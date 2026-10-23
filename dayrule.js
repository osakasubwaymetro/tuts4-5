// dayrule.js v1.1.0
// 1.1.0: 「1/17,24,31 2/7,14」のように、月日のあとに日だけを並べて書けるようにした（空白・カンマで区切る）。「1/17~24」のように範囲の終わりの月を省略するのもOK
// ダイヤ一覧の「曜日区分」を細かく指定できるようにする共通の判定。
// 書き方（カンマ「,」「、」か改行で区切って、どれか1つ当てはまれば運転）:
//   空欄                 毎日
//   平日 / 土休日        平日ダイヤ／土日祝ダイヤ（今まで通り。土休日・土日祝・休日・土日 も同じ）
//   毎日                 毎日
//   金 / 月水金 / 金曜    その曜日だけ（祝日でもその曜日なら運転）
//   祝                   祝日だけ
//   10/25 / 2026-10-25   その日だけ（年なしは毎年）。10月25日 / 2026年10月25日 でも可
//   1/17,24,31 2/7,14    1/17・1/24・1/31・2/7・2/14（月日のあとの数字だけは同じ月）
//   10/25~11/3           その期間だけ（両端を含む。年なしは年またぎもOK。〜 ～ も可）
//   !で始める            除外。例: 平日,!11/3 ＝平日だけど11/3は運休   金,!祝 ＝祝日の金曜は運休
// 除外だけ書いた場合は「毎日から除外」の意味になる。読めない書き方は当てはまらない扱い。
// 日付の判定は運行日（0:00〜2:59は前日）で行う想定。呼ぶ側で serviceDate() を使う。
(function () {
  "use strict";
  const DOW = "日月火水木金土";
  const HOLIDAY_WORDS = new Set(["土休日", "土日祝", "土日休", "休日", "土日", "日祝", "土休", "土曜休日"]);
  const ALL_WORDS = new Set(["毎日", "全日", "終日", "両方", "both"]);
  const parsedCache = new Map();

  const pad = n => String(n).padStart(2, "0");
  const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  function isHolidayType(d, holidaySet) {
    const w = d.getDay();
    return w === 0 || w === 6 || !!(holidaySet && holidaySet.has(dateKey(d)));
  }
  function serviceDate(now) {
    const n = now || new Date();
    return n.getHours() < 3 ? new Date(n.getFullYear(), n.getMonth(), n.getDate() - 1) : new Date(n.getFullYear(), n.getMonth(), n.getDate());
  }

  function normalize(s) {
    return String(s == null ? "" : s)
      .replace(/[！]/g, "!").replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 65248))
      .replace(/[～〜]/g, "~").replace(/[／]/g, "/").replace(/[－‐―]/g, "-")
      .replace(/(\d{4})年/g, "$1/").replace(/(\d{1,2})月(\d{1,2})日?/g, "$1/$2")
      .replace(/\s*~\s*/g, "~").replace(/[ \t　]+/g, ","); // 空白は区切り扱い（「1/17,24 2/7」のように書ける）
  }
  function parseDate(s) {
    const m = String(s).match(/^(?:(\d{4})[-\/])?(\d{1,2})[-\/](\d{1,2})$/);
    return m ? { y: m[1] ? Number(m[1]) : null, m: Number(m[2]), d: Number(m[3]) } : null;
  }
  function parseToken(raw) {
    let t = raw, neg = false;
    if (t.startsWith("!")) { neg = true; t = t.slice(1); }
    if (!t) return null;
    if (t.includes("~")) {
      const [a, b0] = t.split("~");
      const s = parseDate(a);
      const b = s && /^\d{1,2}$/.test(b0) ? `${s.m}/${b0}` : b0; // 「1/17~24」のように終わりの月を省略できる
      const e = parseDate(b);
      if (s && e) return { neg, kind: "range", s, e };
      return { neg, kind: "bad" };
    }
    const dt = parseDate(t);
    if (dt) return { neg, kind: "date", d: dt };
    if (t === "平日" || t === "平") return { neg, kind: "weekday" };
    if (ALL_WORDS.has(t)) return { neg, kind: "all" };
    if (t === "祝" || t === "祝日") return { neg, kind: "pubhol" };
    if (HOLIDAY_WORDS.has(t)) return { neg, kind: "holiday" };
    const dm = t.replace(/曜日?/g, "");
    if (dm && [...dm].every(c => DOW.includes(c))) return { neg, kind: "dow", set: new Set([...dm].map(c => DOW.indexOf(c))) };
    if (/土|休/.test(t)) return { neg, kind: "holiday" }; // 今までの判定（土・休を含む＝休日ダイヤ）との互換
    return { neg, kind: "bad" };
  }
  function parseRule(rule) {
    const key = String(rule == null ? "" : rule);
    if (parsedCache.has(key)) return parsedCache.get(key);
    // 「1/17,24,31 2/7,14」のように、月日のあとに日だけ並べたら、直前の月日と同じ月（年）として読む
    let ctxY = null, ctxM = null;
    const raws = normalize(key).split(/[,、，;；\n\r]+/).map(x => x.trim()).filter(Boolean).map(x => {
      const m = x.match(/^(!?)(\d{1,2})$/);
      if (m && ctxM != null) return `${m[1]}${ctxY != null ? ctxY + "/" : ""}${ctxM}/${m[2]}`;
      const d = parseDate(x.replace(/^!/, "").split("~").pop());
      if (d) { ctxY = d.y; ctxM = d.m; }
      return x;
    });
    const toks = raws.map(parseToken).filter(Boolean);
    parsedCache.set(key, toks);
    return toks;
  }

  const num = (y, m, d) => y * 10000 + m * 100 + d;
  function matchOne(t, date, hol) {
    const y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate();
    switch (t.kind) {
      case "all": return true;
      case "weekday": return !isHolidayType(date, hol);
      case "holiday": return isHolidayType(date, hol);
      case "pubhol": return !!(hol && hol.has(dateKey(date)));
      case "dow": return t.set.has(date.getDay());
      case "date": return t.d.y != null ? num(t.d.y, t.d.m, t.d.d) === num(y, m, d) : (t.d.m === m && t.d.d === d);
      case "range": {
        const s = t.s, e = t.e;
        if (s.y != null || e.y != null) {
          let sy = s.y, ey = e.y;
          if (sy == null) sy = ey - (num(0, s.m, s.d) > num(0, e.m, e.d) ? 1 : 0);
          if (ey == null) ey = sy + (num(0, e.m, e.d) < num(0, s.m, s.d) ? 1 : 0);
          const cur = num(y, m, d);
          return cur >= num(sy, s.m, s.d) && cur <= num(ey, e.m, e.d);
        }
        const cur = num(0, m, d), a = num(0, s.m, s.d), b = num(0, e.m, e.d);
        return a <= b ? (cur >= a && cur <= b) : (cur >= a || cur <= b); // 年またぎ
      }
      default: return false;
    }
  }
  // その日（運行日）にこの曜日区分の列車が運転するか
  function matches(rule, date, holidaySet) {
    const toks = parseRule(rule);
    if (!toks.length) return true;
    const pos = toks.filter(t => !t.neg), neg = toks.filter(t => t.neg);
    const okPos = pos.length ? pos.some(t => matchOne(t, date, holidaySet)) : true;
    return okPos && !neg.some(t => matchOne(t, date, holidaySet));
  }

  // 前後約1年を調べて、平日ダイヤの日／休日ダイヤの日のどちらに運転するかを返す（時刻表・集計用）
  const kindCache = new Map();
  let kindCacheHol = null;
  function labels(rule, holidaySet) {
    if (kindCacheHol !== holidaySet) { kindCache.clear(); kindCacheHol = holidaySet; }
    const key = String(rule == null ? "" : rule);
    if (kindCache.has(key)) return kindCache.get(key);
    let r;
    if (!parseRule(key).length) r = { weekday: true, holiday: true };
    else {
      r = { weekday: false, holiday: false };
      const base = new Date(); base.setHours(0, 0, 0, 0);
      for (let i = -400; i <= 400 && !(r.weekday && r.holiday); i++) {
        const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
        if (!matches(key, d, holidaySet)) continue;
        if (isHolidayType(d, holidaySet)) r.holiday = true; else r.weekday = true;
      }
    }
    kindCache.set(key, r);
    return r;
  }
  // "both" / "weekday" / "holiday" / "none"
  function kind(rule, holidaySet) {
    const l = labels(rule, holidaySet);
    return l.weekday && l.holiday ? "both" : l.weekday ? "weekday" : l.holiday ? "holiday" : "none";
  }

  window.DayRule = { matches, labels, kind, serviceDate, isHolidayType, parse: parseRule };
})();
