// timetable.js
// version: 1.5.3
// 1.5.3: 直通運転で複数路線にまたがる運用（例：JR京都線, JR湖西線, JR北陸本線をまたぐ
//        サンダーバードを1行にまとめて登録した場合）で、京都線内の駅は時刻表に出るのに
//        湖西線・北陸本線内の駅だけ出てこない不具合を修正。原因は、各駅の方向判定が
//        「すぐ隣の停車駅」1つだけを見ていたため、隣の駅がちょうど他路線側（駅マスタに
//        無い駅）だった場合に判定不能になり、その駅がまるごと表から除外されていたこと。
//        隣1駅だけでなく、この路線の駅マスタ上に見つかる駅が出てくるまで列車の停車順を
//        前後にたどって方向判定するように変更した
// 1.5.2: ダイヤ改正前除外（ttFilterLatestRevision）が、路線全体で一番新しい適用開始日を
//        1つだけ選び、それ以外の運番を丸ごと除外してしまうバグを修正。同じ路線に運番の
//        違う複数の列車（特急・普通など）が別々の時期に登録されている場合、片方の適用
//        開始日が新しいだけでもう片方が巻き添えで消えてしまっていた（湖西線・北陸本線の
//        駅で時刻表に出てこない不具合の原因）。「ID＋運番」ごとに独立して最新版だけを
//        残す方式に変更した
// 1.5.1: 種別・行先はどの駅の行でも同じ値になりがちで冗長なので、各駅の行からは外して
//        タイトル下のサブタイトル（種別・行先）だけに戻した（表自体は駅名・発車時刻のみ）
// 1.5.0: 列車詳細モーダルに種別・行先の列を追加。また、終点駅（行先）が運用シート上で
//        発車時刻の入っていない行になっていて表示されないケースがあったため、停車駅の
//        絞り込みを「時刻がある行だけ」から「駅名がある行は全部」に変更し、それでも
//        終点駅の行が運用シートに無い場合は行先データから終点駅を末尾に補うようにした
// 1.4.1: 乗車記録側の「ダイヤ改正前を除外」を、新しく列を作る案ではなく、routeシートに
//        既にある「ダイヤ改正日」列（scripts.jsのloadAndShowHistoryPopupで使っているのと
//        同じ既存の仕組み）を使うように修正。新しい列の追加は不要になった
// 1.4.0: ①ダイヤ改正前の古いデータが混ざる問題に対応。ダイヤ一覧に「適用開始日」列を
//        追加運用する前提で、同じ会社・路線の中で今日時点で有効な一番新しい適用開始日の
//        運用登録だけを使うようにした（適用開始日が無い行は今まで通り常に使う＝後方互換）。
//        乗車記録側は、routeシートの「開始日」列より前の乗車記録（改正前に乗った分）を除外。
//        ②ダイヤから追加された時刻（乗車記録由来は対象外）だけ、クリックするとその列車の
//        運番・列車番号・各駅の発車時刻一覧をモーダルで表示できるようにした。
// 1.3.0: 路線を選んだ後の「方向」の選択肢を、ダイヤ・乗車記録を全部fetchして中身がある
//        方向だけ出す方式から、index.htmlの投稿フォーム（現在地からの方面選択）と同じ、
//        駅マスタの並び順だけを見て即座に組み立てる方式に変更。方向選択がすぐ出るようになった
//        （実際の時刻データの取得は、方向を選んでからttRenderTimetableで行う）
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

// ダイヤ一覧の「適用開始日」列を見て、ダイヤ改正前の古い運用登録を除外する。
// 同じ「ID＋運番」（＝同じ列車の登録）の中で、今日時点で有効（適用開始日 <= 今日）な
// 一番新しい適用開始日の行だけを残す。路線全体で1つの日付に絞るわけではないので、
// 同じ路線に運番の違う複数の列車（例: 特急と普通）がそれぞれ別の時期に登録されていても、
// お互いに巻き込まれて消えたりしない。適用開始日が無い行・未来日しか無い運番は
// 後方互換のため常に残す（今まで通りの挙動）
function ttFilterLatestRevision(matches) {
  const today = new Date();
  const groups = {}; // key: "ID_運番" -> 選ばれた行（今のところ一番新しい適用開始日）
  const passthrough = []; // 適用開始日が無い、または有効な日付が1つも無い行

  matches.forEach(d => {
    const key = `${d["ID"] || ""}_${d["運番"] || ""}`;
    const raw = String(d["適用開始日"] || "").trim();
    if (!raw) { passthrough.push(d); return; }

    const date = new Date(raw);
    if (isNaN(date) || date > today) return; // 不正な日付・まだ来ていない未来の改正は対象外

    if (!groups[key] || date > groups[key].date) groups[key] = { row: d, date };
  });

  return [...Object.values(groups).map(g => g.row), ...passthrough];
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
  const rawMatches = list.filter(d => d["会社"] === companyVal && ttDiagramRowMatchesRoute(d, routeVal));
  const matches = ttFilterLatestRevision(rawMatches);

  // entries[sign] = [{ hour, minute, bound, dayType, isExtra, source, unban, trainNumber, stops }]
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

        // 直通運転で複数路線にまたがる運用の場合、すぐ隣の停車駅がこの路線の駅マスタに
        // 無い（＝他路線の駅）ことがあるので、隣1駅だけでなく、この路線の駅マスタ上に
        // 見つかる駅が出てくるまで前後を辿って方向を判定する
        let sign = null;
        for (let j = idx + 1; j < group.length && sign === null; j++) {
          sign = ttDirectionSign(routeVal, orderList, stationName, group[j]["駅名"]);
        }
        if (sign === null) {
          for (let j = idx - 1; j >= 0 && sign === null; j--) {
            const back = ttDirectionSign(routeVal, orderList, group[j]["駅名"], stationName);
            if (back !== null) sign = back;
          }
        }
        if (sign === null) return; // どちら向きか判定できない場合は表に出さない

        const bounds = String(row["行先"] || "").split("/").map(s => s.trim()).filter(Boolean);
        const bound = bounds[0] || "";
        const types = String(row["種別"] || "").split("/").map(s => s.trim()).filter(Boolean);
        const type = types[0] || "";

        // クリックした時に各駅の発車時刻・種別・行先を出せるよう、この列車（同じ列車番号の
        // グループ）の停車駅を丸ごと持たせておく。終点駅は発車時刻が入っていないことが
        // 多いので、時刻の有無では絞り込まず駅名があれば全部残す
        const stops = group
          .filter(r2 => r2["駅名"])
          .map(r2 => ({
            station: r2["駅名"],
            time: String(r2["発車時刻"] || "").trim(),
            type: String(r2["種別"] || "").split("/").map(s => s.trim()).filter(Boolean)[0] || "",
            bound: String(r2["行先"] || "").split("/").map(s => s.trim()).filter(Boolean)[0] || ""
          }));
        // 運用シート自体に終点駅の行が無い場合（行先の駅が最後の停車駅として登録されて
        // いない）は、行先データから終点駅を補って末尾に足す
        if (bound && (!stops.length || stops[stops.length - 1].station !== bound)) {
          stops.push({ station: bound, time: "", type: "", bound: "" });
        }

        pushEntry(sign, {
          hour: Number(hm[1]), minute: Number(hm[2]), bound, type, dayType, isExtra, source: "diagram",
          unban: d["運番"] || "", trainNumber: row["列車番号"] || "", stops
        });
      });
    });
  }

  // ここから乗車記録（全ユーザー分）も、ダイヤに無い時刻を補う形で混ぜる。
  // scripts.js（loadAndShowHistoryPopup）と同じ「route シートの『ダイヤ改正日』より前の
  // 記録は除外する」既存の仕組みをそのまま使う（新規の列は追加しない）
  const rawOrder = ttRouteRawOrder(routeVal);
  const revisionRaw = routeRow ? routeRow["ダイヤ改正日"] : "";
  const revisionDate = revisionRaw ? new Date(revisionRaw) : null;
  const hasValidRevisionDate = revisionDate && !isNaN(revisionDate);
  const [allRides, holidaySet] = await Promise.all([ttGetAllRides(), ttGetHolidaySet()]);
  allRides.forEach(r => {
    if (r["路線"] !== routeVal || r["乗車駅"] !== stationName) return;
    if (companyVal && r["会社"] && r["会社"] !== companyVal) return;

    const timeRaw = String(r["時刻"] || "").trim();
    const d = new Date(timeRaw.replace(" ", "T"));
    if (isNaN(d)) return;
    if (hasValidRevisionDate && d < revisionDate) return; // ダイヤ改正日より前の記録は除外（scripts.jsと同じ判定）

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
      const sup = mark ? `<sup>${mark}</sup>` : "";
      const typeMark = typeMarks && e.type ? (typeMarks[e.type] || "") : "";
      const typeTag = typeMark ? `<span class="tt-type-tag">${escapeHtmlTT(typeMark)}</span>` : "";

      // ダイヤから追加されたものに限り、クリックで各駅の発車時刻・運番・列車番号を見れるようにする
      let cls = "tt-min" + (e.isExtra ? " extra" : "");
      let clickAttr = "";
      if (e.source === "diagram") {
        cls += " clickable";
        const idx = ttTrainDetailRegistry.push(e) - 1;
        clickAttr = ` data-tt-idx="${idx}" onclick="ttShowTrainDetail(${idx})"`;
      }
      return `<span class="${cls}"${clickAttr}>${typeTag}${String(e.minute).padStart(2, "0")}${sup}</span>`;
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

// ダイヤ由来のマスに割り振ったクリック用の番号→エントリの対応表（描画のたびにリセットする）
let ttTrainDetailRegistry = [];

function ttShowTrainDetail(idx) {
  const e = ttTrainDetailRegistry[idx];
  if (!e || !e.stops || !e.stops.length) return;

  const rowsHTML = e.stops.map(s =>
    `<tr><td>${escapeHtmlTT(s.station)}</td><td>${escapeHtmlTT(s.time)}</td></tr>`
  ).join("");

  const title = [e.unban ? `運番${escapeHtmlTT(e.unban)}` : "", e.trainNumber ? `列車番号${escapeHtmlTT(e.trainNumber)}` : ""]
    .filter(Boolean).join("　");
  const subtitle = [e.type, e.bound ? `${e.bound}行き` : ""].filter(Boolean).join("　");

  document.getElementById("ttTrainDetailTitle").innerHTML = (title || "列車詳細") + (subtitle ? `<span class="sub">${escapeHtmlTT(subtitle)}</span>` : "");
  document.getElementById("ttTrainDetailBody").innerHTML = `
    <table class="tt-detail-table">
      <tr><th>駅名</th><th>発車時刻</th></tr>
      ${rowsHTML}
    </table>
  `;
  document.getElementById("ttTrainDetailOverlay").classList.add("show");
}
function ttCloseTrainDetail() {
  document.getElementById("ttTrainDetailOverlay").classList.remove("show");
}

async function ttRenderTimetable(stationName, routeVal, sign) {
  const statusEl = document.getElementById("ttStatus");
  const resultEl = document.getElementById("ttResult");
  resultEl.innerHTML = "";
  statusEl.classList.remove("error");
  statusEl.textContent = "読み込み中...";
  ttTrainDetailRegistry = [];

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

// route シートの「環状方向限定」列（片方向のみ運行の環状線）。scripts.jsのgetCircularFixedDirectionと同じ
function ttGetCircularFixedDirection(routeVal) {
  const row = ttRouteRow(routeVal);
  if (!row) return null;
  const v = String(row["環状方向限定"] || "").trim();
  if (v.includes("外回り")) return "外回り";
  if (v.includes("内回り")) return "内回り";
  return null;
}

// index.htmlの投稿フォーム（startStationPopupFlow）と同じ考え方で、駅マスタのデータだけを
// 見て方向の選択肢を即座に組み立てる（ダイヤ・乗車記録のfetchを待たないので高速）
function ttComputeDirectionOptions(stationName, routeVal) {
  if (ttIsCircular(routeVal)) {
    const fixedDir = ttGetCircularFixedDirection(routeVal);
    if (fixedDir) {
      // 環状反転を考慮して、指定された方向に対応する実際のsignを求める
      const sign = ttCircularDirLabel(routeVal, 1) === fixedDir ? 1 : -1;
      return [{ sign, label: fixedDir }];
    }
    return [1, -1].map(sign => ({ sign, label: ttCircularDirLabel(routeVal, sign) }));
  }

  const order = ttRouteStationOrder(routeVal);
  const idx = order.indexOf(stationName);
  if (idx === -1 || order.length < 2) return [];

  const opts = [];
  if (idx < order.length - 1) opts.push({ sign: 1, label: `${order[order.length - 1]}方面` });
  if (idx > 0) opts.push({ sign: -1, label: `${order[0]}方面` });
  return opts;
}

function ttPopulateDirSelect(stationName, routeVal) {
  const dirSel = document.getElementById("ttDirSelect");
  document.getElementById("ttResult").innerHTML = "";
  document.getElementById("ttStatus").textContent = "";

  const opts = ttComputeDirectionOptions(stationName, routeVal);
  if (!opts.length) {
    dirSel.innerHTML = '<option value="">方向を判定できませんでした</option>';
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
