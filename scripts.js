// version: 1.3.0
// 1.3.0: 「現在地から駅を探す」ボタンを廃止し、「現在時刻を入力」に統合（GPS取得は1回のみ）。
//        確度の高い候補は自動入力するように改善。投稿成功後にフォーム全体をクリアする機能を追加
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
  if (routeEl) routeEl.dispatchEvent(new Event("change"));
  const modelEl = document.getElementById("model");
  if (modelEl) modelEl.dispatchEvent(new Event("change"));

  const resultBox = document.getElementById("geoStationResult");
  if (resultBox) resultBox.innerHTML = "";
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
// 正式社名⇄通称・表記ゆれの対応表（駅データAPIとマスタの路線名表記のズレを吸収する）
const LINE_NAME_ALIASES = [
  [/西日本旅客鉄道/g, "JR"], [/東日本旅客鉄道/g, "JR"], [/東海旅客鉄道/g, "JR"],
  [/九州旅客鉄道/g, "JR"], [/北海道旅客鉄道/g, "JR"], [/四国旅客鉄道/g, "JR"],
  [/大阪市高速電気軌道/g, "大阪メトロ"], [/大阪市営地下鉄/g, "大阪メトロ"],
  [/阪急電鉄/g, "阪急"], [/阪神電気鉄道/g, "阪神"], [/京阪電気鉄道/g, "京阪"],
  [/近畿日本鉄道/g, "近鉄"], [/南海電気鉄道/g, "南海"], [/西日本鉄道/g, "西鉄"],
  [/東京地下鉄/g, "東京メトロ"], [/都営地下鉄/g, "都営"], [/東急電鉄/g, "東急"],
  [/京王電鉄/g, "京王"], [/小田急電鉄/g, "小田急"], [/京成電鉄/g, "京成"],
  [/西武鉄道/g, "西武"], [/東武鉄道/g, "東武"], [/相模鉄道/g, "相鉄"],
];

function normalizeLineName(name) {
  if (!name) return "";
  let n = String(name);
  LINE_NAME_ALIASES.forEach(([pattern, replacement]) => { n = n.replace(pattern, replacement); });
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
  if (resultBox) resultBox.textContent = "📍 近くの駅を確認中...";

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

    renderGeoStationResult(matches);

    // 確度の高い候補（一番近いもの）が見つかっていれば自動で入力しておく。
    // 違う場合は下のプルダウンからいつでも選び直せる。
    const best = matches.find(m => m.confident);
    if (best) {
      await applyGeoStation(best);
      const sel = document.getElementById("geoStationSelect");
      if (sel) sel.value = matches.indexOf(best);
    }
  } catch (e) {
    console.error("駅取得エラー:", e);
    if (resultBox) resultBox.textContent = "近くの駅の取得に失敗しました。";
  }
}

function renderGeoStationResult(matches) {
  const resultBox = document.getElementById("geoStationResult");
  resultBox.innerHTML = "";

  if (!matches.length) {
    resultBox.textContent = "近くに一致する駅データが見つかりませんでした。手動で選択してください。";
    return;
  }

  const label = document.createElement("div");
  label.className = "geo-result-label";
  label.textContent = "近くの駅（近い順）を選ぶと、エリア〜乗車駅まで自動入力されます：";
  resultBox.appendChild(label);

  const select = document.createElement("select");
  select.id = "geoStationSelect";

  const blank = document.createElement("option");
  blank.value = "";
  blank.textContent = "選択してください";
  select.appendChild(blank);

  matches.forEach((m, i) => {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = m.confident
      ? `${m.name}（${m.line}）`
      : `${m.name}（${m.line}）※駅名のみ一致`;
    select.appendChild(opt);
  });

  select.addEventListener("change", () => {
    if (select.value === "") return;
    applyGeoStation(matches[select.value]);
  });

  resultBox.appendChild(select);
}

async function applyGeoStation(match) {
  function setAndTrigger(id, val) {
    const el = document.getElementById(id);
    if (!el || !val) return;
    el.value = val;
    el.dispatchEvent(new Event("change"));
  }
  function setAndTriggerFirst(selector, val) {
    const el = document.querySelector(selector);
    if (!el || !val) return;
    el.value = val;
    el.dispatchEvent(new Event("change"));
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
}


