// diagram_static.js
// version: 1.0.2
// 1.0.2: 所要時間・失敗を画面の左下にも小さく出す（スマホ用。タップで消える）
// 1.0.1: 取得にかかった時間とサイズをコンソールに出す（[DiagramStatic]）
// 1.0.0: 新規作成。ダイヤ（ダイヤ一覧＋運番シート）を、Cloudflare Pages の静的JSONから読む共通部品。
//        無い／壊れてる／形がおかしい時は null を返すので、呼び出し側は従来どおりスプシ(opensheet)から取る。
//        window.DiagramStatic.routeList(会社, 路線) → ダイヤ一覧の行の配列 or null（取れたシートはメモリに保持）
//        window.DiagramStatic.sheet(ID, 運番)       → 運用シートの行（{列車番号,駅名,発車時刻,行先,種別}の配列）or null
(function () {
  "use strict";
  const BASE = "https://tuts4-data.pages.dev/";
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

  function getManifest() {
    if (manifestP && Date.now() - manifestAt < MANIFEST_MEMO_MS) return manifestP;
    manifestAt = Date.now();
    manifestP = getJson(BASE + "manifest.json?t=" + Date.now(), { cache: "no-cache" }).then(m => {
      if (!m || !Array.isArray(m.files)) throw new Error("bad manifest");
      return m;
    });
    manifestP.catch(() => { manifestP = null; });
    return manifestP;
  }

  async function loadRoute(entry) {
    const t0 = performance.now();
    const data = await getJson(BASE + entry.file + "?v=" + encodeURIComponent(entry.rev || ""));
    diagShow(`[DiagramStatic] ${entry.route} 取得 ${Math.round(performance.now() - t0)}ms`);
    if (!data || !Array.isArray(data.list) || !data.sheets || typeof data.sheets !== "object") throw new Error("bad shape");
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
    async routeList(company, route) {
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
      } catch (e) {
        diagShow("[DiagramStatic] manifest失敗→スプシ: " + (e && e.message));
        return null;
      }
    },
    sheet(id, unban) { return sheets.get(`${id || ""}_${unban || ""}`) || null; }
  };
})();
