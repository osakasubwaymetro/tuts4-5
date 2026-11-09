/* generator_core.js v1.1.0
 * elesite の生レスポンス → tuts4 静的JSON の変換ロジック(fetch_saikyo.py / convert.py の JS 移植)。
 * ブラウザ(window.GenCore)と Node(module.exports)の両方で使える。DOM・通信には触らない。
 */
(function (root) {
  "use strict";

  const REGISTRY_HEADERS = ["会社", "路線", "ID", "運番", "曜日区分", "臨時", "適用開始日", "最終更新", "両数", "所定形式", "臨時ダイヤ名"];

  // "05:22" -> "5:22"
  function single(t) {
    const m = String(t || "").split(":");
    if (m.length < 2) return String(t || "");
    return String(parseInt(m[0], 10)) + ":" + m[1];
  }

  /** flow(get_daily_unyou_by_unyou_id の応答) から有効な区間だけ取り出す */
  function pickSegments(flow) {
    const items = Array.isArray(flow) ? flow : (flow ? [flow] : []);
    const segs = [];
    for (const it of items) {
      for (const s of (it.unyou_list || [])) {
        const rid = s.retsuban_id;
        if (rid === -1 || rid == null || !s.retsuban) continue;
        if (s.retsuban.includes("入庫") || s.retsuban.includes("出庫")) continue;
        segs.push(s);
      }
    }
    return segs;
  }

  /**
   * ttMap: { retsuban_id: get_retsuban_time_by_id の応答 }
   * 戻り値: { rows(シート列順・見出し込み), skipped[], stations[], bounds[] }
   */
  function convertUnyou(flow, ttMap) {
    const segs = pickSegments(flow);
    const skipped = [];
    const pending = [];
    for (const s of segs) {
      const tt = ttMap[s.retsuban_id];
      if (!tt || tt.code === -1 || !(tt.timetable_list && tt.timetable_list.length)) { skipped.push(s.retsuban); continue; }
      const num = String(tt.retsuban || s.retsuban).split("#")[0];
      let shubetsu = String(tt.shubetsu || s.shubetsu || "").split("#")[0];
      if (shubetsu === "Ａ快速" || shubetsu === "A快速") shubetsu = "快速";
      const ikisaki = tt.ikisaki || s.ikisaki || "";
      const subs = [];
      for (const el of tt.timetable_list) {
        if (el && !Array.isArray(el) && el.timetable) subs.push(el.timetable);
        else if (Array.isArray(el)) subs.push(el);
      }
      if (!subs.length) { skipped.push(s.retsuban); continue; }
      let chosen = null;
      for (const sub of subs) {
        const sts = sub.filter(x => x.station).map(x => x.station);
        if (sts.length && sts[0] === s.start_st && sts[sts.length - 1] === s.end_st) { chosen = sub; break; }
      }
      if (!chosen) chosen = subs[0];
      const sts = chosen.map(x => x.station);
      let i0 = sts.indexOf(s.start_st); if (i0 < 0) i0 = 0;
      let i1 = sts.indexOf(s.end_st); if (i1 < 0) i1 = sts.length - 1;
      pending.push({ num, shubetsu, ikisaki, chosen, i0, i1 });
    }
    const bounds = [];
    for (let k = 1; k < pending.length; k++) {
      const p = pending[k - 1], q = pending[k];
      const prevSt = p.chosen[p.i1].station;
      if (q.chosen[q.i0].station === prevSt) bounds.push(prevSt);
    }
    const rows = [["列車番号", "駅名", "発車時刻", "種別", "行先"]];
    const stations = [];
    for (const { num, shubetsu, ikisaki, chosen, i0, i1 } of pending) {
      for (let i = i0; i <= i1; i++) stations.push(chosen[i].station);
      const isKaisou = num === "回送" || shubetsu === "回送";
      let genNum = null;
      for (let i = i0; i <= i1; i++) {
        const x = chosen[i];
        const arr = x.arr_time, dep = x.dep_time;
        if (x.train_type === "通過") {
          rows.push([isKaisou ? (genNum || num) : num, x.station, single(dep || arr), "", ""]);
          continue;
        }
        let t;
        if (i === i0 && i === i1) t = single(dep || arr);
        else if (i === i0) t = single(dep);
        else if (i === i1) t = single(arr);
        else if (arr && dep && arr !== dep) t = arr + "\n" + dep;
        else t = single(dep || arr);
        let rnum = num;
        if (isKaisou) {
          if (genNum == null) {
            const d0 = chosen[i0].dep_time || chosen[i0].arr_time || "";
            genNum = "回送" + d0.replace(":", "");
          }
          rnum = genNum;
        }
        rows.push([rnum, x.station, t, shubetsu, ikisaki]);
      }
    }
    return { rows, skipped, stations, bounds };
  }

  /** シート列順 [番号,駅,時刻,種別,行先] → 出力列順 [番号,駅,時刻,行先,種別] */
  function toOutputRows(rows) {
    return rows.map(r => { const c = r.slice(); while (c.length < 5) c.push(""); return [c[0], c[1], c[2], c[4], c[3]].concat(c.slice(5)); });
  }

  /** 時刻が単調増加か(24時跨ぎの 20時台→5時未満 は許容)。違反数を返す */
  function monotonicViolations(rows) {
    const mins = t => { const p = String(t).split("\n").pop().split(":"); return (+p[0]) * 60 + (+p[1]); };
    let bad = 0, prev = -1;
    for (const r of rows.slice(1)) {
      const v = mins(r[2]);
      if (v < prev && !(prev > 20 * 60 && v < 5 * 60)) bad++;
      prev = v;
    }
    return bad;
  }

  /**
   * 路線帰属(1.1.0)。stationsByRoute: { 路線名: [駅名,...] } (マスタ station シートから。並びは路線の駅順)。
   * 列車が通った「隣り合う2駅(区間)」のうち、その路線の駅順でも隣り合っている区間(上り下りは同じ区間として数える)を、その路線が説明できる区間とみなす。
   * 全区間を少ない路線で説明できるように貪欲に選ぶ(同点なら駅数の少ない=専用の路線を優先)。
   * 新しく説明できる区間が2つ未満の路線は採らない(境界駅だけ触れた路線を除くため)。
   * 並びは最初に現れた順。unknown = どの路線にも無い駅。
   */
  function attributeRoutes(stations, stationsByRoute) {
    const seq = [];
    for (const s of stations) if (seq[seq.length - 1] !== s) seq.push(s);
    const known = new Set();
    const cover = {}; // 路線 → 説明できる区間(index)の集合
    const size = {};
    for (const [r, list] of Object.entries(stationsByRoute)) {
      size[r] = list.length;
      const adj = new Set();
      for (let i = 0; i + 1 < list.length; i++) { adj.add(list[i] + "\t" + list[i + 1]); adj.add(list[i + 1] + "\t" + list[i]); }
      list.forEach(x => known.add(x));
      const cs = new Set();
      for (let i = 0; i + 1 < seq.length; i++) if (adj.has(seq[i] + "\t" + seq[i + 1])) cs.add(seq[i] < seq[i + 1] ? seq[i] + "\t" + seq[i + 1] : seq[i + 1] + "\t" + seq[i]);
      if (cs.size) cover[r] = cs;
    }
    const unknown = [...new Set(seq.filter(s => !known.has(s)))];
    const covered = new Set(), chosen = [];
    for (const minGain of [2, 1]) {
      if (chosen.length) break;
      for (;;) {
        let best = null, bg = 0;
        for (const r of Object.keys(cover)) {
          if (chosen.includes(r)) continue;
          let g = 0; for (const i of cover[r]) if (!covered.has(i)) g++;
          if (g < minGain) continue;
          if (g > bg || (g === bg && best !== null && size[r] < size[best])) { best = r; bg = g; }
        }
        if (!best) break;
        chosen.push(best); for (const i of cover[best]) covered.add(i);
      }
    }
    const firstOf = r => { for (let i = 0; i + 1 < seq.length; i++) { const k = seq[i] < seq[i + 1] ? seq[i] + "\t" + seq[i + 1] : seq[i + 1] + "\t" + seq[i]; if (cover[r].has(k)) return i; } return 1e9; };
    const routes = chosen.sort((a, b) => firstOf(a) - firstOf(b));
    return { routes, unknown };
  }

  /** diagrams > groups > defaults で実効値を解決 */
  function resolveFields(diag, group, defaults) {
    const F = ["company", "prefix", "weekday", "rinji", "start_date", "cars", "icons", "pattern_name"];
    const eff = {};
    for (const f of F) {
      eff[f] = "";
      for (const src of [diag, group, defaults]) {
        if (src && src[f] != null && src[f] !== "") { eff[f] = src[f]; break; }
      }
    }
    return eff;
  }

  /** 登録行(11列)を作る。lastUpdate は保存日(JST) */
  function buildRegistryRow(eff, routeCell, unban, lastUpdate) {
    return {
      "会社": String(eff.company), "路線": routeCell, "ID": String(eff.prefix), "運番": String(unban),
      "曜日区分": String(eff.weekday), "臨時": String(eff.rinji), "適用開始日": String(eff.start_date),
      "最終更新": lastUpdate, "両数": String(eff.cars), "所定形式": String(eff.icons),
      "臨時ダイヤ名": String(eff.pattern_name)
    };
  }

  /** items: [{obj(登録行), rows(出力列順)}] を (会社,単体路線) ごとのグループにする(convert.py の build_groups) */
  function groupByRoute(items) {
    const order = [], map = {};
    for (const it of items) {
      for (const route of String(it.obj["路線"]).split(",").map(s => s.trim()).filter(Boolean)) {
        const key = it.obj["会社"] + "\t" + route;
        if (!map[key]) { map[key] = { company: it.obj["会社"], route, list: [], sheets: {} }; order.push(key); }
        map[key].list.push(it.obj);
        const k = it.obj["ID"] + "_" + it.obj["運番"];
        if (!(k in map[key].sheets)) map[key].sheets[k] = it.rows;
      }
    }
    return order.map(k => map[k]);
  }

  const api = { REGISTRY_HEADERS, single, pickSegments, convertUnyou, toOutputRows, monotonicViolations, attributeRoutes, resolveFields, buildRegistryRow, groupByRoute };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.GenCore = api;
})(typeof window !== "undefined" ? window : globalThis);
