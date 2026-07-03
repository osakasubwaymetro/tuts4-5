// version: 1.10.2
// 1.10.2: 古いバージョンで積まれたキュー項目に乗車駅・種別が無く「乗車駅不明」になる
//         不具合を修正。表示前にキャッシュ済みデータから自動補完し、キューにも書き戻す
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
document.getElementById("username").value = localStorage.getItem("username");


// areaの取得
fetch("https://opensheet.elk.sh/1ZooIjdlOwsLZVjQv6KN53h4X2JYUyULYuJTuhbgk95s/area")
  .then(res => res.json())
  .then(data => {
    const select = document.getElementById("area");
    select.innerHTML = '<option value="">選択してください</option>';
    data.forEach(row => {
      const val = row["えりあ"];
      const opt = document.createElement("option");
      opt.textContent = val;
      opt.value = val;
      select.appendChild(opt);
    });
  })
  .catch(err => console.error(err));

// typeの取得
fetch("https://opensheet.elk.sh/1ZooIjdlOwsLZVjQv6KN53h4X2JYUyULYuJTuhbgk95s/type")
  .then(res => res.json())
  .then(data => {
    const select = document.getElementById("type");
    select.innerHTML = '<option value="">選択してください</option>';
    data.forEach(row => {
      const val = row["区分"];
      const opt = document.createElement("option");
      opt.textContent = val;
      opt.value = val;
      select.appendChild(opt);
    });
  })
  .catch(err => console.error(err));

// countryデータをまとめて読み込み
fetch(countryURL)
  .then(res => res.json())
  .then(data => {
    allCountryData = data;
  })
  .catch(err => console.error(err));

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
fetch(route)
  .then(res => res.json())
  .then(data => {
    allrouteData = data;
    updateCoupleButtonVisibility();
  })
  .catch(err => console.error(err));

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
fetch(model)
  .then(res => res.json())
  .then(data => {
    allmodelData = data;
  })
  .catch(err => console.error(err));

// areaまたはtypeが変わったら、countryプルダウンを更新
document.getElementById("route").addEventListener("change", updatemodelList);

function updatemodelList() {
  const routeVal = document.getElementById("route").value;
  const select = document.getElementById("model");

  select.innerHTML = '<option value="">選択してください</option>';

  // 両方選ばれていなければ終了
  if (!routeVal) return;

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
}



// stationデータをまとめて読み込み
fetch("https://opensheet.elk.sh/1ZooIjdlOwsLZVjQv6KN53h4X2JYUyULYuJTuhbgk95s/station")
  .then(res => res.json())
  .then(data => {
    allstationData = data;
    updatestationList();
  })
  .catch(err => console.error(err));

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
  return name.slice(4);
}
function formatStationOption(name) {
  return isViaEntry(name) ? `→ ${viaTargetRoute(name)}へ直通` : name;
}

function updatestationList() {
  const routeVal = document.getElementById("route").value;
  const selects = document.querySelectorAll(".station-select");
  if (!allstationData) return;

  const filtered = routeVal
    ? allstationData.filter(row => row["路線"] === routeVal)
    : [];
  const names = [...new Set(filtered.map(r => r["駅名"]))];

  selects.forEach(select => {
    const current = select.value;
    select.innerHTML = '<option value="">選択してください</option>';
    names.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = formatStationOption(c);
      select.appendChild(opt);
    });
    if (names.includes(current)) select.value = current;
  });
}



// sujitypeデータをまとめて読み込み
fetch("https://opensheet.elk.sh/1ZooIjdlOwsLZVjQv6KN53h4X2JYUyULYuJTuhbgk95s/sujitype")
  .then(res => res.json())
  .then(data => {
    allsujitypeData = data;
    updatesujitypeList();
  })
  .catch(err => console.error(err));

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
fetch("https://opensheet.elk.sh/1ZooIjdlOwsLZVjQv6KN53h4X2JYUyULYuJTuhbgk95s/bound")
  .then(res => res.json())
  .then(data => {
    allboundData = data;
    updateboundList();
  })
  .catch(err => console.error(err));

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
fetch("https://opensheet.elk.sh/1ZooIjdlOwsLZVjQv6KN53h4X2JYUyULYuJTuhbgk95s/number")
  .then(res => res.json())
  .then(data => {
    allnumberData = data;
  })
  .catch(err => console.error(err));

// modelが変わったら、numberプルダウンを更新
document.getElementById("model").addEventListener("change", updatenumberList);

function updatenumberList() {
  const modelVal = document.getElementById("model").value;
  const select = document.getElementById("number");

  select.innerHTML = '<option value="">選択してください</option>';

  // 両方選ばれていなければ終了
  if (!modelVal) return;

  // スプレッドシートの number シート構成が:
  // 車両形式 | 車番
  const filtered = allnumberData.filter(row =>
    row["車両形式"] === modelVal
  );

  // 重複を排除
  const companies = [...new Set(filtered.map(r => r["車番"]))];

  companies.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    select.appendChild(opt);
  });
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
    memoValue
  };

  // ▼ここにGASのデプロイURLを入れる
  const scriptURL = "https://script.google.com/macros/s/AKfycbzuhYRx9gyb5J1a-6ZuxmcCepIU1hIMnuBo58wh5CTYMWE785YAnuJY4ckm_13-ZHc7/exec";

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
    hideLoadingPopup();
    logAction("post", `投稿: ${routeValue} / ${modelValue} ${numberValue} / ${stationValue} → ${boundValue}`);
    handleTripBookkeeping(routeValue, boundValue, timeValue, stationValue, sujitypeValue);
    showStampPopup(modelValue, numberValue);
    resetForm();
  })
  .catch(err => {
    hideLoadingPopup();
    console.error("送信エラー:", err);
    alert("送信に失敗しました");
  });
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
fetch("https://opensheet.elk.sh/1ZooIjdlOwsLZVjQv6KN53h4X2JYUyULYuJTuhbgk95s/desc")
  .then(res => res.json())
  .then(data => {
    allRemarkData = data;
  })
  .catch(err => console.error(err));

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
fetch("https://opensheet.elk.sh/1ZooIjdlOwsLZVjQv6KN53h4X2JYUyULYuJTuhbgk95s/linealias")
  .then(res => res.json())
  .then(data => {
    lineAliasData = data
      .map(row => ({ official: row["正式名称"] || "", alias: row["通称"] || "" }))
      .filter(r => r.official && r.alias);
  })
  .catch(err => console.error("linealias取得エラー:", err));

function normalizeLineName(name) {
  if (!name) return "";
  let n = String(name);
  lineAliasData.forEach(({ official, alias }) => { n = n.split(official).join(alias); });
  return n.trim();
}

// 表記ゆれを吸収したうえで「一致」または「片方がもう片方を包含」していればOKとみなす
function isLineMatch(masterLine, apiLine) {
  const a = normalizeLineName(masterLine);
  const b = normalizeLineName(apiLine);
  if (!a || !b) return false;
  if (a === b || a.includes(b) || b.includes(a)) return true;
  // 末尾の「線」を除いた核部分でも比較（さらに表記ゆれに強くする）
  const coreA = a.replace(/線$/, "");
  const coreB = b.replace(/線$/, "");
  return !!coreA && !!coreB && (coreA === coreB || a.includes(coreB) || b.includes(coreA));
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
          matches.push({ name: st.name, line: hitRow["路線"], confident: true });
        }
      } else {
        // 路線名の表記があまりに違って一致判定できない場合のフォールバック：
        // 駅名だけは一致しているので、その駅にある自分の路線候補を「駅名のみ一致」として出す
        stationRows.forEach(row => {
          const key = st.name + "|" + row["路線"];
          if (!seen.has(key)) {
            seen.add(key);
            matches.push({ name: st.name, line: row["路線"], confident: false });
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
    item.textContent = m.confident
      ? `${m.name}（${m.line}）`
      : `${m.name}（${m.line}）※駅名のみ一致`;
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

  // 区分・会社から えりあ を特定
  const countryRow = (allCountryData || []).find(r => r["区分"] === typeVal && r["会社"] === companyVal);
  const areaVal = countryRow ? countryRow["えりあ"] : "";

  setAndTrigger("area", areaVal);
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

function startStationPopupFlow() {
  const routeVal = document.getElementById("route").value;
  const stationSelects = document.querySelectorAll(".station-select");
  const boardingStation = stationSelects.length ? stationSelects[0].value : "";
  if (!routeVal || !boardingStation) return;

  // 方面ポップアップを出している間に裏で先読みしておき、履歴選択時のラグを無くす
  getRideHistoryCached();

  const stationsOnRoute = (allstationData || []).filter(r => r["路線"] === routeVal);
  if (stationsOnRoute.length < 2) return;

  const first = stationsOnRoute[0]["駅名"];
  const last = stationsOnRoute[stationsOnRoute.length - 1]["駅名"];
  if (!first || !last || first === last) return;

  // 乗車駅自体が終着駅なら、その駅への「方面」は存在しない（折り返せないので除外）
  const termini = [first, last].filter(name => name !== boardingStation);
  if (!termini.length) return;

  if (termini.length === 1) {
    // 方面が一意に決まる（終着駅から乗る）場合は、方面選択を飛ばして直接履歴を表示
    loadAndShowHistoryPopup(routeVal, boardingStation, termini[0]);
  } else {
    showDirectionChoicePopup(routeVal, boardingStation, termini);
  }
}

function showDirectionChoicePopup(routeVal, boardingStation, termini) {
  setModalTitle("方面を選択");
  const list = document.getElementById("historyModalList");
  list.innerHTML = "";

  termini.forEach(name => {
    const item = document.createElement("button");
    item.type = "button";
    item.textContent = isViaEntry(name) ? formatStationOption(name) : `${name} 方面`;
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

async function loadAndShowHistoryPopup(routeVal, boardingStation, dirVal) {
  setModalTitle("過去の乗車記録から選ぶ");
  const list = document.getElementById("historyModalList");
  list.innerHTML = '<p class="modal-loading">過去の乗車記録を確認中...</p>';
  document.getElementById("historyModalOverlay").classList.add("show");

  const stationsOnRoute = (allstationData || []).filter(r => r["路線"] === routeVal);
  const indexOf = name => stationsOnRoute.findIndex(r => r["駅名"] === name);
  const dirIndex = indexOf(dirVal);
  const boardingIndex = indexOf(boardingStation);

  // route シートに「ダイヤ改正日」が入っていれば、それ以降の記録だけを対象にする
  const routeRow = (allrouteData || []).find(r => r["路線"] === routeVal);
  const revisionRaw = routeRow ? routeRow["ダイヤ改正日"] : "";
  const revisionDate = revisionRaw ? new Date(revisionRaw) : null;
  const hasValidRevisionDate = revisionDate && !isNaN(revisionDate);

  const rides = await getRideHistoryCached();

  // 同じ路線・同じ乗車駅の記録のみを対象にする（ユーザーは問わない）
  const raw = [];
  rides
    .filter(r => r["路線"] === routeVal && r["乗車駅"] === boardingStation)
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
        // 判定できない場合（直通運転先など）はとりあえず候補に含める
        let matchesDirection = true;
        if (bIndex !== -1 && boardingIndex !== -1) {
          matchesDirection = (dirIndex > boardingIndex) ? (bIndex > boardingIndex) : (bIndex < boardingIndex);
        }

        if (matchesDirection) raw.push({ type: t, bound: b, time });
      });
    });

  // 新しい順に並べ、現在時刻から+30分以内のものを優先。無ければ直近10件にフォールバック
  raw.sort((a, b) => {
    if (!a.time) return 1;
    if (!b.time) return -1;
    return b.time - a.time;
  });

  const nowMin = timeOfDayMinutes(new Date());
  const windowed = raw.filter(c => {
    if (!c.time) return false;
    const diff = (timeOfDayMinutes(c.time) - nowMin + 1440) % 1440;
    return diff <= 30;
  });

  const pool = (windowed.length ? windowed : raw).slice(0, 10);

  // 種別・行先の組み合わせで重複除去
  const seen = new Set();
  const candidates = [];
  pool.forEach(c => {
    const key = c.type + "|" + c.bound;
    if (!seen.has(key)) { seen.add(key); candidates.push(c); }
  });

  renderHistoryPopupList(candidates);
}

function renderHistoryPopupList(candidates) {
  const list = document.getElementById("historyModalList");
  list.innerHTML = "";

  if (!candidates.length) {
    list.innerHTML = '<p class="modal-loading">この方面での過去の乗車記録が見つかりませんでした。</p>';
    return;
  }

  candidates.forEach(c => {
    const item = document.createElement("button");
    item.type = "button";
    const timeLabel = formatHM(c.time);
    const dest = c.type ? `${c.type}${c.bound}行き` : `${c.bound}行き`;
    item.textContent = timeLabel ? `${timeLabel} ${dest}` : dest;
    item.onclick = () => applyHistoryCandidate(c);
    list.appendChild(item);
  });
}

function closeHistoryModal() {
  const overlay = document.getElementById("historyModalOverlay");
  if (overlay) overlay.classList.remove("show");
}

function applyHistoryCandidate(c) {
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
  if (c.time) {
    const now = new Date();
    const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), c.time.getHours(), c.time.getMinutes());
    const pad = n => String(n).padStart(2, "0");
    const timeEl = document.getElementById("departing_time");
    if (timeEl) {
      timeEl.value = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    }
  }

  closeHistoryModal();
}



/* ----------------------------------------
   乗り継ぎ（旅）記録
   投稿の瞬間はまだ「どこで降りるか」分からないので、次に別の乗車を投稿した
   タイミングで「前回はどこで降りましたか？」と聞く。
   「乗り継ぎ中」を選べば同じ旅IDのまま続き、「ここで旅を終える」を選べば
   旅IDをリセットする（次の投稿からは新しい旅として扱う）。

   降車駅が未回答のまま次々に投稿が進むと質問が失われてしまうため、
   「1件だけ保留」ではなく「未回答キュー」に積んで、答えるまで残り続けるようにしている。
   キューは tuts4_descent_queue（配列）で管理し、ヘッダーの「🚏 降車駅未回答」ボタンから
   何件でも順番に答えられる。

   ※ transfers用のGASデプロイURLを発行したら、下のTRANSFERS_URLに貼ってください
      （transfers_gas.gs を参照）
---------------------------------------- */
const TRANSFERS_URL = "https://script.google.com/macros/s/AKfycbwOzhHMk2WRtcUHvSMfnrimIQxUk-_dZN_43I-m8fpMNVxomE7emhevGGyC3UnLR3ejBw/exec";

function getDescentQueue() {
  try { return JSON.parse(localStorage.getItem("tuts4_descent_queue") || "[]"); }
  catch (e) { return []; }
}
function setDescentQueue(queue) {
  localStorage.setItem("tuts4_descent_queue", JSON.stringify(queue));
}
function queueKey(item) { return item.username + "|" + item.rideTime; }

// 投稿が成功するたびに呼ばれる。「前回の乗車」を降車駅未回答キューに積む
function handleTripBookkeeping(routeValue, boundValue, timeValue, stationValue, sujitypeValue) {
  const username = localStorage.getItem("username");
  if (!username) return;

  const prevPendingRaw = localStorage.getItem("tuts4_pending_descent");

  let tripId = localStorage.getItem("tuts4_current_trip_id");
  if (!tripId) {
    tripId = username + "_" + timeValue;
    localStorage.setItem("tuts4_current_trip_id", tripId);
  }

  // 前回の投稿は「次の投稿があった＝もう降りたはず」なのでキューに積む
  if (prevPendingRaw) {
    try {
      const prev = JSON.parse(prevPendingRaw);
      if (prev.username === username) {
        const queue = getDescentQueue();
        if (!queue.some(q => queueKey(q) === queueKey(prev))) {
          queue.push(prev);
          setDescentQueue(queue);
        }
      }
    } catch (e) { /* 壊れてたら無視 */ }
  }

  localStorage.setItem("tuts4_pending_descent", JSON.stringify({
    username, rideTime: timeValue, route: routeValue, bound: boundValue,
    station: stationValue || "", sujitype: sujitypeValue || "", tripId
  }));
}

// スタンプポップアップを閉じたあと、キューに未回答があれば1件開く
function maybeAskDescentStation() {
  const queue = getDescentQueue();
  if (!queue.length) return;
  openDescentPopup(queue[0]);
}

function formatRideTimeLabel(rideTime) {
  const d = new Date(rideTime);
  if (isNaN(d)) return String(rideTime || "");
  const pad = n => String(n).padStart(2, "0");
  const weekday = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}(${weekday}) ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function timeKeyMatch(a, b) {
  if (!a || !b) return false;
  if (String(a) === String(b)) return true;
  const da = new Date(a), db = new Date(b);
  return !isNaN(da) && !isNaN(db) && da.getTime() === db.getTime();
}

// 古いバージョンで積まれたキュー項目は乗車駅・種別を持っていないことがあるので、
// 表示前にキャッシュ済みの乗車データから補完し、キューにも書き戻しておく
async function enrichPrevIfNeeded(prev) {
  if (prev.station) return prev;

  try {
    const rides = await getRideHistoryCached();
    const match = rides.find(r =>
      String(r["ユーザー名"]) === String(prev.username) &&
      timeKeyMatch(r["時刻"] || r["発車時刻"] || "", prev.rideTime)
    );
    if (match) {
      prev.station = match["乗車駅"] || "";
      prev.sujitype = match["種別"] || "";

      const queue = getDescentQueue().map(q =>
        queueKey(q) === queueKey(prev) ? { ...q, station: prev.station, sujitype: prev.sujitype } : q
      );
      setDescentQueue(queue);

      const pendingRaw = localStorage.getItem("tuts4_pending_descent");
      if (pendingRaw) {
        try {
          const pending = JSON.parse(pendingRaw);
          if (queueKey(pending) === queueKey(prev)) {
            pending.station = prev.station;
            pending.sujitype = prev.sujitype;
            localStorage.setItem("tuts4_pending_descent", JSON.stringify(pending));
          }
        } catch (e) { /* ignore */ }
      }
    }
  } catch (e) {
    console.error("乗車駅情報の補完に失敗:", e);
  }

  return prev;
}

async function openDescentPopup(prev) {
  setModalTitle("降車駅の記録");
  openModalLoading("降車駅の記録", "読み込み中...");

  prev = await enrichPrevIfNeeded(prev);

  const list = document.getElementById("historyModalList");

  const queueLen = getDescentQueue().length;
  const queueNote = queueLen > 1 ? `<p class="small" style="margin-bottom:6px;">他に${queueLen - 1}件、未回答の記録が残っています</p>` : "";

  const stationsOnRoute = (allstationData || []).filter(r => r["路線"] === prev.route);
  const names = [...new Set(stationsOnRoute.map(r => r["駅名"]))];

  const options = ['<option value="">選択してください</option>']
    .concat(names.map(n => `<option value="${n}">${formatStationOption(n)}</option>`))
    .join("");

  const timeLabel = formatRideTimeLabel(prev.rideTime);
  const typeLabel = prev.sujitype ? `${prev.sujitype}` : "";
  const rideSummary = `${timeLabel}<br>${prev.route}<br>${prev.station || "(乗車駅不明)"} → ${typeLabel}${prev.bound}行き`;

  list.innerHTML = `
    ${queueNote}
    <div class="descent-ride-summary">${rideSummary}</div>
    <p class="modal-loading" style="margin-bottom:8px;">↑この乗車、どこで降りましたか？（直通運転で別路線に入った場合は「→ 〇〇線へ直通」を選んでください）</p>
    <select id="alightStationSelect" style="width:100%;margin-bottom:14px;">${options}</select>
    <button type="button" id="continueTripBtn">🚃 乗り継ぎ中（旅を続ける）</button>
    <button type="button" id="endTripBtn">🏁 ここで旅を終える</button>
    <button type="button" id="skipDescentBtn" style="background:none; color:#999; border:none; text-decoration:underline; padding:8px 0 0;">あとで答える</button>
  `;

  document.getElementById("continueTripBtn").onclick = () => submitDescent(prev, false);
  document.getElementById("endTripBtn").onclick = () => submitDescent(prev, true);
  document.getElementById("skipDescentBtn").onclick = () => closeHistoryModal();

  document.getElementById("historyModalOverlay").classList.add("show");
}

async function submitDescent(prev, tripEnd) {
  const select = document.getElementById("alightStationSelect");
  const alightStation = select ? select.value : "";
  if (!alightStation) {
    alert("降車駅を選択してください");
    return;
  }

  // 直通運転で別路線に入っただけの場合は、旅は終わらず継続する
  const viaJump = isViaEntry(alightStation);
  const effectiveTripEnd = viaJump ? false : tripEnd;

  try {
    await fetch(TRANSFERS_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: prev.username,
        rideTime: prev.rideTime,
        alightStation,
        tripId: prev.tripId,
        tripEnd: effectiveTripEnd
      })
    });
  } catch (e) {
    console.error("降車駅の送信に失敗:", e);
  }

  if (effectiveTripEnd) {
    localStorage.removeItem("tuts4_current_trip_id");
  }

  // 答えた分をキューから外す
  const queue = getDescentQueue().filter(q => queueKey(q) !== queueKey(prev));
  setDescentQueue(queue);

  closeHistoryModal();

  if (viaJump) {
    jumpToRoute(viaTargetRoute(alightStation));
  } else if (queue.length) {
    // まだキューが残っていれば、続けて次の1件を聞く
    setTimeout(() => openDescentPopup(queue[0]), 400);
  }
}

/* ----------------------------------------
   過去の投稿を洗い出して、降車駅が未回答のものをキューに積む（後付けの一括チェック）
---------------------------------------- */
async function backfillDescentQueue() {
  const username = localStorage.getItem("username");
  if (!username) return;

  openModalLoading("過去の記録をチェック中", "📋 未回答の降車駅を探しています...");

  const RIDES_URL = "https://script.google.com/macros/s/AKfycbyWTr6ejDZKkaw9owEM8yLcl6-6w5pHeyk2hWdX6Lw1INNg5ZxuhvCx7PPfOmxWHC17/exec";

  try {
    const [ridesRes, transfersRes] = await Promise.all([
      fetch(RIDES_URL),
      fetch(TRANSFERS_URL)
    ]);
    const allRides = await ridesRes.json();
    const allTransfers = await transfersRes.json();

    const myRides = allRides
      .filter(r => String(r["ユーザー名"]) === String(username))
      .map(r => ({
        username,
        rideTime: r["時刻"] || r["発車時刻"] || "",
        route: r["路線"] || "",
        bound: r["行先"] || "",
        station: r["乗車駅"] || "",
        sujitype: r["種別"] || ""
      }))
      .filter(r => r.rideTime && r.route);

    const answeredKeys = new Set(
      allTransfers
        .filter(t => String(t["ユーザー名"]) === String(username))
        .map(t => username + "|" + t["元の乗車時刻"])
    );

    // 一番最後（＝今回答するタイミングでまだ次の乗車が無いかもしれない）ものは除外
    myRides.sort((a, b) => new Date(a.rideTime) - new Date(b.rideTime));
    const latestKey = myRides.length ? queueKey(myRides[myRides.length - 1]) : null;

    const queue = getDescentQueue();
    const queueKeys = new Set(queue.map(queueKey));

    let addedCount = 0;
    myRides.forEach(r => {
      const key = queueKey(r);
      if (key === latestKey) return; // 最新1件は「乗り継ぎ中かもしれない」ので対象外
      if (answeredKeys.has(key)) return; // すでにtransfersに記録済み
      if (queueKeys.has(key)) return; // すでにキューにある
      queue.push(r);
      queueKeys.add(key);
      addedCount++;
    });

    setDescentQueue(queue);

    if (queue.length) {
      openDescentPopup(queue[0]);
    } else {
      const list = document.getElementById("historyModalList");
      if (list) list.innerHTML = '<p class="modal-loading">未回答の降車記録は見つかりませんでした。</p>';
    }
  } catch (e) {
    console.error("過去記録のチェックに失敗:", e);
    const list = document.getElementById("historyModalList");
    if (list) list.innerHTML = '<p class="modal-loading">チェックに失敗しました。時間を置いて再試行してください。</p>';
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

// マスタデータの読み込みが一段落する頃合いを見て下書きを復元する
window.addEventListener("load", () => {
  setTimeout(restoreDraft, 800);
});


