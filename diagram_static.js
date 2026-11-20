// diagram_static.js
// version: 1.3.0
// 1.3.0: ①臨時ダイヤ（コミケ臨など）も路線ファイルから分離され「路線×ダイヤ名」で1JSONになるのに対応（索引の dia 付きの項目。形は路線ファイルと同じ list+sheets）。
//          索引が取れている時、路線ファイル内の同じ臨時ダイヤ名の行は使わない（新旧混在でも二重にならない）。取れない時は路線ファイルのまま。
//        ②JSON化されていない臨時（スプレッドシート「ダイヤ一覧」で 臨時=TRUE の行とそのタブ）も併せて読み、JSON側に無いものを足す。
//          スプシが読めなくてもJSONだけで通常どおり表示する。新しく tempsFor(会社, 路線, 日付) / keepRow(索引, 会社, 路線) を公開。
// 1.2.0: 臨時列車（各列車に日付を設定するもの）が路線ファイルから分離され、1列車1JSON（extras/*.json）＋索引（extras-index.json）になるのに対応。
//        getExtrasIndex() / extrasFor(会社, 路線, 日付の配列) を公開。routeList(会社, 路線, {date}) は、索引が取れている時だけ
//        「路線ファイルの臨時列車の行を除いて、その日に走る extras の行を足した」一覧を返す（索引が取れない時は従来どおり路線ファイルのまま＝落ちない）。
// 1.1.0: 取得先を複数持てるようにした。Cloudflare Worker（tuts4-gen）を先に試し、だめなら従来の tuts4-data.pages.dev に戻す。
//        新しく getManifest(force) / fetchRoute(entry) を公開（trainpos.js もここを使う＝読み込み処理を一本化）。
// 1.0.2: 所要時間・失敗を画面の左下にも小さく出す（スマホ用。タップで消える）
// 1.0.1: 取得にかかった時間とサイズをコンソールに出す（[DiagramStatic]）
// 1.0.0: 新規作成。ダイヤ（ダイヤ一覧＋運番シート）を、Cloudflare Pages の静的JSONから読む共通部品。
//        無い／壊れてる／形がおかしい時は null を返すので、呼び出し側は従来どおりスプシ(opensheet)から取る。
//        window.DiagramStatic.routeList(会社, 路線) → ダイヤ一覧の行の配列 or null（取れたシートはメモリに保持）
//        window.DiagramStatic.sheet(ID, 運番)       → 運用シートの行（{列車番号,駅名,発車時刻,行先,種別}の配列）or null
(function () {
  "use strict";
  // 先頭ほど優先。1つ目が落ちていても2つ目で読めるようにしてある
  const BASES = [
    "https://tuts4-gen.osakasubwaymetro.workers.dev/",
    "https://tuts4-data.pages.dev/"
  ];
  const TIMEOUT_MS = 15000;
  const MANIFEST_MEMO_MS = 60 * 1000;
  const COLS = ["列車番号", "駅名", "発車時刻", "行先", "種別"];

  const sheets = new Map();   // "ID_運番" → 行(オブジェクト)の配列
  const routes = new Map();   // "会社\t路線\trev" → Promise<list|null>
  let manifestP = null, manifestAt = 0;

  // 画面の左下に小さく出す（スマホはコンソールが見れないため）。タップで消える／20秒で自動で消える
  function diagShow(msg) {
    try {
      console.info(msg);
      let box = document.getElementById("diagLogBox");
      if (!box) {
        box = document.createElement("div");
        box.id = "diagLogBox";
        box.style.cssText = "position:fixed;left:6px;bottom:6px;z-index:99999;max-width:92vw;background:rgba(0,0,0,.78);color:#9f9;font:11px/1.4 monospace;padding:6px 8px;border-radius:8px;white-space:pre-wrap;word-break:break-all;";
        box.onclick = () => box.remove();
        (document.body || document.documentElement).appendChild(box);
      }
      const line = document.createElement("div");
      line.textContent = msg;
      box.appendChild(line);
      while (box.children.length > 8) box.removeChild(box.firstChild);
      clearTimeout(box._t);
      box._t = setTimeout(() => box.remove(), 20000);
    } catch (e) { /* ignore */ }
  }

  async function getJson(url, opt) {
    const ctl = typeof AbortController === "function" ? new AbortController() : null;
    const timer = ctl ? setTimeout(() => ctl.abort(), TIMEOUT_MS) : null;
    try {
      const res = await fetch(url, Object.assign({}, opt || {}, ctl ? { signal: ctl.signal } : {}));
      if (!res.ok) throw new Error("HTTP " + res.status);
      return await res.json();
    } finally { if (timer) clearTimeout(timer); }
  }

  // 取得先ごとのマニフェスト（1分だけ覚える）
  const manifestMemo = new Map(); // base → { p, at }
  function manifestOf(base, force) {
    const m = manifestMemo.get(base);
    if (m && !force && Date.now() - m.at < MANIFEST_MEMO_MS) return m.p;
    const p = getJson(base + "manifest.json?t=" + Date.now(), { cache: "no-cache" }).then(j => {
      if (!j || !Array.isArray(j.files)) throw new Error("bad manifest");
      j.files.forEach(f => { if (f && typeof f === "object") f._base = base; });
      return j;
    });
    manifestMemo.set(base, { p, at: Date.now() });
    p.catch(() => { const cur = manifestMemo.get(base); if (cur && cur.p === p) manifestMemo.delete(base); });
    return p;
  }

  // 取得先を順に試して、最初に読めたマニフェストを返す（全部だめなら例外）
  async function getManifest(force) {
    let last = null;
    for (const base of BASES) {
      try { return await manifestOf(base, force); }
      catch (e) { last = e; diagShow(`[DiagramStatic] manifest失敗(${hostOf(base)}): ${e && e.message}`); }
    }
    throw last || new Error("no manifest");
  }
  const hostOf = u => { try { return new URL(u).host; } catch (e) { return u; } };

  function checkShape(data) {
    if (!data || !Array.isArray(data.list) || !data.sheets || typeof data.sheets !== "object") throw new Error("bad shape");
  }

  // 1路線ぶんの生データ { list, sheets }。entry の取得先を先に、だめなら他の取得先の同じ路線を試す。全部だめなら例外
  async function fetchRoute(entry) {
    const t0 = performance.now();
    const order = [entry._base, ...BASES.filter(b => b !== entry._base)].filter(Boolean);
    let last = null;
    for (const base of order) {
      try {
        let e = entry;
        if (base !== entry._base) {
          const m = await manifestOf(base);
          e = m.files.find(f => f && f.file && f.route === entry.route && f.company === entry.company);
          if (!e) continue;
        }
        const data = await getJson(base + e.file + "?v=" + encodeURIComponent(e.rev || ""));
        checkShape(data);
        diagShow(`[DiagramStatic] ${entry.route} 取得 ${Math.round(performance.now() - t0)}ms (${hostOf(base)})`);
        return data;
      } catch (err) { last = err; diagShow(`[DiagramStatic] ${entry.route} 失敗(${hostOf(base)}): ${err && err.message}`); }
    }
    throw last || new Error("route not found");
  }

  /* ---------- 臨時列車（extras） ---------- */
  const isTrueV = v => ["true", "1", "はい", "有", "✓"].includes(String(v == null ? "" : v).trim().toLowerCase());
  // 臨時列車の行 = 臨時=TRUE で、臨時ダイヤ名が空（臨時ダイヤの行はそのまま路線ファイルに残る）
  const isLegacyTempRow = d => isTrueV(d && d["臨時"]) && !String((d && d["臨時ダイヤ名"]) || "").trim();
  const routesOfRow = r => String((r && r["路線"]) || "").split(",").map(x => x.trim()).filter(Boolean);
  const ymdStr = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  // 運行日（3:00で切り替わる）の前日・当日・翌日。日付をまたぐ列車・深夜の列車を取りこぼさないため
  function defaultDates(base) {
    const b = base || new Date(Date.now() - 3 * 3600 * 1000);
    const o = [];
    for (const k of [-1, 0, 1]) o.push(ymdStr(new Date(b.getFullYear(), b.getMonth(), b.getDate() + k)));
    return o;
  }

  const extrasMemo = new Map(); // base → { p, at }
  function extrasIndexOf(base, force) {
    const m = extrasMemo.get(base);
    if (m && !force && Date.now() - m.at < MANIFEST_MEMO_MS) return m.p;
    const p = getJson(base + "extras-index.json?t=" + Date.now(), { cache: "no-cache" }).then(j => {
      if (!j || !Array.isArray(j.trains)) throw new Error("bad extras-index");
      j.trains.forEach(t => { if (t && typeof t === "object") t._base = base; });
      return j;
    });
    extrasMemo.set(base, { p, at: Date.now() });
    return p;
  }
  // 臨時列車の索引。どの取得先でも取れなければ null（呼び出し側は臨時列車なしで続ける）
  async function getExtrasIndex(force) {
    for (const base of BASES) {
      try { return await extrasIndexOf(base, force); }
      catch (e) { diagShow(`[DiagramStatic] extras索引なし(${hostOf(base)}): ${e && e.message}`); }
    }
    return null;
  }

  const extraFileMemo = new Map(); // file?v=rev → Promise<{meta, rows}|null>
  function fetchExtraFile(entry) {
    const mk = entry.file + "?v=" + (entry.rev || "");
    if (!extraFileMemo.has(mk)) {
      const p = (async () => {
        const order = [entry._base, ...BASES.filter(b => b !== entry._base)].filter(Boolean);
        for (const base of order) {
          try {
            const data = await getJson(base + entry.file + "?v=" + encodeURIComponent(entry.rev || ""));
            if (!data || !Array.isArray(data.rows) || !Array.isArray(data.meta) || !data.meta.length) throw new Error("bad extras shape");
            return data;
          } catch (e) { diagShow(`[DiagramStatic] extras失敗(${hostOf(base)}) ${entry.key || entry.file}: ${e && e.message}`); }
        }
        return null;
      })().then(r => { if (!r) extraFileMemo.delete(mk); return r; });
      extraFileMemo.set(mk, p);
    }
    return extraFileMemo.get(mk);
  }

  // 会社・路線・日付(YYYY-MM-DD の配列)に該当する臨時列車 → [{ meta(登録行。曜日区分は索引のdatesで上書き), rows(オブジェクト行), entry }]。索引が無ければ null
  async function extrasFor(company, route, dates) {
    const idx = await getExtrasIndex();
    if (!idx) return null;
    // dates が "upcoming" の時は、昨日以降に1日でも運転日がある臨時列車を全部（時刻表のように日付を決めずに見る画面用）
    const since = defaultDates()[0];
    const want = dates === "upcoming" ? null : new Set(dates && dates.length ? dates : defaultDates());
    const hit = idx.trains.filter(t => t && t.file && Array.isArray(t.routes) && t.routes.includes(route)
      && (!company || !t.company || t.company === company) && !t.dia
      && Array.isArray(t.dates) && t.dates.some(d => want ? want.has(d) : d >= since));
    const got = new Array(hit.length).fill(null);
    let next = 0;
    const one = async i => {
      const t = hit[i];
      const data = await fetchExtraFile(t);
      if (!data) return;
      const m0 = data.meta.find(m => m && (!company || m["会社"] === company) && routesOfRow(m).includes(route)) || data.meta[0];
      const meta = Object.assign({}, m0, { "曜日区分": t.dates.join(","), "臨時": "TRUE" });
      const body = data.rows.filter((r, i) => Array.isArray(r) && !(i === 0 && String(r[0]) === "列車番号"));
      const rows = body.map(r => { const o = {}; COLS.forEach((c, i) => { o[c] = r[i] == null ? "" : r[i]; }); return o; });
      got[i] = { meta, rows, entry: t };
    };
    await Promise.all(Array.from({ length: Math.min(8, hit.length) }, async () => { while (next < hit.length) await one(next++); }));
    return got.filter(Boolean);
  }

  /* ---------- 臨時ダイヤ（路線×ダイヤ名の個別JSON。形は路線ファイルと同じ list + sheets に key/dia を足したもの） ---------- */
  const diaFileMemo = new Map();
  function fetchDiaFile(entry) {
    const mk = entry.file + "?v=" + (entry.rev || "");
    if (!diaFileMemo.has(mk)) {
      const p = (async () => {
        const order = [entry._base, ...BASES.filter(b => b !== entry._base)].filter(Boolean);
        for (const base of order) {
          try {
            const data = await getJson(base + entry.file + "?v=" + encodeURIComponent(entry.rev || ""));
            checkShape(data);
            return data;
          } catch (e) { diagShow(`[DiagramStatic] 臨時ダイヤ失敗(${hostOf(base)}) ${entry.key || entry.file}: ${e && e.message}`); }
        }
        return null;
      })().then(r => { if (!r) diaFileMemo.delete(mk); return r; });
      diaFileMemo.set(mk, p);
    }
    return diaFileMemo.get(mk);
  }
  const toObjRows = raw => (raw || []).filter((r, i) => Array.isArray(r) && !(i === 0 && String(r[0]) === "列車番号"))
    .map(r => { const o = {}; COLS.forEach((c, i) => { o[c] = r[i] == null ? "" : r[i]; }); return o; });
  const entryHitsDates = (t, want, since) => !Array.isArray(t.dates) || !t.dates.length || t.dates.some(d => want ? want.has(d) : d >= since);
  const entryCompanyOk = (t, company) => !company || !t.company || t.company === company;

  async function diasFor(company, route, dates) {
    const idx = await getExtrasIndex();
    if (!idx) return null;
    const since = defaultDates()[0];
    const want = dates === "upcoming" ? null : new Set(dates && dates.length ? dates : defaultDates());
    const hit = idx.trains.filter(t => t && t.file && t.dia && Array.isArray(t.routes) && t.routes.includes(route)
      && entryCompanyOk(t, company) && entryHitsDates(t, want, since));
    const out = [];
    await Promise.all(hit.map(async t => {
      const data = await fetchDiaFile(t);
      if (!data) return;
      for (const m of data.list) {
        if (!m || typeof m !== "object") continue;
        const k = `${m["ID"] || ""}_${m["運番"] || ""}`;
        if (!Array.isArray(data.sheets[k])) continue;
        const meta = Object.assign({}, m, { "臨時ダイヤ名": String(m["臨時ダイヤ名"] || "").trim() || t.dia });
        out.push({ meta, rows: toObjRows(data.sheets[k]), entry: t, from: "dia" });
      }
    }));
    return out;
  }

  // 路線ファイルの行のうち「別ファイルに分離済みなので使わない」ものを除く判定（索引が無ければ全部使う）
  //  ・臨時列車の行（臨時=TRUE で臨時ダイヤ名なし）: 索引が取れている間は extras が正
  //  ・臨時ダイヤの行: 索引に同じ路線×ダイヤ名の項目がある時だけ除く（まだ分離されていないダイヤは路線ファイルのまま）
  function keepRow(idx, company, route) {
    if (!idx) return () => true;
    const dias = new Set();
    idx.trains.forEach(t => { if (t && t.dia && Array.isArray(t.routes) && t.routes.includes(route) && entryCompanyOk(t, company)) dias.add(String(t.dia).trim()); });
    return d => {
      if (isLegacyTempRow(d)) return false;
      const n = String((d && d["臨時ダイヤ名"]) || "").trim();
      return !(n && dias.has(n));
    };
  }

  /* ---------- JSON化されていない臨時（スプレッドシート） ---------- */
  const SHEET_ID = "1JzY1wIGbj2Z83ItsMnMrz1xQ-cviEv50P0mOHiyi70A";
  const SHEET_LIST_KEY = "tuts4_diagram_list_cache";   // scripts.js / trainpos.js / timetable.js と同じ置き場（1分）
  const SHEET_LIST_TTL = 60 * 1000;
  const SHEET_TAB_TTL = 14 * 24 * 60 * 60 * 1000;
  function lsRead(key) {
    try { const p = JSON.parse(localStorage.getItem(key) || "null"); return (p && Array.isArray(p.data) && p.fetchedAt) ? p : null; } catch (e) { return null; }
  }
  function lsWrite(key, data) { try { localStorage.setItem(key, JSON.stringify({ data, fetchedAt: Date.now() })); } catch (e) { /* 容量超過は無視 */ } }
  async function fetchSheetRaw(name, ms) {
    const ctl = typeof AbortController === "function" ? new AbortController() : null;
    const timer = ctl ? setTimeout(() => ctl.abort(), ms) : null;
    try {
      const res = await fetch(`https://opensheet.elk.sh/${SHEET_ID}/${encodeURIComponent(name)}`, ctl ? { signal: ctl.signal } : undefined);
      const d = await res.json();
      if (!Array.isArray(d)) throw new Error("not array");
      return d;
    } finally { if (timer) clearTimeout(timer); }
  }
  let sheetListMemo = null;
  function getSheetList() {
    if (sheetListMemo && Date.now() - sheetListMemo.at < SHEET_LIST_TTL) return sheetListMemo.p;
    const p = (async () => {
      const c = lsRead(SHEET_LIST_KEY);
      if (c && Date.now() - c.fetchedAt < SHEET_LIST_TTL) return c.data;
      try { const d = await fetchSheetRaw("ダイヤ一覧", 5000); lsWrite(SHEET_LIST_KEY, d); return d; }
      catch (e) { diagShow("[DiagramStatic] スプシ読めず（JSONだけで続行）: " + (e && e.message)); return c ? c.data : null; }
    })();
    sheetListMemo = { p, at: Date.now() };
    return p;
  }
  const sheetTabMemo = new Map();
  function getSheetTab(name, lastUpdated) {
    const m = sheetTabMemo.get(name);
    if (m && Date.now() - m.at < 60 * 1000) return m.p;
    const p = (async () => {
      const key = "tuts4_diagram_sheet_" + name;
      const c = lsRead(key);
      let force = false;
      if (lastUpdated && c) { const u = new Date(lastUpdated); if (!isNaN(u) && u.getTime() > c.fetchedAt) force = true; }
      if (c && !force && Date.now() - c.fetchedAt < SHEET_TAB_TTL) return c.data;
      try { const d = await fetchSheetRaw(name, 8000); lsWrite(key, d); return d; }
      catch (e) { return c ? c.data : null; }
    })();
    sheetTabMemo.set(name, { p, at: Date.now() });
    return p;
  }
  const ISO_LIST = /^\d{4}-\d{1,2}-\d{1,2}(\s*,\s*\d{4}-\d{1,2}-\d{1,2})*$/;
  const isoNorm = x => { const m = x.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/); return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`; };
  // 日付だけの曜日区分（「2027-01-02,2027-01-03」）の臨時列車は、見ている日に当たらなければシートを取りに行かない。それ以外（臨時ダイヤ・期間指定など）は常に対象
  function sheetRowInWindow(d, want, since) {
    if (String(d["臨時ダイヤ名"] || "").trim()) return true;
    const s = String(d["曜日区分"] || "").trim();
    if (!ISO_LIST.test(s)) return true;
    return s.split(",").some(x => { const v = isoNorm(x); return want ? want.has(v) : v >= since; });
  }
  async function sheetTempsFor(company, route, dates, known) {
    const list = await getSheetList();
    if (!list) return [];
    const since = defaultDates()[0];
    const want = dates === "upcoming" ? null : new Set(dates && dates.length ? dates : defaultDates());
    const seen = new Set();
    const rows = list.filter(d => {
      if (!d || !isTrueV(d["臨時"]) || (company && d["会社"] !== company) || !routesOfRow(d).includes(route)) return false;
      const k = `${d["ID"] || ""}_${d["運番"] || ""}`;
      if (!d["ID"] || known.has(k) || seen.has(k)) return false;
      seen.add(k);
      return sheetRowInWindow(d, want, since);
    });
    const got = new Array(rows.length).fill(null);
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(8, rows.length) }, async () => {
      while (next < rows.length) {
        const i = next++;
        try {
          const tab = await getSheetTab(`${rows[i]["ID"]}_${rows[i]["運番"]}`, rows[i]["最終更新"]);
          if (tab && tab.length) got[i] = { meta: rows[i], rows: tab, from: "sheet" };
        } catch (e) { /* この1本は飛ばす */ }
      }
    }));
    return got.filter(Boolean);
  }

  const baseListMemo = new Map(); // "会社\t路線" → Promise<list|null>
  async function baseListOf(company, route) {
    try {
      const m = await getManifest();
      const entry = m.files.find(f => f && f.file && f.route === route && (!company || f.company === company));
      if (!entry) return null;
      const key = `${company}\t${route}\t${entry.rev || ""}`;
      if (!routes.has(key)) {
        const p = loadRoute(entry).catch(e => { diagShow("[DiagramStatic] 失敗→スプシ: " + route + " " + (e && e.message)); routes.delete(key); return null; });
        routes.set(key, p);
      }
      return await routes.get(key);
    } catch (e) { return null; }
  }

  // その路線・日付の臨時（臨時列車のextras＋臨時ダイヤ＋スプシにだけある臨時）。
  // → { idx: 索引（取れなければ null）, items: [{ meta, rows(オブジェクト行), from: "extras"|"dia"|"sheet" }] }。途中で何が失敗しても例外にせず、取れたぶんだけ返す
  async function tempsFor(company, route, dates, baseList) {
    const base = baseList || await baseListOf(company, route) || [];
    const known = new Set(base.map(d => `${d["ID"] || ""}_${d["運番"] || ""}`));
    let idx = null;
    try { idx = await getExtrasIndex(); } catch (e) { idx = null; }
    const items = [];
    if (idx) {
      idx.trains.forEach(t => { if (t && t.key) known.add(String(t.key)); });
      try { (await extrasFor(company, route, dates) || []).forEach(x => items.push({ meta: x.meta, rows: x.rows, from: "extras", entry: x.entry })); } catch (e) { diagShow("[DiagramStatic] extras失敗: " + (e && e.message)); }
      try { (await diasFor(company, route, dates) || []).forEach(x => items.push(x)); } catch (e) { diagShow("[DiagramStatic] 臨時ダイヤ失敗: " + (e && e.message)); }
      items.forEach(x => known.add(`${x.meta["ID"] || ""}_${x.meta["運番"] || ""}`));
      // 取得済みの extras ファイルの id/unban も既知にする（索引の key と ID_運番 が一致しない場合の保険）
    }
    let more = [];
    try { more = await sheetTempsFor(company, route, dates, known); } catch (e) { more = []; }
    return { idx, items: items.concat(more) };
  }

  async function loadRoute(entry) {
    const data = await fetchRoute(entry);
    const local = new Map();
    for (const d of data.list) {
      if (!d || typeof d !== "object") throw new Error("bad list row");
      const k = `${d["ID"] || ""}_${d["運番"] || ""}`;
      if (local.has(k)) continue;
      const raw = data.sheets[k];
      if (!Array.isArray(raw)) throw new Error("missing sheet " + k);
      local.set(k, raw.map(r => {
        if (!Array.isArray(r)) throw new Error("bad row " + k);
        const o = {};
        COLS.forEach((c, i) => { o[c] = r[i] == null ? "" : r[i]; });
        return o;
      }));
    }
    // 全部そろって初めて公開する（途中で壊れてたら何も入れない）
    local.forEach((v, k) => sheets.set(k, v));
    return data.list;
  }

  window.DiagramStatic = {
    // opts.date: Date（その日の前日・当日・翌日の臨時列車を足す。省略時は「いま」の運行日）／ opts.upcoming: true（昨日以降に運転日がある臨時列車を全部足す）
    async routeList(company, route, opts) {
      try {
        const m = await getManifest();
        const entry = m.files.find(f => f && f.file && f.route === route && (!company || f.company === company));
        if (!entry) return null;
        const base = await baseListOf(company, route);
        if (!base) return base;
        let t = null;
        try { t = await tempsFor(company, route, opts && opts.upcoming ? "upcoming" : defaultDates(opts && opts.date), base); } catch (e) { t = null; }
        if (!t) return base; // 何かあっても路線ファイルのまま（落とさない）
        t.items.forEach(x => { sheets.set(`${x.meta["ID"] || ""}_${x.meta["運番"] || ""}`, x.rows); });
        return base.filter(keepRow(t.idx, company, route)).concat(t.items.map(x => x.meta));
      } catch (e) {
        diagShow("[DiagramStatic] manifest失敗→スプシ: " + (e && e.message));
        return null;
      }
    },
    getManifest,
    fetchRoute,
    getExtrasIndex,
    extrasFor,
    tempsFor,
    keepRow,
    defaultDates,
    isLegacyTempRow,
    sheet(id, unban) { return sheets.get(`${id || ""}_${unban || ""}`) || null; }
  };
})();
