/**
 * nav.js — 共通ヘッダー管理ファイル
 * 新しいページを追加するときは NAV_LINKS だけ編集してください
 *
 * version: 1.5.5
 * 1.5.5: refreshNavDescentButton()を追加。リロード無しで「降車駅未回答」ボタンの
 *        表示・非表示をその場で切り替えられるように
 * 1.5.4: ヘッダーの降車駅未回答ボタンが、投稿直後の自動ポップアップと同じ関数を
 *        使っていたのを分離（openPendingDescentManuallyに変更）
 * 1.5.3: 「降車駅未回答」ボタンが、次の投稿を待たず1件目の投稿直後から出るように変更
 * 1.5.2: 管理者メニューに「入場編成一覧」（maintenance.html）を追加
 * 1.5.1: メニューに「乗車路線マップ確認用」（linemap.html）を追加
 * 1.5.0: お知らせ・お問い合わせページ（contact.html）をメニューに追加。
 *        管理者メニューに「お問い合わせ管理」（inquiries.html）を追加
 * 1.4.1: 管理者専用リンクの対象を「運営」のみに限定（他の特定ユーザー名の許可を削除）
 * 1.4.0: 管理者専用リンクの対象に「運営」を追加（今まで特定ユーザー名のみだった）
 * 1.3.0: 過去分の一括チェック機能を撤去（乗車履歴ページから個別に記録する方式に変更したため）
 */

// ===== ① ナビゲーションのリンク一覧 =====
// ここを編集するだけで全ページのメニューが更新されます
const NAV_LINKS = [
  { href: "index.html",      icon: "📝", label: "新規投稿" },
  { href: "show.html",       icon: "📜", label: "投稿履歴" },
  { href: "statistick.html", icon: "📊", label: "統計情報" },
  { href: "linemap.html",    icon: "🗺", label: "乗車路線マップ確認用" },
  { href: "stampbook.html",  icon: "🎫", label: "スタンプ帳" },
  { href: "contact.html",    icon: "📩", label: "お知らせ・お問い合わせ" },
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
  .nav-descent-btn {
    background: #E60012;
    border: none;
    color: white;
    font-size: 13px;
    font-weight: bold;
    padding: 5px 9px;
    border-radius: 8px;
    cursor: pointer;
    line-height: 1;
    animation: navDescentPulse 1.6s infinite;
  }
  @keyframes navDescentPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
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
  const ADMIN_USERS = ["運営"];
  const adminLinks = ADMIN_USERS.includes(currentUser)
    ? [
        { href: "log.html", icon: "🔍", label: "ログ管理" },
        { href: "inquiries.html", icon: "📮", label: "お問い合わせ管理" },
        { href: "maintenance.html", icon: "🛠", label: "入場編成一覧" },
      ]
    : [];

  // メニューリンクを生成（通常リンク＋管理者リンク）
  const linkHTML = [...NAV_LINKS, ...adminLinks].map(link => {
    const isActive = link.href === currentFile ? 'class="nav-active"' : '';
    return `<a href="${link.href}" ${isActive}>${link.icon} ${link.label}</a>`;
  }).join("");

  // 未回答の降車記録があるかチェック（ページ問わず localStorage で判定できる）
  const hasPendingDescent = !!localStorage.getItem("tuts4_awaiting_descent_answer") || !!localStorage.getItem("tuts4_pending_descent");
  const descentBtnHTML = hasPendingDescent
    ? `<button class="nav-descent-btn" onclick="_navOpenPendingDescent()" title="前回の降車駅が未回答です">🚏 降車駅未回答</button>`
    : "";

  // ヘッダー全体のHTML
  const navHTML = `
    <header class="nav-header">
      <div class="nav-title">${pageTitle}</div>
      <div class="nav-right">
        ${descentBtnHTML}
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

// 投稿・回答のたびに呼ぶと、ページをリロードしなくても「降車駅未回答」ボタンの
// 表示・非表示をその場で切り替えられる
function refreshNavDescentButton() {
  const hasPendingDescent = !!localStorage.getItem("tuts4_awaiting_descent_answer") || !!localStorage.getItem("tuts4_pending_descent");
  const navRight = document.querySelector(".nav-right");
  if (!navRight) return;
  let btn = navRight.querySelector(".nav-descent-btn");
  if (hasPendingDescent && !btn) {
    btn = document.createElement("button");
    btn.className = "nav-descent-btn";
    btn.setAttribute("onclick", "_navOpenPendingDescent()");
    btn.title = "前回の降車駅が未回答です";
    btn.textContent = "🚏 降車駅未回答";
    navRight.insertBefore(btn, navRight.firstChild);
  } else if (!hasPendingDescent && btn) {
    btn.remove();
  }
}

// 未回答の降車駅ボタン：index.html上ならその場でポップアップを開き、
// 他のページからならindex.htmlに遷移してから自動で開く
function _navOpenPendingDescent() {
  const currentFile = location.pathname.split("/").pop() || "index.html";
  if (currentFile === "index.html" && typeof openPendingDescentManually === "function") {
    openPendingDescentManually();
  } else {
    location.href = "index.html?openDescent=1";
  }
}
