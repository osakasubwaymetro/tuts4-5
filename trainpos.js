// trainpos.js v1.1.0
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
    const c = readLsCache("tuts4_diagram_list_cache", 60 * 60 * 1000);
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
      const res = await fetch(`https://opensheet.elk.sh/${DIAGRAM_SHEET_ID}/${encodeURIComponent(name)}`);
      const data = await res.json();
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
  function compactSheet(rows, listRow) {
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
        const isTerminus = i === group.length - 1 && bounds.includes(String(r["駅名"] || "").trim());
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
        stops.push({ s: String(r["駅名"]).trim(), a, d, type: splitSlash(r["種別"])[0] || "", bound: bounds[0] || "" });
      });
      if (!stops.length) return;
      const bounds = new Set();
      group.forEach(r => splitSlash(r["行先"]).forEach(b => bounds.add(b)));
      out.push({
        unban: listRow["運番"] || "",
        trainNumber: group[0]["列車番号"] || "",
        dayType, isExtra: isTrue(listRow["臨時"]),
        bounds: [...bounds], stops
      });
    });
    return out;
  }

  async function loadRouteTrains(ctx, onProgress) {
    const cacheKey = "tp_trains_" + ctx.company + "_" + ctx.routeVal;
    if (idb()) {
      const c = await idb().get(cacheKey);
      if (c && Array.isArray(c.trains) && Date.now() - c.fetchedAt < TRAINS_TTL_MS) return c.trains;
    }
    const list = await getDiagramList();
    const rawMatches = list.filter(d =>
      (!ctx.company || d["会社"] === ctx.company) &&
      String(d["路線"] || "").split(",").map(s => s.trim()).includes(ctx.routeVal));
    const matches = filterLatestRevision(rawMatches);

    const trains = [];
    let done = 0, idx = 0;
    const worker = async () => {
      while (idx < matches.length) {
        const d = matches[idx++];
        try {
          const rows = await fetchSheet(d["ID"], d["運番"], d["最終更新"]);
          compactSheet(rows, d).forEach(t => trains.push(t));
        } catch (e) { /* この運番はスキップ */ }
        done++;
        if (onProgress) onProgress(done, matches.length);
      }
    };
    await Promise.all(Array.from({ length: Math.min(6, matches.length) }, worker));
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

  /* ---------- 位置計算 ---------- */
  // t: 秒（サービス日の0時起点）。戻り値 { row0, row1, frac, sign, atStation }（rowは描画行の番号）
  function locate(train, t, ctx) {
    const N = ctx.stationsOnRoute.length;
    const idxOf = new Map();
    ctx.stationsOnRoute.forEach((n, i) => { if (!idxOf.has(n)) idxOf.set(n, i); });
    const on = [];
    train.stops.forEach(s => {
      const i = idxOf.get(s.s);
      if (i == null) return;
      const a = s.a != null ? s.a : s.d, d = s.d != null ? s.d : s.a;
      if (a == null) return;
      on.push({ i, a, d });
    });
    if (!on.length) return null;
    if (t < on[0].a || t > on[on.length - 1].d) return null;

    for (let k = 0; k < on.length; k++) {
      const cur = on[k];
      if (t >= cur.a && t <= cur.d) {
        const nx = on[k + 1], pv = on[k - 1];
        let sign = nx ? Math.sign(nx.i - cur.i) : (pv ? Math.sign(cur.i - pv.i) : 1);
        if (ctx.isLoop && nx && Math.abs(nx.i - cur.i) > N / 2) sign = -sign;
        return { row0: cur.i, row1: cur.i, frac: 0, sign: sign || 1, atStation: true };
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
        type: s.type, bound: s.bound
      };
    });
    const first = train.stops.find(s => s.bound) || train.stops[0] || {};
    const bound = first.bound || "";
    // 運用シートに終点駅の行が無い場合は、行先から終点駅を補う（時刻表ページと同じ）
    if (bound && (!stops.length || stops[stops.length - 1].station !== bound)) {
      stops.push({ station: bound, time: "", arr: "", dep: "", arrSec: null, depSec: null, type: "", bound: "" });
    }
    window.ttOpenTrainDetail({
      unban: train.unban, trainNumber: train.trainNumber,
      type: first.type || "", bound, stops
    });
  }

  /* ---------- 描画 ---------- */
  function currentNow() {
    const now = new Date();
    if (st.live || st.manualSec == null) return { date: now, sec: now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds() };
    return { date: now, sec: st.manualSec };
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
    const centers = rows.map(r => r.offsetTop + r.offsetHeight / 2);
    if (!centers.length) return;

    const { date, sec } = currentNow();
    const active = computeActive(ctx, sec, date);
    const ridesIdx = indexRides(st.rides);

    const layer = document.createElement("div");
    layer.id = "tpLayer";
    scroll.appendChild(layer);

    const slots = { left: [], right: [] }; // 同じ側で近い列車を横にずらすための記録
    const placed = active.map(a => {
      const y0 = centers[a.pos.row0], y1 = centers[a.pos.row1];
      if (y0 == null || y1 == null) return null;
      return { a, y: y0 + (y1 - y0) * a.pos.frac };
    }).filter(Boolean).sort((p, q) => p.y - q.y);

    placed.forEach(p => {
      const side = p.a.pos.sign < 0 ? "left" : "right";
      let k = 0;
      while (slots[side].some(s => s.k === k && Math.abs(s.y - p.y) < 74)) k++;
      slots[side].push({ y: p.y, k });
      const fm = findFormation(p.a.train, p.a.serviceDate, ridesIdx);
      const last = p.a.train.stops[p.a.train.stops.length - 1];
      const stopOnNow = p.a.train.stops.find(s => s.bound) || {};
      const type = stopOnNow.type || "";
      const bound = stopOnNow.bound || (last ? last.s : "");
      const label = `${type}${bound}`;
      const icon = fm ? resolveIcon(fm.model, fm.number) : FALLBACK_TRAIN_IMAGE;
      const badge = p.a.train.trainNumber || (p.a.train.unban ? "運" + p.a.train.unban : "");
      const off = 18 + 66 * k; // 線から離す距離。同じ側が混む時は外側へずらす
      const el = document.createElement("div");
      el.className = "tp-train tp-" + side + (p.a.pos.atStation ? " tp-stop" : "");
      el.style.top = p.y + "px";
      // 上り（index減少）は線の左側、下り（index増加）は右側に置く
      if (side === "left") el.style.right = `calc(50% + ${off}px)`;
      else el.style.left = `calc(50% + ${off}px)`;
      el.innerHTML = `
        <div class="tp-badge">${esc(badge)}</div>
        <div class="tp-icon"><img src="${esc(icon)}" alt="" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${FALLBACK_TRAIN_IMAGE}';"></div>
        <div class="tp-label">${esc(label)}</div>
        ${fm && fm.number ? `<div class="tp-num">${esc(cleanNum(fm.number))}</div>` : ""}`;
      el.onclick = () => openDetail(p.a.train);
      layer.appendChild(el);
    });

    const status = document.getElementById("tpStatus");
    if (status && !st.loading) status.textContent = `運行中 ${placed.length}本`;
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
      const trains = await loadRouteTrains(ctx, (d, n) => {
        if (seq === st.loadSeq && status) status.textContent = `ダイヤを読み込み中… ${d}/${n}`;
      });
      if (seq !== st.loadSeq) return; // 路線が切り替わっていたら捨てる
      st.trains = trains; st.trainsRoute = ctx.routeVal; st.loading = false;
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
