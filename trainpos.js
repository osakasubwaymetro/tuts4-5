// trainpos.js v1.19.0
// 1.19.0: 現在時刻を指定する時に、時刻だけでなく日付も変えられるようにした（日時の入力欄）。指定した日の曜日・祝日でダイヤを選ぶ
// 1.18.0: 黒いラベル（列車番号・種別行先）の文字が見切れる時は、ラベルの中で文字を左右にスクロールして全部読めるようにした
// 1.17.2: 右側（下り＝画面の下へ進む列車）の併結・連結は、前の編成が下に来るよう縦の並びを逆にする（アイコン・種別行先・編成番号・列車番号。左側は前が上のまま）
// 1.17.1: ダイヤに無い乗車記録（乗車記録だけの列車）も、連結編成数ぶんのアイコンを縦に出す。乗車位置の編成だけに車両アイコン・編成番号を出し、ほかは汎用アイコン。記録に連結編成数が無い古い併結の記録は、行先の数を連結編成数とみなす
// 1.17.0: 乗車記録の「連結編成数」「乗車位置（前から何個目の編成）」に対応。連結編成数ぶんのアイコンを縦に出し、乗車位置の編成だけに車両アイコン・編成番号を反映する（それ以外は汎用アイコン／所定形式）。併結（ダイヤ上の複数列車）は前から並べた順。記録に乗車位置が無い古いものは、前から1個目として扱う
// 1.16.0: スタフの前の列車・次の列車（同じ運用）に飛べるよう、列車詳細に運用の列車一覧を渡す
// 1.15.2: 併結で列車番号・種別行先・編成番号が同じものは、1つにまとめて表示する（2020B+2020B → 2020B）。アイコンは1本ずつ出てタップで各列車の時刻表が開く
// 1.15.1: パターンを変えた時に、ダイヤ（キャッシュを使わず取り直し）と乗車記録を取得し直す
// 1.15.0: 現在時刻の枠に「パターン」のプルダウンを追加。自動（今日の曜日）／平日ダイヤ／土日祝ダイヤ を切り替えて表示できる（選んだパターンに当てはまる、いちばん近い日のダイヤで表示）
// 1.14.2: 一度広げた路線は、リロードするまで高さを一切変えない（以前は、まだ混んでいると広げ足していたので、列車が動くたびにサイズが変わってスクロールが戻されることがあった）
// 1.14.1: 列車番号が同じ列車が2本以上走っているときは、位置や時刻に関係なく必ず併結としてまとめる
// 1.14.0: 種別も行先も同じ列車でも、同じ位置・同じ時刻なら併結として1つにまとめる。併結のアイコンは1つずつ押せて、押した列車の時刻表（列車詳細）が出る
// 1.13.1: 他路線を通る区間の道のりを、via_（直通先の目印）が置いてある駅でだけ路線を乗り換える地図でたどるようにした（例: 湖西線の近江塩津の via_JR北陸本線 から北陸本線に移って敦賀へ）。同じ名前の駅に勝手に飛ばない。駅間の数の比で時刻を決める
// 1.13.0: 時刻が書いてない区間を他路線で走る列車（例: 京都→山科→敦賀のサンダーバード。近江塩津〜敦賀）の位置を、全路線の駅を隣同士でつないだ地図で一番短い道のりにたどり、途中のこの路線の駅を駅数の比で補って出す（今までは境界駅1つだけを推定していたので、間違った道で推定されたり出なかったりした）
// 1.12.2: 始発駅では併結の判定を発車時刻だけで行う（到着時刻は見ない）。在線表示の開始も発車の10分前から
// 1.12.1: 始発駅の在線表示の併結判定に、発車時刻も条件に追加（到着が同じで発車が1分違う列車も別々に表示）
// 1.12.0: 駅名の表記ゆれ（stationaliasシートの正式名称⇄通称、ひらがな・カタカナの違い）に対応。ダイヤの駅名が通称（例: なんば）でも、この路線の正式名称の駅（難波）の位置に出す
// 1.11.1: 併結のまとめ判定に、停車・発車・到着の時刻も条件に追加。始発駅の在線表示で、発車時刻が違う列車が併結にまとめられていたのを修正
// 1.11.0: 併結列車（同じ位置を同じ方向に進む、種別・行先が違う列車）を1つにまとめ、アイコンを縦に並べて表示。バッジは列車番号を「+」でつなぎ、種別行先は1本ずつ2行、編成番号は「G11+」「U1」のように2行
// 1.10.0: ダイヤ一覧の「曜日区分」の細かい指定（曜日／特定の日／期間／除外。dayrule.js）に対応。運行日（0:00〜2:59は前日）ごとに、その日に運転する列車だけ表示する
// 1.9.0: 列車の始発駅の発車（到着）10分前から、始発駅に在線表示する。同じ運用の前の列車がまだ走行中（全区間の時刻で判定）なら、在線表示は出さず前の列車を引き続き出す
// 1.8.2: 「所定形式」の複数画像は、列車ごとに順番ではなく、1秒ごとに 1,2,3,1,2,3… と切り替えて表示する
// 1.8.1: 「所定形式」に改行区切りでURLを複数入れると、その運用の列車に順番に 1,2,3,1,2,3… と割り当てて表示する
// 1.8.0: ダイヤ一覧の「所定形式」列に画像URLを入れると、その運用の編成が乗車記録で分かるまで、汎用アイコンの代わりにその画像を表示する。乗車記録があればそちらを優先（今まで通り）
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
  const WAIT_SEC = 10 * 60;                  // 始発駅の発車の何秒前から在線表示するか（10分）
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
    on: false, live: true, manualSec: null, pattern: "auto",
  };

  /* ---------- 小物 ---------- */
  // 駅名の比較用：駅を取り、カタカナ→ひらがな、小さい仮名→大きい仮名にそろえる
  function nameKey(n) {
    return String(n == null ? "" : n).trim().replace(/駅$/, "").replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60))
      .replace(/[ぁぃぅぇぉっゃゅょ]/g, c => ({ "ぁ": "あ", "ぃ": "い", "ぅ": "う", "ぇ": "え", "ぉ": "お", "っ": "つ", "ゃ": "や", "ゅ": "ゆ", "ょ": "よ" }[c])).replace(/\s/g, "");
  }
  // 路線の駅の並び → 「駅名（通称・表記ゆれ込み）→ 行番号」の引き当て
  function makeIdx(names) {
    const m = new Map();
    names.forEach((n, i) => {
      const k = nameKey(n);
      const grp = st.aliasMap && st.aliasMap.get(k);
      [k, ...(grp ? [...grp] : [])].forEach(x => { if (!m.has(x)) m.set(x, i); });
    });
    return { get: x => m.get(nameKey(x)), has: x => m.has(nameKey(x)) };
  }
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
    const dayType = dayRaw ? (dayRaw.includes("土") || dayRaw.includes("休") ? "holiday" : "weekday") : "both"; // dayrule.js が無い時の判定
    const groups = [];
    let cur = null, curNum = null;
    rows.forEach(r => {
      const num = r["列車番号"];
      if (cur && num === curNum) cur.push(r);
      else { cur = [r]; curNum = num; groups.push(cur); }
    });

    const out = [];
    // 「所定形式」は改行区切りで画像URLを複数書ける。1秒ごとに 1,2,3,1,2,3… と切り替えて表示する
    const icons = String(listRow["所定形式"] || "").split(/[\r\n]+/).map(x => toDisplayableImageUrl(x)).filter(Boolean);
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
        dayType, dayRaw, isExtra: isTrue(listRow["臨時"]),
        sheetKey: `${listRow["ID"] || ""}_${listRow["運番"] || ""}_${dayRaw || dayType}`, // 同じ運用（＝同じ編成が走り続ける）の目印
        bounds: [...bounds], stops,
        defaultIcons: icons, // 画像URLの一覧（複数なら1秒ごとに切り替え） // ダイヤ一覧の「所定形式」列の画像URL（編成の記録が無い時に使う）
        viaParallel: !!viaParallel // 並走路線のダイヤ一覧から取った列車（この路線のダイヤ一覧には無い）
      });
    });
    return out;
  }

  async function loadRouteTrains(ctx, onProgress, force) {
    const par = (ctx.parallelRoutes || []).filter(p => p.route && p.route !== ctx.routeVal);
    const cacheKey = "tp_trains8_" + ctx.company + "_" + ctx.routeVal + "+" + par.map(p => p.route).sort().join(",");
    if (force) { try { localStorage.removeItem("tuts4_diagram_list_cache"); } catch (e) { /* ignore */ } }
    if (idb() && !force) {
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
      if (!st.rides && !force) {
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
    if (st.modelRows && st.numberRows && st.aliasMap) return;
    const get = async (name) => {
      const key = "tp_master_" + name;
      let cached = null;
      if (idb() && name !== "stationalias") { const c = await idb().get(key); if (Array.isArray(c) && c.length) cached = c; } // 駅名の対応表は毎回取り直す（追加してすぐ反映）
      if (cached) return cached;
      try {
        const res = await fetch(MASTER_BASE + name);
        const j = await res.json();
        if (Array.isArray(j)) { if (idb()) idb().set(key, j); return j; }
      } catch (e) { /* ignore */ }
      return [];
    };
    const [m, n, al] = await Promise.all([get("model"), get("number"), get("stationalias")]);
    st.modelRows = m; st.numberRows = n;
    // 駅名の表記ゆれ（stationaliasシート：正式名称⇄通称。ひらがな・カタカナの違いも同じ駅として扱う）
    const am = new Map();
    (al || []).forEach(r => {
      const o = nameKey(r["正式名称"]), a = nameKey(r["通称"]);
      if (!o || !a) return;
      const grp = am.get(o) || am.get(a) || new Set([o]);
      grp.add(o); grp.add(a);
      grp.forEach(x => am.set(x, grp));
    });
    st.aliasMap = am;
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
          const cnt = parseInt(r["連結編成数"], 10) || 0, pos = parseInt(r["乗車位置"], 10) || 0;
          const k = model + "\u0001" + number + "\u0001" + pos + "\u0001" + cnt;
          tally.set(k, (tally.get(k) || 0) + 1);
        });
      });
    });
    if (!tally.size) return null;
    return fmFromKey([...tally.entries()].sort((a, b) => b[1] - a[1])[0][0]);
  }
  function fmFromKey(key) {
    const b = key.split("\u0001");
    return { model: b[0], number: b[1], pos: Number(b[2]) || 0, count: Number(b[3]) || 0 };
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
      const k = f.model + "\u0001" + f.number + "\u0001" + f.pos + "\u0001" + f.count;
      tally.set(k, (tally.get(k) || 0) + 1);
    });
    let result = null;
    if (tally.size) result = fmFromKey([...tally.entries()].sort((a, b) => b[1] - a[1])[0][0]);
    memo.set(mk, result);
    return result;
  }

  // ダイヤ改正日より後の全ての乗車記録を、「区分（平日/土休日）＋発車時刻(HH:MM)」ごとに整理する。
  // 同じ 駅・時刻・行先 が複数日にあれば、一番新しい記録（＝最近の編成）を代表にする。
  // 乗車記録の取得（st.rides）か路線が変わった時だけ作り直す。
  function buildRideSlotIndex(ctx) {
    const sig = `${ctx.routeVal}|${ctx.revisionDate ? ctx.revisionDate.getTime() : ""}|${st.ridesFetchedAt}|${st.rides ? st.rides.length : 0}`;
    if (st.slotIdx && st.slotIdxSig === sig) return st.slotIdx;
    const idxOf = makeIdx(ctx.stationsOnRoute);
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
        type: splitSlash(r["種別"])[0] || "", types: splitSlash(r["種別"]),
        model: splitSlash(r["車両形式"])[0] || "",
        number: splitSlash(r["車番"])[0] || "",
        count: parseInt(r["連結編成数"], 10) || 0, pos: parseInt(r["乗車位置"], 10) || 0
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
      if (!runsOn(tr, date, hol)) return;
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
      const n = Math.max(c.count || 0, c.bounds.length, 1);
      out.push({ row: c.row, sign: sign || 1, hm: c.hm, type: c.type, bound: c.bound, bounds: c.bounds, types: c.types, model: c.model, number: c.number, n, pos: Math.min(c.pos > 0 ? c.pos : 1, n) });
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
    const idxOf = makeIdx(ctx.stationsOnRoute);
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

  // 全路線の駅を「隣の駅同士」でつないだ地図。路線をまたぐのは、via_（直通先の目印）が置いてある駅だけ
  // （例: 湖西線の端の「近江塩津」に via_JR北陸本線 があれば、近江塩津で湖西線→北陸本線に乗り換えて進める）。
  // 同じ名前の駅だからといって、無関係な路線に勝手に飛ばないようにするため
  const canonKey = n => { const k = nameKey(n); const g = st.aliasMap && st.aliasMap.get(k); return g ? [...g].sort()[0] : k; };
  const nodeId = (r, n) => r + "\u0001" + canonKey(n);
  function stationGraph(ctx) {
    if (ctx._g && ctx._gRoute === ctx.routeVal) return ctx._g;
    const rowsBy = new Map(); // 路線 → 生の駅名の並び（via_込み）
    (ctx.stationData || []).forEach(r => {
      const n = String(r["駅名"] || "");
      if (!n) return;
      if (!rowsBy.has(r["路線"])) rowsBy.set(r["路線"], []);
      rowsBy.get(r["路線"]).push(n);
    });
    const adj = new Map(); // ノード → Map(隣ノード → 駅間の数(0 or 1))
    const link = (a, b, w) => {
      if (a === b) return;
      if (!adj.has(a)) adj.set(a, new Map()); if (!adj.has(b)) adj.set(b, new Map());
      if (!adj.get(a).has(b) || adj.get(a).get(b) > w) { adj.get(a).set(b, w); adj.get(b).set(a, w); }
    };
    const stationsOf = new Map(); // 路線 → 駅名キーのSet（via_を除く）
    rowsBy.forEach((rows, rt) => stationsOf.set(rt, new Set(rows.filter(n => !n.startsWith("via_")).map(canonKey))));
    const nodesOfStation = new Map(); // 駅名キー → ノード一覧
    rowsBy.forEach((rows, rt) => {
      const real = rows.filter(n => !n.startsWith("via_"));
      real.forEach(n => {
        const id = nodeId(rt, n), k = canonKey(n);
        if (!nodesOfStation.has(k)) nodesOfStation.set(k, []);
        nodesOfStation.get(k).push(id);
      });
      for (let i = 1; i < real.length; i++) link(nodeId(rt, real[i - 1]), nodeId(rt, real[i]), 1);
      // via_ の両隣の駅が、直通先の路線にもあれば、そこで乗り換えられる（駅間の数は増えない）
      rows.forEach((n, i) => {
        if (!n.startsWith("via_")) return;
        const target = n.slice(4);
        if (!stationsOf.has(target)) return;
        [rows.slice(0, i).reverse().find(x => !x.startsWith("via_")), rows.slice(i + 1).find(x => !x.startsWith("via_"))].forEach(nb => {
          if (nb && stationsOf.get(target).has(canonKey(nb))) link(nodeId(rt, nb), nodeId(target, nb), 0);
        });
      });
    });
    ctx._g = { adj, nodesOfStation, memo: new Map() }; ctx._gRoute = ctx.routeVal;
    return ctx._g;
  }
  // 2駅の間の一番短い道のり（駅間の数が最小）。[{r:路線, k:駅名キー, m:そこまでの駅間の数}] を返す。無ければ null
  function graphPath(ctx, from, to) {
    const g = stationGraph(ctx);
    const fk = canonKey(from), tk = canonKey(to), mk = fk + ">" + tk;
    if (g.memo.has(mk)) return g.memo.get(mk);
    let res = null;
    const starts = g.nodesOfStation.get(fk) || [], goals = new Set(g.nodesOfStation.get(tk) || []);
    if (starts.length && goals.size) {
      const dist = new Map(), prev = new Map();
      const dq = [];
      starts.forEach(n => { dist.set(n, 0); prev.set(n, null); dq.push(n); });
      // 0-1 BFS（乗り換えは0、駅間は1）
      let head = 0; const front = [];
      const pop = () => front.length ? front.pop() : dq[head++];
      while (front.length || head < dq.length) {
        const u = pop(), du = dist.get(u);
        for (const [v, w] of g.adj.get(u) || []) {
          const nd = du + w;
          if (!dist.has(v) || nd < dist.get(v)) { dist.set(v, nd); prev.set(v, u); if (w === 0) front.push(v); else dq.push(v); }
        }
      }
      let best = null;
      goals.forEach(n => { if (dist.has(n) && (best == null || dist.get(n) < dist.get(best))) best = n; });
      if (best != null) {
        res = [];
        for (let x = best; x != null; x = prev.get(x)) { const [r, k] = x.split("\u0001"); res.push({ r, k, m: dist.get(x) }); }
        res.reverse();
      }
    }
    g.memo.set(mk, res);
    return res;
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
      if (pOn && qOn) continue;
      // 2駅の間を、路線の駅を隣同士でつないだ地図で一番短い道のりでたどり、その途中のこの路線の駅を
      // 駅数の比で時刻を決めて差し込む（時刻の書いてない区間でも、他路線を通ってこの路線に入る列車の位置が出る）
      const gp = graphPath(ctx, P.s, Q.s);
      if (gp && gp[gp.length - 1].m > 0) {
        const H = gp[gp.length - 1].m;
        const seen = new Set();
        gp.forEach(nd => {
          if (nd.r !== ctx.routeVal || nd.m <= 0 || nd.m >= H || !idxOf.has(nd.k) || seen.has(nd.k)) return;
          seen.add(nd.k);
          const t = P.d + (Q.a - P.d) * nd.m / H;
          out.push({ s: nd.k, a: t, d: t, pass: true });
        });
        continue;
      }
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
    // 始発駅の発車（到着）の10分前から、始発駅に在線表示する（この路線に始発駅がある列車だけ）
    if (t < on[0].a) {
      const f0 = train.stops[0], idx0 = routeInfo(ctx).idxOf.get(f0.s);
      if (idx0 === on[0].i && (f0.a != null || f0.d != null) && t >= on[0].d - WAIT_SEC) {
        const nx = on[1];
        let sign = nx ? Math.sign(nx.i - on[0].i) : 1;
        if (ctx.isLoop && nx && Math.abs(nx.i - on[0].i) > N / 2) sign = -sign;
        return { row0: on[0].i, row1: on[0].i, frac: 0, sign: sign || 1, atStation: true, waiting: true, sig: `w${on[0].d}` }; // 始発駅は発車時刻だけで判定（発車が1秒でも違えば併結にしない）
      }
      return null;
    }
    if (t > on[on.length - 1].d) return null;
    // この路線の最初の駅が列車の始発駅なら、併結の判定は発車時刻だけで行う（到着時刻は見ない）
    const f1 = train.stops[0];
    const firstIsOrigin = (f1.a != null || f1.d != null) && routeInfo(ctx).idxOf.get(f1.s) === on[0].i;

    for (let k = 0; k < on.length; k++) {
      const cur = on[k];
      if (t >= cur.a && t <= cur.d) {
        const nx = on[k + 1], pv = on[k - 1];
        let sign = nx ? Math.sign(nx.i - cur.i) : (pv ? Math.sign(cur.i - pv.i) : 1);
        if (ctx.isLoop && nx && Math.abs(nx.i - cur.i) > N / 2) sign = -sign;
        return { row0: cur.i, row1: cur.i, frac: 0, sign: sign || 1, atStation: !cur.pass, sig: (k === 0 && firstIsOrigin) ? `s${cur.d}` : `s${cur.a}-${cur.d}` }; // 通過駅は停車扱いにしない
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
        return { row0: i, row1: j, frac, sign: Math.sign(j - i) || 1, atStation: false, sig: `r${cur.d}-${nx.a}` };
      }
    }
    return null;
  }

  // その運行日（sd）にこの列車が運転するか。曜日区分の細かい指定は dayrule.js、無い時は平日／土休日だけで判定
  function runsOn(tr, sd, hol) {
    if (window.DayRule && tr.dayRaw) return DayRule.matches(tr.dayRaw, sd, st.holidaySet || new Set());
    return tr.dayType === "both" || tr.dayType === (hol ? "holiday" : "weekday");
  }
  // 同じ運用（sheetKey）の他の列車が、全区間の時刻でいま走行中か
  function trainRange(tr) {
    if (tr._rng) return tr._rng;
    let lo = null, hi = null;
    tr.stops.forEach(sp => [sp.a, sp.d].forEach(v => { if (v == null) return; if (lo == null || v < lo) lo = v; if (hi == null || v > hi) hi = v; }));
    return (tr._rng = [lo, hi]);
  }
  function prevStillRunning(tr, t) {
    if (st._bkFor !== st.trains) {
      const m = new Map();
      st.trains.forEach(x => { if (!x.sheetKey) return; if (!m.has(x.sheetKey)) m.set(x.sheetKey, []); m.get(x.sheetKey).push(x); });
      st._bk = m; st._bkFor = st.trains;
    }
    const list = st._bk.get(tr.sheetKey);
    if (!list || list.length < 2) return false;
    const myLo = trainRange(tr)[0];
    return list.some(o => {
      if (o === tr) return false;
      const [lo, hi] = trainRange(o);
      return lo != null && lo < myLo && lo <= t && t <= hi;
    });
  }

  function computeActive(ctx, nowSec, baseDate) {
    const out = [];
    const holidayNow = isHoliday(baseDate);
    const yesterday = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() - 1);
    const holidayYest = isHoliday(yesterday);
    // 今日のダイヤ（t=現在秒）と、昨日のダイヤの日跨ぎ分（t=現在秒+24h）の両方を見る
    [[baseDate, nowSec, holidayNow], [yesterday, nowSec + 86400, holidayYest]].forEach(([sd, t, hol]) => {
      st.trains.forEach(tr => {
        if (!runsOn(tr, sd, hol)) return;
        const pos = locate(tr, t, ctx);
        if (!pos) return;
        // 在線表示は、同じ運用の前の列車がまだ走行中なら出さない（前の列車を引き続き出す）
        if (pos.waiting && prevStillRunning(tr, t)) return;
        out.push({ train: tr, pos, serviceDate: sd });
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

  function trainToEntry(train) {
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
    return { unban: train.unban, trainNumber: train.trainNumber, type: first.type || "", bound: first.bound || "", stops };
  }
  function openDetail(train) {
    if (typeof window.ttOpenTrainDetail !== "function") return;
    const entry = trainToEntry(train);
    // 同じ運用（シート）の列車を、シートの並び順で渡す（スタフで前・次の列車に飛ぶため）
    const list = train.sheetKey ? st.trains.filter(x => x.sheetKey === train.sheetKey) : [];
    const i = list.indexOf(train);
    if (list.length > 1 && i >= 0) {
      entry.seq = list.map(x => ({ trainNumber: x.trainNumber || "", unban: x.unban || "", build: () => trainToEntry(x) }));
      entry.seqIdx = i;
    }
    window.ttOpenTrainDetail(entry);
  }

  /* ---------- 描画 ---------- */
  // 運行日は3:00で切り替える（0:00〜2:59は前日の運行日の続き＝時刻に24時間足す）
  function currentNow() {
    const now = new Date();
    const manual = !st.live && st.manualSec != null;
    let sec = manual ? st.manualSec : now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    const base = manual && st.manualDate ? st.manualDate : now; // 指定した日（無ければ今日）
    let date = base;
    if (sec < DAY_START) { date = new Date(base.getFullYear(), base.getMonth(), base.getDate() - 1); sec += 86400; }
    // パターン指定（平日／土日祝）：その日がパターンに合わなければ、合ういちばん近い日で代用する
    if (st.pattern === "weekday" || st.pattern === "holiday") {
      const want = st.pattern === "holiday";
      if (isHoliday(date) !== want) {
        for (let i = 1; i <= 14; i++) {
          let hit = null;
          for (const sgn of [1, -1]) {
            const c = new Date(date.getFullYear(), date.getMonth(), date.getDate() + sgn * i);
            if (isHoliday(c) === want) { hit = c; break; }
          }
          if (hit) { date = hit; break; }
        }
      }
    }
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
    const fmMemo = new Map();
    const fmCache = new Map();
    const fmOf = a => {
      if (!fmCache.has(a)) fmCache.set(a, findFormationForSheet(a.train, a.serviceDate, ridesIdx, fmMemo));
      return fmCache.get(a);
    };
    // 1つの表示（単独または併結）の編成の並び：連結編成数ぶんの枠を前から並べ、記録の乗車位置の枠に車両を当てはめる
    const slotPlan = p => {
      const recs = [], seen = new Set();
      p.members.forEach(a => {
        const f = fmOf(a);
        if (!f) return;
        const k = f.model + "\u0001" + f.number + "\u0001" + f.pos + "\u0001" + f.count;
        if (seen.has(k)) return;
        seen.add(k); recs.push(f);
      });
      let n = p.members.length;
      recs.forEach(f => { if (f.count > n) n = f.count; });
      const assigned = new Array(n).fill(null);
      recs.forEach(f => {
        let s = (f.pos > 0 ? f.pos : 1) - 1;
        if (s >= n) s = n - 1;
        if (!assigned[s]) assigned[s] = f;
      });
      return { n, assigned };
    };

    // 現在の行位置から、配置する列車一覧を作る
    const build = (centers) => {
      const placedRaw = active.map(a => {
        const y0 = centers[a.pos.row0], y1 = centers[a.pos.row1];
        if (y0 == null || y1 == null) return null;
        return { kind: "dia", a, members: [a], sign: a.pos.sign, y: y0 + (y1 - y0) * a.pos.frac, h: 67 };
      }).filter(Boolean);
      // 併結：同じ位置（同じ区間・同じ進み具合）を同じ方向に進む、種別・行先が違う列車は1つにまとめて縦に並べて表示する
      const placed = [];
      const gm = new Map();
      placedRaw.forEach(p => {
        const ps = p.a.pos;
        const gk = [ps.row0, ps.row1, ps.frac.toFixed(4), ps.sign, ps.atStation ? 1 : 0, ps.sig].join("|"); // 時刻（発車・到着）も同じものだけ併結とみなす
        const g = gm.get(gk);
        if (g) { g.members.push(p.a); g.h = 67 + 55 * (g.members.length - 1); return; }
        gm.set(gk, p);
        placed.push(p);
      });
      // 列車番号が同じ列車は、位置・時刻が違っても必ず併結扱いにする（先に出てきた方の位置にまとめる）
      const byNum = new Map();
      for (let i = 0; i < placed.length; i++) {
        const el = placed[i];
        const nums = el.members.map(m => m.train.trainNumber).filter(Boolean);
        const hit = nums.map(n => byNum.get(n)).find(x => x && x !== el);
        if (hit) {
          hit.members.push(...el.members);
          hit.h = 67 + 55 * (hit.members.length - 1);
          placed.splice(i, 1); i--;
          hit.members.forEach(m => m.train.trainNumber && byNum.set(m.train.trainNumber, hit));
        } else {
          nums.forEach(n => byNum.set(n, el));
        }
      }
      placed.forEach(p => { p.h = 67 + 55 * (slotPlan(p).n - 1); });
      const rideOnly = rideOnlyList.map(r => {
        const y = centers[r.row];
        return y == null ? null : { kind: "ride", r, sign: r.sign, y, h: 67 + 55 * ((r.n || 1) - 1) };
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
        while (sl[side].some(s => s.k === k && Math.abs(s.y - p.y) < (s.h + p.h) / 2 + 7)) k++;
        sl[side].push({ y: p.y, k, h: p.h });
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
    if (W && !keptH && maxStack(built.all) > kMax) {
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

    const slots = { left: [], right: [] }; // 同じ側で近い列車を横にずらすための記録

    all.forEach(p => {
      const side = p.sign < 0 ? "left" : "right";
      let k = 0;
      while (slots[side].some(s => s.k === k && Math.abs(s.y - p.y) < (s.h + p.h) / 2 + 7)) k++;
      slots[side].push({ y: p.y, k, h: p.h });
      const off = 18 + 66 * k; // 線から離す距離。同じ側が混む時は外側へずらす
      const el = document.createElement("div");
      el.style.top = p.y + "px";
      // 上り（index減少）は線の左側、下り（index増加）は右側に置く
      if (side === "left") el.style.right = `calc(50% + ${off}px)`;
      else el.style.left = `calc(50% + ${off}px)`;

      if (p.kind === "ride") {
        // 乗車記録だけの列車：バッジは列車番号の代わりに発車時刻。ダイヤが無いのでタップしても何も起きない
        const r = p.r;
        const n = r.n || 1;
        const realIcon = (r.model || r.number) ? resolveIcon(r.model, r.number) : FALLBACK_TRAIN_IMAGE;
        // 連結編成数ぶんのアイコンを縦に並べ、乗車位置の編成だけに車両アイコンを出す（ほかは汎用アイコン）
        const icons = Array.from({ length: n }, (_, j) => j === r.pos - 1 ? realIcon : FALLBACK_TRAIN_IMAGE);
        const labList = r.bounds && r.bounds.length > 1
          ? r.bounds.map((b, i) => `${(r.types && (r.types[i] || r.types[0])) || ""}${b}`)
          : [`${r.type}${r.bound}`];
        if (side === "right") { icons.reverse(); labList.reverse(); } // 右側は先頭の編成が下
        const labs = [...new Set(labList)];
        el.className = "tp-train tp-ride tp-" + side + (n > 1 ? " tp-coupled" : "");
        el.innerHTML = `
          <div class="tp-badge">${esc(r.hm)}</div>
          ${icons.map(ic => `<div class="tp-icon"><img src="${esc(ic)}" alt="" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${FALLBACK_TRAIN_IMAGE}';"></div>`).join("")}
          ${labs.map(t => `<div class="tp-label">${esc(t)}</div>`).join("")}
          ${r.number ? `<div class="tp-num">${esc(cleanNum(r.number))}</div>` : ""}`;
        layer.appendChild(el);
        return;
      }

      // 1本（または併結の複数本）ぶんの表示を作る。アイコンは編成ごとに縦に並べ（連結編成数ぶん）、種別行先は列車ごとに1行ずつ、編成番号は「G11+」「U1」のように並べる
      const mviews = p.members.map(a => {
        const tb = typeBound(a);
        const defIcons = a.train.defaultIcons || [];
        const badge = a.train.trainNumber || (a.train.unban ? "運" + a.train.unban : "");
        return { badge, defIcons, label: `${tb.type}${tb.bound}` };
      });
      const plan = slotPlan(p);
      const nM = mviews.length;
      const views = [];
      for (let j = 0; j < plan.n; j++) {
        const mi = Math.min(j, nM - 1);
        const fm = plan.assigned[j];
        const defIcons = !fm ? mviews[mi].defIcons : [];
        const icon = fm ? resolveIcon(fm.model, fm.number) : (defIcons.length ? defIcons[iconIdx(defIcons.length)] : FALLBACK_TRAIN_IMAGE);
        views.push({ icon, defIcons, mi, num: fm && fm.number ? cleanNum(fm.number) : "" });
      }
      // 右側は画面の下へ進むので、先頭の編成が下に来るよう逆順にする
      if (side === "right") { views.reverse(); mviews.reverse(); }
      const multi = views.length > 1;
      const nums = [...new Set(views.map(v => v.num).filter(Boolean))];
      const labels = [...new Set(mviews.map(v => v.label))];
      const badges = [...new Set(mviews.map(v => v.badge).filter(Boolean))];
      el.className = "tp-train tp-" + side + (p.a.pos.atStation ? " tp-stop" : "") + (multi ? " tp-coupled" : "");
      el.innerHTML = `
        <div class="tp-badge">${esc(badges.join("+"))}</div>
        ${views.map(v => `<div class="tp-icon" data-mi="${v.mi}"><img src="${esc(v.icon)}" ${v.defIcons.length > 1 ? `data-icons="${esc(v.defIcons.join("\n"))}"` : ""} alt="" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${FALLBACK_TRAIN_IMAGE}';"></div>`).join("")}
        ${labels.map(t => `<div class="tp-label">${esc(t)}</div>`).join("")}
        ${nums.map((n, i) => `<div class="tp-num">${esc(n)}${i < nums.length - 1 ? "+" : ""}</div>`).join("")}`;
      el.onclick = () => openDetail(p.a.train);
      // 併結：アイコンを押すと、その列車の時刻表（列車詳細）を出す
      el.querySelectorAll(".tp-icon[data-mi]").forEach(ic => {
        ic.onclick = ev => { ev.stopPropagation(); const m = p.members[+ic.dataset.mi]; if (m) openDetail(m.train); };
      });
      layer.appendChild(el);
    });

    // 黒いラベル（列車番号・種別行先）の文字が見切れている時は、ラベルの中で文字を左右にスクロールする。
    // 1秒ごとに描き直すので、アニメの位置は現在時刻から決めて、描き直しても途切れず続くようにする
    layer.querySelectorAll(".tp-badge, .tp-label").forEach(lb => {
      const over = lb.scrollWidth - lb.clientWidth;
      if (over < 2) return;
      const span = document.createElement("span");
      span.textContent = lb.textContent;
      lb.textContent = "";
      lb.appendChild(span);
      const dur = Math.max(2, over / 18); // 片道の秒数（遅めで読める速さ）
      lb.classList.add("tp-scroll");
      span.style.setProperty("--d", (over + 2) + "px");
      span.style.setProperty("--t", dur + "s");
      span.style.setProperty("--dl", "-" + ((Date.now() / 1000) % (dur * 2)).toFixed(3) + "s");
    });

    const status = document.getElementById("tpStatus");
    if (status && !st.loading) status.textContent = `運行中 ${placed.reduce((n, p) => n + p.members.length, 0)}本` + (rideOnly.length ? `（乗車記録のみ ${rideOnly.length}本）` : "");
  }

  // この列車のいまの種別・行先（併結のまとめ判定と表示で共通）
  function typeBound(a) {
    const last = a.train.stops[a.train.stops.length - 1];
    const stopOnNow = a.train.stops.find(s => s.bound) || {};
    return { type: stopOnNow.type || "", bound: stopOnNow.bound || (last ? last.s : "") };
  }
  const tbKey = a => { const t = typeBound(a); return t.type + "|" + t.bound; };

  // 複数の所定形式画像は1秒ごとに切り替える
  const iconIdx = n => Math.floor(Date.now() / 1000) % n;
  function cycleIcons() {
    document.querySelectorAll("#tpLayer img[data-icons]").forEach(im => {
      const list = im.dataset.icons.split("\n").filter(Boolean);
      if (list.length < 2) return;
      const u = list[iconIdx(list.length)];
      if (im.getAttribute("src") !== u) { im.onerror = () => { im.onerror = null; im.src = FALLBACK_TRAIN_IMAGE; }; im.src = u; }
    });
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
        <input type="datetime-local" id="tpTime" step="60" disabled>
        <label class="tp-sw" style="margin-left:6px;">パターン</label>
        <select id="tpPattern">
          <option value="auto">自動（今日）</option>
          <option value="weekday">平日ダイヤ</option>
          <option value="holiday">土日祝ダイヤ</option>
        </select>
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
        ti.value = `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}T${pad(n.getHours())}:${pad(n.getMinutes())}`;
        st.manualSec = n.getHours() * 3600 + n.getMinutes() * 60;
        st.manualDate = new Date(n.getFullYear(), n.getMonth(), n.getDate());
      }
      renderLayer();
    };
    document.getElementById("tpPattern").onchange = e => {
      st.pattern = e.target.value;
      // パターンを変えたら、ダイヤと乗車記録を取り直す
      st.force = true; st.trains = []; st.trainsRoute = ""; st.pending = null;
      renderLayer();
      ensureData().then(renderLayer);
    };
    document.getElementById("tpTime").onchange = e => {
      const m = String(e.target.value || "").match(/^(\d{4})-(\d{2})-(\d{2})T(\d{1,2}):(\d{2})/);
      if (m) {
        st.manualDate = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
        st.manualSec = Number(m[4]) * 3600 + Number(m[5]) * 60;
        renderLayer();
      }
    };
  }

  async function applyState() {
    const opts = document.getElementById("tpOpts");
    if (opts) opts.style.display = st.on ? "inline" : "none";
    if (st.timer) { clearInterval(st.timer); st.timer = null; }
    if (st.iconTimer) { clearInterval(st.iconTimer); st.iconTimer = null; }
    if (!st.on) {
      renderLayer();
      const s = document.getElementById("tpStatus"); if (s) s.textContent = "";
      return;
    }
    await ensureData();
    renderLayer();
    st.iconTimer = setInterval(cycleIcons, 1000);
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
    const force = !!st.force; st.force = false;
    if (st.trainsRoute !== ctx.routeVal) {
      st.loading = true;
      st.trains = []; st.trainsRoute = "";
      if (status) status.textContent = "ダイヤを読み込み中…";
      // 乗車記録・祝日・車両マスタは、列車の読み込みと同時に取りに行く（順番待ちしない）
      const others = Promise.all([getHolidaySet(), loadRides(force), loadMasters()]);
      const trains = await loadRouteTrains(ctx, (d, n) => {
        if (seq === st.loadSeq && status) status.textContent = `ダイヤを読み込み中… ${d}/${n}`;
      }, force);
      if (seq !== st.loadSeq) return; // 路線が切り替わっていたら捨てる
      st.trains = trains; st.trainsRoute = ctx.routeVal;
      if (status) status.textContent = "乗車記録を確認中…";
      await others;
      if (seq !== st.loadSeq) return;
      st.loading = false;
      return;
    }
    if (status) status.textContent = "乗車記録を確認中…";
    await Promise.all([getHolidaySet(), loadRides(force), loadMasters()]);
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
