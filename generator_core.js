/* generator_core.js v1.7.0 (1.7.0: 路線判定を trainpos 流(列車ごとの続けて停まる2駅×路線の駅順)に組み直し。再判定(second)は廃止。1.6.0: 1.6.0: explainRoutes に再判定(opts.second)を追加。attributeRoutes は不変。1.5.0: 1.5.0: sheetSig 追加=時刻表の同一判定用。1.4.0: 1.4.0: 列車内訳 explainRoutes と convertUnyou の trains を追加。判定ロジックは不変)
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
   * 路線判定(1.7.0)。trainpos(走行位置)と同じ発想: 列車ごとに、時刻表で続けて停まる2駅(隣り合う停車)が、その路線の駅順リストに
   * 両方入っていれば、その区間はその路線を走る区間(間に別路線の停車駅が挟まる所は続けて停まる2駅ではないので数えない)。
   * ・列車の境目(前の列車の終着→次の列車の始発)は区間に数えない(trainpos も列車単位)。
   * ・各区間の候補路線 = 路線の駅順で隣り合っている路線。無ければ2駅とも駅順リストにある路線(急行が駅を飛ばした区間)。
   * ・全区間を説明できる最小の路線の組(同じ数なら駅数の少ない=専用の路線を優先。候補が多い時は貪欲法)。
   * ・採った路線のうち、区間ごとに1つの路線だけに割り当てる(その路線で説明できる区間が多い方を優先)。1つも割り当たらない路線は外す。
   * 決定的(同じ入力なら同じ結果)。stationsByRoute: { 路線名: [駅名,...] }(渡した路線だけが候補)。
   * 戻り値: { routes, unknown, pairs:[{a,b,t,route}], isAdj(r,a,b) }
   */
  function judgeRoutes(trainStations, stationsByRoute) {
    const names = Object.keys(stationsByRoute);
    const pos = {}, adj = {}, size = {}, known = new Set();
    for (const r of names) {
      const list = stationsByRoute[r];
      size[r] = list.length; pos[r] = new Set(list);
      const ad = new Set();
      for (let i = 0; i + 1 < list.length; i++) { ad.add(list[i] + "\t" + list[i + 1]); ad.add(list[i + 1] + "\t" + list[i]); }
      adj[r] = ad; list.forEach(x => known.add(x));
    }
    const isAdj = (r, a, b) => adj[r].has(a + "\t" + b);
    const kOf = (a, b) => (a < b ? a + "\t" + b : b + "\t" + a);
    const pairs = [], cand = new Map();
    trainStations.forEach((st, t) => {
      let prev = null;
      for (const x of st) { if (x === prev) continue; if (prev !== null) pairs.push({ a: prev, b: x, t, route: null }); prev = x; }
    });
    for (const p of pairs) {
      const k = kOf(p.a, p.b); if (cand.has(k)) continue;
      let c = names.filter(r => isAdj(r, p.a, p.b));
      if (!c.length) c = names.filter(r => pos[r].has(p.a) && pos[r].has(p.b));
      cand.set(k, c);
    }
    const lists = [...cand.values()].filter(c => c.length);
    const all = [...new Set(lists.flat())];
    const masks = lists.map(c => c.reduce((m, r) => m | (1 << all.indexOf(r)), 0));
    let chosen = [];
    if (lists.length) {
      if (all.length > 20) { // 候補が多すぎる時は貪欲法
        const left = new Set(masks.keys());
        while (left.size) {
          let best = -1, bg = 0;
          all.forEach((r, j) => { let g = 0; left.forEach(i => { if (masks[i] & (1 << j)) g++; }); if (g > bg || (g === bg && g > 0 && best >= 0 && size[r] < size[all[best]])) { bg = g; best = j; } });
          if (best < 0) break;
          chosen.push(all[best]); [...left].forEach(i => { if (masks[i] & (1 << best)) left.delete(i); });
        }
      } else {
        const covers = m => masks.every(x => x & m);
        outer: for (let n = 1; n <= all.length; n++) {
          let best = null, bs = 1e9;
          const rec = (start, m, c) => {
            if (c === n) { if (covers(m)) { let sz = 0; all.forEach((r, j) => { if (m & (1 << j)) sz += size[r]; }); if (sz < bs) { bs = sz; best = m; } } return; }
            for (let j = start; j < all.length; j++) rec(j + 1, m | (1 << j), c + 1);
          };
          rec(0, 0, 0);
          if (best !== null) { chosen = all.filter((r, j) => best & (1 << j)); break outer; }
        }
      }
    }
    // 区間ごとに1つの路線へ割り当て(説明できる区間が多い路線を優先、同数なら駅数の少ない方、さらに名前順)
    const count = {}; chosen.forEach(r => { count[r] = 0; });
    for (const c of lists) for (const r of c) if (r in count) count[r]++;
    const order = chosen.slice().sort((x, y) => count[y] - count[x] || size[x] - size[y] || (x < y ? -1 : x > y ? 1 : 0));
    const assigned = new Map();
    for (const [k, c] of cand) { const r = order.find(x => c.includes(x)); if (r) assigned.set(k, r); }
    pairs.forEach(p => { p.route = assigned.get(kOf(p.a, p.b)) || null; });
    const used = new Set(assigned.values()), seq = [];
    for (const p of pairs) if (p.route && !seq.includes(p.route)) seq.push(p.route);
    const routes = seq.filter(r => used.has(r));
    const unknown = [...new Set(trainStations.flat().filter(x => !known.has(x)))];
    return { routes, unknown, pairs, isAdj };
  }

  /** 路線帰属。stations は「駅名の並び」または「列車ごとの駅名の並びの配列」(後者を渡すと列車の境目を区間に数えない)。戻り値 { routes, unknown } */
  function attributeRoutes(stations, stationsByRoute) {
    const trains = Array.isArray(stations[0]) ? stations : [stations];
    const j = judgeRoutes(trains, stationsByRoute);
    return { routes: j.routes, unknown: j.unknown };
  }

  /**
   * 列車内訳(1.4.0→1.7.0で判定を attributeRoutes と同じ judgeRoutes に統一)。表示専用。
   * 戻り値: { routes, extra:[], unknown, trains:[{num,shubetsu,start,end,stations,spans:[{route,from,to,pairs,loose}],outside:[{station,why}]}], links:[] }
   */
  function explainRoutes(trains, stationsByRoute) {
    const j = judgeRoutes(trains.map(t => t.stations), stationsByRoute);
    const known = new Set(); for (const l of Object.values(stationsByRoute)) l.forEach(x => known.add(x));
    const out = trains.map((t, ti) => {
      const own = j.pairs.filter(p => p.t === ti);
      const spans = j.routes.map(r => {
        const ps = own.filter(p => p.route === r);
        if (!ps.length) return null;
        return { route: r, from: ps[0].a, to: ps[ps.length - 1].b, pairs: ps.length, loose: ps.filter(p => !j.isAdj(r, p.a, p.b)).length, second: false };
      }).filter(Boolean);
      const covered = new Set(); own.forEach(p => { if (p.route) { covered.add(p.a); covered.add(p.b); } });
      const outside = [];
      for (const x of new Set(t.stations)) if (!covered.has(x)) outside.push({ station: x, why: known.has(x) ? "どの候補路線でも、続けて停まる駅の区間として説明できない" : "マスタに無い駅" });
      return { num: t.num, shubetsu: t.shubetsu || "", start: t.stations[0] || "", end: t.stations[t.stations.length - 1] || "", stations: t.stations, spans, outside };
    });
    return { routes: j.routes, extra: [], unknown: j.unknown, trains: out, links: [] };
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
  const api = { hhmm, unbanBase, unbanFromRows, unbanFromGroup, uniqueUnban, REGISTRY_HEADERS, single, pickSegments, convertUnyou, toOutputRows, monotonicViolations, attributeRoutes, explainRoutes, judgeRoutes, sheetSig, normalizeStation, renameStations, resolveFields, buildRegistryRow, groupByRoute };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.GenCore = api;
})(typeof window !== "undefined" ? window : globalThis);
