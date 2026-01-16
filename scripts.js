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
  })
  .catch(err => console.error(err));

// areaまたはtypeが変わったら、countryプルダウンを更新
document.getElementById("route").addEventListener("change", updatestationList);

function updatestationList() {
  const routeVal = document.getElementById("route").value;
  const select = document.getElementById("station");

  select.innerHTML = '<option value="">選択してください</option>';

  // 両方選ばれていなければ終了
  if (!routeVal) return;

  // スプレッドシートの station シート構成が:
  // 路線 | 駅名
  const filtered = allstationData.filter(row =>
    row["路線"] === routeVal
  );

  // 重複を排除
  const companies = [...new Set(filtered.map(r => r["駅名"]))];

  companies.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    select.appendChild(opt);
  });
}



// sujitypeデータをまとめて読み込み
fetch("https://opensheet.elk.sh/1ZooIjdlOwsLZVjQv6KN53h4X2JYUyULYuJTuhbgk95s/sujitype")
  .then(res => res.json())
  .then(data => {
    allsujitypeData = data;
  })
  .catch(err => console.error(err));

// areaまたはtypeが変わったら、sujitypeプルダウンを更新
document.getElementById("route").addEventListener("change", updatesujitypeList);

function updatesujitypeList() {
  const routeVal = document.getElementById("route").value;
  const select = document.getElementById("sujitype");

  select.innerHTML = '<option value="">選択してください</option>';

  // 両方選ばれていなければ終了
  if (!routeVal) return;

  // スプレッドシートの sujitype シート構成が:
  // 路線 | 駅名
  const filtered = allsujitypeData.filter(row =>
    row["路線"] === routeVal
  );

  // 重複を排除
  const companies = [...new Set(filtered.map(r => r["種別"]))];

  companies.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    select.appendChild(opt);
  });
}



// boundデータをまとめて読み込み
fetch("https://opensheet.elk.sh/1ZooIjdlOwsLZVjQv6KN53h4X2JYUyULYuJTuhbgk95s/bound")
  .then(res => res.json())
  .then(data => {
    allboundData = data;
  })
  .catch(err => console.error(err));

// areaまたはtypeが変わったら、boundプルダウンを更新
document.getElementById("route").addEventListener("change", updateboundList);

function updateboundList() {
  const routeVal = document.getElementById("route").value;
  const select = document.getElementById("bound");

  select.innerHTML = '<option value="">選択してください</option>';

  // 両方選ばれていなければ終了
  if (!routeVal) return;

  // スプレッドシートの bound シート構成が:
  // 路線 | 駅名
  const filtered = allboundData.filter(row =>
    row["路線"] === routeVal
  );

  // 重複を排除
  const companies = [...new Set(filtered.map(r => r["行先"]))];

  companies.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    select.appendChild(opt);
  });
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
    const stationValue = document.getElementById('station').value;
    const sujitypeValue = document.getElementById('sujitype').value;
    const boundValue = document.getElementById('bound').value;
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

  fetch(scriptURL, {
    method: "POST",
    mode: "no-cors", // GASを匿名アクセス可能にしているため
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
  .then(() => {
    alert("送信しました！");
  })
  .catch(err => {
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



let myRideLogs = [];

fetch("https://script.google.com/macros/s/AKfycbyWTr6ejDZKkaw9owEM8yLcl6-6w5pHeyk2hWdX6Lw1INNg5ZxuhvCx7PPfOmxWHC17/exec")
  .then(res => res.json())
  .then(data => {
    const username = localStorage.getItem("username");
    myRideLogs = data.filter(row => row["ユーザー名"] === username);
  });

document.getElementById("number").addEventListener("change", checkRideHistory);


function checkRideHistory() {
  const model = document.getElementById("model").value;
  const number = document.getElementById("number").value;
  const result = document.getElementById("rideCheckResult");

  if (!model || !number) {
    result.textContent = "";
    return;
  }

  const sameRides = myRideLogs.filter(row =>
    row["車両形式"] === model &&
    row["車番"] === number
  );

  if (sameRides.length === 0) {
    result.textContent = "🎉 初乗車です！";
  } else {
    result.textContent = `🚆 ${sameRides.length + 1} 回目の乗車です`;
  }
}
