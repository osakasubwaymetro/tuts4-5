/* generator_core.js v1.5.0 (1.5.0: sheetSig 追加=時刻表の同一判定用。1.4.0: 1.4.0: 列車内訳 explainRoutes と convertUnyou の trains を追加。判定ロジックは不変)
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
    const trains = []; // 列車内訳用(1.4.0): 列車ごとの番号・種別・停車駅(判定には使わない)
    for (const { num, shubetsu, ikisaki, chosen, i0, i1 } of pending) {
      const tst = [];
      for (let i = i0; i <= i1; i++) { stations.push(chosen[i].station); tst.push(chosen[i].station); }
      const tr = { num, shubetsu, ikisaki, stations: tst }; trains.push(tr);
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
        tr.num = rnum;
      }
    }
    const out = { rows, skipped, stations, bounds, trains };
    return renameStations(out, null);
  }

  /** 駅名の自動正規化(1.2.0): ele は「ＪＲ○○駅」と全角、tuts は半角「JR」なので半角に統一する */
  function normalizeStation(name) {
    return String(name == null ? "" : name).replace(/[ＪJ][ＲR]/g, "JR");
  }

  /**
   * 駅名の置換(1.2.0)。fixes: { 旧名: 新名 } (null なら自動正規化のみ)。
   * conv.rows / stations / bounds を破壊的に書き換えて conv を返す。自動正規化を先に、続けて fixes を適用。
   */
  function renameStations(conv, fixes) {
    const f = n => { let x = normalizeStation(n); if (fixes && Object.prototype.hasOwnProperty.call(fixes, x) && fixes[x]) x = fixes[x]; return x; };
    for (let i = 1; i < conv.rows.length; i++) conv.rows[i][1] = f(conv.rows[i][1]);
    conv.stations = conv.stations.map(f);
    conv.bounds = conv.bounds.map(f);
    if (conv.trains) conv.trains.forEach(t => { t.stations = t.stations.map(f); });
    return conv;
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

  /**
   * 列車内訳(1.4.0)。表示専用で、判定(attributeRoutes)は呼んで結果をそのまま使う=判定ロジックは変えない。
   * attributeRoutes は全列車の停車駅をつなげた並びで判定するので、列車の境目(前の列車の終着→次の列車の始発)も1区間として数えられる。
   * その区間も「つなぎ」として明示する。戻り値: { routes, unknown, trains:[{num,shubetsu,start,end,stations,spans:[{route,from,to,pairs}],outside:[{station,why}]}], links:[{from,to,fromTrain,toTrain,routes}] }
   */
  function explainRoutes(trains, stationsByRoute) {
    const allSt = []; trains.forEach(t => t.stations.forEach(x => allSt.push(x)));
    const at = attributeRoutes(allSt, stationsByRoute);
    const adjOf = {}, inRoute = {};
    for (const [r, list] of Object.entries(stationsByRoute)) {
      const adj = new Set();
      for (let i = 0; i + 1 < list.length; i++) { adj.add(list[i] + "\t" + list[i + 1]); adj.add(list[i + 1] + "\t" + list[i]); }
      adjOf[r] = adj; inRoute[r] = new Set(list);
    }
    const pairs = []; // 判定が実際に数えた区間(連続重複を除いた並び)
    let tail = null, last = -1;
    trains.forEach((t, ti) => {
      for (const s of t.stations) {
        if (tail === s) { last = ti; continue; }
        if (tail !== null) pairs.push({ a: tail, b: s, from: last, to: ti, link: last !== ti });
        tail = s; last = ti;
      }
    });
    const hit = p => at.routes.filter(r => adjOf[r].has(p.a + "\t" + p.b));
    pairs.forEach(p => { p.routes = hit(p); });
    const known = new Set(); for (const r of Object.keys(inRoute)) inRoute[r].forEach(x => known.add(x));
    const out = trains.map((t, ti) => {
      const own = pairs.filter(p => !p.link && p.to === ti);
      const spans = at.routes.map(r => {
        const ps = own.filter(p => p.routes.includes(r));
        if (!ps.length) return null;
        const idx = []; ps.forEach(p => { idx.push(t.stations.indexOf(p.a)); idx.push(t.stations.lastIndexOf(p.b)); });
        // 区間の端: 最初に現れた a と、最後の b(同じ駅が2度出る列車でも順序どおり)
        const a0 = ps[0].a, b0 = ps[ps.length - 1].b;
        return { route: r, from: a0, to: b0, pairs: ps.length };
      }).filter(Boolean);
      const covered = new Set(); own.forEach(p => { if (p.routes.length) { covered.add(p.a); covered.add(p.b); } });
      const outside = [];
      for (const x of new Set(t.stations)) if (!covered.has(x)) outside.push({ station: x, why: known.has(x) ? "選ばれた路線の駅順で隣り合っていない" : "マスタに無い駅" });
      return { num: t.num, shubetsu: t.shubetsu || "", start: t.stations[0] || "", end: t.stations[t.stations.length - 1] || "", stations: t.stations, spans, outside };
    });
    const links = pairs.filter(p => p.link).map(p => ({ from: p.a, to: p.b, fromTrain: trains[p.from].num, toTrain: trains[p.to].num, routes: p.routes }));
    return { routes: at.routes, unknown: at.unknown, trains: out, links };
  }

  /** 時刻表の同一判定用(1.5.0)。出力列順の行 [列車番号,駅名,時刻,行先,種別] の先頭5列(前後の空白は無視)。見出し行(列車番号/種別)は除く。行が無ければ "" */
  function sheetSig(rows) {
    const out = [];
    for (const r of rows || []) {
      if (!Array.isArray(r)) continue;
      if (String(r[0]).trim() === "列車番号" && String(r[4] == null ? "" : r[4]).trim() === "種別") continue;
      const c = []; for (let i = 0; i < 5; i++) c.push(String(r[i] == null ? "" : r[i]).trim());
      out.push(c);
    }
    return out.length ? JSON.stringify(out) : "";
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

  /** 時刻(5:22 / 05:22 / 0522 / 24:10)→ "0522"。読めなければ "" */
  function hhmm(t) {
    const m = /^\s*(\d{1,2})\s*:?\s*(\d{2})(?::\d{2})?\s*$/.exec(String(t == null ? "" : t));
    return m ? String(parseInt(m[1], 10)).padStart(2, "0") + m[2] : "";
  }
  /** 運番の自動値(1.3.0): 始発駅名＋始発時刻(HHMM)。例: 淀0522 */
  function unbanBase(station, time) {
    const st = normalizeStation(String(station || "").trim()), t = hhmm(time);
    return st && t ? st + t : "";
  }
  /** 変換結果(rows: 見出し込み)の先頭列車の始発駅・始発時刻から運番の自動値を作る。取れなければ "" */
  function unbanFromRows(rows) {
    if (!rows || rows.length < 2) return "";
    const num = rows[1][0];
    for (let i = 1; i < rows.length && rows[i][0] === num; i++) {
      const v = unbanBase(rows[i][1], rows[i][2]);
      if (v) return v;
    }
    return "";
  }
  /** 一覧取得の応答の1グループから、始発駅・始発時刻が確実に分かる時だけ運番の自動値を返す(shukko 等)。分からなければ "" */
  function unbanFromGroup(g) {
    if (!g || typeof g !== "object") return "";
    const pick = (o, keys) => { for (const k of keys) if (o && o[k] != null && o[k] !== "") return o[k]; return ""; };
    const SK = ["station", "station_name", "st_name", "start_st", "start_station", "eki", "name"];
    const TK = ["dep_time", "start_time", "depart_time", "time", "hhmm", "dep"];
    let o = g.shukko;
    if (Array.isArray(o)) o = o[0];
    if (o && typeof o === "object") { const v = unbanBase(pick(o, SK), pick(o, TK)); if (v) return v; }
    return unbanBase(pick(g, ["start_st", "start_station"]), pick(g, ["start_time", "dep_time"]));
  }
  /** 同じ接頭辞の中で重複しない運番にする。base が taken に有れば 末尾に（2）（3）…を付ける。taken は破壊的に更新 */
  function uniqueUnban(base, taken) {
    let v = base, n = 1;
    while (taken.has(v)) { n++; v = base + "（" + n + "）"; }
    taken.add(v);
    return v;
  }
  const api = { hhmm, unbanBase, unbanFromRows, unbanFromGroup, uniqueUnban, REGISTRY_HEADERS, single, pickSegments, convertUnyou, toOutputRows, monotonicViolations, attributeRoutes, explainRoutes, sheetSig, normalizeStation, renameStations, resolveFields, buildRegistryRow, groupByRoute };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.GenCore = api;
})(typeof window !== "undefined" ? window : globalThis);
