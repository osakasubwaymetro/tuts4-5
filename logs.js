// logs.js (修正版)

// ✅ ログ保存用GASのURL（あなたのログ用GASに置き換える）
const GAS_LOG_URL = "https://script.google.com/macros/s/AKfycbzly7vRlMrEqI0D156pHJMaAlcYmiQM98n0N9rKpfDt_UKFQsA5kcGyHjpQx5uwJyD3/exec";

// ✅ 有効なアクセスキー一覧
const VALID_KEYS = ["00002025"];

// ログインチェック（ページ内で使う）
function checkLogin() {
  const username = localStorage.getItem("username");
  const accessKey = localStorage.getItem("accessKey");

  if (!username || !VALID_KEYS.includes(accessKey)) {
    alert("ログインが必要です。");
    window.location.href = "login.html";
    return null;
  }
  return username;
}

// ログ送信用関数（プリフライトを避けるため no-cors で送信）
function logAction(action, details = "") {
  const username = localStorage.getItem("username") || "未ログイン";
  const payload = {
    action,
    username,
    details,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent
  };

  // no-cors にすることでプリフライト(OPTIONS)を防ぎ、Apps Script に届くようにする
  fetch(GAS_LOG_URL, {
    method: "POST",
    mode: "no-cors",
    // 重要: headers を付けない（付けるとプリフライトになる）
    body: JSON.stringify(payload)
  }).catch(err => {
    // no-cors だと response は得られないが、fetch 自体の失敗はキャッチできる
    console.error("ログ送信エラー:", err);
  });
}

// ページ読み込み時に自動記録（view ログ）
document.addEventListener("DOMContentLoaded", () => {
  const page = location.pathname.split("/").pop() || "index.html";
  logAction("view", `ページ閲覧: ${page}`);
});

// ログアウト
function logout() {
  const username = localStorage.getItem("username");
  logAction("logout", `${username} がログアウトしました`);
  localStorage.removeItem("username");
  localStorage.removeItem("accessKey");
  alert("ログアウトしました。");
  window.location.href = "login.html";
}
