// trainpos.js v1.7.2
// 1.7.2: 一度広げた駅間の高さは、リロードするまで路線ごとにそのまま維持する（列車が動くたびに高さが変わってスクロールが戻されるのを防ぐ）。広げる方向にだけ変わる
// 1.7.1: 同じ側で横に並ぶのは2本までOK。3本目（3列目）になる時に駅間を広げる判定にした
// 1.7.0: 駅間が長く列車が密な路線（東海道新幹線など）で、列車が枠の横からはみ出しそうな時は全区間の駅間の高さを均等に広げる。
// 1.6.0: 路線の列車データの読み込みを高速化。運番シートの取得を6本→16本同時に、1枚20秒のタイムアウトを付け、
//        列車データ（最新）と乗車記録・祝日・車両マスタの取得を同時に走らせる（今までは列車を全部読み終えてから順に取っていた）。
//        ダイヤ一覧の保持時間を1時間→1分にして、変更がほぼすぐ反映されるようにした。結果の並びはダイヤ一覧の順で毎回同じにした
// 1.5.0: 平日／休日ダイヤの切り替えを0:00→3:00にした。0:00〜2:59は前日の運行日の続きとして扱い、始発駅の発車が0:00〜2:59の列車は前日のダイヤ（24:13扱い）に入れる。日跨ぎ列車の仕組みはそのまま
// 1.4.0: ・終点駅の行が無くてもいい仕組みをやめた（最後に書いてある行は終着＝時刻1個なら到着のみ）。列車の詳細の終点補足も廃止
//        ・路線の境界駅が通過（時刻が書いていない）でも、列車が消えないようにした。時刻の無い行は前後の時刻から
//          按分して推定し、行が無い場合は、他路線と共通の駅（境界駅）を探して、駅数の比で推定する
//        ・路線マスタの「並走」で並走している路線の列車も、この路線の図に出す（この路線の駅に2駅以上かかる列車だけ）
// 1.3.0: 1.2.1 の変更（乗車記録を毎回取り直す・件数表示）を元に戻した（1.2.0 相当）。そのうえで、
//        ダイヤに無い乗車記録は「その日の分」ではなく、「路線マスタのダイヤ改正日より後の全ての日の記録のうち、
//        表示している日と同じ区分（平日／土休日）の記録」を使うようにした。記録の発車時刻が HH:MM なら、
//        HH:MM:00〜HH:MM:59 の間だけ乗車駅に表示する（同じ駅・時刻・行先が複数日にあれば一番新しい記録の編成を使う）
// 1.2.0: ダイヤに無い乗車記録も、HH:MM:00〜HH:MM:59 の間だけ乗車駅に表示する。ダイヤが無いのでタップしても何も起きない。
//        列車番号の代わりに発車時刻（HH:MM）を表示。ダイヤの列車と一致する記録（駅・時刻・行先）は、二重に出さない
// 1.1.2: 折り返しなどで列車番号が変わっても編成アイコン・編成番号が消えないようにした。
//        乗車記録の紐づけは、同じ運用（ダイヤ一覧の同じID＋運番＝同じ編成が1日走り続ける）の
//        他の列車の記録まで見て、1本でも一致すれば、その運用の全ての列車に同じ編成を出す
// 1.1.1: 種別・行先が両方空の行（通過駅）は「停車中」（緑）にせず、通過の時刻として位置の計算にだけ使う。
//        路線の境界駅が通過でも、時刻が入っていれば路線に入る／出る位置が正しく出る
// 1.1.0: 列車をタップすると、時刻表で時刻を押した時と同じ「列車の詳細」（各駅の到着時刻＋スタフ表示）を開く（timetable.js の ttOpenTrainDetail を使用）
// 乗車路線マップ（linemap.html）に「列車位置」を重ねて表示する。
//  ・ダイヤ（運用シート）の時刻から、今走っている列車の位置を計算（駅に停車中／駅間）
//  ・列車番号を黒いバッジで表示
//  ・同じ日の乗車記録（路線・駅・時刻・行先が一致）が上がっていれば、その編成アイコン／種別＋行先／編成番号も表示
//  ・乗車記録が無い列車は、汎用アイコン＋列車番号＋種別＋行先だけ表示
// 画面に触るのは #trainposBar（操作バー）と、.route-line-scroll 内に作る #tpLayer だけ。
(function () {
  "use strict";

  const MASTER_BASE = "https://opensheet.elk.sh/1ZooIjdlOwsLZVjQv6KN53h4X2JYUyULYuJTuhbgk95s/";
  const DIAGRAM_SHEET_ID = "1JzY1wIGbj2Z83ItsMnMrz1xQ-cviEv50P0mOHiyi70A";
  const RIDES_URL = "https://script.google.com/macros/s/AKfycbyWTr6ejDZKkaw9owEM8yLcl6-6w5pHeyk2hWdX6Lw1INNg5ZxuhvCx7PPfOmxWHC17/exec";
  const FALLBACK_TRAIN_IMAGE = "https://img.elesite-next.com/hatena.webp";
  const DAY_START = 3 * 3600;                // 運行日の切り替え時刻（3:00）
  const FETCH_CONCURRENCY = 16;              // 運番シートを同時に取る本数
  const SHEET_TIMEOUT_MS = 20000;            // 1枚あたりのタイムアウト
  const TRAINS_TTL_MS = 30 * 60 * 1000;      // 路線ごとの列車データ（IndexedDB）
  const RIDES_REFRESH_MS = 3 * 60 * 1000;    // 乗車記録の取り直し間隔
  const TICK_MS = 5000;
  const LS_ON = "tuts4_trainpos_on";

  const st = {
    ctx: null,            // { routeVal, stationsOnRoute, isLoop, company }
    trains: [],           // 今表示中の路線の列車（コンパクト化済み）
    trainsRoute: "",
    loading: false,
    loadSeq: 0,
    rides: null, ridesFetchedAt: 0, ridesLoading: false,
    holidaySet: null,
    modelRows: null, numberRows: null,
    timer: null, pending: null,
    on: false, live: true, manualSec: null,
  };

  /* ---------- 小物 ---------- */
  const pad = n => String(n).padStart(2, "0");
  const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const cleanNum = n => String(n || "").trim().replace(/\*/g, "");
  const splitSlash = v => String(v || "").split("/").map(s => s.trim()).filter(Boolean);
  const isTrue = v => ["true", "TRUE", "1", "はい", "有", "✓"].includes(String(v).trim());
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  function idb() { return window.tuts4IdbCache || null; }

  function toDisplayableImageUrl(url) {
    const s = String(url || "").trim();
    if (!s) return "";
    let m = s.match(/drive\.google\.com\/file\/d\/([^/]+)/);
    if (m) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w200`;
    m = s.match(/[?&]id=([^&]+)/);
    if (m && s.includes("drive.google.com")) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w200`;
    return s;
  }

  /* ---------- ダイヤ読み込み（timetable.js と同じ規約。localStorageには書き込まない） ---------- */
  function readLsCache(key, ttl) {
    try {
      const p = JSON.parse(localStorage.getItem(key) || "null");
      if (!p || !Array.isArray(p.data) || !p.fetchedAt) return null;
      if (ttl && Date.now() - p.fetchedAt > ttl) return null;
      return p;
    } catch (e) { return null; }
  }

  async function getDiagramList() {
    const c = readLsCache("tuts4_diagram_list_cache", 60 * 1000); // 1分（変更がほぼすぐ反映される）
    if (c) return c.data;
    try {
      const res = await fetch(`https://opensheet.elk.sh/${DIAGRAM_SHEET_ID}/${encodeURIComponent("ダイヤ一覧")}`);
      const data = await res.json();
      if (Array.isArray(data)) return data;
    } catch (e) { /* ignore */ }
    const stale = readLsCache("tuts4_diagram_list_cache", 0);
    return stale ? stale.data : [];
  }

  async function fetchSheet(id, unban, lastUpdated) {
    const name = `${id}_${unban}`;
    const key = "tuts4_diagram_sheet_" + name;
    const meta = readLsCache(key, 14 * 24 * 60 * 60 * 1000);
    let force = false;
    if (lastUpdated && meta) {
      const u = new Date(lastUpdated);
      if (!isNaN(u) && u.getTime() > meta.fetchedAt) force = true;
    }
    if (meta && !force) return meta.data;
    try {
      const ctl = typeof AbortController === "function" ? new AbortController() : null;
      const timer = ctl ? setTimeout(() => ctl.abort(), SHEET_TIMEOUT_MS) : null;
      let data;
      try {
        const res = await fetch(`https://opensheet.elk.sh/${DIAGRAM_SHEET_ID}/${encodeURIComponent(name)}`, ctl ? { signal: ctl.signal } : undefined);
        data = await res.json();
      } finally { if (timer) clearTimeout(timer); }
      if (Array.isArray(data)) return data;
    } catch (e) { /* ignore */ }
    const stale = readLsCache(key, 0);
    return stale ? stale.data : [];
  }

  function filterLatestRevision(matches) {
    const today = new Date();
    const groups = {}, pass = [];
    matches.forEach(d => {
      const key = `${d["ID"] || ""}_${d["運番"] || ""}`;
      const raw = String(d["適用開始日"] || "").trim();
      if (!raw) { pass.push(d); return; }
      const date = new Date(raw);
      if (isNaN(date) || date > today) return;
      if (!groups[key] || date > groups[key].date) groups[key] = { row: d, date };
    });
    return [...Object.values(groups).map(g => g.row), ...pass];
  }

  // 運用シートの行 → 列車（同じ列車番号が続くまとまり）ごとの停車情報。時刻は秒、日跨ぎは+24hで連続化
  function compactSheet(rows, listRow, viaParallel) {
    const dayRaw = String(listRow["曜日区分"] || "").trim();
    const dayType = dayRaw ? (dayRaw.includes("土") || dayRaw.includes("休") ? "holiday" : "weekday") : "both";
    const groups = [];
    let cur = null, curNum = null;
    rows.forEach(r => {
      const num = r["列車番号"];
      if (cur && num === curNum) cur.push(r);
      else { cur = [r]; curNum = num; groups.push(cur); }
    });

    const out = [];
    groups.forEach(group => {
      let prev = null; // 直前の時刻（秒）。24時間を跨いだら+86400して連続させる
      const stops = [];
      group.forEach((r, i) => {
        const found = [...String(r["発車時刻"] || "").matchAll(/(\d{1,2}):(\d{2})(?::(\d{2}))?/g)]
          .map(m => Number(m[1]) * 3600 + Number(m[2]) * 60 + (m[3] ? Number(m[3]) : 0));
        const bounds = splitSlash(r["行先"]);
        const isTerminus = i === group.length - 1; // 最後に書いてある行は終着（時刻1個なら到着のみ）
        let a = found.length ? found[0] : null;
        let d = found.length >= 2 ? found[1] : (found.length === 1 ? (isTerminus ? null : found[0]) : null);
        // 日跨ぎの連続化
        [["a", a], ["d", d]].forEach(([k, v]) => {
          if (v == null) return;
          let t = v;
          while (prev != null && t < prev - 12 * 3600) t += 86400;
          prev = t;
          if (k === "a") a = t; else d = t;
        });
        if (!r["駅名"]) return;
        const type0 = splitSlash(r["種別"])[0] || "";
        stops.push({ s: String(r["駅名"]).trim(), a, d, type: type0, bound: bounds[0] || "", pass: !type0 && !bounds.length });
      });
      if (!stops.length) return;
      // 始発駅の発車が0:00〜2:59の列車は「前日の運行日の続き」（24:13のような扱い）にする。
      // 運行日の切り替えは3:00なので、前日の平日／休日のダイヤで、深夜0時台も走ってるように見える
      const firstT = stops[0].d != null ? stops[0].d : stops[0].a;
      if (firstT != null && firstT < DAY_START) {
        stops.forEach(sp => { if (sp.a != null) sp.a += 86400; if (sp.d != null) sp.d += 86400; });
      }
      const bounds = new Set();
      group.forEach(r => splitSlash(r["行先"]).forEach(b => bounds.add(b)));
      out.push({
        unban: listRow["運番"] || "",
        trainNumber: group[0]["列車番号"] || "",
        dayType, isExtra: isTrue(listRow["臨時"]),
        sheetKey: `${listRow["ID"] || ""}_${listRow["運番"] || ""}_${dayType}`, // 同じ運用（＝同じ編成が走り続ける）の目印
        bounds: [...bounds], stops,
        viaParallel: !!viaParallel // 並走路線のダイヤ一覧から取った列車（この路線のダイヤ一覧には無い）
      });
    });
    return out;
  }

  async function loadRouteTrains(ctx, onProgress) {
    const par = (ctx.parallelRoutes || []).filter(p => p.route && p.route !== ctx.routeVal);
    const cacheKey = "tp_trains4_" + ctx.company + "_" + ctx.routeVal + "+" + par.map(p => p.route).sort().join(",");
    if (idb()) {
      const c = await idb().get(cacheKey);
      if (c && Array.isArray(c.trains) && Date.now() - c.fetchedAt < TRAINS_TTL_MS) return c.trains;
    }
    const list = await getDiagramList();
    const pick = (route, company) => filterLatestRevision(list.filter(d =>
      (!company || d["会社"] === company) &&
      String(d["路線"] || "").split(",").map(x => x.trim()).includes(route)));

    // この路線のダイヤ＋並走路線のダイヤ（同じ運用シートが両方に載っていたら1回だけ読む）
    const jobs = [];
    const seen = new Set();
    const add = (d, viaParallel) => {
      const k = `${d["ID"] || ""}_${d["運番"] || ""}_${d["曜日区分"] || ""}_${d["適用開始日"] || ""}`;
      if (seen.has(k)) return;
      seen.add(k);
      jobs.push({ d, viaParallel });
    };
    pick(ctx.routeVal, ctx.company).forEach(d => add(d, false));
    par.forEach(p => pick(p.route, p.company).forEach(d => add(d, true)));

    // シートを同時に取る。列車は取れた順ではなく、ダイヤ一覧の順に並べる（毎回同じ並びになる）
    const perJob = new Array(jobs.length).fill(null);
    let done = 0, idx = 0;
    const worker = async () => {
      while (idx < jobs.length) {
        const i = idx++;
        const { d, viaParallel } = jobs[i];
        try {
          const rows = await fetchSheet(d["ID"], d["運番"], d["最終更新"]);
          perJob[i] = compactSheet(rows, d, viaParallel);
        } catch (e) { /* この運番はスキップ */ }
        done++;
        if (onProgress) onProgress(done, jobs.length);
      }
    };
    await Promise.all(Array.from({ length: Math.min(FETCH_CONCURRENCY, jobs.length) }, worker));
    const trains = perJob.flat().filter(Boolean);
    if (idb()) idb().set(cacheKey, { trains, fetchedAt: Date.now() });
    return trains;
  }

  /* ---------- 平日/土休日 ---------- */
  async function getHolidaySet() {
    if (st.holidaySet) return st.holidaySet;
    try {
      const c = JSON.parse(localStorage.getItem("tuts4_holidays_cache") || "null");
      if (c && Array.isArray(c.dates)) { st.holidaySet = new Set(c.dates); return st.holidaySet; }
    } catch (e) { /* ignore */ }
    try {
      const res = await fetch("https://holidays-jp.github.io/api/v1/date.json");
      const data = await res.json();
      st.holidaySet = new Set(Object.keys(data));
    } catch (e) { st.holidaySet = new Set(); }
    return st.holidaySet;
  }
  function isHoliday(d) {
    const w = d.getDay();
    return w === 0 || w === 6 || (st.holidaySet && st.holidaySet.has(dateKey(d)));
  }

  /* ---------- 乗車記録（全ユーザー分。当日の記録だけ使う） ---------- */
  async function loadRides(force) {
    if (!force && st.rides && Date.now() - st.ridesFetchedAt < RIDES_REFRESH_MS) return st.rides;
    if (st.ridesLoading) return st.rides || [];
    st.ridesLoading = true;
    try {
      let data = null;
      if (!st.rides) {
        const c = readLsCache("tuts4_tt_allrides_cache", 60 * 60 * 1000);
        if (c) data = c.data;
      }
      if (!data) {
        const res = await fetch(RIDES_URL);
        const j = await res.json();
        if (Array.isArray(j)) data = j;
      }
      if (data) { st.rides = data; st.ridesFetchedAt = Date.now(); }
    } catch (e) { /* 取れなければ前回分を使う */ }
    st.ridesLoading = false;
    return st.rides || [];
  }

  async function loadMasters() {
    if (st.modelRows && st.numberRows) return;
    const get = async (name) => {
      const key = "tp_master_" + name;
      let cached = null;
      if (idb()) { const c = await idb().get(key); if (Array.isArray(c) && c.length) cached = c; }
      if (cached) return cached;
      try {
        const res = await fetch(MASTER_BASE + name);
        const j = await res.json();
        if (Array.isArray(j)) { if (idb()) idb().set(key, j); return j; }
      } catch (e) { /* ignore */ }
      return [];
    };
    const [m, n] = await Promise.all([get("model"), get("number")]);
    st.modelRows = m; st.numberRows = n;
  }

  function resolveIcon(modelName, numberName) {
    const num = cleanNum(numberName);
    if (st.numberRows && num) {
      const row = st.numberRows.find(r => r["車両形式"] === modelName && cleanNum(r["車番"]) === num);
      const own = row ? toDisplayableImageUrl(row["画像URL"]) : "";
      if (own) return own;
    }
    if (st.modelRows && modelName) {
      for (const r of st.modelRows) {
        if (r["車両形式"] !== modelName) continue;
        const u = toDisplayableImageUrl(r["画像URL"]);
        if (u) return u;
      }
    }
    return FALLBACK_TRAIN_IMAGE;
  }

  // 日付キー|駅|HH:MM → 乗車記録[]
  function indexRides(rides) {
    const map = new Map();
    (rides || []).forEach(r => {
      const raw = String(r["時刻"] || "").trim();
      const d = new Date(raw.replace(" ", "T"));
      if (isNaN(d)) return;
      const key = `${dateKey(d)}|${String(r["乗車駅"] || "").trim()}|${pad(d.getHours())}:${pad(d.getMinutes())}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    });
    return map;
  }

  // この列車に一致する乗車記録（路線・駅・発車時刻・行先）から、車両形式と編成番号を決める
  function findFormation(train, serviceDate, ridesIdx) {
    const tally = new Map();
    const bset = new Set(train.bounds);
    train.stops.forEach(s => {
      [s.a, s.d].forEach(sec => {
        if (sec == null) return;
        const dayOffset = Math.floor(sec / 86400);
        const dt = new Date(serviceDate.getFullYear(), serviceDate.getMonth(), serviceDate.getDate() + dayOffset);
        const hh = Math.floor((sec % 86400) / 3600), mm = Math.floor((sec % 3600) / 60);
        const list = ridesIdx.get(`${dateKey(dt)}|${s.s}|${pad(hh)}:${pad(mm)}`);
        if (!list) return;
        list.forEach(r => {
          const rb = splitSlash(r["行先"]);
          if (rb.length && bset.size && !rb.some(b => bset.has(b))) return;
          const model = splitSlash(r["車両形式"])[0] || "";
          const number = splitSlash(r["車番"])[0] || "";
          if (!model && !number) return;
          const k = model + "\u0001" + number;
          tally.set(k, (tally.get(k) || 0) + 1);
        });
      });
    });
    if (!tally.size) return null;
    const best = [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0].split("\u0001");
    return { model: best[0], number: best[1] };
  }

  // 自分の列車に記録が無くても、同じ運用（sheetKey）の他の列車に記録があれば、その編成を使う
  // （折り返すと列車番号は変わるが、編成は同じ運用のまま走り続けるため）
  function findFormationForSheet(train, serviceDate, ridesIdx, memo) {
    const own = findFormation(train, serviceDate, ridesIdx);
    if (own || !train.sheetKey) return own;
    const mk = train.sheetKey + "|" + dateKey(serviceDate);
    if (memo.has(mk)) return memo.get(mk);
    const tally = new Map();
    st.trains.forEach(t => {
      if (t.sheetKey !== train.sheetKey) return;
      const f = findFormation(t, serviceDate, ridesIdx);
      if (!f) return;
      const k = f.model + "\u0001" + f.number;
      tally.set(k, (tally.get(k) || 0) + 1);
    });
    let result = null;
    if (tally.size) {
      const best = [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0].split("\u0001");
      result = { model: best[0], number: best[1] };
    }
    memo.set(mk, result);
    return result;
  }

  // ダイヤ改正日より後の全ての乗車記録を、「区分（平日/土休日）＋発車時刻(HH:MM)」ごとに整理する。
  // 同じ 駅・時刻・行先 が複数日にあれば、一番新しい記録（＝最近の編成）を代表にする。
  // 乗車記録の取得（st.rides）か路線が変わった時だけ作り直す。
  function buildRideSlotIndex(ctx) {
    const sig = `${ctx.routeVal}|${ctx.revisionDate ? ctx.revisionDate.getTime() : ""}|${st.ridesFetchedAt}|${st.rides ? st.rides.length : 0}`;
    if (st.slotIdx && st.slotIdxSig === sig) return st.slotIdx;
    const idxOf = new Map();
    ctx.stationsOnRoute.forEach((n, i) => { if (!idxOf.has(n)) idxOf.set(n, i); });
    const rev = ctx.revisionDate && !isNaN(ctx.revisionDate) ? ctx.revisionDate : null;
    const best = new Map(); // 重複排除用：dtype|hm|station|bound → { d, ...記録 }
    (st.rides || []).forEach(r => {
      if (r["路線"] !== ctx.routeVal) return;
      if (ctx.company && r["会社"] && r["会社"] !== ctx.company) return;
      const station = String(r["乗車駅"] || "").trim();
      const row = idxOf.get(station);
      if (row == null) return;
      const d = new Date(String(r["時刻"] || "").trim().replace(" ", "T"));
      if (isNaN(d)) return;
      if (rev && d < rev) return; // ダイヤ改正日より前の記録は使わない
      const dtype = isHoliday(d) ? "holiday" : "weekday";
      const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
      const rb = splitSlash(r["行先"]);
      const key = [dtype, hm, station, rb[0] || ""].join("|");
      const prev = best.get(key);
      if (prev && prev.d >= d) return;
      best.set(key, {
        d, dtype, hm, station, row,
        bound: rb[0] || "", bounds: rb,
        type: splitSlash(r["種別"])[0] || "",
        model: splitSlash(r["車両形式"])[0] || "",
        number: splitSlash(r["車番"])[0] || ""
      });
    });
    const idx = new Map(); // dtype|hm → [記録]
    best.forEach(v => {
      const k = v.dtype + "|" + v.hm;
      if (!idx.has(k)) idx.set(k, []);
      idx.get(k).push(v);
    });
    st.slotIdx = idx; st.slotIdxSig = sig;
    return idx;
  }

  // ダイヤに無い乗車記録を「その分の間だけ乗車駅に居る列車」として返す
  function computeRideOnly(ctx, sec, date) {
    if (!st.rides) return [];
    const hol = isHoliday(date);
    const dtype = hol ? "holiday" : "weekday";
    const nowH = Math.floor(sec / 3600) % 24, nowM = Math.floor((sec % 3600) / 60);
    const hm = `${pad(nowH)}:${pad(nowM)}`; // 今の「分」の間だけ（HH:MM:00〜HH:MM:59）
    const cands = buildRideSlotIndex(ctx).get(dtype + "|" + hm);
    if (!cands || !cands.length) return [];

    // ダイヤの列車が、駅・時刻（HH:MM）・行先で持っている組み合わせ（記録がそれと一致したらダイヤ側で表示済み）
    const diaIdx = new Map();
    const hmKey = (station, t) => {
      const day = ((t % 86400) + 86400) % 86400;
      return `${station}|${pad(Math.floor(day / 3600))}:${pad(Math.floor((day % 3600) / 60))}`;
    };
    st.trains.forEach(tr => {
      if (tr.dayType !== "both" && tr.dayType !== dtype) return;
      tr.stops.forEach(sp => {
        [sp.a, sp.d].forEach(t => {
          if (t == null) return;
          const k = hmKey(sp.s, t);
          let set = diaIdx.get(k);
          if (!set) { set = new Set(); diaIdx.set(k, set); }
          if (!tr.bounds.length) set.add("*");
          tr.bounds.forEach(b => set.add(b));
        });
      });
    });

    const out = [];
    cands.forEach(c => {
      const dset = diaIdx.get(`${c.station}|${c.hm}`);
      if (dset && (dset.has("*") || !c.bounds.length || c.bounds.some(b => dset.has(b)))) return; // ダイヤの列車と同じ
      let sign = null;
      if (typeof window.ttResolveRideDirectionSign === "function" && c.bound) {
        try {
          sign = window.ttResolveRideDirectionSign(ctx.routeVal, window.ttRouteStationOrder(ctx.routeVal), window.ttRouteRawOrder(ctx.routeVal), c.station, c.bound);
        } catch (e) { sign = null; }
      }
      out.push({ row: c.row, sign: sign || 1, hm: c.hm, type: c.type, bound: c.bound, model: c.model, number: c.number });
    });
    return out;
  }

  /* ---------- 位置計算 ---------- */
  // t: 秒（サービス日の0時起点）。戻り値 { row0, row1, frac, sign, atStation }（rowは描画行の番号）
  // ===== この路線の図での「通る駅と時刻」を作る =====
  // 1) 時刻の書いていない行（通過）は、前後の時刻のある行の間で行の並びに応じて按分して推定する
  // 2) 時刻のある駅からこの路線の外の駅へ出る（または外から入る）時に、境界駅の行が無ければ、他路線と共通の駅を
  //    探して、「駅数の比」で境界駅を通る時刻を推定して差し込む（これで境界駅までと境界駅から先の位置が消えない）
  function routeInfo(ctx) {
    if (ctx._ri && ctx._riRoute === ctx.routeVal) return ctx._ri;
    const idxOf = new Map();
    ctx.stationsOnRoute.forEach((n, i) => { if (!idxOf.has(n)) idxOf.set(n, i); });
    const byRoute = new Map(); // 路線名 → 駅名の並び（via_を除く）
    (ctx.stationData || []).forEach(r => {
      const n = String(r["駅名"] || "");
      if (!n || n.startsWith("via_")) return;
      const k = r["路線"];
      if (!byRoute.has(k)) byRoute.set(k, []);
      byRoute.get(k).push(n);
    });
    const routesOf = new Map(); // 駅名 → その駅がある路線のSet
    byRoute.forEach((names, rt) => names.forEach(n => {
      if (!routesOf.has(n)) routesOf.set(n, new Set());
      routesOf.get(n).add(rt);
    }));
    ctx._ri = { idxOf, byRoute, routesOf }; ctx._riRoute = ctx.routeVal;
    return ctx._ri;
  }

  // other（この路線に無い駅）から見た、この路線との境界駅 { C, dOther(境界駅までの駅数 on T), T }
  function findJunction(ctx, other) {
    const { idxOf, byRoute, routesOf } = routeInfo(ctx);
    const rts = routesOf.get(other);
    if (!rts) return null;
    let best = null;
    rts.forEach(T => {
      if (T === ctx.routeVal) return;
      const names = byRoute.get(T) || [];
      const io = names.indexOf(other);
      if (io < 0) return;
      names.forEach((n, j) => {
        if (!idxOf.has(n)) return;
        const dist = Math.abs(j - io);
        if (!best || dist < best.dOther) best = { C: n, dOther: dist, T };
      });
    });
    return best;
  }

  function buildOnRoute(train, ctx) {
    if (train._onRoute === ctx.routeVal && train._on) return train._on;
    const { idxOf } = routeInfo(ctx);
    const seq = train.stops.map(sp => ({
      s: sp.s,
      a: sp.a != null ? sp.a : sp.d,
      d: sp.d != null ? sp.d : sp.a,
      pass: !!sp.pass
    }));
    // 1) 時刻の無い行を、前後の時刻から行の並びで按分
    const timed = [];
    seq.forEach((x, i) => { if (x.a != null) timed.push(i); });
    for (let k = 0; k + 1 < timed.length; k++) {
      const i0 = timed[k], i1 = timed[k + 1];
      for (let j = i0 + 1; j < i1; j++) {
        const f = (j - i0) / (i1 - i0);
        const t = seq[i0].d + (seq[i1].a - seq[i0].d) * f;
        seq[j].a = seq[j].d = t;
        seq[j].pass = true;
      }
    }
    const ent = seq.filter(x => x.a != null);

    // 2) 路線の出入り口（境界駅）を補う
    const out = [];
    for (let k = 0; k < ent.length; k++) {
      const P = ent[k], Q = ent[k + 1];
      out.push(P);
      if (!Q) break;
      const pOn = idxOf.has(P.s), qOn = idxOf.has(Q.s);
      if (pOn === qOn) continue;
      const names = ctx.stationsOnRoute;
      if (pOn && !qOn) {
        const j = findJunction(ctx, Q.s);
        if (j && j.C !== P.s) {
          const dR = Math.abs(idxOf.get(j.C) - idxOf.get(P.s));
          const dT = j.dOther;
          const f = (dR + dT) ? dR / (dR + dT) : 0.5;
          const t = P.d + (Q.a - P.d) * f;
          out.push({ s: j.C, a: t, d: t, pass: true });
        }
      } else {
        const j = findJunction(ctx, P.s);
        if (j && j.C !== Q.s) {
          const dR = Math.abs(idxOf.get(j.C) - idxOf.get(Q.s));
          const dT = j.dOther;
          const f = (dR + dT) ? dT / (dR + dT) : 0.5;
          const t = P.d + (Q.a - P.d) * f;
          out.push({ s: j.C, a: t, d: t, pass: true });
        }
      }
    }
    const on = out.filter(x => idxOf.has(x.s)).map(x => ({ i: idxOf.get(x.s), a: x.a, d: x.d, pass: x.pass }));
    train._on = on; train._onRoute = ctx.routeVal;
    return on;
  }

  function locate(train, t, ctx) {
    const N = ctx.stationsOnRoute.length;
    const on = buildOnRoute(train, ctx);
    // 並走路線の列車は、この路線の駅に2駅以上かかる場合だけ出す（乗換駅に停まるだけの列車は出さない）
    if (train.viaParallel && on.length < 2) return null;
    if (!on.length) return null;
    if (t < on[0].a || t > on[on.length - 1].d) return null;

    for (let k = 0; k < on.length; k++) {
      const cur = on[k];
      if (t >= cur.a && t <= cur.d) {
        const nx = on[k + 1], pv = on[k - 1];
        let sign = nx ? Math.sign(nx.i - cur.i) : (pv ? Math.sign(cur.i - pv.i) : 1);
        if (ctx.isLoop && nx && Math.abs(nx.i - cur.i) > N / 2) sign = -sign;
        return { row0: cur.i, row1: cur.i, frac: 0, sign: sign || 1, atStation: !cur.pass }; // 通過駅は停車扱いにしない
      }
      const nx = on[k + 1];
      if (nx && t > cur.d && t < nx.a) {
        let i = cur.i, j = nx.i;
        if (ctx.isLoop) {
          // 環状線：一周の最後の行（index N）を使って、0番駅を跨ぐ区間を描く
          if (i === N - 1 && j === 0) j = N;
          else if (i === 0 && j === N - 1) i = N;
        }
        const frac = (t - cur.d) / Math.max(1, nx.a - cur.d);
        return { row0: i, row1: j, frac, sign: Math.sign(j - i) || 1, atStation: false };
      }
    }
    return null;
  }

  function computeActive(ctx, nowSec, baseDate) {
    const out = [];
    const holidayNow = isHoliday(baseDate);
    const yesterday = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() - 1);
    const holidayYest = isHoliday(yesterday);
    // 今日のダイヤ（t=現在秒）と、昨日のダイヤの日跨ぎ分（t=現在秒+24h）の両方を見る
    [[baseDate, nowSec, holidayNow], [yesterday, nowSec + 86400, holidayYest]].forEach(([sd, t, hol]) => {
      st.trains.forEach(tr => {
        if (tr.dayType !== "both" && tr.dayType !== (hol ? "holiday" : "weekday")) return;
        const pos = locate(tr, t, ctx);
        if (pos) out.push({ train: tr, pos, serviceDate: sd });
      });
    });
    return out;
  }

  /* ---------- 列車の詳細（時刻表ページと同じ表示を開く） ---------- */
  function secToHm(sec) {
    if (sec == null) return { hm: "", sec: null };
    const day = ((sec % 86400) + 86400) % 86400;
    const h = Math.floor(day / 3600), m = Math.floor((day % 3600) / 60), s = day % 60;
    return { hm: `${h}:${pad(m)}`, sec: s ? s : null };
  }

  function openDetail(train) {
    if (typeof window.ttOpenTrainDetail !== "function") return;
    const stops = train.stops.map(s => {
      const a = secToHm(s.a), d = secToHm(s.d);
      return {
        station: s.s,
        time: a.hm,          // 列車詳細には「到着時刻」を載せる（時刻表ページと同じ）
        arr: a.hm, dep: d.hm,
        arrSec: a.sec, depSec: d.sec,
        type: s.type, bound: s.bound, pass: !!s.pass
      };
    });
    const first = train.stops.find(s => s.bound) || train.stops[0] || {};
    const bound = first.bound || "";
    window.ttOpenTrainDetail({
      unban: train.unban, trainNumber: train.trainNumber,
      type: first.type || "", bound, stops
    });
  }

  /* ---------- 描画 ---------- */
  // 運行日は3:00で切り替える（0:00〜2:59は前日の運行日の続き＝時刻に24時間足す）
  function currentNow() {
    const now = new Date();
    let sec = (st.live || st.manualSec == null) ? now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds() : st.manualSec;
    let date = now;
    if (sec < DAY_START) { date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1); sec += 86400; }
    return { date, sec };
  }

  function renderLayer() {
    const ctx = st.ctx;
    const box = document.getElementById("mapResult");
    if (!box) return;
    const scroll = box.querySelector(".route-line-scroll");
    const old = document.getElementById("tpLayer");
    if (old) old.remove();
    updateClock();
    if (!st.on || !ctx || !scroll || st.trainsRoute !== ctx.routeVal) return;

    const rows = [...scroll.querySelectorAll(".rt-row")];
    // 一度広げた高さは、リロードするまで路線ごとに維持する（縮めない＝スクロール位置が戻されない）
    st.rowH = st.rowH || {};
    const keptH = st.rowH[ctx.routeVal] || 0;
    rows.forEach(r => { r.style.minHeight = keptH ? keptH + "px" : ""; });
    const getCenters = () => rows.map(r => r.offsetTop + r.offsetHeight / 2);
    if (!rows.length) return;

    const { date, sec } = currentNow();
    const active = computeActive(ctx, sec, date);
    const ridesIdx = indexRides(st.rides);
    const rideOnlyList = computeRideOnly(ctx, sec, date);

    // 現在の行位置から、配置する列車一覧を作る
    const build = (centers) => {
      const placed = active.map(a => {
        const y0 = centers[a.pos.row0], y1 = centers[a.pos.row1];
        if (y0 == null || y1 == null) return null;
        return { kind: "dia", a, sign: a.pos.sign, y: y0 + (y1 - y0) * a.pos.frac };
      }).filter(Boolean);
      const rideOnly = rideOnlyList.map(r => {
        const y = centers[r.row];
        return y == null ? null : { kind: "ride", r, sign: r.sign, y };
      }).filter(Boolean);
      const all = placed.concat(rideOnly).sort((p, q) => p.y - q.y);
      return { placed, rideOnly, all };
    };
    // 同じ側で近い列車を横に積んだ時の最大段数(k)
    const maxStack = (all) => {
      const sl = { left: [], right: [] };
      let mk = 0;
      all.forEach(p => {
        const side = p.sign < 0 ? "left" : "right";
        let k = 0;
        while (sl[side].some(s => s.k === k && Math.abs(s.y - p.y) < 74)) k++;
        sl[side].push({ y: p.y, k });
        if (k > mk) mk = k;
      });
      return mk;
    };

    // 枠からはみ出す段数なら、全区間の行の高さを均等に広げる
    const W = scroll.clientWidth || 0;
    const capK = W ? Math.max(0, Math.floor((W / 2 - 18 - 64 - 4) / 66)) : 99;
    const kMax = Math.min(1, capK); // 横に並べるのは2本（2列）まで。3列目になる時は駅間を広げる
    let centers = getCenters();
    if (!centers.length) return;
    let built = build(centers);
    if (W && maxStack(built.all) > kMax) {
      let h = Math.max(46, keptH, ...rows.map(r => r.offsetHeight));
      for (let i = 0; i < 14; i++) {
        h = Math.ceil(h * 1.25);
        rows.forEach(r => { r.style.minHeight = h + "px"; });
        centers = getCenters();
        built = build(centers);
        if (maxStack(built.all) <= kMax) break;
      }
      st.rowH[ctx.routeVal] = h;
    }
    const { placed, rideOnly, all } = built;

    const layer = document.createElement("div");
    layer.id = "tpLayer";
    scroll.appendChild(layer);

    const fmMemo = new Map();
    const slots = { left: [], right: [] }; // 同じ側で近い列車を横にずらすための記録

    all.forEach(p => {
      const side = p.sign < 0 ? "left" : "right";
      let k = 0;
      while (slots[side].some(s => s.k === k && Math.abs(s.y - p.y) < 74)) k++;
      slots[side].push({ y: p.y, k });
      const off = 18 + 66 * k; // 線から離す距離。同じ側が混む時は外側へずらす
      const el = document.createElement("div");
      el.style.top = p.y + "px";
      // 上り（index減少）は線の左側、下り（index増加）は右側に置く
      if (side === "left") el.style.right = `calc(50% + ${off}px)`;
      else el.style.left = `calc(50% + ${off}px)`;

      if (p.kind === "ride") {
        // 乗車記録だけの列車：バッジは列車番号の代わりに発車時刻。ダイヤが無いのでタップしても何も起きない
        const r = p.r;
        const icon = (r.model || r.number) ? resolveIcon(r.model, r.number) : FALLBACK_TRAIN_IMAGE;
        el.className = "tp-train tp-ride tp-" + side;
        el.innerHTML = `
          <div class="tp-badge">${esc(r.hm)}</div>
          <div class="tp-icon"><img src="${esc(icon)}" alt="" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${FALLBACK_TRAIN_IMAGE}';"></div>
          <div class="tp-label">${esc(`${r.type}${r.bound}`)}</div>
          ${r.number ? `<div class="tp-num">${esc(cleanNum(r.number))}</div>` : ""}`;
        layer.appendChild(el);
        return;
      }

      const fm = findFormationForSheet(p.a.train, p.a.serviceDate, ridesIdx, fmMemo);
      const last = p.a.train.stops[p.a.train.stops.length - 1];
      const stopOnNow = p.a.train.stops.find(s => s.bound) || {};
      const type = stopOnNow.type || "";
      const bound = stopOnNow.bound || (last ? last.s : "");
      const label = `${type}${bound}`;
      const icon = fm ? resolveIcon(fm.model, fm.number) : FALLBACK_TRAIN_IMAGE;
      const badge = p.a.train.trainNumber || (p.a.train.unban ? "運" + p.a.train.unban : "");
      el.className = "tp-train tp-" + side + (p.a.pos.atStation ? " tp-stop" : "");
      el.innerHTML = `
        <div class="tp-badge">${esc(badge)}</div>
        <div class="tp-icon"><img src="${esc(icon)}" alt="" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${FALLBACK_TRAIN_IMAGE}';"></div>
        <div class="tp-label">${esc(label)}</div>
        ${fm && fm.number ? `<div class="tp-num">${esc(cleanNum(fm.number))}</div>` : ""}`;
      el.onclick = () => openDetail(p.a.train);
      layer.appendChild(el);
    });

    const status = document.getElementById("tpStatus");
    if (status && !st.loading) status.textContent = `運行中 ${placed.length}本` + (rideOnly.length ? `（乗車記録のみ ${rideOnly.length}本）` : "");
  }

  function updateClock() {
    const el = document.getElementById("tpClock");
    if (!el) return;
    const { sec } = currentNow();
    el.textContent = `${pad(Math.floor(sec / 3600) % 24)}:${pad(Math.floor((sec % 3600) / 60))}:${pad(sec % 60)}`;
  }

  /* ---------- 操作バー ---------- */
  function ensureBar() {
    const bar = document.getElementById("trainposBar");
    if (!bar || bar.dataset.ready) return;
    bar.dataset.ready = "1";
    bar.innerHTML = `
      <label class="tp-sw"><input type="checkbox" id="tpOn"> 🚆 列車位置を表示</label>
      <span class="tp-opts" id="tpOpts" style="display:none;">
        <label class="tp-sw"><input type="checkbox" id="tpNow" checked> 現在時刻</label>
        <input type="time" id="tpTime" step="60" disabled>
        <span class="tp-clock">🕐 <span id="tpClock">--:--:--</span></span>
      </span>
      <div id="tpStatus" class="small" style="color:#888;margin-top:4px;"></div>`;
    const on = document.getElementById("tpOn");
    on.checked = lsGet(LS_ON) === "1";
    st.on = on.checked;
    on.onchange = () => { st.on = on.checked; lsSet(LS_ON, st.on ? "1" : "0"); applyState(); };
    document.getElementById("tpNow").onchange = e => {
      st.live = e.target.checked;
      const ti = document.getElementById("tpTime");
      ti.disabled = st.live;
      if (!st.live) {
        const n = new Date();
        ti.value = `${pad(n.getHours())}:${pad(n.getMinutes())}`;
        st.manualSec = n.getHours() * 3600 + n.getMinutes() * 60;
      }
      renderLayer();
    };
    document.getElementById("tpTime").onchange = e => {
      const m = String(e.target.value || "").match(/^(\d{1,2}):(\d{2})$/);
      if (m) { st.manualSec = Number(m[1]) * 3600 + Number(m[2]) * 60; renderLayer(); }
    };
  }

  async function applyState() {
    const opts = document.getElementById("tpOpts");
    if (opts) opts.style.display = st.on ? "inline" : "none";
    if (st.timer) { clearInterval(st.timer); st.timer = null; }
    if (!st.on) {
      renderLayer();
      const s = document.getElementById("tpStatus"); if (s) s.textContent = "";
      return;
    }
    await ensureData();
    renderLayer();
    st.timer = setInterval(async () => {
      if (st.live) {
        if (Date.now() - st.ridesFetchedAt > RIDES_REFRESH_MS) { await loadRides(true); }
        renderLayer();
      } else { updateClock(); }
    }, TICK_MS);
  }

  function ensureData() {
    const ctx = st.ctx;
    if (!ctx || !st.on) return Promise.resolve();
    // 同じ路線の読み込みが走ってる間は、それを使い回す（二重に取りに行かない）
    if (st.pending && st.pending.route === ctx.routeVal) return st.pending.promise;
    const promise = ensureDataImpl().finally(() => { if (st.pending && st.pending.promise === promise) st.pending = null; });
    st.pending = { route: ctx.routeVal, promise };
    return promise;
  }

  async function ensureDataImpl() {
    const ctx = st.ctx;
    const status = document.getElementById("tpStatus");
    if (!ctx || !st.on) return;
    const seq = ++st.loadSeq;
    if (st.trainsRoute !== ctx.routeVal) {
      st.loading = true;
      st.trains = []; st.trainsRoute = "";
      if (status) status.textContent = "ダイヤを読み込み中…";
      // 乗車記録・祝日・車両マスタは、列車の読み込みと同時に取りに行く（順番待ちしない）
      const others = Promise.all([getHolidaySet(), loadRides(false), loadMasters()]);
      const trains = await loadRouteTrains(ctx, (d, n) => {
        if (seq === st.loadSeq && status) status.textContent = `ダイヤを読み込み中… ${d}/${n}`;
      });
      if (seq !== st.loadSeq) return; // 路線が切り替わっていたら捨てる
      st.trains = trains; st.trainsRoute = ctx.routeVal;
      if (status) status.textContent = "乗車記録を確認中…";
      await others;
      if (seq !== st.loadSeq) return;
      st.loading = false;
      return;
    }
    if (status) status.textContent = "乗車記録を確認中…";
    await Promise.all([getHolidaySet(), loadRides(false), loadMasters()]);
    if (seq !== st.loadSeq) return;
    st.loading = false;
  }

  /* ---------- 公開API ---------- */
  window.TrainPos = {
    // linemap.html の renderMap() の最後で呼ぶ
    onMapRendered(ctx) {
      ensureBar();
      const routeChanged = !st.ctx || st.ctx.routeVal !== ctx.routeVal;
      st.ctx = ctx;
      if (!st.on) { renderLayer(); return; }
      if (routeChanged || st.trainsRoute !== ctx.routeVal) {
        ensureData().then(renderLayer);
      } else {
        renderLayer();
      }
    },
    init() { ensureBar(); if (st.on) applyState(); }
  };
})();
