/**
 * nav.js — 共通ヘッダー管理ファイル
 * 新しいページを追加するときは NAV_LINKS だけ編集してください
 */

// ===== ① ナビゲーションのリンク一覧 =====
// ここを編集するだけで全ページのメニューが更新されます
const NAV_LINKS = [
  { href: "index.html",      icon: "📝", label: "新規投稿" },
  { href: "show.html",       icon: "📜", label: "投稿履歴" },
  { href: "statistick.html", icon: "📊", label: "統計情報" },
  { href: "stampbook.html",  icon: "🎫", label: "スタンプ帳" },
  { href: "settings.html",   icon: "⚙️", label: "設定" },
];

// ===== ② CSS =====
const NAV_CSS = `
  .nav-header {
    background-color: #004C97;
    color: white;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 16px;
    height: 54px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.18);
    position: sticky;
    top: 0;
    z-index: 9999;
  }
  .nav-title {
    font-weight: bold;
    font-size: 15px;
    letter-spacing: 0.05em;
    color: white;
  }
  .nav-right {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .nav-username {
    font-weight: bold;
    font-size: 13px;
    color: #FFD700;
  }
  .nav-menu-btn {
    background: white;
    border: none;
    color: #004C97;
    font-size: 20px;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s, color 0.2s;
    line-height: 1;
  }
  .nav-menu-btn:hover { background: #E60012; color: white; }
  .nav-dropdown {
    position: fixed;
    top: 54px;
    right: 16px;
    background: white;
    border-radius: 14px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.18);
    min-width: 220px;
    padding: 10px 0;
    z-index: 9998;
    transform: translateY(-8px) scale(0.97);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.18s ease, transform 0.18s ease;
  }
  .nav-dropdown.open {
    opacity: 1;
    pointer-events: all;
    transform: translateY(0) scale(1);
  }
  .nav-dropdown a, .nav-dropdown button.nav-logout {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 11px 20px;
    font-size: 14px;
    color: #222;
    text-decoration: none;
    background: none;
    border: none;
    width: 100%;
    text-align: left;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.15s;
  }
  .nav-dropdown a:hover, .nav-dropdown button.nav-logout:hover {
    background: #F0F4FA;
  }
  .nav-dropdown a.nav-active {
    color: #004C97;
    font-weight: bold;
    background: #EEF4FF;
  }
  .nav-divider {
    height: 1px;
    background: #eee;
    margin: 6px 0;
  }
  .nav-user-row {
    padding: 10px 20px 8px;
    font-size: 12px;
    color: #999;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .nav-user-name {
    font-weight: bold;
    color: #004C97;
    font-size: 14px;
  }
  .nav-backdrop {
    display: none;
    position: fixed;
    inset: 0;
    z-index: 9997;
  }
  .nav-backdrop.open { display: block; }
`;

// ===== ③ ヘッダーを生成して挿入する関数 =====
function initNav(pageTitle) {
  // CSS を <head> に注入
  const style = document.createElement("style");
  style.textContent = NAV_CSS;
  document.head.appendChild(style);

  // 現在のページファイル名を取得（アクティブ判定用）
  const currentFile = location.pathname.split("/").pop() || "index.html";

  // 現在のユーザー
  const currentUser = localStorage.getItem("username") || "";

  // 管理者のみ表示するリンク
  const ADMIN_USER = "ぴなお";
  const adminLinks = currentUser === ADMIN_USER
    ? [{ href: "log.html", icon: "🔍", label: "ログ管理" }]
    : [];

  // メニューリンクを生成（通常リンク＋管理者リンク）
  const linkHTML = [...NAV_LINKS, ...adminLinks].map(link => {
    const isActive = link.href === currentFile ? 'class="nav-active"' : '';
    return `<a href="${link.href}" ${isActive}>${link.icon} ${link.label}</a>`;
  }).join("");

  // ヘッダー全体のHTML
  const navHTML = `
    <header class="nav-header">
      <div class="nav-title">${pageTitle}</div>
      <div class="nav-right">
        <span class="nav-username" id="navUsernameDisplay"></span>
        <button class="nav-menu-btn" onclick="_navToggle()" aria-label="メニュー">☰</button>
      </div>
    </header>

    <div class="nav-backdrop" id="navBackdrop" onclick="_navClose()"></div>
    <div class="nav-dropdown" id="navDropdown">
      <div class="nav-user-row">
        👤 <span class="nav-user-name" id="navMenuUsername"></span> さん
      </div>
      <div class="nav-divider"></div>
      ${linkHTML}
      <div class="nav-divider"></div>
      <button class="nav-logout" onclick="logout()">🚪 ログアウト</button>
    </div>
  `;

  // <body> の先頭に挿入
  document.body.insertAdjacentHTML("afterbegin", navHTML);

  // ユーザー名を表示
  const u = localStorage.getItem("username") || "";
  document.getElementById("navUsernameDisplay").textContent = u;
  document.getElementById("navMenuUsername").textContent = u;
}

// ===== ④ 開閉ロジック =====
function _navToggle() {
  document.getElementById("navDropdown").classList.toggle("open");
  document.getElementById("navBackdrop").classList.toggle("open");
}

function _navClose() {
  document.getElementById("navDropdown").classList.remove("open");
  document.getElementById("navBackdrop").classList.remove("open");
}
