// version: 1.28.2
// 1.28.2: 運用シートに種別・行先の列（発車時刻の次・その次）を追加対応。増結は「/」区切りで
//         複数の種別・行先を1セルに入れられる（併結記録と同じ形式）。選択時に種別・行先も
//         自動入力されるように修正
// 1.28.1: ダイヤ一覧に「曜日区分」列（平日／土休日）を追加対応。今日と同じ曜日区分の
//         運用シートだけを候補に混ぜるように変更（未指定の行は今まで通り常に対象）
// 1.28.0: 新しい「ダイヤ」スプレッドシート（ダイヤ一覧＋運用シート<ID>_<運番>）に対応。
//         今の会社・路線・乗車駅に一致する運用シートを見て、発車時刻を「過去の乗車記録
//         から選ぶ」候補に混ぜる（🚉アイコン、運番表示、臨時フラグがあれば「臨時」と表示）。
//         選ぶと発車時刻のみ自動入力（種別・行先は運用データに無いので手動のまま）
// 1.27.0: 「臨時列車」トグルを追加（発車時刻の下・手入力フォームの発車時刻の下）。
//         ONで投稿すると、ridesシートの「臨時」列に記録され、過去の乗車記録の候補
//         一覧には出なくなる（rides_gas.gsが「臨時」列に書き込むよう対応が必要）
const countryURL = "https://opensheet.elk.sh/1ZooIjdlOwsLZVjQv6KN53h4X2JYUyULYuJTuhbgk95s/country";
const route = "https://opensheet.elk.sh/1ZooIjdlOwsLZVjQv6KN53h4X2JYUyULYuJTuhbgk95s/route";
const model = "https://opensheet.elk.sh/1ZooIjdlOwsLZVjQv6KN53h4X2JYUyULYuJTuhbgk95s/model";

let allCountryData = []; // 全データを保持
let allrouteData = [];
let allmodelData = [];
let allstationData = [];
let allsujitypeData = [];
let allboundData = [];
let allnumberData = [];
let allRemarkData = [];
let lineAliasData = []; // 路線名の正式名称⇄通称対応表（linealiasシート）
let linePrefixData = []; // 路線名の接頭辞（会社名部分）対応表（lineprefixシート）。例: 大阪→大阪メトロ
document.getElementById("username").value = localStorage.getItem("username");

// マスタデータ用の共通キャッシュ読み込み関数。
// キャッシュがあれば即座にhandlerへ渡し（体感速度優先）、裏で最新を取得して
// 取れ次第もう一度handlerへ渡す＋キャッシュを更新する（「更新中」表示等は出さず静かに行う）。
// opensheet側が一時的に配列以外（エラーレスポンス等）を返すことがあるため、1回だけ自動リトライする
function fetchCachedMasterData(cacheKey, url, handler) {
  const key = "tuts4_master_" + cacheKey;

  try {
    const cached = localStorage.getItem(key);
    if (cached) handler(JSON.parse(cached));
  } catch (e) { /* 壊れたキャッシュは無視 */ }

  fetchJsonArrayWithRetry(url, cacheKey).then(data => {
    if (!data) return; // 取得失敗（配列以外）なら何もしない。キャッシュがあればそれを使い続ける
    handler(data);
    try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { /* 容量超過等は無視 */ }
  });
}

async function fetchJsonArrayWithRetry(url, label, attempts = 2) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data)) return data;
    } catch (e) { /* 下でリトライ */ }
    if (i < attempts - 1) await new Promise(r => setTimeout(r, 1000));
  }
  console.error((label || url) + "取得エラー: 配列以外が返るか、通信に失敗しました");
  return null;
}


// areaの取得
fetchCachedMasterData("area", "https://opensheet.elk.sh/1ZooIjdlOwsLZVjQv6KN53h4X2JYUyULYuJTuhbgk95s/area", data => {
  const select = document.getElementById("area");
  select.innerHTML = '<option value="">選択してください</option>';
  data.forEach(row => {
    const val = row["えりあ"];
    const opt = document.createElement("option");
    opt.textContent = val;
    opt.value = val;
    select.appendChild(opt);
  });
});

// typeの取得
fetchCachedMasterData("type", "https://opensheet.elk.sh/1ZooIjdlOwsLZVjQv6KN53h4X2JYUyULYuJTuhbgk95s/type", data => {
  const select = document.getElementById("type");
  select.innerHTML = '<option value="">選択してください</option>';
  data.forEach(row => {
    const val = row["区分"];
    const opt = document.createElement("option");
    opt.textContent = val;
    opt.value = val;
    select.appendChild(opt);
  });
});

// countryデータをまとめて読み込み
fetchCachedMasterData("country", countryURL, data => {
  allCountryData = data;
});

// areaまたはtypeが変わったら、countryプルダウンを更新
document.getElementById("area").addEventListener("change", updateCountryList);
document.getElementById("type").addEventListener("change", updateCountryList);

function updateCountryList() {
  const areaVal = document.getElementById("area").value;
  const typeVal = document.getElementById("type").value;
  const select = document.getElementById("country");

  select.innerHTML = '<option value="">選択してください</option>';

  // 両方選ばれていなければ終了
  if (!areaVal || !typeVal) return;

  // スプレッドシートの country シート構成が:
  // えりあ | 区分 | 会社
  const filtered = allCountryData.filter(row =>
    row["えりあ"] === areaVal && row["区分"] === typeVal
  );

  // 重複を排除
  const companies = [...new Set(filtered.map(r => r["会社"]))];

  companies.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    select.appendChild(opt);
  });
}



// routeデータをまとめて読み込み
fetchCachedMasterData("route", route, data => {
  allrouteData = data;
  updateCoupleButtonVisibility();
});

// areaまたはtypeが変わったら、countryプルダウンを更新
document.getElementById("type").addEventListener("change", updaterouteList);
document.getElementById("country").addEventListener("change", updaterouteList);

function updaterouteList() {
  const typeVal = document.getElementById("type").value;
  const countryVal = document.getElementById("country").value;
  const select = document.getElementById("route");

  select.innerHTML = '<option value="">選択してください</option>';

  // 両方選ばれていなければ終了
  if (!typeVal || !countryVal) return;

  // スプレッドシートの route シート構成が:
  // 区分 | 会社 | 路線
  const filtered = allrouteData.filter(row =>
    row["区分"] === typeVal && row["会社"] === countryVal
  );

  // 重複を排除
  const companies = [...new Set(filtered.map(r => r["路線"]))];

  companies.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    select.appendChild(opt);
  });
}



// modelデータをまとめて読み込み
fetchCachedMasterData("model", model, data => {
  allmodelData = data;
});

// areaまたはtypeが変わったら、countryプルダウンを更新
document.getElementById("route").addEventListener("change", updatemodelList);

function updatemodelList() {
  const routeVal = document.getElementById("route").value;
  const select = document.getElementById("model");

  select.innerHTML = '<option value="">選択してください</option>';

  // 両方選ばれていなければ終了
  if (!routeVal) { updateModelTriggerLabel(); return; }

  // スプレッドシートの model シート構成が:
  // 区分 | 車両形式
  const filtered = allmodelData.filter(row =>
    row["路線"] === routeVal
  );

  // 重複を排除
  const companies = [...new Set(filtered.map(r => r["車両形式"]))];

  companies.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    select.appendChild(opt);
  });

  updateModelTriggerLabel();
}



// stationデータをまとめて読み込み
fetchCachedMasterData("station", "https://opensheet.elk.sh/1ZooIjdlOwsLZVjQv6KN53h4X2JYUyULYuJTuhbgk95s/station", data => {
  allstationData = data;
  updatestationList();
});

document.getElementById("route").addEventListener("change", updatestationList);

// 併結で追加された分も含め、.station-select を全て更新する
/* ----------------------------------------
   直通運転（via_）対応
   station シートに「via_路線名」という駅名を登録しておくと、物理的な駅ではなく
   「ここで別路線に直通する」という目印として扱う。表示は「→ 〇〇線へ直通」に変換し、
   降車駅としてこれを選ぶと、そのままフォームが直通先の路線までジャンプする。
---------------------------------------- */
function isViaEntry(name) {
  return typeof name === "string" && name.startsWith("via_");
}
function viaTargetRoute(name) {
  // "#" 以降はディスアンビゲーション用のタグ（例: 東西線の両端がどちらも同じ路線に直通する場合、
  // "via_JR中央・総武線各駅停車#中野方面" のように付けて、2つのvia_を別物として区別できるようにする）
  return name.slice(4).split("#")[0];
}
function formatStationOption(name) {
  return isViaEntry(name) ? `→ ${viaTargetRoute(name)}へ直通` : name;
}

// via_駅名の位置の前後で、一番近い「実駅」（via_ではない駅）を探す
// referenceStation（今来た側の駅）が分かれば、その駅がvia_より前か後ろかで探す方向を決める
// （降車駅ポップアップで via_ を直接タップした際に、接続駅として自動記録するために使う）

function updatestationList() {
  const routeVal = document.getElementById("route").value;
  const selects = document.querySelectorAll(".station-select");
  if (!allstationData) return;

  const filtered = routeVal
    ? allstationData.filter(row => row["路線"] === routeVal)
    : [];
  const names = [...new Set(filtered.map(r => r["駅名"]).filter(n => !isViaEntry(n)))];

  selects.forEach(select => {
    const current = select.value;
    select.innerHTML = '<option value="">選択してください</option>';
    names.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      select.appendChild(opt);
    });
    if (names.includes(current)) select.value = current;
  });
}



// sujitypeデータをまとめて読み込み
fetchCachedMasterData("sujitype", "https://opensheet.elk.sh/1ZooIjdlOwsLZVjQv6KN53h4X2JYUyULYuJTuhbgk95s/sujitype", data => {
  allsujitypeData = data;
  updatesujitypeList();
});

document.getElementById("route").addEventListener("change", updatesujitypeList);

// 併結で追加された分も含め、.sujitype-select を全て更新する
function updatesujitypeList() {
  const routeVal = document.getElementById("route").value;
  const selects = document.querySelectorAll(".sujitype-select");
  if (!allsujitypeData) return;

  const filtered = routeVal
    ? allsujitypeData.filter(row => row["路線"] === routeVal)
    : [];
  const names = [...new Set(filtered.map(r => r["種別"]))];

  selects.forEach(select => {
    const current = select.value;
    select.innerHTML = '<option value="">選択してください</option>';
    names.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      select.appendChild(opt);
    });
    if (names.includes(current)) select.value = current;
  });
}



// boundデータをまとめて読み込み
fetchCachedMasterData("bound", "https://opensheet.elk.sh/1ZooIjdlOwsLZVjQv6KN53h4X2JYUyULYuJTuhbgk95s/bound", data => {
  allboundData = data;
  updateboundList();
});

document.getElementById("route").addEventListener("change", updateboundList);

// 併結で追加された分も含め、.bound-select を全て更新する
function updateboundList() {
  const routeVal = document.getElementById("route").value;
  const selects = document.querySelectorAll(".bound-select");
  if (!allboundData) return;

  const filtered = routeVal
    ? allboundData.filter(row => row["路線"] === routeVal)
    : [];
  const names = [...new Set(filtered.map(r => r["行先"]))];

  selects.forEach(select => {
    const current = select.value;
    select.innerHTML = '<option value="">選択してください</option>';
    names.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      select.appendChild(opt);
    });
    if (names.includes(current)) select.value = current;
  });
}



/* ----------------------------------------
   併結（まとまりBの複製）対応
   マスタデータ（route シート）の D列がチェック（TRUE）の路線だけ
   「併結を追加」ボタンを表示する
---------------------------------------- */
let rideBlockCount = 1;

function routeHasCoupling(routeVal) {
  if (!routeVal || !allrouteData || !allrouteData.length) return false;

  const typeVal = document.getElementById("type").value;
  const countryVal = document.getElementById("country").value;

  const row = allrouteData.find(r =>
    r["路線"] === routeVal &&
    (!typeVal || r["区分"] === typeVal) &&
    (!countryVal || r["会社"] === countryVal)
  ) || allrouteData.find(r => r["路線"] === routeVal);

  if (!row) return false;

  // D列は「併結」列。TRUE/チェック済みなら併結可能とみなす
  const v = row["併結"];

  return v === true || v === 1 ||
    ["true", "TRUE", "1", "はい", "有", "✓"].includes(String(v).trim());
}

function updateCoupleButtonVisibility() {
  const routeVal = document.getElementById("route").value;
  const btn = document.getElementById("coupleBtn");
  btn.style.display = routeHasCoupling(routeVal) ? "block" : "none";
}

// 路線を変更したら、併結ブロックは一旦1つに戻す
function resetRideBlocksToOne() {
  const container = document.getElementById("rideBlocks");
  const blocks = container.querySelectorAll(".ride-block");
  blocks.forEach((b, i) => { if (i > 0) b.remove(); });
  rideBlockCount = 1;
}

document.getElementById("route").addEventListener("change", () => {
  resetRideBlocksToOne();
  updateCoupleButtonVisibility();
});

function addCoupling() {
  rideBlockCount++;
  const container = document.getElementById("rideBlocks");

  const block = document.createElement("div");
  block.className = "ride-block";
  block.dataset.index = rideBlockCount - 1;
  block.innerHTML = `
    <div class="ride-block-head">
      <span class="ride-block-label">併結 ${rideBlockCount}号車</span>
      <button type="button" class="remove-couple-btn" onclick="this.closest('.ride-block').remove()">✕ 削除</button>
    </div>
    <div class="ride-block-row">
      <div class="field stack-field">
        <label class="mini-label">種別</label>
        <select class="sujitype-select"><option value="">選択してください</option></select>
        <label class="mini-label">行先</label>
        <select class="bound-select"><option value="">選択してください</option></select>
      </div>
    </div>
  `;
  container.appendChild(block);

  // 新しく増えたプルダウンにも選択肢を反映（乗車駅は最初のブロックのみなので更新不要）
  updatesujitypeList();
  updateboundList();
}



// numberデータをまとめて読み込み
fetchCachedMasterData("number", "https://opensheet.elk.sh/1ZooIjdlOwsLZVjQv6KN53h4X2JYUyULYuJTuhbgk95s/number", data => {
  allnumberData = data;
});

// modelが変わったら、numberプルダウンを更新
document.getElementById("model").addEventListener("change", updatenumberList);

function updatenumberList() {
  const modelVal = document.getElementById("model").value;
  const select = document.getElementById("number");

  select.innerHTML = '<option value="">選択してください</option>';

  // 両方選ばれていなければ終了
  if (!modelVal) { updateNumberTriggerLabel(); return; }

  // スプレッドシートの number シート構成が:
  // 車両形式 | 車番
  // "****7連****" のようなグループ見出し行は実際の編成では無いので除外する
  const filtered = allnumberData.filter(row =>
    row["車両形式"] === modelVal && formationGroupHeaderLabel(row["車番"]) === null
  );

  // 重複を排除
  const companies = [...new Set(filtered.map(r => cleanFormationNumber(r["車番"])))].filter(Boolean);

  companies.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    select.appendChild(opt);
  });

  updateNumberTriggerLabel();
}



// 投稿ボタン（確認用）
function upload() {
    const usernameValue = document.getElementById('username').value;
    const timeValue = document.getElementById('departing_time').value;
    const areaValue = document.getElementById('area').value;
    const typeValue = document.getElementById('type').value;
    const countryValue = document.getElementById('country').value;
    const routeValue = document.getElementById('route').value;
    const modelValue = document.getElementById('model').value;

    // 乗車駅は1つ目のまとまりB（併結でも乗る場所は同じなので）
    const stationSelects = document.querySelectorAll(".station-select");
    const stationValue = stationSelects.length ? stationSelects[0].value : "";

    // 併結時は 種別1/種別2/... 行先1/行先2/... のように「/」区切りで結合
    // （スプレッドシートの形は崩さず、1セルに複数分を記録する）
    const sujitypeValue = [...document.querySelectorAll(".sujitype-select")]
      .map(el => el.value).filter(Boolean).join("/");
    const boundValue = [...document.querySelectorAll(".bound-select")]
      .map(el => el.value).filter(Boolean).join("/");

    const numberValue = document.getElementById('number').value;
    const memoValue = document.getElementById('memo').value;
    const isExtraValue = document.getElementById('isExtraTrain')?.checked ? "TRUE" : "";
    console.log(numberValue)

  const payload = {
    usernameValue,
    timeValue,
    areaValue,
    typeValue,
    countryValue,
    routeValue,
    modelValue,
    stationValue,
    sujitypeValue,
    boundValue,
    numberValue,
    memoValue,
    isExtraValue
  };

  // ▼ここにGASのデプロイURLを入れる
  const scriptURL = "https://script.google.com/macros/s/AKfycbzuhYRx9gyb5J1a-6ZuxmcCepIU1hIMnuBo58wh5CTYMWE785YAnuJY4ckm_13-ZHc7/exec";

  // GASの応答が遅いことがあるので、まずローカルに一時保存してから
  // 画面上は1秒だけ「送信中」にして先に進める。実際の送信は裏で行い、
  // 成功したらローカルから消す（失敗時は残しておいて、あとで自動リトライする）
  const entryId = Date.now() + "_" + Math.random().toString(36).slice(2);
  const queue = getPendingPosts();
  queue.push({ id: entryId, payload });
  setPendingPosts(queue);

  showLoadingPopup();

  fetch(scriptURL, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
    .then(() => {
      setPendingPosts(getPendingPosts().filter(e => e.id !== entryId));
    })
    .catch(err => {
      console.error("送信エラー（あとで自動的に再送します）:", err);
    });

  setTimeout(async () => {
    logAction("post", `投稿: ${routeValue} / ${modelValue} ${numberValue} / ${stationValue} → ${boundValue}`);
    handleTripBookkeeping(routeValue, boundValue, timeValue, stationValue, sujitypeValue);
    hideLoadingPopup();
    showStampPopup(modelValue, numberValue);
    resetForm();
  }, 1000);
}

// 投稿完了後、次の入力に備えてフォームを全クリアする
function resetForm() {
  ["area", "type", "country", "route", "model", "number"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  const timeEl = document.getElementById("departing_time");
  if (timeEl) timeEl.value = "";
  const memoEl = document.getElementById("memo");
  if (memoEl) memoEl.value = "";
  const extraEl = document.getElementById("isExtraTrain");
  if (extraEl) extraEl.checked = false;

  // route/model の変更カスケードを明示的に発火し、駅・種別・行先・車番の選択肢や
  // 併結ブロック（まとまりB）・併結ボタンもまとめてクリアする
  const routeEl = document.getElementById("route");
  if (routeEl) routeEl.dispatchEvent(new Event("change", { bubbles: true }));
  const modelEl = document.getElementById("model");
  if (modelEl) modelEl.dispatchEvent(new Event("change", { bubbles: true }));

  const resultBox = document.getElementById("geoStationResult");
  if (resultBox) resultBox.innerHTML = "";

  // 直近の投稿を反映できるよう、乗車履歴キャッシュ（候補提案用）は無効化しておく
  localStorage.removeItem("tuts4_community_ride_cache");
  _rideHistoryPromise = null;

  // 入力内容の下書きも消す（クリアボタン／投稿完了のどちらでもここを通る）
  localStorage.removeItem("tuts4_form_draft");
}

function setCurrentDateTime() {
  const now = new Date();

  // yyyy-MM-ddTHH:mm の形式に整える
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");

  const localDatetime = `${year}-${month}-${day}T${hours}:${minutes}`;
  document.getElementById("departing_time").value = localDatetime;

}


/* ----------------------------------------
   備考（remark）データの取得
---------------------------------------- */
fetchCachedMasterData("desc", "https://opensheet.elk.sh/1ZooIjdlOwsLZVjQv6KN53h4X2JYUyULYuJTuhbgk95s/desc", data => {
  allRemarkData = data;
});

// 路線が変わったら備考を更新
document.getElementById("route").addEventListener("change", updateRemarkList);

function updateRemarkList() {
  const routeVal = document.getElementById("route").value;
  const descmsg = document.getElementById("desc");

  // 必ず最初に空にする
  descmsg.textContent = "";

  if (!routeVal) return;

  // 路線が一致し、備考が存在するものだけに絞る
  const filtered = allRemarkData.filter(row =>
    row["路線"] === routeVal && row["備考"]
  );

  // 該当路線がスプレッドシートに存在しない場合
  if (filtered.length === 0) {
    descmsg.textContent = "";
    return;
  }

  // 備考の重複を除去
  const items = [...new Set(filtered.map(r => r["備考"]))];

  // p要素なので文字列として結合して表示
  descmsg.textContent = items.join(" / ");
}



/* ----------------------------------------
   ※ 旧「初乗車/○回目」表示（checkRideHistory）は削除
   投稿後のスタンプポップアップ（showStampPopup, index.html側）に統合済み
---------------------------------------- */



/* ----------------------------------------
   現在地から最寄り駅を探す
   HeartRails Express（駅名＋乗り入れ路線をキー無しで取得できる無料API）で
   近くの駅と路線の組を取得し、自分のマスタデータ（station シート：路線・駅名）と
   「駅名・路線名が完全一致」するものだけを候補としてリストアップする。
   選択すると、エリア・区分・会社・路線・乗車駅まで自動で埋まる（ショートカットと同じ仕組み）。
---------------------------------------- */
// 正式社名⇄通称・表記ゆれの対応表（linealiasシート：正式名称・通称）
fetchCachedMasterData("linealias", "https://opensheet.elk.sh/1ZooIjdlOwsLZVjQv6KN53h4X2JYUyULYuJTuhbgk95s/linealias", data => {
  lineAliasData = data
    .map(row => ({ official: row["正式名称"] || "", alias: row["通称"] || "" }))
    .filter(r => r.official && r.alias);
});

// 路線名の接頭辞（会社名部分）の対応表（lineprefixシート：正式接頭辞・通称接頭辞）
// 例: 大阪メトロの各路線がHeartRails側で「大阪○○線」（大阪メトロの「メトロ」が省略された形）
// で返ってくる場合、「大阪」→「大阪メトロ」と1行登録しておけば、○○の部分が何であっても
// まとめて変換できる（路線名を1本ずつ完全一致で登録する必要が無い）
fetchCachedMasterData("lineprefix", "https://opensheet.elk.sh/1ZooIjdlOwsLZVjQv6KN53h4X2JYUyULYuJTuhbgk95s/lineprefix", data => {
  linePrefixData = data
    .map(row => ({ officialPrefix: row["正式接頭辞"] || "", aliasPrefix: row["通称接頭辞"] || "" }))
    .filter(r => r.officialPrefix && r.aliasPrefix);
});

// 1つの路線名から、あり得る正規化候補を複数作る（接頭辞を置き換えた版・置き換えない版の両方）。
// どちらか一方だけを正解と決め打ちすると、置き換えが逆に邪魔をするケース
// （例:「大阪環状線」を「大阪メトロ環状線」にしてしまい、本来の「JR大阪環状線」と
// マッチしなくなる）があるため、両方を候補として残し、比較時にどちらかで一致すればOKとする
function normalizeLineNameVariants(name) {
  if (!name) return [""];
  const base = String(name).trim();

  // ① 路線名まるごとの完全一致ルールがあれば、それを唯一の候補として使う
  const exact = lineAliasData.find(({ official }) => official === base);
  if (exact) return [exact.alias.trim()];

  // ② 通称・部分一致（正式社名の一部を通称に置き換え）を適用したベース版
  let withAlias = base;
  lineAliasData.forEach(({ official, alias }) => { withAlias = withAlias.split(official).join(alias); });
  const variants = [withAlias.trim()];

  // ③ さらに接頭辞（会社名部分）を置き換えた版も候補に追加する（②はそのまま残す）
  const prefixRule = linePrefixData.find(({ officialPrefix }) => base.startsWith(officialPrefix));
  if (prefixRule) {
    let withPrefix = prefixRule.aliasPrefix + base.slice(prefixRule.officialPrefix.length);
    lineAliasData.forEach(({ official, alias }) => { withPrefix = withPrefix.split(official).join(alias); });
    variants.push(withPrefix.trim());
  }

  return variants;
}

// 表記ゆれを吸収したうえで「一致」または「片方がもう片方を包含」していればOKとみなす。
// 双方の候補（接頭辞を置き換えた版・置き換えない版）の組み合わせを全部試し、
// どれか1つでも一致すればマッチとする
function isLineMatch(masterLine, apiLine) {
  const masterVariants = normalizeLineNameVariants(masterLine);
  const apiVariants = normalizeLineNameVariants(apiLine);

  for (const a of masterVariants) {
    for (const b of apiVariants) {
      if (!a || !b) continue;
      if (a === b || a.includes(b) || b.includes(a)) return true;
      // 末尾の「線」を除いた核部分でも比較（さらに表記ゆれに強くする）
      const coreA = a.replace(/線$/, "");
      const coreB = b.replace(/線$/, "");
      if (coreA && coreB && (coreA === coreB || a.includes(coreB) || b.includes(coreA))) return true;
    }
  }
  return false;
}

// 「現在時刻を入力」ボタン（index.html側）から、位置情報取得後に呼ばれる
async function findNearbyStationsFromPosition(lat, lon) {
  const resultBox = document.getElementById("geoStationResult");
  openModalLoading("近くの駅を選択", "📍 近くの駅を確認中...");

  try {
    const res = await fetch(`https://express.heartrails.com/api/json?method=getStations&x=${lon}&y=${lat}`);
    const data = await res.json();
    const stations = (data.response && data.response.station) || [];

    // 駅名は自分のマスタデータに存在するものだけ対象にし、路線名は表記ゆれ込みで突き合わせる
    const matches = [];
    const seen = new Set();
    stations.forEach(st => {
      const stationRows = (allstationData || []).filter(row => row["駅名"] === st.name);
      if (!stationRows.length) return;

      const hitRow = stationRows.find(row => isLineMatch(row["路線"], st.line));
      if (hitRow) {
        const key = st.name + "|" + hitRow["路線"];
        if (!seen.has(key)) {
          seen.add(key);
          matches.push({ name: st.name, line: hitRow["路線"], confident: true, distance: st.distance });
        }
      } else {
        // 路線名の表記があまりに違って一致判定できない場合のフォールバック：
        // 駅名だけは一致しているので、その駅にある自分の路線候補を「駅名のみ一致」として出す
        // （HeartRails側の正式名称も一緒に持たせておき、表示・linealiasへの追加検討に使う）
        stationRows.forEach(row => {
          const key = st.name + "|" + row["路線"];
          if (!seen.has(key)) {
            seen.add(key);
            matches.push({ name: st.name, line: row["路線"], apiLine: st.line, confident: false, distance: st.distance });
          }
        });
      }
    });

    // 近い順のまま、ポップアップで選んでもらう（自動確定はしない）
    renderGeoStationResult(matches);
  } catch (e) {
    console.error("駅取得エラー:", e);
    const list = document.getElementById("historyModalList");
    if (list) list.innerHTML = '<p class="modal-loading">近くの駅の取得に失敗しました。</p>';
    if (resultBox) resultBox.textContent = "近くの駅の取得に失敗しました。";
  }
}

function formatDistanceLabel(raw) {
  const s = String(raw || "").trim();
  const m = parseInt(s, 10);
  if (isNaN(m)) return "";
  return m >= 1000 ? (m / 1000).toFixed(1) + "km" : m + "m";
}

function renderGeoStationResult(matches) {
  const resultBox = document.getElementById("geoStationResult");

  if (!matches.length) {
    const list = document.getElementById("historyModalList");
    if (list) list.innerHTML = '<p class="modal-loading">近くに一致する駅データが見つかりませんでした。手動で選択してください。</p>';
    return;
  }

  if (resultBox) resultBox.textContent = "";

  setModalTitle("近くの駅を選択");
  const list = document.getElementById("historyModalList");
  list.innerHTML = "";

  matches.forEach(m => {
    const item = document.createElement("button");
    item.type = "button";
    const label = m.confident
      ? `${m.name}（${m.line}）`
      : `${m.name}（${m.line}）※駅名のみ一致・正式名称「${m.apiLine}」`;
    const distLabel = formatDistanceLabel(m.distance);
    item.style.display = "flex";
    item.style.justifyContent = "space-between";
    item.style.alignItems = "center";
    item.style.gap = "8px";
    item.innerHTML = `
      <span>${label}</span>
      ${distLabel ? `<span style="color:#999; font-size:12px; white-space:nowrap;">${distLabel}</span>` : ""}
    `;
    item.onclick = () => {
      applyGeoStation(m);
      closeHistoryModal();
    };
    list.appendChild(item);
  });

  document.getElementById("historyModalOverlay").classList.add("show");
}

async function applyGeoStation(match) {
  function setAndTrigger(id, val) {
    const el = document.getElementById(id);
    if (!el || !val) return;
    el.value = val;
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }
  function setAndTriggerFirst(selector, val) {
    const el = document.querySelector(selector);
    if (!el || !val) return;
    el.value = val;
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }
  function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

  // 路線から 区分・会社 を特定
  const routeRow = (allrouteData || []).find(r => r["路線"] === match.line);
  if (!routeRow) return;
  const typeVal = routeRow["区分"];
  const companyVal = routeRow["会社"];

  // えりあは「現在時刻を入力」ボタン側でGPS→都道府県→地方のマッピングにより
  // 既に正しく設定済みのはずなので、ここでは上書きしない
  // （会社名だけから逆引きすると、複数えりあにまたがる会社の場合に間違ったえりあになるため）
  setAndTrigger("type", typeVal);
  await wait(300);
  setAndTrigger("country", companyVal);
  await wait(300);
  setAndTrigger("route", match.line);
  await wait(300);
  setAndTriggerFirst(".station-select", match.name);

  // 「最寄り駅から選択」経由のときだけ、方面・履歴ポップアップを続けて開く
  startStationPopupFlow();
}



/* ----------------------------------------
   乗車駅を選ぶと、ポップアップで「方面→過去の乗車記録」を選べる
   （「最寄り駅から選択」経由で乗車駅が決まったときだけ自動で開く。
    手動でプルダウンから乗車駅を選んだ場合は開かない）
   時刻表が使えないので、代わりに「station シートに登録されている駅の並び順＝
   路線上の物理的な順番」とみなし、その両端の駅名を方面の目印にする。

   ※ 前提：station シートの各路線の行が、実際の駅の並び順になっている必要がある
      （ループ線・支線・直通運転先の駅は正しく判定できない場合がある）
---------------------------------------- */

function isCircularRoute(routeVal) {
  const row = (allrouteData || []).find(r => r["路線"] === routeVal);
  if (!row) return false;
  const v = row["環状"];
  return v === true || v === 1 || ["true", "TRUE", "1", "はい", "有", "✓"].includes(String(v).trim());
}

// route シートの「環状反転」がTRUEなら、内部の「外回り＝インデックス増加方向」の決め打ちを逆にする
// 駅名が routeName（またはそこから via_ でさらに繋がる先の路線）に実在するかを再帰的に探す。
// 東京の「5直」のような多段の直通運転にも対応できるよう、via_を辿り続ける
// （visitedで既に通った路線を記録し、無限ループ・同じ路線の重複探索を防ぐ）
// via_マーカーの隣にある実駅（via_ではない駅）のraw indexを探す。
// via_自身の行位置は隣同士でもほぼ同じ場所になりがちで方向判定の基準にならないため、
// 実際に隣接する実駅（例: 天王寺）の位置を基準に使う
function findViaNeighborRawIdx(rawNames, viaRawIdx) {
  for (let i = viaRawIdx - 1; i >= 0; i--) {
    if (!isViaEntry(rawNames[i])) return i;
  }
  for (let i = viaRawIdx + 1; i < rawNames.length; i++) {
    if (!isViaEntry(rawNames[i])) return i;
  }
  return viaRawIdx; // 見つからなければ妥協でそのまま
}

function isStationReachableViaChain(routeName, boundNameTrim, visited) {
  if (!routeName || visited.has(routeName)) return false;
  visited.add(routeName);

  const rows = (allstationData || []).filter(r => r["路線"] === routeName);
  const stations = rows.map(r => String(r["駅名"] || "").trim());
  const found = stations.some(s => s && !isViaEntry(s) &&
    (s === boundNameTrim || boundNameTrim.includes(s) || s.includes(boundNameTrim)));
  if (found) return true;

  for (const r of rows) {
    const name = r["駅名"];
    if (isViaEntry(name)) {
      if (isStationReachableViaChain(viaTargetRoute(name), boundNameTrim, visited)) return true;
    }
  }
  return false;
}

function isCircularReversed(routeVal) {
  const row = (allrouteData || []).find(r => r["路線"] === routeVal);
  if (!row) return false;
  const v = row["環状反転"];
  return v === true || v === 1 || ["true", "TRUE", "1", "はい", "有", "✓"].includes(String(v).trim());
}

// ディズニーリゾートラインのような「片方向のみ運行」の環状線に対応。
// route シートの「環状方向限定」列に「外回りのみ」または「内回りのみ」と入れておくと、
// 方面を聞かずに自動でその方向として扱う（null＝両方向あり、通常通り方面を聞く）
function getCircularFixedDirection(routeVal) {
  const row = (allrouteData || []).find(r => r["路線"] === routeVal);
  if (!row) return null;
  const v = String(row["環状方向限定"] || "").trim();
  if (v.includes("外回り")) return "外回り";
  if (v.includes("内回り")) return "内回り";
  return null;
}

// 環状線で「外回り／内回り」を選ぶ時、実際にどっちへ行くか分かるよう隣の駅名を添える
function circularNeighborLabel(routeVal, boardingStation, wantOuter) {
  const rows = (allstationData || []).filter(r => r["路線"] === routeVal).map(r => r["駅名"]).filter(n => !isViaEntry(n));
  const idx = rows.indexOf(boardingStation);
  if (idx === -1 || rows.length < 2) return "";
  const reversed = isCircularReversed(routeVal);
  const goForward = reversed ? !wantOuter : wantOuter;
  const total = rows.length;
  const neighborIdx = goForward ? (idx + 1) % total : (idx - 1 + total) % total;
  return rows[neighborIdx] || "";
}

function startStationPopupFlow() {
  const routeVal = document.getElementById("route").value;
  const stationSelects = document.querySelectorAll(".station-select");
  const boardingStation = stationSelects.length ? stationSelects[0].value : "";
  if (!routeVal || !boardingStation) return;

  // 方面ポップアップを出している間に裏で先読みしておき、履歴選択時のラグを無くす
  getRideHistoryCached();

  const stationsOnRoute = (allstationData || []).filter(r => r["路線"] === routeVal);
  if (stationsOnRoute.length < 2) return;

  // 環状線（山手線・大阪環状線など）は「両端」という概念が無いので、
  // 内回り／外回りの2択で方面を選ぶ専用のフローに分ける
  if (isCircularRoute(routeVal)) {
    const fixedDir = getCircularFixedDirection(routeVal);
    if (fixedDir) {
      // ディズニーリゾートラインのような片方向のみの路線は、方面を聞かず自動で確定させる
      loadAndShowHistoryPopup(routeVal, boardingStation, fixedDir === "外回り" ? "__outer__" : "__inner__");
    } else {
      showCircularDirectionPopup(routeVal, boardingStation);
    }
    return;
  }

  const first = stationsOnRoute[0]["駅名"];
  const last = stationsOnRoute[stationsOnRoute.length - 1]["駅名"];
  if (!first || !last || first === last) return;

  // via_（直通先の目印）が端にある場合は、その路線自体の実際の終着駅（隣の実駅）を
  // 方面名として使う（例:「近鉄吉野線 方面」ではなく「古市 方面」）
  const stationNames = stationsOnRoute.map(r => r["駅名"]);
  function resolveTerminus(name, rawIdx) {
    if (!isViaEntry(name)) return name;
    if (rawIdx === 0) {
      for (let i = 1; i < stationNames.length; i++) if (!isViaEntry(stationNames[i])) return stationNames[i];
    } else {
      for (let i = rawIdx - 1; i >= 0; i--) if (!isViaEntry(stationNames[i])) return stationNames[i];
    }
    return name;
  }
  const resolvedFirst = resolveTerminus(first, 0);
  const resolvedLast = resolveTerminus(last, stationsOnRoute.length - 1);

  // 乗車駅自体が終着駅なら、その駅への「方面」は存在しない（折り返せないので除外）
  const termini = [resolvedFirst, resolvedLast].filter(name => name !== boardingStation);
  if (!termini.length) return;

  if (termini.length === 1) {
    // 方面が一意に決まる（終着駅から乗る）場合は、方面選択を飛ばして直接履歴を表示
    loadAndShowHistoryPopup(routeVal, boardingStation, termini[0]);
  } else {
    showDirectionChoicePopup(routeVal, boardingStation, termini);
  }
}

// 環状線用：内回り／外回りの2択を出す（"__inner__" / "__outer__" という特別なdirValを使う）
function showCircularDirectionPopup(routeVal, boardingStation) {
  setModalTitle("方面を選択（環状線）");
  const list = document.getElementById("historyModalList");
  list.innerHTML = "";

  [["外回り", "__outer__", true], ["内回り", "__inner__", false]].forEach(([label, dirVal, wantOuter]) => {
    const neighbor = circularNeighborLabel(routeVal, boardingStation, wantOuter);
    const item = document.createElement("button");
    item.type = "button";
    item.textContent = neighbor ? `${label}（${neighbor}方面）` : label;
    item.onclick = () => loadAndShowHistoryPopup(routeVal, boardingStation, dirVal);
    list.appendChild(item);
  });

  document.getElementById("historyModalOverlay").classList.add("show");
}

function showDirectionChoicePopup(routeVal, boardingStation, termini) {
  setModalTitle("方面を選択");
  const list = document.getElementById("historyModalList");
  list.innerHTML = "";

  termini.forEach(name => {
    const item = document.createElement("button");
    item.type = "button";
    item.textContent = `${name} 方面`;
    item.onclick = () => loadAndShowHistoryPopup(routeVal, boardingStation, name);
    list.appendChild(item);
  });

  document.getElementById("historyModalOverlay").classList.add("show");
}

function setModalTitle(text) {
  const title = document.getElementById("modalTitle");
  if (title) title.textContent = text;
}

// ポップアップを即座に開いて「確認中」等のメッセージを表示する（データが揃う前の状態表示用）
function openModalLoading(title, message) {
  setModalTitle(title);
  const list = document.getElementById("historyModalList");
  if (list) list.innerHTML = `<p class="modal-loading">${message}</p>`;
  const overlay = document.getElementById("historyModalOverlay");
  if (overlay) overlay.classList.add("show");
}

/* 種別・行先の候補提案だけは、自分以外のユーザーの投稿データも使う。
   （ユーザー名は一切表示せず、種別・行先・時刻の傾向を見るだけのため。
    「投稿履歴」「統計」は引き続き自分の分だけ表示・保存する） */
let _rideHistoryPromise = null;

async function getRideHistoryCached() {
  if (_rideHistoryPromise) return _rideHistoryPromise;

  _rideHistoryPromise = (async () => {
    const CACHE_KEY = "tuts4_community_ride_cache";
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try { return JSON.parse(cached); } catch (e) { localStorage.removeItem(CACHE_KEY); }
    }

    const RIDES_URL = "https://script.google.com/macros/s/AKfycbyWTr6ejDZKkaw9owEM8yLcl6-6w5pHeyk2hWdX6Lw1INNg5ZxuhvCx7PPfOmxWHC17/exec";
    try {
      const res = await fetch(RIDES_URL);
      const all = await res.json();
      localStorage.setItem(CACHE_KEY, JSON.stringify(all));
      return all;
    } catch (e) {
      console.error("乗車履歴の取得に失敗:", e);
      return [];
    }
  })();

  return _rideHistoryPromise;
}

// ページを開いた時点で先読みを開始しておく（乗車駅を選ぶ頃には取得済みにしておくため）
getRideHistoryCached();

function timeOfDayMinutes(d) {
  return d.getHours() * 60 + d.getMinutes();
}

function formatHM(d) {
  if (!d) return "";
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

/* ----------------------------------------
   平日／土日祝の判定（電車のダイヤは平日ダイヤ・土休日ダイヤで違うことが多いため、
   過去の乗車記録から候補を出す時に、今日と同じ「曜日タイプ」を優先するのに使う）
---------------------------------------- */
let _holidaySetPromise = null;
async function getHolidaySet() {
  if (_holidaySetPromise) return _holidaySetPromise;

  _holidaySetPromise = (async () => {
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
      console.error("祝日データの取得に失敗:", e);
      return new Set();
    }
  })();

  return _holidaySetPromise;
}

function dateKey(d) {
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// true = 土日祝（休日ダイヤ）、false = 平日（平日ダイヤ）
function isWeekendType(d, holidaySet) {
  const day = d.getDay();
  if (day === 0 || day === 6) return true;
  return holidaySet.has(dateKey(d));
}

/* ----------------------------------------
   ダイヤデータ（新しい「ダイヤ」スプレッドシート）
   「ダイヤ一覧」シートに 会社・路線・ID・運番・臨時 を登録しておくと、
   各運用シート（<ID>_<運番>）の 駅名・発車時刻 を見て、乗車駅の候補として混ぜる
---------------------------------------- */
const DIAGRAM_SHEET_ID = "1JzY1wIGbj2Z83ItsMnMrz1xQ-cviEv50P0mOHiyi70A";
let _diagramListCache = null;
async function getDiagramList() {
  if (_diagramListCache) return _diagramListCache;
  const CACHE_KEY = "tuts4_diagram_list_cache";
  const url = `https://opensheet.elk.sh/${DIAGRAM_SHEET_ID}/${encodeURIComponent("ダイヤ一覧")}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (Array.isArray(data)) {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      _diagramListCache = data;
      return data;
    }
  } catch (e) { /* ignore */ }
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) { _diagramListCache = JSON.parse(cached); return _diagramListCache; }
  } catch (e) { /* ignore */ }
  return [];
}
async function fetchDiagramSheet(id, unban) {
  const sheetName = `${id}_${unban}`;
  const CACHE_KEY = "tuts4_diagram_sheet_" + sheetName;
  const url = `https://opensheet.elk.sh/${DIAGRAM_SHEET_ID}/${encodeURIComponent(sheetName)}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (Array.isArray(data)) {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      return data;
    }
  } catch (e) { /* ignore */ }
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) return JSON.parse(cached);
  } catch (e) { /* ignore */ }
  return [];
}
function isFlaggedExtraGeneric(v) {
  return ["true", "TRUE", "1", "はい", "有", "✓"].includes(String(v).trim());
}
// 今選んでいる会社・路線に該当する運用シートを全部見て、この駅を通る発車時刻を候補として集める
// （同じ運用番号のシート内に同じ駅名が複数回出てきてもOK＝折り返しに対応）
async function getDiagramCandidates(routeVal, boardingStation, todayIsWeekendType) {
  const companyVal = document.getElementById("country")?.value || "";
  const list = await getDiagramList();
  const matches = list.filter(d => {
    if (d["会社"] !== companyVal || d["路線"] !== routeVal) return false;
    const dayType = String(d["曜日区分"] || "").trim();
    if (!dayType) return true; // 未指定なら平日・土休日を問わず対象
    const isHolidayRow = dayType.includes("土") || dayType.includes("休");
    return isHolidayRow === todayIsWeekendType;
  });

  const results = [];
  for (const d of matches) {
    const rows = await fetchDiagramSheet(d["ID"], d["運番"]);
    const isExtra = isFlaggedExtraGeneric(d["臨時"]);
    rows.forEach(r => {
      if (r["駅名"] !== boardingStation) return;
      const raw = String(r["発車時刻"] || "").trim();
      let time = null;
      const hm = raw.match(/^(\d{1,2}):(\d{2})$/);
      if (hm) {
        const now = new Date();
        time = new Date(now.getFullYear(), now.getMonth(), now.getDate(), Number(hm[1]), Number(hm[2]));
      } else {
        const parsed = new Date(raw);
        if (!isNaN(parsed)) time = parsed;
      }
      if (!time) return;

      // 種別・行先は増結対応で「/」区切り（併結時と同じ形式）
      const bounds = String(r["行先"] || "").split("/").map(s => s.trim()).filter(Boolean);
      const types = String(r["種別"] || "").split("/").map(s => s.trim());
      if (bounds.length) {
        bounds.forEach((b, i) => {
          results.push({ isDiagram: true, time, unban: d["運番"], isExtra, type: types[i] || types[0] || "", bound: b });
        });
      } else {
        results.push({ isDiagram: true, time, unban: d["運番"], isExtra, type: "", bound: "" });
      }
    });
  }
  return results;
}

async function loadAndShowHistoryPopup(routeVal, boardingStation, dirVal) {
  setModalTitle("過去の乗車記録から選ぶ");
  const list = document.getElementById("historyModalList");
  list.innerHTML = '<p class="modal-loading">過去の乗車記録を確認中...</p>';
  document.getElementById("historyModalOverlay").classList.add("show");

  const stationsOnRoute = (allstationData || []).filter(r => r["路線"] === routeVal);
  const indexOf = name => stationsOnRoute.findIndex(r => r["駅名"] === name);
  const isCircular = dirVal === "__outer__" || dirVal === "__inner__";
  const dirIndex = isCircular ? null : indexOf(dirVal);
  const boardingIndex = isCircular ? null : indexOf(boardingStation);
  const totalStations = stationsOnRoute.length;

  // 環状線用：ボーディング駅から見て「外回り方向」に何駅で着くか（乗り換え無しの短い方を採用）
  function circularMatchesDirection(bIndex) {
    const circBoardingIndex = indexOf(boardingStation);
    if (bIndex === -1 || circBoardingIndex === -1 || totalStations < 2) return true;
    const forwardDist = (bIndex - circBoardingIndex + totalStations) % totalStations;
    const backwardDist = totalStations - forwardDist;
    const isOuterForBound = forwardDist <= backwardDist; // 短い方を「外回り」寄りとみなす簡易判定
    return dirVal === "__outer__" ? isOuterForBound : !isOuterForBound;
  }

  // 環状線版：行先が直通先（この路線の駅リストには無い駅）の場合、その行先がどのvia_の
  // 先にある駅かを調べて、そのvia_が外回り／内回りどちら寄りかを判定し、選んでいる方面と比較する
  function circularViaThroughServiceMatchesDirection(boundName) {
    if (boardRawIdx === -1 || totalStations < 2) return null;
    const bTrim = String(boundName || "").trim();
    if (!bTrim) return null;

    for (let i = 0; i < rawRowNames.length; i++) {
      if (!isViaEntry(rawRowNames[i])) continue;
      const targetRoute = viaTargetRoute(rawRowNames[i]);
      const found = isStationReachableViaChain(targetRoute, bTrim, new Set([routeVal]));
      if (!found) continue;

      const neighborIdx = findViaNeighborRawIdx(rawRowNames, i);
      const forwardDist = (neighborIdx - boardRawIdx + totalStations) % totalStations;
      const backwardDist = totalStations - forwardDist;
      const viaGoesForward = forwardDist <= backwardDist; // このvia_（の隣接実駅）へは前方向で行く方が近いか

      const reversed = isCircularReversed(routeVal);
      const wantsOuter = dirVal === "__outer__";
      const dirGoesForward = reversed ? !wantsOuter : wantsOuter;

      return viaGoesForward === dirGoesForward;
    }
    return null;
  }

  // 行先が直通先（この路線の駅リストには無い駅）の場合、その行先がどのvia_の
  // 先にある駅かを調べて、選んでいる方面（前方向／後方向）と一致するか判定する
  const rawRowNames = stationsOnRoute.map(r => r["駅名"]); // via_の目印も含めた生の並び
  const boardRawIdx = rawRowNames.indexOf(boardingStation);
  function viaThroughServiceMatchesDirection(boundName) {
    if (isCircular || boardRawIdx === -1 || dirIndex === -1) return null; // 判定材料が無い
    const dirGoesForward = dirIndex > boardingIndex;
    const bTrim = String(boundName || "").trim();
    if (!bTrim) return null;

    for (let i = 0; i < rawRowNames.length; i++) {
      if (!isViaEntry(rawRowNames[i])) continue;
      const targetRoute = viaTargetRoute(rawRowNames[i]);
      // 直接この路線に無くても、さらに先のvia_を辿った先に見つかればOK（多段直通対応）
      const found = isStationReachableViaChain(targetRoute, bTrim, new Set([routeVal]));
      if (!found) continue; // この直通先はこのvia_の路線（の先）には無い

      const neighborIdx = findViaNeighborRawIdx(rawRowNames, i);
      const viaGoesForward = neighborIdx > boardRawIdx;
      return viaGoesForward === dirGoesForward;
    }
    return null; // 対応するvia_が見つからない＝判定不能
  }

  function computeMatchesDirection(bIndex, b) {
    let matchesDirection = true;
    if (isCircular) {
      matchesDirection = circularMatchesDirection(bIndex);
      if (bIndex === -1) {
        const viaMatch = circularViaThroughServiceMatchesDirection(b);
        if (viaMatch !== null) matchesDirection = viaMatch;
      }
    } else if (bIndex !== -1 && boardingIndex !== -1) {
      matchesDirection = (dirIndex > boardingIndex) ? (bIndex > boardingIndex) : (bIndex < boardingIndex);
    } else if (bIndex === -1) {
      const viaMatch = viaThroughServiceMatchesDirection(b);
      if (viaMatch !== null) matchesDirection = viaMatch;
    }
    return matchesDirection;
  }

  // route シートに「ダイヤ改正日」が入っていれば、それ以降の記録だけを対象にする
  const routeRow = (allrouteData || []).find(r => r["路線"] === routeVal);
  const revisionRaw = routeRow ? routeRow["ダイヤ改正日"] : "";
  const revisionDate = revisionRaw ? new Date(revisionRaw) : null;
  const hasValidRevisionDate = revisionDate && !isNaN(revisionDate);

  const rides = await getRideHistoryCached();
  const holidaySet = await getHolidaySet();
  const todayIsWeekendType = isWeekendType(new Date(), holidaySet);

  // 同じ路線・同じ乗車駅の記録のみを対象にする（ユーザーは問わない）。
  // 「臨時列車」フラグが立っている記録は、定期的な候補として出すのにふさわしくないので除外する
  function isFlaggedExtra(v) {
    return ["true", "TRUE", "1", "はい", "有", "✓"].includes(String(v).trim());
  }
  const raw = [];
  rides
    .filter(r => r["路線"] === routeVal && r["乗車駅"] === boardingStation && !isFlaggedExtra(r["臨時"]))
    .forEach(r => {
      const bounds = String(r["行先"] || "").split("/").map(s => s.trim()).filter(Boolean);
      const types = String(r["種別"] || "").split("/").map(s => s.trim());
      const parsedTime = new Date(r["時刻"] || r["発車時刻"] || "");
      const time = isNaN(parsedTime) ? null : parsedTime;

      // ダイヤ改正日より前の記録は、今のダイヤと違う可能性があるので除外
      if (hasValidRevisionDate && time && time < revisionDate) return;

      bounds.forEach((b, i) => {
        const t = types[i] || types[0] || "";
        const bIndex = indexOf(b);

        // 行先が方面判定できる（駅リストにある）場合のみ方向でも絞り込む。
        // 直通先（このルート上には無い駅）は、対応するvia_を探して方向を判定する。
        // それも判定できない場合はとりあえず候補に含める
        if (computeMatchesDirection(bIndex, b)) {
          raw.push({ type: t, bound: b, time, isWeekendType: time ? isWeekendType(time, holidaySet) : null });
        }
      });
    });

  // 新しい順に並べ、現在時刻から+30分以内のものを優先。無ければ直近10件にフォールバック
  raw.sort((a, b) => {
    if (!a.time) return 1;
    if (!b.time) return -1;
    return b.time - a.time;
  });

  // 平日ダイヤ・土休日ダイヤは別物なので、今日と同じ「曜日タイプ」の記録があればそちらを優先する
  // （無ければ曜日タイプを問わず全部を対象にフォールバック）
  const sameDayType = raw.filter(c => c.isWeekendType === todayIsWeekendType);
  const dayTypePool = sameDayType.length ? sameDayType : raw;

  // 「5分前〜1時間後」の窓の中にある記録だけを対象にし、近い順に並べる。
  // 窓の中に10件以上あれば近い方から10件、10件未満ならその窓の中の分だけ全部出す
  const nowMin = timeOfDayMinutes(new Date());
  const refMin = (nowMin - 5 + 1440) % 1440;
  const WINDOW_MINUTES = 65; // 5分前 〜 1時間後 ＝ 合計65分の窓
  const pool = dayTypePool
    .filter(c => c.time)
    .map(c => ({ ...c, _diff: (timeOfDayMinutes(c.time) - refMin + 1440) % 1440 }))
    .filter(c => c._diff <= WINDOW_MINUTES)
    .sort((a, b) => (a._diff - b._diff) || (b.time - a.time))
    .slice(0, 10);

  // 種別・行先の組み合わせで重複除去（ショートカットを優先して先に登録）
  const seen = new Set();
  const candidates = [];

  // 事前登録しておいたショートカット。時刻を設定していれば、その時間帯に近い時だけ候補に混ぜる
  // （設定していなければ今まで通り常に候補に混ぜる）
  function shortcutTimeDiffMinutes(hhmm) {
    const parts = String(hhmm || "").split(":").map(Number);
    if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return Infinity;
    const t = parts[0] * 60 + parts[1];
    const diff = Math.abs(t - nowMin);
    return Math.min(diff, 1440 - diff);
  }

  let savedShortcuts = [];
  try { savedShortcuts = JSON.parse(localStorage.getItem("tuts4_shortcuts") || "[]"); } catch (e) { /* ignore */ }
  savedShortcuts
    .filter(s => s.route === routeVal && s.station === boardingStation && s.bound)
    .filter(s => computeMatchesDirection(indexOf(s.bound), s.bound))
    .filter(s => !s.time || shortcutTimeDiffMinutes(s.time) <= 90) // 時刻設定ありは前後90分以内だけ
    .forEach(s => {
      const key = s.sujitype + "|" + s.bound;
      if (!seen.has(key)) {
        seen.add(key);
        candidates.push({
          type: s.sujitype || "", bound: s.bound, time: null,
          isShortcut: true, shortcutName: s.name, shortcutTime: s.time || ""
        });
      }
    });

  pool.forEach(c => {
    const key = c.type + "|" + c.bound;
    if (!seen.has(key)) { seen.add(key); candidates.push(c); }
  });

  // ダイヤデータ（運用シート）から、今の時間帯に近い発車時刻を候補として混ぜる
  const diagramRaw = await getDiagramCandidates(routeVal, boardingStation, todayIsWeekendType);
  diagramRaw
    .map(c => ({ ...c, _diff: (timeOfDayMinutes(c.time) - refMin + 1440) % 1440 }))
    .filter(c => c._diff <= WINDOW_MINUTES)
    .sort((a, b) => a._diff - b._diff)
    .slice(0, 10)
    .forEach(c => candidates.push(c));

  renderHistoryPopupList(candidates, routeVal, boardingStation, dirVal);
}

function renderHistoryPopupList(candidates, routeVal, boardingStation, dirVal) {
  const list = document.getElementById("historyModalList");
  list.innerHTML = "";

  if (!candidates.length) {
    list.innerHTML = '<p class="modal-loading">この方面での過去の乗車記録が見つかりませんでした。</p>';
  } else {
    candidates.forEach(c => {
      const item = document.createElement("button");
      item.type = "button";
      const timeLabel = formatHM(c.time);

      if (c.isDiagram) {
        const dest = c.bound ? `${c.type || ""}${c.bound}行き ` : "";
        item.textContent = `🚉 ${c.isExtra ? "臨時 " : ""}${timeLabel} ${dest}運番${c.unban}`;
      } else {
        const dest = c.type ? `${c.type}${c.bound}行き` : `${c.bound}行き`;
        item.textContent = c.isShortcut
          ? `📌 ${c.shortcutTime ? c.shortcutTime + " " : ""}${dest}（${c.shortcutName}）`
          : (timeLabel ? `${timeLabel} ${dest}` : dest);
      }
      item.onclick = () => applyHistoryCandidate(c);
      list.appendChild(item);
    });
  }

  const manualBtn = document.createElement("button");
  manualBtn.type = "button";
  manualBtn.className = "descent-transfer-btn";
  manualBtn.textContent = "✏️ この中に無い場合はこちら（手入力）";
  manualBtn.onclick = () => renderManualEntryForm(routeVal);
  list.appendChild(manualBtn);
}

// 候補に無い場合の手入力フォーム（ポップアップを閉じずにその場で種別・行先・時刻を入力できる）
function renderManualEntryForm(routeVal) {
  setModalTitle("種別・行先を入力");
  const list = document.getElementById("historyModalList");

  const sujitypes = [...new Set((allsujitypeData || []).filter(r => r["路線"] === routeVal).map(r => r["種別"]))].filter(Boolean);
  const bounds = [...new Set((allboundData || []).filter(r => r["路線"] === routeVal).map(r => r["行先"]))].filter(Boolean);

  const now = new Date();
  const pad = n => String(n).padStart(2, "0");
  const nowVal = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;

  list.innerHTML = `
    <label class="edit-field-label">発車時刻</label>
    <input type="datetime-local" id="manualTimeInput" value="${nowVal}">
    <label class="toggle-row">
      <input type="checkbox" id="manualIsExtraTrain">
      <span>臨時列車（過去の乗車記録の候補には出さない）</span>
    </label>
    <label class="edit-field-label">種別（無ければ「選択してください」のままでOK）</label>
    <select id="manualTypeInput">
      <option value="">選択してください</option>
      ${sujitypes.map(s => `<option value="${s}">${s}</option>`).join("")}
    </select>
    <label class="edit-field-label">行先</label>
    <select id="manualBoundInput">
      <option value="">選択してください</option>
      ${bounds.map(b => `<option value="${b}">${b}</option>`).join("")}
    </select>
    <div style="margin-top:14px;">
      <button type="button" id="manualApplyBtn" class="save-btn">この内容で入力する</button>
      <button type="button" id="manualBackBtn" class="cancel-btn">← 戻る</button>
    </div>
  `;

  document.getElementById("manualBackBtn").onclick = closeHistoryModal;

  document.getElementById("manualApplyBtn").onclick = () => {
    const timeVal = document.getElementById("manualTimeInput").value;
    const typeVal = document.getElementById("manualTypeInput").value;
    const boundVal = document.getElementById("manualBoundInput").value;

    if (!boundVal) {
      alert("行先を選択してください");
      return;
    }

    const typeSel = document.querySelector(".sujitype-select");
    const boundSel = document.querySelector(".bound-select");
    if (typeSel) { typeSel.value = typeVal; typeSel.dispatchEvent(new Event("change", { bubbles: true })); }
    if (boundSel) { boundSel.value = boundVal; boundSel.dispatchEvent(new Event("change", { bubbles: true })); }

    if (timeVal) {
      const timeEl = document.getElementById("departing_time");
      if (timeEl) timeEl.value = timeVal;
    }

    const extraEl = document.getElementById("isExtraTrain");
    const manualExtraEl = document.getElementById("manualIsExtraTrain");
    if (extraEl) extraEl.checked = !!manualExtraEl?.checked;

    closeHistoryModal();
  };
}

function closeHistoryModal() {
  const overlay = document.getElementById("historyModalOverlay");
  if (overlay) overlay.classList.remove("show");
}

function applyHistoryCandidate(c) {
  if (c.isDiagram) {
    const pad = n => String(n).padStart(2, "0");
    const now = new Date();
    const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), c.time.getHours(), c.time.getMinutes());
    const timeEl = document.getElementById("departing_time");
    if (timeEl) {
      timeEl.value = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    }
    const extraEl = document.getElementById("isExtraTrain");
    if (extraEl) extraEl.checked = !!c.isExtra;

    const typeSel = document.querySelector(".sujitype-select");
    const boundSel = document.querySelector(".bound-select");
    if (c.bound) {
      if (typeSel) { typeSel.value = c.type || ""; typeSel.dispatchEvent(new Event("change", { bubbles: true })); }
      if (boundSel) { boundSel.value = c.bound; boundSel.dispatchEvent(new Event("change", { bubbles: true })); }
    }

    closeHistoryModal();
    return;
  }

  const typeSel = document.querySelector(".sujitype-select");
  const boundSel = document.querySelector(".bound-select");

  if (typeSel) {
    typeSel.value = c.type || "";
    typeSel.dispatchEvent(new Event("change", { bubbles: true }));
  }
  if (boundSel) {
    boundSel.value = c.bound;
    boundSel.dispatchEvent(new Event("change", { bubbles: true }));
  }

  // 発車時刻も、選んだ記録の時刻（今日の日付換算）に合わせる
  const pad = n => String(n).padStart(2, "0");
  if (c.time) {
    const now = new Date();
    const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), c.time.getHours(), c.time.getMinutes());
    const timeEl = document.getElementById("departing_time");
    if (timeEl) {
      timeEl.value = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    }
  } else if (c.shortcutTime) {
    const now = new Date();
    const timeEl = document.getElementById("departing_time");
    if (timeEl) {
      timeEl.value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${c.shortcutTime}`;
    }
  }

  closeHistoryModal();
}



/* ----------------------------------------
   乗り継ぎ（旅）記録
   投稿の瞬間はまだ「どこで降りるか」分からないので、次に別の乗車を投稿した
   タイミングで「前回はどこで降りましたか？」と聞く（直前の1件だけ）。
   「乗り継ぎ中」を選べば同じ旅IDのまま続き、「ここで旅を終える」を選べば
   旅IDをリセットする（次の投稿からは新しい旅として扱う）。
   答えなかった場合は消える（次の投稿で上書きされる）。過去分をまとめて遡って
   聞く機能は無し。過去分は show.html（乗車履歴）から1件ずつ選んで記録する。

   ※ transfers用のGASデプロイURLを発行したら、下のTRANSFERS_URLに貼ってください
      （transfers_gas.gs を参照）
---------------------------------------- */
const TRANSFERS_URL = "https://script.google.com/macros/s/AKfycbwOzhHMk2WRtcUHvSMfnrimIQxUk-_dZN_43I-m8fpMNVxomE7emhevGGyC3UnLR3ejBw/exec";

// 降車駅の送信も「ローカルに一時保存→裏で送信→成功したら消す」キューで管理する。
// ページ側（show.htmlなど）はこのキューを見て「⏳ 送信待ち」を表示できる。
const PENDING_TRANSFERS_KEY = "tuts4_pending_transfers";
function getPendingTransfers() {
  try { return JSON.parse(localStorage.getItem(PENDING_TRANSFERS_KEY) || "[]"); }
  catch (e) { return []; }
}
function setPendingTransfers(list) {
  localStorage.setItem(PENDING_TRANSFERS_KEY, JSON.stringify(list));
}
function isTransferPending(username, rideTime) {
  return getPendingTransfers().some(e => e.payload.username === username && e.payload.rideTime === rideTime);
}

// transfers用GASへの送信は no-cors をやめて、実際に成否を確認できる形で送る。
// Content-Type を text/plain にするとブラウザがCORSプリフライトを送らずに済み、
// GASの{status:"ok"|"error"}という返事をそのまま読める（no-corsだと成否が一切分からないため）
async function postToTransfersGAS(payload) {
  const res = await fetch(TRANSFERS_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const data = await res.json();
  if (data && data.status && data.status !== "ok") {
    throw new Error(data.message || "GAS側でエラーが発生しました");
  }
  return data;
}

// 投稿が成功するたびに呼ばれる。前回の投稿を「次に聞く1件」として保留する
function handleTripBookkeeping(routeValue, boundValue, timeValue, stationValue, sujitypeValue) {
  const username = localStorage.getItem("username");
  if (!username) return;

  const prevPendingRaw = localStorage.getItem("tuts4_pending_descent");

  let tripId = localStorage.getItem("tuts4_current_trip_id");
  if (!tripId) {
    tripId = username + "_" + timeValue;
    localStorage.setItem("tuts4_current_trip_id", tripId);
  }

  // 前回の投稿があれば、それを「次に聞く1件」として保留する
  // （答えないまま、さらに次の投稿をすると上書きされて消える＝直前の1件だけを聞く仕様）
  if (prevPendingRaw) {
    try {
      const prev = JSON.parse(prevPendingRaw);
      if (prev.username === username) {
        localStorage.setItem("tuts4_awaiting_descent_answer", prevPendingRaw);
      }
    } catch (e) { /* 壊れてたら無視 */ }
  }

  localStorage.setItem("tuts4_pending_descent", JSON.stringify({
    username, rideTime: timeValue, route: routeValue, bound: boundValue,
    station: stationValue || "", sujitype: sujitypeValue || "", tripId
  }));
}

// スタンプポップアップを閉じたあと、聞くべき質問が残っていれば開く
function maybeAskDescentStation() {
  const raw = localStorage.getItem("tuts4_awaiting_descent_answer");
  if (!raw) return;
  localStorage.removeItem("tuts4_awaiting_descent_answer"); // 二重に聞かないよう先に消しておく

  let prev;
  try { prev = JSON.parse(raw); } catch (e) { return; }

  openDescentPopup(prev);
}

function formatRideTimeLabel(rideTime) {
  const d = new Date(rideTime);
  if (isNaN(d)) return String(rideTime || "");
  const pad = n => String(n).padStart(2, "0");
  const weekday = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}(${weekday}) ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function openDescentPopup(prev) {
  setModalTitle("降車駅の記録");

  const list = document.getElementById("historyModalList");
  const timeLabel = formatRideTimeLabel(prev.rideTime);
  const typeLabel = prev.sujitype ? `${prev.sujitype}` : "";
  const rideSummary = `${timeLabel}<br>${prev.route}<br>${prev.station || "(乗車駅不明)"} → ${typeLabel}${prev.bound}行き`;

  const chain = []; // [{ junction, nextRoute }, ...]
  let currentRoute = prev.route;
  let legRefStation = prev.station; // 今の路線に入ってきた側の基準駅（方向判定に使う）
  const circularFixedDir = isCircularRoute(prev.route) ? getCircularFixedDirection(prev.route) : null;
  let circularDir = circularFixedDir; // 片方向のみの路線は自動確定、それ以外は選択後にセット
  let mode = (isCircularRoute(prev.route) && !circularFixedDir) ? "circularDir" : "station"; // "circularDir" | "station" | "junction" | "route"
  let submitting = false;

  function breadcrumbHTML() {
    if (!chain.length) return "";
    let html = `<span>${prev.route}</span>`;
    chain.forEach(h => { html += ` → <span style="color:#888;">[${h.junction}]</span> → <span>${h.nextRoute}</span>`; });
    return `<div class="descent-breadcrumb">${html}</div>`;
  }

  function stationNamesFor(routeName) {
    const rows = (allstationData || []).filter(r => r["路線"] === routeName);
    return [...new Set(rows.map(r => r["駅名"]))];
  }

  // 駅一覧をボタン用アイテムに変換する。via_はその「位置」から直接、隣の拠点駅を割り出して
  // 使うので、同じ文字列のvia_が路線の両端にあっても（例: 東西線の中野側・西船橋側）、
  // 別々の候補としてちゃんと区別できる（indexOfによる名前検索に頼らないため）
  function buildStationItems(routeName) {
    const rawRows = (allstationData || []).filter(r => r["路線"] === routeName).map(r => r["駅名"]);
    const refRawIdx = legRefStation ? rawRows.indexOf(legRefStation) : -1;
    const circular = isCircularRoute(routeName);
    const reversed = circular ? isCircularReversed(routeName) : false;
    const seen = new Set();
    const items = [];

    rawRows.forEach((name, rawIdx) => {
      if (isViaEntry(name)) {
        const nextRoute = viaTargetRoute(name);

        let neighbor = null;
        const tryBackward = () => { for (let i = rawIdx - 1; i >= 0; i--) if (!isViaEntry(rawRows[i])) return rawRows[i]; return null; };
        const tryForward = () => { for (let i = rawIdx + 1; i < rawRows.length; i++) if (!isViaEntry(rawRows[i])) return rawRows[i]; return null; };

        if (circular && circularDir) {
          // 環状線は「基準駅がvia_より前か後ろか」という直線的な判定が通用しない
          // （ループ上ではどちら向きでもいずれ基準駅に辿り着けるため）。
          // なので、すでに選んである内回り／外回りの向きをそのまま使う
          const wantsOuter = circularDir === "外回り";
          const goForward = reversed ? !wantsOuter : wantsOuter;
          // 列車が「forward」方向に進んでいるなら、via_マーカーに来た側（直前の駅）は
          // raw位置としては「backward」側にあるので、探す順序を逆にする
          neighbor = goForward ? (tryBackward() || tryForward()) : (tryForward() || tryBackward());
        } else if (refRawIdx !== -1) {
          // 基準駅（乗車駅、または前の乗換駅）がvia_より前か後ろかを見て、
          // 同じ側にある実駅を優先して探す（分からなければ従来通り前方向を優先）
          neighbor = refRawIdx > rawIdx ? (tryForward() || tryBackward()) : (tryBackward() || tryForward());
        } else {
          neighbor = tryBackward() || tryForward();
        }
        if (!neighbor) return; // 隣の実駅が見つからない場合はスキップ

        const key = "via|" + neighbor + "|" + nextRoute;
        if (seen.has(key)) return;
        seen.add(key);
        items.push({
          label: `→ ${nextRoute}へ直通（${neighbor}）`,
          onClick: () => {
            chain.push({ junction: neighbor, nextRoute });
            currentRoute = nextRoute;
            legRefStation = neighbor;
            render();
          }
        });
      } else {
        const key = "st|" + name;
        if (seen.has(key)) return;
        seen.add(key);
        items.push({ label: name, onClick: () => finishAndSubmit(name) });
      }
    });

    return items;
  }

  function render() {
    let promptText = "";
    let items = [];

    if (mode === "circularDir") {
      promptText = `↑${currentRoute}は環状線です。この乗車はどちら回りでしたか？`;
      items = [["外回り", true], ["内回り", false]].map(([label, wantOuter]) => {
        const neighbor = circularNeighborLabel(currentRoute, prev.station, wantOuter);
        return {
          label: neighbor ? `${label}（${neighbor}方面）` : label,
          onClick: () => { circularDir = label; mode = "station"; render(); }
        };
      });
    } else if (mode === "station") {
      promptText = chain.length
        ? `↑${currentRoute}のどこで降りましたか？`
        : "↑この乗車、どこで降りましたか？";
      items = buildStationItems(currentRoute);
    } else if (mode === "junction") {
      promptText = `↑${currentRoute}のどの駅で乗り換え・直通しますか？`;
      items = stationNamesFor(currentRoute)
        .filter(n => !isViaEntry(n))
        .map(n => ({
          label: n,
          onClick: () => { chain.push({ junction: n, nextRoute: null }); mode = "route"; render(); }
        }));
      items.push({
        label: "← 戻る",
        extraClass: "descent-back-btn",
        onClick: () => { mode = "station"; render(); }
      });
    } else if (mode === "route") {
      promptText = "↑次はどの路線に直通しますか？";
      const allRoutes = [...new Set((allrouteData || []).map(r => r["路線"]))].filter(Boolean).sort();
      items = allRoutes.map(n => ({
        label: n,
        onClick: () => {
          chain[chain.length - 1].nextRoute = n;
          currentRoute = n;
          legRefStation = chain[chain.length - 1].junction;
          mode = "station";
          render();
        }
      }));
      items.push({
        label: "← 戻る",
        extraClass: "descent-back-btn",
        onClick: () => { chain.pop(); mode = "junction"; render(); }
      });
    }

    const itemsHTML = items.map((it, i) =>
      `<button type="button" class="${it.extraClass || ""}" data-i="${i}">${it.label}</button>`
    ).join("");

    list.innerHTML = `
      <div class="descent-ride-summary">${rideSummary}</div>
      ${breadcrumbHTML()}
      <p class="modal-loading" style="margin-bottom:8px;">${promptText}</p>
      <div class="modal-list">${itemsHTML}</div>
      <button type="button" id="skipDescentBtn" style="background:none; color:#999; border:none; text-decoration:underline; padding:8px 0 0;">あとで答える</button>
    `;

    const buttons = list.querySelectorAll(".modal-list button");
    buttons.forEach(btn => { btn.disabled = true; });
    setTimeout(() => { if (!submitting) buttons.forEach(btn => { btn.disabled = false; }); }, 450);

    buttons.forEach((btn, i) => {
      btn.onclick = () => { if (!submitting && !btn.disabled) items[i].onClick(); };
    });

    document.getElementById("skipDescentBtn").onclick = () => closeHistoryModal();
  }

  function finishAndSubmit(finalStation) {
    let alightValue = finalStation;
    if (chain.length) {
      alightValue = chain.map(h => `${h.junction}@${h.nextRoute}`).join("|") + "|" + finalStation;
    }
    if (circularDir) {
      alightValue = `[環状:${circularDir}]${alightValue}`;
    }

    list.innerHTML = `
      <div class="descent-ride-summary">${rideSummary}</div>
      ${breadcrumbHTML()}
      <p class="modal-loading" style="margin-bottom:8px;">↓${finalStation}で降車として記録します</p>
      <button type="button" id="continueTripBtn">🚃 乗り継ぎ中（旅を続ける）</button>
      <button type="button" id="endTripBtn">🏁 ここで旅を終える</button>
    `;

    document.getElementById("continueTripBtn").onclick = () => {
      submitting = true;
      document.getElementById("continueTripBtn").disabled = true;
      document.getElementById("endTripBtn").disabled = true;
      document.getElementById("continueTripBtn").textContent = "送信中...";
      submitDescentValue(prev, alightValue, false);
    };
    document.getElementById("endTripBtn").onclick = () => {
      submitting = true;
      document.getElementById("continueTripBtn").disabled = true;
      document.getElementById("endTripBtn").disabled = true;
      document.getElementById("endTripBtn").textContent = "送信中...";
      submitDescentValue(prev, alightValue, true);
    };
  }

  render();
  document.getElementById("historyModalOverlay").classList.add("show");
}

let _submittingDescent = false;

async function submitDescentValue(prev, alightStation, tripEnd) {
  if (_submittingDescent) return; // 連打防止
  if (!alightStation) return;

  _submittingDescent = true;

  // 旧形式：単独の「via_路線名」を直接選んだ場合は、そのままその路線へフォームをジャンプする
  // （新しい「🔀 別路線に直通する」チェーンを使った場合は、ここではジャンプしない＝連続入力を妨げない）
  const viaJump = isViaEntry(alightStation);
  const effectiveTripEnd = viaJump ? false : tripEnd;

  const payload = {
    username: prev.username,
    rideTime: prev.rideTime,
    alightStation,
    tripId: prev.tripId,
    tripEnd: effectiveTripEnd
  };

  const entryId = Date.now() + "_" + Math.random().toString(36).slice(2);
  const queue = getPendingTransfers();
  queue.push({ id: entryId, payload });
  setPendingTransfers(queue);

  // 裏で実際に送信する（結果を待たず、1秒後にUIを先に進める）
  postToTransfersGAS(payload)
    .then(() => { setPendingTransfers(getPendingTransfers().filter(e => e.id !== entryId)); })
    .catch(e => console.error("降車駅の送信に失敗（あとで自動的に再送します）:", e));

  await new Promise(r => setTimeout(r, 1000));

  _submittingDescent = false;

  if (effectiveTripEnd) {
    localStorage.removeItem("tuts4_current_trip_id");
  }

  closeHistoryModal();

  if (viaJump) {
    jumpToRoute(viaTargetRoute(alightStation));
  }
}

// 直通先の路線名がわかっている場合、フォームのエリア〜路線までを自動で合わせてジャンプする
async function jumpToRoute(routeName) {
  function setAndTrigger(id, val) {
    const el = document.getElementById(id);
    if (!el || !val) return;
    el.value = val;
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }
  function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

  const routeRow = (allrouteData || []).find(r => r["路線"] === routeName);
  if (!routeRow) return;
  const typeVal = routeRow["区分"];
  const companyVal = routeRow["会社"];
  const countryRow = (allCountryData || []).find(r => r["区分"] === typeVal && r["会社"] === companyVal);
  const areaVal = countryRow ? countryRow["えりあ"] : "";

  setAndTrigger("area", areaVal);
  setAndTrigger("type", typeVal);
  await wait(300);
  setAndTrigger("country", companyVal);
  await wait(300);
  setAndTrigger("route", routeName);

  window.scrollTo({ top: 0, behavior: "smooth" });
}



/* ----------------------------------------
   入力内容の下書き保存
   リロードしても入力中の内容が消えないよう、変更のたびに localStorage に保存し、
   ページを開いた時に復元する。消えるのは「クリア」ボタンを押した時と、投稿完了時のみ。
---------------------------------------- */
const DRAFT_KEY = "tuts4_form_draft";
let _restoringDraft = false; // 復元中はポップアップ等の副作用を止めるためのフラグ

function saveDraft() {
  if (_restoringDraft) return;

  const rideBlocks = [...document.querySelectorAll(".ride-block")].map(block => ({
    station: block.querySelector(".station-select")?.value || "",
    sujitype: block.querySelector(".sujitype-select")?.value || "",
    bound: block.querySelector(".bound-select")?.value || ""
  }));

  const draft = {
    area: document.getElementById("area")?.value || "",
    type: document.getElementById("type")?.value || "",
    country: document.getElementById("country")?.value || "",
    route: document.getElementById("route")?.value || "",
    model: document.getElementById("model")?.value || "",
    number: document.getElementById("number")?.value || "",
    memo: document.getElementById("memo")?.value || "",
    departing_time: document.getElementById("departing_time")?.value || "",
    rideBlocks
  };

  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

// フォーム内の変更をまとめて拾って下書き保存する（併結で増えたブロックにも自動で効く）
document.querySelector("main")?.addEventListener("change", saveDraft);
document.querySelector("main")?.addEventListener("input", saveDraft);

async function restoreDraft() {
  const raw = localStorage.getItem(DRAFT_KEY);
  if (!raw) return;

  let draft;
  try { draft = JSON.parse(raw); } catch (e) { localStorage.removeItem(DRAFT_KEY); return; }

  function setAndTrigger(id, val) {
    const el = document.getElementById(id);
    if (!el || !val) return;
    el.value = val;
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }
  function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

  _restoringDraft = true;
  try {
    if (draft.departing_time) {
      const timeEl = document.getElementById("departing_time");
      if (timeEl) timeEl.value = draft.departing_time;
    }
    if (draft.memo) {
      const memoEl = document.getElementById("memo");
      if (memoEl) memoEl.value = draft.memo;
    }

    setAndTrigger("area", draft.area);
    setAndTrigger("type", draft.type);
    await wait(400);
    setAndTrigger("country", draft.country);
    await wait(400);
    setAndTrigger("route", draft.route);
    await wait(400);

    // 併結ブロックが複数あった場合は、必要な数だけ追加してから値を復元する
    if (draft.rideBlocks && draft.rideBlocks.length > 1 && typeof addCoupling === "function") {
      for (let i = 1; i < draft.rideBlocks.length; i++) addCoupling();
      await wait(200);
    }

    const stationSelects = document.querySelectorAll(".station-select");
    const sujitypeSelects = document.querySelectorAll(".sujitype-select");
    const boundSelects = document.querySelectorAll(".bound-select");

    (draft.rideBlocks || []).forEach((b, i) => {
      if (stationSelects[i] && b.station) {
        stationSelects[i].value = b.station;
        stationSelects[i].dispatchEvent(new Event("change", { bubbles: true }));
      }
      if (sujitypeSelects[i] && b.sujitype) sujitypeSelects[i].value = b.sujitype;
      if (boundSelects[i] && b.bound) boundSelects[i].value = b.bound;
    });

    await wait(300);
    setAndTrigger("model", draft.model);
    await wait(300);
    setAndTrigger("number", draft.number);
  } finally {
    _restoringDraft = false;
  }
}

// マスタデータ（路線・車両形式）が実際に読み込まれるまで待ってから下書きを復元する
// （固定時間待ちだと、マスタデータの読み込みが増えた分、間に合わず復元に失敗することがあった）
window.addEventListener("load", () => {
  waitForMasterDataThenRestore();
});

async function waitForMasterDataThenRestore() {
  const maxWaitMs = 6000;
  const start = Date.now();
  while (
    (!allrouteData || !allrouteData.length || !allmodelData || !allmodelData.length) &&
    (Date.now() - start < maxWaitMs)
  ) {
    await new Promise(r => setTimeout(r, 150));
  }
  restoreDraft();
}



/* ----------------------------------------
   投稿の一時保存＆裏送信キュー
   GASの応答が遅いことがあるので、投稿ボタンを押したら1秒だけ「送信中」にして先に進める。
   実際のスプシへの送信はローカルに一時保存したうえで裏で行い、成功したら消す。
   タブを開いた時・オンライン復帰時・定期的（30秒おき）に、残っている分を自動で再送する。
---------------------------------------- */
const PENDING_POSTS_KEY = "tuts4_pending_posts";
const PENDING_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzuhYRx9gyb5J1a-6ZuxmcCepIU1hIMnuBo58wh5CTYMWE785YAnuJY4ckm_13-ZHc7/exec";

function getPendingPosts() {
  try { return JSON.parse(localStorage.getItem(PENDING_POSTS_KEY) || "[]"); }
  catch (e) { return []; }
}
function setPendingPosts(list) {
  localStorage.setItem(PENDING_POSTS_KEY, JSON.stringify(list));
}

let _flushingPendingPosts = false;
async function flushPendingPosts() {
  if (_flushingPendingPosts) return;
  _flushingPendingPosts = true;

  try {
    const queue = getPendingPosts();
    if (!queue.length) return;

    const stillPending = [];
    for (const entry of queue) {
      try {
        await fetch(PENDING_SCRIPT_URL, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(entry.payload),
        });
        // no-corsなので成功したかどうかは分からないが、ネットワーク自体が通れば送れたとみなす
      } catch (e) {
        console.error("投稿の再送信に失敗（次回また試します）:", e);
        stillPending.push(entry);
      }
    }
    setPendingPosts(stillPending);
  } finally {
    _flushingPendingPosts = false;
  }
}

window.addEventListener("load", () => setTimeout(flushPendingPosts, 1500));
window.addEventListener("online", flushPendingPosts);
setInterval(flushPendingPosts, 30000);

let _flushingPendingTransfers = false;
async function flushPendingTransfers() {
  if (_flushingPendingTransfers) return;
  _flushingPendingTransfers = true;

  try {
    const queue = getPendingTransfers();
    if (!queue.length) return;

    const stillPending = [];
    for (const entry of queue) {
      try {
        await postToTransfersGAS(entry.payload);
      } catch (e) {
        console.error("降車駅の再送信に失敗（次回また試します）:", e);
        stillPending.push(entry);
      }
    }
    setPendingTransfers(stillPending);
  } finally {
    _flushingPendingTransfers = false;
  }
}

window.addEventListener("load", () => setTimeout(flushPendingTransfers, 1500));
window.addEventListener("online", flushPendingTransfers);
setInterval(flushPendingTransfers, 30000);



/* ----------------------------------------
   「運営」アカウント専用：現在地に頼らず、エリア〜駅名を手動で選んで
   「最寄り駅から選んだ後」と同じ動作（方面→過去の乗車記録）を他の駅でもテストできるようにする
---------------------------------------- */
function openAdminStationPicker() {
  let mode = "area";
  let areaVal = "", typeVal = "", countryVal = "", routeVal = "";

  function backItem(fn) {
    return { label: "← 戻る", extraClass: "descent-back-btn", onClick: fn };
  }

  function render() {
    let title = "";
    let items = [];

    if (mode === "area") {
      title = "【運営テスト】エリアを選択";
      const areas = [...new Set((allCountryData || []).map(r => r["えりあ"]))].filter(Boolean);
      items = areas.map(a => ({ label: a, onClick: () => { areaVal = a; mode = "type"; render(); } }));
    } else if (mode === "type") {
      title = "【運営テスト】区分を選択";
      const types = [...new Set((allCountryData || [])
        .filter(r => r["えりあ"] === areaVal)
        .map(r => r["区分"]))].filter(Boolean);
      items = types.map(t => ({ label: t, onClick: () => { typeVal = t; mode = "country"; render(); } }));
      items.push(backItem(() => { mode = "area"; render(); }));
    } else if (mode === "country") {
      title = "【運営テスト】会社を選択";
      const companies = [...new Set((allCountryData || [])
        .filter(r => r["えりあ"] === areaVal && r["区分"] === typeVal)
        .map(r => r["会社"]))].filter(Boolean);
      items = companies.map(c => ({ label: c, onClick: () => { countryVal = c; mode = "route"; render(); } }));
      items.push(backItem(() => { mode = "type"; render(); }));
    } else if (mode === "route") {
      title = "【運営テスト】路線を選択";
      const routes = [...new Set((allrouteData || [])
        .filter(r => r["区分"] === typeVal && r["会社"] === countryVal)
        .map(r => r["路線"]))].filter(Boolean);
      items = routes.map(r => ({ label: r, onClick: () => { routeVal = r; mode = "station"; render(); } }));
      items.push(backItem(() => { mode = "country"; render(); }));
    } else if (mode === "station") {
      title = "【運営テスト】駅名を選択";
      const stations = [...new Set((allstationData || [])
        .filter(r => r["路線"] === routeVal)
        .map(r => r["駅名"]))].filter(n => !isViaEntry(n));
      items = stations.map(s => ({ label: s, onClick: () => applyAdminStation(areaVal, typeVal, countryVal, routeVal, s) }));
      items.push(backItem(() => { mode = "route"; render(); }));
    }

    setModalTitle(title);
    const list = document.getElementById("historyModalList");
    list.innerHTML = `<div class="modal-list">${items.map((it, i) => `<button type="button" class="${it.extraClass || ""}" data-i="${i}">${it.label}</button>`).join("")}</div>`;

    list.querySelectorAll(".modal-list button").forEach((btn, i) => {
      btn.onclick = () => items[i].onClick();
    });

    document.getElementById("historyModalOverlay").classList.add("show");
  }

  render();
}

async function applyAdminStation(areaVal, typeVal, countryVal, routeVal, stationVal) {
  function setAndTrigger(id, val) {
    const el = document.getElementById(id);
    if (!el || !val) return;
    el.value = val;
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }
  function setAndTriggerFirst(selector, val) {
    const el = document.querySelector(selector);
    if (!el || !val) return;
    el.value = val;
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }
  function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

  setAndTrigger("area", areaVal);
  setAndTrigger("type", typeVal);
  await wait(300);
  setAndTrigger("country", countryVal);
  await wait(300);
  setAndTrigger("route", routeVal);
  await wait(300);
  setAndTriggerFirst(".station-select", stationVal);

  // 「最寄り駅から選択」経由の時と同じく、続けて方面・履歴ポップアップを開く
  startStationPopupFlow();
}


/* ----------------------------------------
   車両検索：入力した車番（各号車のいずれか）を含む編成を、今選んでいる路線に
   走ってる車両形式に絞って検索し、一覧表示する
---------------------------------------- */
function updateNumberTriggerLabel() {
  const btn = document.getElementById("numberTriggerBtn");
  if (!btn) return;
  const val = document.getElementById("number").value;
  btn.textContent = val ? formatFormationLabel(val) : "選択してください";
  btn.classList.toggle("placeholder", !val);
}
document.getElementById("number")?.addEventListener("change", updateNumberTriggerLabel);

function updateModelTriggerLabel() {
  const btn = document.getElementById("modelTriggerBtn");
  if (!btn) return;
  const val = document.getElementById("model").value;
  btn.textContent = val || "選択してください";
  btn.classList.toggle("placeholder", !val);
}
document.getElementById("model")?.addEventListener("change", updateModelTriggerLabel);

function openModelPicker() {
  const routeVal = document.getElementById("route").value;
  if (!routeVal) {
    alert("先に路線を選んでください");
    return;
  }

  setModalTitle("車両形式を選択");
  const list = document.getElementById("historyModalList");

  const models = [...new Set((allmodelData || []).filter(r => r["路線"] === routeVal).map(r => r["車両形式"]))].filter(Boolean);

  if (!models.length) {
    list.innerHTML = '<p class="modal-loading">この路線の車両形式データがありません</p>';
  } else {
    list.innerHTML = models.map((m, i) => `
        <div class="car-search-result" data-i="${i}">
          <div class="csr-main">
            <img class="csr-icon" src="${resolveTrainImage({ 車両形式: m }, routeVal)}" loading="lazy"
                 onerror="this.onerror=null;this.src='${FALLBACK_TRAIN_IMAGE}';">
            <div class="csr-info">
              <div class="csr-header"><span>${m}</span></div>
            </div>
          </div>
        </div>
      `).join("");

    list.querySelectorAll(".car-search-result").forEach((el, i) => {
      el.onclick = () => {
        const modelSelect = document.getElementById("model");
        modelSelect.value = models[i];
        modelSelect.dispatchEvent(new Event("change", { bubbles: true }));
        closeHistoryModal();
      };
    });
  }

  document.getElementById("historyModalOverlay").classList.add("show");
}

// number シートの車番が "*" で囲まれている（例: ***32651***）ものは「注目の編成」として
// 一覧の先頭に来るようにソートする
// number シートの車番が "****7連****" のように"*"で囲まれている行は、実際の編成ではなく
// 「ここから次の見出しまでは7連グループ」というグループ見出し行として扱う
function formationGroupHeaderLabel(raw) {
  const m = String(raw || "").trim().match(/^\*+(.+?)\*+$/);
  return m ? m[1].trim() : null;
}

// 指定した車両形式の number シート行を、見出し行を区切りにしてグループ分けする
// （見出し行自体は編成としては返さない。見出しが無い状態の行は label:null のグループに入る）
function parseFormationGroups(modelVal) {
  const rows = (allnumberData || []).filter(r => r["車両形式"] === modelVal);
  const groups = [];
  let current = { label: null, formations: [] };

  rows.forEach(r => {
    const headerLabel = formationGroupHeaderLabel(r["車番"]);
    if (headerLabel !== null) {
      if (current.formations.length) groups.push(current);
      current = { label: headerLabel, formations: [] };
    } else {
      current.formations.push(r);
    }
  });
  if (current.formations.length) groups.push(current);

  return groups;
}

function openFormationPicker() {
  const modelVal = document.getElementById("model").value;
  const routeVal = document.getElementById("route").value;
  if (!modelVal) {
    alert("先に車両形式を選んでください");
    return;
  }

  setModalTitle(`${modelVal} の編成を選択`);
  const list = document.getElementById("historyModalList");

  const groups = parseFormationGroups(modelVal);
  const allFormations = groups.flatMap(g => g.formations);
  const namedGroups = groups.filter(g => g.label); // ドロップダウンに出すのは見出し付きグループのみ

  list.innerHTML = `
    ${namedGroups.length ? `
      <select id="formationFilterSelect" class="formation-filter-select">
        <option value="all">すべて表示</option>
        ${namedGroups.map(g => `<option value="${g.label}">${g.label}</option>`).join("")}
      </select>
    ` : ""}
    <div id="formationResultsArea"></div>
  `;

  function render(filterLabel) {
    const formations = (filterLabel && filterLabel !== "all")
      ? (namedGroups.find(g => g.label === filterLabel)?.formations || [])
      : allFormations;

    const area = document.getElementById("formationResultsArea");

    if (!formations.length) {
      area.innerHTML = '<p class="modal-loading">該当する編成がありません</p>';
      return;
    }

    area.innerHTML = formations.map((r, i) => `
        <div class="car-search-result" data-i="${i}">
          <div class="csr-main">
            <img class="csr-icon" src="${resolveTrainImage(r, routeVal)}" loading="lazy"
                 onerror="this.onerror=null;this.src='${FALLBACK_TRAIN_IMAGE}';">
            <div class="csr-info">
              <div class="csr-header"><span>${formatFormationLabel(r["車番"])}</span></div>
              ${noteBadgeHtml(r)}
            </div>
          </div>
        </div>
      `).join("");

    area.querySelectorAll(".car-search-result").forEach((el, i) => {
      el.onclick = () => {
        const chosen = formations[i];
        const numberSelect = document.getElementById("number");
        numberSelect.value = cleanFormationNumber(chosen["車番"]);
        numberSelect.dispatchEvent(new Event("change", { bubbles: true }));
        closeHistoryModal();
      };
    });
  }

  function scrollToTop() {
    const listEl = document.getElementById("historyModalList");
    if (listEl) listEl.scrollTop = 0;
    const panelEl = document.querySelector(".modal-panel");
    if (panelEl) panelEl.scrollTop = 0;
  }

  if (namedGroups.length) {
    document.getElementById("formationFilterSelect").onchange = e => { render(e.target.value); scrollToTop(); };
  }
  render("all");
  scrollToTop();

  document.getElementById("historyModalOverlay").classList.add("show");
}

function openCarSearchPopup() {
  setModalTitle("🔍 車両検索");
  const list = document.getElementById("historyModalList");

  list.innerHTML = `
    <input type="text" id="carSearchInput" placeholder="車番を入力（部分一致）"
      style="width:100%; padding:9px; border-radius:8px; border:1px solid #ccc; margin-bottom:10px; box-sizing:border-box;">
    <button type="button" id="carSearchGoBtn" style="width:100%; margin-bottom:12px;">検索</button>
    <div id="carSearchResults"></div>
  `;

  document.getElementById("carSearchGoBtn").onclick = runCarSearch;
  document.getElementById("carSearchInput").addEventListener("keydown", e => {
    if (e.key === "Enter") runCarSearch();
  });

  document.getElementById("historyModalOverlay").classList.add("show");
  setTimeout(() => document.getElementById("carSearchInput")?.focus(), 100);
}

function cleanFormationNumber(num) {
  return String(num || "").trim().replace(/\*/g, "");
}

function noteBadgeHtml(r) {
  const note = String((r && r["備考"]) || "").trim();
  return note ? `<span class="csr-note-badge">${note}</span>` : "";
}

function formatFormationLabel(num) {
  const s = cleanFormationNumber(num);
  if (!s) return s;
  if (s.includes("編成") || /F$/i.test(s)) return s; // 既に「F」や「編成」で終わってるなら重複させない
  return `${s}編成`;
}

// 画像が無い時に表示するフォールバック画像
const FALLBACK_TRAIN_IMAGE = "https://img.elesite-next.com/hatena.webp";

// Google Driveの共有リンク（.../file/d/【ID】/view?... など）を、<img>で直接表示できる
// サムネイルURLに変換する。既に直リンクや通常のhttp(s)画像URLならそのまま返す
function toDisplayableImageUrl(url) {
  const s = String(url || "").trim();
  if (!s) return "";
  // https://drive.google.com/file/d/【ID】/view?usp=sharing 形式
  let m = s.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (m) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w300`;
  // https://drive.google.com/open?id=【ID】 や ...?id=【ID】 形式
  m = s.match(/[?&]id=([^&]+)/);
  if (m && s.includes("drive.google.com")) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w300`;
  return s; // それ以外のURLはそのまま
}

// 編成の画像URLを決める（優先順位：①その編成専用 ②形式の基本 ③フォールバック）
function resolveTrainImage(numberRow, routeVal) {
  if (numberRow) {
    const own = toDisplayableImageUrl(numberRow["画像URL"]);
    if (own) return own;

    // 直通等で同じ車両形式が複数路線の行にまたがっていることがあるため、
    // まず「今選んでいる路線」の行を優先してチェックし、無ければ他のどの行でもいいので探す
    const modelRows = (allmodelData || []).filter(r => r["車両形式"] === numberRow["車両形式"]);
    if (routeVal) {
      const preferred = modelRows.find(r => r["路線"] === routeVal);
      if (preferred) {
        const preferredImg = toDisplayableImageUrl(preferred["画像URL"]);
        if (preferredImg) return preferredImg;
      }
    }
    for (const row of modelRows) {
      const modelImg = toDisplayableImageUrl(row["画像URL"]);
      if (modelImg) return modelImg;
    }
  }
  return FALLBACK_TRAIN_IMAGE;
}

function getCarNumbers(r) {
  const carKeys = Object.keys(r)
    .filter(k => /号車$/.test(k))
    .sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0));
  const cars = carKeys.map(k => String(r[k] || "").trim()).filter(Boolean);
  return cars.length ? cars : [String(r["車番"] || "").trim()].filter(Boolean);
}

function runCarSearch() {
  const query = document.getElementById("carSearchInput").value.trim();
  const resultsDiv = document.getElementById("carSearchResults");
  const routeVal = document.getElementById("route").value;

  if (!query) {
    resultsDiv.innerHTML = '<p class="modal-loading">車番を入力してください</p>';
    return;
  }

  // 今選んでいる路線で使われている車両形式に絞る
  const modelsOnRoute = new Set((allmodelData || []).filter(r => r["路線"] === routeVal).map(r => r["車両形式"]));

  const matches = (allnumberData || []).filter(r => {
    if (formationGroupHeaderLabel(r["車番"]) !== null) return false; // グループ見出し行は除外
    if (routeVal && !modelsOnRoute.has(r["車両形式"])) return false;
    const cars = getCarNumbers(r);
    return cars.some(c => c.includes(query));
  });

  if (!matches.length) {
    resultsDiv.innerHTML = '<p class="modal-loading">見つかりませんでした</p>';
    return;
  }

  resultsDiv.innerHTML = matches.map((r, i) => {
    const cars = getCarNumbers(r);
    const chips = cars.map(c => `<span class="csr-car${c.includes(query) ? " highlight" : ""}">${c}</span>`).join("");
    return `
      <div class="car-search-result" data-i="${i}">
        <div class="csr-main">
          <img class="csr-icon" src="${resolveTrainImage(r, routeVal)}" loading="lazy"
               onerror="this.onerror=null;this.src='${FALLBACK_TRAIN_IMAGE}';">
          <div class="csr-info">
            <div class="csr-header">
              <span>${r["車両形式"]}</span>
              <span class="csr-number">${formatFormationLabel(r["車番"])}</span>
            </div>
            ${noteBadgeHtml(r)}
            <div class="csr-cars">${chips}</div>
          </div>
        </div>
      </div>
    `;
  }).join("");

  resultsDiv.querySelectorAll(".car-search-result").forEach((el, i) => {
    el.onclick = () => {
      const chosen = matches[i];
      const modelSelect = document.getElementById("model");
      modelSelect.value = chosen["車両形式"];
      modelSelect.dispatchEvent(new Event("change", { bubbles: true }));
      setTimeout(() => {
        const numberSelect = document.getElementById("number");
        numberSelect.value = cleanFormationNumber(chosen["車番"]);
        numberSelect.dispatchEvent(new Event("change", { bubbles: true }));
      }, 300);
      closeHistoryModal();
    };
  });
}
