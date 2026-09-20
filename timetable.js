// timetable.js
// version: 1.2.0
// 1.2.0: 種別（普通／急行／快速急行など）が2種類以上ある路線・方向だけ、時刻の左に
//        小さく種別マークを表示するように対応（1種類しか無い路線では今まで通り非表示）。
//        一番多い種別を無印、それ以外を短縮マークにして凡例も表示する（行先マークと同じ方式）
// 1.1.0: 「ダイヤ」登録分だけだとデータが少なすぎるため、全ユーザーの乗車記録（実際に
//        記録された乗車時刻）もあわせて時刻表に混ぜるように対応。ダイヤと乗車記録で
//        同じ時刻（分単位）が重複した場合はダイヤ側を優先し、乗車記録側は捨てて重複表示
//        を防ぐ。乗車記録には未来の平日/土休日区分が無いので、実際の乗車日の曜日・祝日
//        （holidays-jp API、scripts.jsと同じキャッシュを利用）から都度判定する。
//        方向判定は、行先がその路線の駅マスタに無い（直通運転で他路線に抜ける）場合、
//        駅マスタ上のvia_エントリの実位置を使って簡易的に判定するようにした。
// 1.0.0: 新規追加。乗車記録用の駅・路線マスタと「ダイヤ」スプレッドシートを組み合わせて、
//        駅を選ぶ→その駅がある路線を選ぶ→方向を選ぶ、で時刻表（平日／土休日）を表示する。
//        方向は、各運用シート内で同じ列車番号の行を1本の列車の停車順とみなし、選んだ駅の
//        前後の停車駅が、その路線の駅マスタ上で「進む方向」の索引が増えるか減るかで判定。
//        環状線は route シートの「環状」「環状反転」に対応（内回り／外回りを判定）。
//        行先が複数ある場合は、一番多い行先を無印、それ以外は頭文字を小さくマークとして表示。

const TT_MASTER_BASE = "https://opensheet.elk.sh/1ZooIjdlOwsLZVjQv6KN53h4X2JYUyULYuJTuhbgk95s";
const TT_DIAGRAM_SHEET_ID = "1JzY1wIGbj2Z83ItsMnMrz1xQ-cviEv50P0mOHiyi70A";
// 全ユーザーの乗車記録を返すGAS（nav.jsで既に定義されているものと同じ。nav.jsが先に
// 読み込まれるので、ここで再宣言せずそのまま使う）
// -> NAV_RIDES_GAS_URL

let ttStationData = [];
let ttRouteData = [];

/* ---------- 共通データ取得（scripts.jsと同じキャッシュキー名を使い、既に他ページで
   取得済みならそれをそのまま使い回せるようにする） ---------- */
function ttFetchCachedMaster(cacheKey, url, handler) {
  const key = "tuts4_master_" + cacheKey;
  try {
    const cached = localStorage.getItem(key);
    if (cached) handler(JSON.parse(cached));
  } catch (e) { /* 壊れたキャッシュは無視 */ }

  fetch(url).then(r => r.json()).then(data => {
    if (!Array.isArray(data)) return;
    handler(data);
    try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { /* 容量超過等は無視 */ }
  }).catch(() => { /* 失敗時はキャッシュがあればそれを使い続ける */ });
}

/* ---------- ダイヤデータ（scripts.jsのDIAGRAM系と同じキャッシュ規約） ---------- */
const TT_DIAGRAM_CACHE_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const TT_DIAGRAM_LIST_CACHE_TTL_MS = 60 * 60 * 1000;

function ttReadDiagramCache(key, ttlMs) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "null");
    if (!parsed || !Array.isArray(parsed.data) || !parsed.fetchedAt) return null;
    if (Date.now() - parsed.fetchedAt > (ttlMs || TT_DIAGRAM_CACHE_TTL_MS)) return null;
    return parsed.data;
  } catch (e) { return null; }
}
function ttReadDiagramCacheMeta(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "null");
    return (parsed && parsed.fetchedAt) ? parsed : null;
  } catch (e) { return null; }
}
function ttWriteDiagramCache(key, data) {
  try { localStorage.setItem(key, JSON.stringify({ data, fetchedAt: Date.now() })); } catch (e) { /* ignore */ }
}
function ttReadStaleDiagramCache(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "null");
    return (parsed && Array.isArray(parsed.data)) ? parsed.data : null;
  } catch (e) { return null; }
}

async function ttGetDiagramList() {
  const CACHE_KEY = "tuts4_diagram_list_cache";
  const cached = ttReadDiagramCache(CACHE_KEY, TT_DIAGRAM_LIST_CACHE_TTL_MS);
  if (cached) return cached;

  const url = `https://opensheet.elk.sh/${TT_DIAGRAM_SHEET_ID}/${encodeURIComponent("ダイヤ一覧")}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (Array.isArray(data)) { ttWriteDiagramCache(CACHE_KEY, data); return data; }
  } catch (e) { /* ignore */ }
  const stale = ttReadStaleDiagramCache(CACHE_KEY);
  return stale || [];
}

async function ttFetchDiagramSheet(id, unban, listRowLastUpdated) {
  const sheetName = `${id}_${unban}`;
  const CACHE_KEY = "tuts4_diagram_sheet_" + sheetName;

  let forceRefresh = false;
  if (listRowLastUpdated) {
    const updatedAt = new Date(listRowLastUpdated);
    const cachedMeta = ttReadDiagramCacheMeta(CACHE_KEY);
    if (!isNaN(updatedAt) && cachedMeta && updatedAt.getTime() > cachedMeta.fetchedAt) forceRefresh = true;
  }
  if (!forceRefresh) {
    const cached = ttReadDiagramCache(CACHE_KEY, TT_DIAGRAM_CACHE_TTL_MS);
    if (cached) return cached;
  }

  const url = `https://opensheet.elk.sh/${TT_DIAGRAM_SHEET_ID}/${encodeURIComponent(sheetName)}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (Array.isArray(data)) { ttWriteDiagramCache(CACHE_KEY, data); return data; }
  } catch (e) { /* ignore */ }
  const stale = ttReadStaleDiagramCache(CACHE_KEY);
  return stale || [];
}

function ttDiagramRowMatchesRoute(row, routeVal) {
  return String(row["路線"] || "").split(",").map(s => s.trim()).includes(routeVal);
}

/* ---------- 平日／土日祝の判定（scripts.jsと同じキャッシュを共有） ---------- */
let _ttHolidaySetPromise = null;
async function ttGetHolidaySet() {
  if (_ttHolidaySetPromise) return _ttHolidaySetPromise;
  _ttHolidaySetPromise = (async () => {
    const CACHE_KEY = "tuts4_holidays_cache";
    const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.fetchedAt < ONE_WEEK) return new Set(parsed.dates);
      }
    } catch (e) { /* ignore */ }
    try {
      const res = await fetch("https://holidays-jp.github.io/api/v1/date.json");
      const data = await res.json();
      const dates = Object.keys(data);
      localStorage.setItem(CACHE_KEY, JSON.stringify({ fetchedAt: Date.now(), dates }));
      return new Set(dates);
    } catch (e) {
      return new Set();
    }
  })();
  return _ttHolidaySetPromise;
}
function ttDateKey(d) {
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
// true = 土日祝、false = 平日
function ttIsHolidayType(d, holidaySet) {
  const day = d.getDay();
  if (day === 0 || day === 6) return true;
  return holidaySet.has(ttDateKey(d));
}
function ttIsFlaggedExtra(v) {
  return ["true", "TRUE", "1", "はい", "有", "✓"].includes(String(v).trim());
}

/* ---------- 全ユーザーの乗車記録（実際に記録された分）を取得 ---------- */
async function ttGetAllRides() {
  const CACHE_KEY = "tuts4_tt_allrides_cache";
  const TTL = 60 * 60 * 1000; // 1時間
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    if (cached && Array.isArray(cached.data) && Date.now() - cached.fetchedAt < TTL) return cached.data;
  } catch (e) { /* ignore */ }

  try {
    const res = await fetch(NAV_RIDES_GAS_URL);
    const data = await res.json();
    if (Array.isArray(data)) {
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data, fetchedAt: Date.now() })); } catch (e) { /* ignore */ }
      return data;
    }
  } catch (e) { /* ignore */ }

  try {
    const stale = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    if (stale && Array.isArray(stale.data)) return stale.data;
  } catch (e) { /* ignore */ }
  return [];
}

/* ---------- 駅マスタ関連ヘルパー ---------- */
function ttIsViaEntry(name) {
  return typeof name === "string" && name.startsWith("via_");
}
function ttViaTargetRoute(name) {
  return name.slice(4).split("#")[0];
}
// via_を除かない、駅マスタ上の生の並び順（直通先の判定に使う）
function ttRouteRawOrder(routeVal) {
  return (ttStationData || []).filter(r => r["路線"] === routeVal).map(r => r["駅名"]);
}

function ttRouteRow(routeVal) {
  return (ttRouteData || []).find(r => r["路線"] === routeVal);
}
function ttIsCircular(routeVal) {
  const row = ttRouteRow(routeVal);
  if (!row) return false;
  const v = row["環状"];
  return v === true || v === 1 || ["true", "TRUE", "1", "はい", "有", "✓"].includes(String(v).trim());
}
function ttIsCircularReversed(routeVal) {
  const row = ttRouteRow(routeVal);
  if (!row) return false;
  const v = row["環状反転"];
  return v === true || v === 1 || ["true", "TRUE", "1", "はい", "有", "✓"].includes(String(v).trim());
}

// 駅マスタ上での、その路線の実駅（via_を除く）の並び順
function ttRouteStationOrder(routeVal) {
  return (ttStationData || [])
    .filter(r => r["路線"] === routeVal && !ttIsViaEntry(r["駅名"]))
    .map(r => r["駅名"]);
}

// 運用シートの行を「列車番号」が続く限り同じ列車の停車順とみなしてグループ化
function ttGroupByTrainNumber(rows) {
  const groups = [];
  let cur = null, curNum = null;
  rows.forEach(r => {
    const num = r["列車番号"];
    if (cur && num === curNum) { cur.push(r); }
    else { cur = [r]; curNum = num; groups.push(cur); }
  });
  return groups;
}

// fromName→toName の移動が、その路線の並び順で「index増加方向」か「減少方向」かを返す
// (1 / -1)。環状線は短い方の回り方を採用する
function ttDirectionSign(routeVal, orderList, fromName, toName) {
  const i = orderList.indexOf(fromName);
  const j = orderList.indexOf(toName);
  if (i === -1 || j === -1 || i === j) return null;
  if (!ttIsCircular(routeVal)) return j > i ? 1 : -1;
  const total = orderList.length;
  const fwd = (j - i + total) % total;
  const bwd = (i - j + total) % total;
  return fwd <= bwd ? 1 : -1;
}

// 乗車記録の「行先」から方向を判定する。行先がこの路線の駅マスタに無い場合
// （直通運転で他路線の駅が行先になっている場合）は、駅マスタ上のvia_エントリのうち、
// 直通先の路線にその行先駅がある最初のものを「乗り換え地点」とみなし、その生の並び順の
// 位置で簡易的に方向を判定する（環状線のラップアラウンドは考慮しない簡易版）
function ttResolveRideDirectionSign(routeVal, orderList, rawOrder, stationName, bound) {
  if (!bound) return null;
  const direct = ttDirectionSign(routeVal, orderList, stationName, bound);
  if (direct !== null) return direct;

  const curRawIdx = rawOrder.indexOf(stationName);
  if (curRawIdx === -1) return null;

  for (let i = 0; i < rawOrder.length; i++) {
    if (!ttIsViaEntry(rawOrder[i])) continue;
    const targetRoute = ttViaTargetRoute(rawOrder[i]);
    const targetOrder = ttRouteStationOrder(targetRoute);
    if (targetOrder.indexOf(bound) === -1) continue;
    if (i === curRawIdx) continue;
    return i > curRawIdx ? 1 : -1;
  }
  return null;
}

// 環状線用：indexが増える方向(sign=1)が外回りか内回りか
function ttCircularDirLabel(routeVal, sign) {
  const reversed = ttIsCircularReversed(routeVal);
  const goForward = sign === 1;
  const wantOuter = reversed ? !goForward : goForward;
  return wantOuter ? "外回り" : "内回り";
}

/* ---------- 選んだ駅・路線について、ダイヤ上のその駅の全出現行を、方向ごとに集める ---------- */
async function ttCollectStationEntries(stationName, routeVal) {
  const routeRow = ttRouteRow(routeVal);
  const companyVal = routeRow ? routeRow["会社"] : "";
  const orderList = ttRouteStationOrder(routeVal);

  const list = await ttGetDiagramList();
  const matches = list.filter(d => d["会社"] === companyVal && ttDiagramRowMatchesRoute(d, routeVal));

  // entries[sign] = [{ hour, minute, bound, dayType, isExtra, source }]
  const entries = { 1: [], "-1": [] };

  // ダイヤと乗車記録で同じ時刻（分単位）が重複したら、ダイヤ側を優先して片方だけ残す
  function pushEntry(sign, entry) {
    const dup = entries[sign].some(e =>
      e.hour === entry.hour && e.minute === entry.minute &&
      (e.dayType === "both" || entry.dayType === "both" || e.dayType === entry.dayType)
    );
    if (dup) return;
    entries[sign].push(entry);
  }

  for (const d of matches) {
    const rows = await ttFetchDiagramSheet(d["ID"], d["運番"], d["最終更新"]);
    const isExtra = ["true", "TRUE", "1", "はい", "有", "✓"].includes(String(d["臨時"] || "").trim());
    const dayTypeRaw = String(d["曜日区分"] || "").trim();
    const dayType = dayTypeRaw ? (dayTypeRaw.includes("土") || dayTypeRaw.includes("休") ? "holiday" : "weekday") : "both";

    const groups = ttGroupByTrainNumber(rows);
    groups.forEach(group => {
      group.forEach((row, idx) => {
        if (row["駅名"] !== stationName) return;
        const timeRaw = String(row["発車時刻"] || "").trim();
        const hm = timeRaw.match(/^(\d{1,2}):(\d{2})$/);
        if (!hm) return;

        let sign = null;
        if (idx + 1 < group.length) {
          sign = ttDirectionSign(routeVal, orderList, stationName, group[idx + 1]["駅名"]);
        }
        if (sign === null && idx - 1 >= 0) {
          const back = ttDirectionSign(routeVal, orderList, group[idx - 1]["駅名"], stationName);
          if (back !== null) sign = back;
        }
        if (sign === null) return; // どちら向きか判定できない場合は表に出さない

        const bounds = String(row["行先"] || "").split("/").map(s => s.trim()).filter(Boolean);
        const bound = bounds[0] || "";
        const types = String(row["種別"] || "").split("/").map(s => s.trim()).filter(Boolean);
        const type = types[0] || "";

        pushEntry(sign, { hour: Number(hm[1]), minute: Number(hm[2]), bound, type, dayType, isExtra, source: "diagram" });
      });
    });
  }

  // ここから乗車記録（全ユーザー分）も、ダイヤに無い時刻を補う形で混ぜる
  const rawOrder = ttRouteRawOrder(routeVal);
  const [allRides, holidaySet] = await Promise.all([ttGetAllRides(), ttGetHolidaySet()]);
  allRides.forEach(r => {
    if (r["路線"] !== routeVal || r["乗車駅"] !== stationName) return;
    if (companyVal && r["会社"] && r["会社"] !== companyVal) return;

    const timeRaw = String(r["時刻"] || "").trim();
    const d = new Date(timeRaw.replace(" ", "T"));
    if (isNaN(d)) return;

    const bound = String(r["行先"] || "").split("/")[0].trim();
    const sign = ttResolveRideDirectionSign(routeVal, orderList, rawOrder, stationName, bound);
    if (sign === null) return;

    const type = String(r["種別"] || "").split("/")[0].trim();
    const dayType = ttIsHolidayType(d, holidaySet) ? "holiday" : "weekday";
    const isExtra = ttIsFlaggedExtra(r["臨時"]);

    pushEntry(sign, { hour: d.getHours(), minute: d.getMinutes(), bound, type, dayType, isExtra, source: "ride" });
  });

  return entries;
}

/* ---------- マーク（行先の頭文字）割り当て ---------- */
function ttAssignMarks(entries) {
  const counts = {};
  entries.forEach(e => { if (e.bound) counts[e.bound] = (counts[e.bound] || 0) + 1; });
  const sorted = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  const marks = {};
  const used = new Set([""]);
  sorted.forEach((b, idx) => {
    if (idx === 0) { marks[b] = ""; return; }
    let n = 1, m = b.slice(0, n);
    while (used.has(m) && n < b.length) { n++; m = b.slice(0, n); }
    if (used.has(m)) m = b; // 最終手段：全部
    used.add(m);
    marks[b] = m;
  });
  return marks;
}

// 種別が2種類以上ある路線だけ、種別マークを表示する（1種類しか無ければ null を返し、非表示にする）
function ttAssignTypeMarks(entries) {
  const counts = {};
  entries.forEach(e => { if (e.type) counts[e.type] = (counts[e.type] || 0) + 1; });
  const keys = Object.keys(counts);
  if (keys.length <= 1) return null;

  const sorted = keys.sort((a, b) => counts[b] - counts[a]);
  const marks = {};
  const used = new Set([""]);
  sorted.forEach((t, idx) => {
    if (idx === 0) { marks[t] = ""; return; } // 一番多い種別（だいたい普通）は無印
    let n = 1, m = t.slice(0, n);
    while (used.has(m) && n < t.length) { n++; m = t.slice(0, n); }
    if (used.has(m)) m = t;
    used.add(m);
    marks[t] = m;
  });
  return marks;
}

/* ---------- 時刻表描画 ---------- */
function ttRenderDaytypeTable(entries, marks, typeMarks, cssClass, label) {
  if (!entries.length) {
    return `<div class="tt-daytype-header ${cssClass}">${label}</div><div class="empty-msg">この方向・区分のダイヤ登録がありません</div>`;
  }

  const byHour = {};
  entries.forEach(e => {
    if (!byHour[e.hour]) byHour[e.hour] = [];
    byHour[e.hour].push(e);
  });

  // 表示順：5,6,...,23,0,1,2,3,4（始発〜終電っぽい並びにする）
  const hourOrder = Object.keys(byHour).map(Number).sort((a, b) => {
    const na = a < 5 ? a + 24 : a;
    const nb = b < 5 ? b + 24 : b;
    return na - nb;
  });

  let rowsHTML = "";
  hourOrder.forEach(h => {
    const mins = byHour[h].slice().sort((a, b) => a.minute - b.minute);
    const minsHTML = mins.map(e => {
      const mark = e.bound ? (marks[e.bound] || "") : "";
      const cls = "tt-min" + (e.isExtra ? " extra" : "");
      const sup = mark ? `<sup>${mark}</sup>` : "";
      const typeMark = typeMarks && e.type ? (typeMarks[e.type] || "") : "";
      const typeTag = typeMark ? `<span class="tt-type-tag">${escapeHtmlTT(typeMark)}</span>` : "";
      return `<span class="${cls}">${typeTag}${String(e.minute).padStart(2, "0")}${sup}</span>`;
    }).join("");
    rowsHTML += `<tr><td class="tt-hour">${h}</td><td class="tt-minutes">${minsHTML}</td></tr>`;
  });

  const primaryBound = Object.keys(marks).find(b => !marks[b]);
  const legendItems = Object.entries(marks).filter(([, m]) => m);
  const legendParts = [];
  if (primaryBound) legendParts.push(`無印: ${escapeHtmlTT(primaryBound)}行き`);
  legendItems.forEach(([b, m]) => legendParts.push(`<span class="mark">${escapeHtmlTT(m)}</span>: ${escapeHtmlTT(b)}行き`));
  const legendHTML = legendParts.length ? `<div class="tt-legend">${legendParts.join("　")}</div>` : "";

  let typeLegendHTML = "";
  if (typeMarks) {
    const primaryType = Object.keys(typeMarks).find(t => !typeMarks[t]);
    const typeLegendItems = Object.entries(typeMarks).filter(([, m]) => m);
    const parts = [];
    if (primaryType) parts.push(`無印: ${escapeHtmlTT(primaryType)}`);
    typeLegendItems.forEach(([t, m]) => parts.push(`<span class="tt-type-tag">${escapeHtmlTT(m)}</span>: ${escapeHtmlTT(t)}`));
    if (parts.length) typeLegendHTML = `<div class="tt-legend">${parts.join("　")}</div>`;
  }

  return `<div class="tt-daytype-header ${cssClass}">${label}</div><table class="tt-table">${rowsHTML}</table>${typeLegendHTML}${legendHTML}`;
}

function escapeHtmlTT(s) {
  return String(s || "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

async function ttRenderTimetable(stationName, routeVal, sign) {
  const statusEl = document.getElementById("ttStatus");
  const resultEl = document.getElementById("ttResult");
  resultEl.innerHTML = "";
  statusEl.classList.remove("error");
  statusEl.textContent = "読み込み中...";

  try {
    const allEntries = await ttCollectStationEntries(stationName, routeVal);
    const entries = allEntries[sign] || [];

    if (!entries.length) {
      statusEl.textContent = "この駅・方向のダイヤ登録が見つかりませんでした。";
      return;
    }

    const marks = ttAssignMarks(entries);
    const typeMarks = ttAssignTypeMarks(entries);
    const weekday = entries.filter(e => e.dayType === "weekday" || e.dayType === "both");
    const holiday = entries.filter(e => e.dayType === "holiday" || e.dayType === "both");

    const dirLabel = ttIsCircular(routeVal)
      ? `${ttCircularDirLabel(routeVal, sign)}`
      : (() => {
          const order = ttRouteStationOrder(routeVal);
          const terminal = sign === 1 ? order[order.length - 1] : order[0];
          return `${terminal || ""}方面`;
        })();

    statusEl.textContent = "";
    resultEl.innerHTML = `
      <div class="tt-block">
        <div class="tt-block-title">${escapeHtmlTT(stationName)}（${escapeHtmlTT(routeVal)}）<span class="sub">${escapeHtmlTT(dirLabel)}</span></div>
        ${ttRenderDaytypeTable(weekday, marks, typeMarks, "weekday", "平日 Weekdays")}
        ${ttRenderDaytypeTable(holiday, marks, typeMarks, "holiday", "土曜・休日 Saturdays/Sundays/Holidays")}
      </div>
    `;
  } catch (e) {
    console.error(e);
    statusEl.classList.add("error");
    statusEl.textContent = "時刻表の取得に失敗しました。時間をおいて再度お試しください。";
  }
}

/* ---------- UIの初期化・連動 ---------- */
function ttPopulateStationList() {
  const names = [...new Set((ttStationData || []).filter(r => !ttIsViaEntry(r["駅名"])).map(r => r["駅名"]))];
  const list = document.getElementById("ttStationList");
  list.innerHTML = names.map(n => `<option value="${escapeHtmlTT(n)}"></option>`).join("");
}

function ttPopulateRouteSelect(stationName) {
  const routeSel = document.getElementById("ttRouteSelect");
  const routes = [...new Set(
    (ttStationData || [])
      .filter(r => r["駅名"] === stationName)
      .map(r => r["路線"])
  )].filter(Boolean);

  if (!routes.length) {
    routeSel.innerHTML = '<option value="">この駅名は見つかりませんでした</option>';
    routeSel.disabled = true;
    return;
  }
  routeSel.innerHTML = '<option value="">選択してください</option>' + routes.map(r => `<option value="${escapeHtmlTT(r)}">${escapeHtmlTT(r)}</option>`).join("");
  routeSel.disabled = false;
}

async function ttPopulateDirSelect(stationName, routeVal) {
  const dirSel = document.getElementById("ttDirSelect");
  dirSel.innerHTML = '<option value="">読み込み中...</option>';
  dirSel.disabled = true;
  document.getElementById("ttResult").innerHTML = "";
  document.getElementById("ttStatus").textContent = "";

  const allEntries = await ttCollectStationEntries(stationName, routeVal);
  const opts = [];
  [1, -1].forEach(sign => {
    if (!allEntries[sign] || !allEntries[sign].length) return;
    const label = ttIsCircular(routeVal)
      ? ttCircularDirLabel(routeVal, sign)
      : (() => {
          const order = ttRouteStationOrder(routeVal);
          const terminal = sign === 1 ? order[order.length - 1] : order[0];
          return `${terminal || ""}方面`;
        })();
    opts.push({ sign, label });
  });

  if (!opts.length) {
    dirSel.innerHTML = '<option value="">ダイヤ登録が見つかりませんでした</option>';
    dirSel.disabled = true;
    return;
  }

  dirSel.innerHTML = '<option value="">選択してください</option>' + opts.map(o => `<option value="${o.sign}">${escapeHtmlTT(o.label)}</option>`).join("");
  dirSel.disabled = false;
}

document.addEventListener("DOMContentLoaded", () => {
  ttFetchCachedMaster("station", `${TT_MASTER_BASE}/station`, data => {
    ttStationData = data;
    ttPopulateStationList();
  });
  ttFetchCachedMaster("route", `${TT_MASTER_BASE}/route`, data => {
    ttRouteData = data;
  });

  const stationInput = document.getElementById("ttStationInput");
  const routeSel = document.getElementById("ttRouteSelect");
  const dirSel = document.getElementById("ttDirSelect");

  stationInput.addEventListener("change", () => {
    const name = stationInput.value.trim();
    document.getElementById("ttResult").innerHTML = "";
    document.getElementById("ttStatus").textContent = "";
    dirSel.innerHTML = '<option value="">まず路線を選んでください</option>';
    dirSel.disabled = true;
    if (!name) {
      routeSel.innerHTML = '<option value="">まず駅名を選んでください</option>';
      routeSel.disabled = true;
      return;
    }
    ttPopulateRouteSelect(name);
  });

  routeSel.addEventListener("change", () => {
    const name = stationInput.value.trim();
    const routeVal = routeSel.value;
    document.getElementById("ttResult").innerHTML = "";
    document.getElementById("ttStatus").textContent = "";
    if (!routeVal) {
      dirSel.innerHTML = '<option value="">まず路線を選んでください</option>';
      dirSel.disabled = true;
      return;
    }
    ttPopulateDirSelect(name, routeVal);
  });

  dirSel.addEventListener("change", () => {
    const name = stationInput.value.trim();
    const routeVal = routeSel.value;
    const sign = dirSel.value;
    if (!name || !routeVal || !sign) return;
    ttRenderTimetable(name, routeVal, Number(sign));
  });
});
