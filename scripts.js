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



const scriptURL = "https://script.google.com/macros/s/AKfycbzuhYRx9gyb5J1a-6ZuxmcCepIU1hIMnuBo58wh5CTYMWE785YAnuJY4ckm_13-ZHc7/exec";

function upload() {
  const payload = {
    usernameValue: document.getElementById('username').value,
    timeValue: document.getElementById('departing_time').value,
    areaValue: document.getElementById('area').value,
    typeValue: document.getElementById('type').value,
    countryValue: document.getElementById('country').value,
    routeValue: document.getElementById('route').value,
    modelValue: document.getElementById('model').value,
    stationValue: document.getElementById('station').value,
    sujitypeValue: document.getElementById('sujitype').value,
    boundValue: document.getElementById('bound').value,
    numberValue: document.getElementById('number').value,
    memoValue: document.getElementById('memo').value
  };

  fetch(scriptURL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  .then(async res => {
    const text = await res.text(); // GASのレスポンスを文字列で取得
    console.log("GASからの応答:", text);

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("レスポンスがJSONではありません");
    }

    if (data.result === "success") {
      alert("✅ 投稿が完了しました！");
    } else {
      alert("⚠️ 投稿エラー：" + (data.message || "不明なエラー"));
    }
  })
  .catch(err => {
    console.error("送信エラー:", err);
    alert("⚠️ 通信に失敗しました\n（ブラウザコンソールで詳細を確認してください）");
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


