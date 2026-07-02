// version: 1.1.3
// 1.1.3: 併結で追加するブロックから乗車駅の重複選択を廃止（種別・行先のみ追加）
const countryURL = "https://opensheet.elk.sh/1ZooIjdlOwsLZVjQv6KN53h4X2JYUyULYuJTuhbgk95s/country";
const route = "https://opensheet.elk.sh/1ZooIjdlOwsLZVjQv6KN53h4X2JYUyULYuJTuhbgk95s/route";
const model = "https://opensheet.elk.sh/1ZooIjdlOwsLZVjQv6KN53h4X2JYUyULYuJTuhbgk95s/model";

let allCountryData = []; // 全データを保持
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
      opt.textContent = c;
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
    showStampPopup(modelValue, numberValue);
  })
  .catch(err => {
    hideLoadingPopup();
    console.error("送信エラー:", err);
    alert("送信に失敗しました");
  });
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


