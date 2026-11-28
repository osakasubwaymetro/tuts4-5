// trainnavi.js v1.9.0
// 1.9.0: 開始フローを変更（ユーザーの要望）。列車を選ぶと、いきなりナビ画面ではなく、まず音声サーバーのURLを入れる画面を出す。
//        「音声を読み込んで開始」→ その列車で使うアナウンス文を全部、先に生成＋デコードしてから（進み具合を表示）、ナビ画面に進む。
//        「URLを入れずに開始」→ その回は端末の音声だけ（保存済みURLは消さない）。
//        小窓（PiP）で音が出なかった対策も兼ねる: 開始のタップで AudioContext を起こし、全音声をデコード済みにしておくことで、
//        再生の瞬間にキャッシュ読みやデコードを挟まないようにした。小窓に切り替える時も AudioContext の resume を試みる。
//        ※2026-11-28、claude.aiにログインできないため Muse が実装（ユーザーがファイル編集を許可）。後日 claudeくんへファイルごと共有する。
// trainnavi.js v1.8.2
// 1.8.2: 号車設定（1.8.0）で後ろの号車（例: 7両目）にしていると、駅に停車中に「次は○○」を連呼する不具合の修正。
//        原因は「駅を出たか」の判定に号車オフセットを足していたこと。停車確定の判定（駅座標から200m以内）と重なる範囲ができ、
//        停車中も「出発した」と誤判定→停車に再確定（発声済みフラグが消える）→また誤判定…を繰り返していた。
//        出発の判定は停車確定と同じ実距離（駅座標から200m超）に統一した。次駅までの距離 D へのオフセット（本来の目的）はそのまま。
//        ※2026-11-28、claude.aiにログインできなかったため Muse が暫定修正。後日 claudeくんへファイルごと共有する。
// trainnavi.js v1.8.1
// 1.8.1: 画面の左下に出ていた黒い枠（小窓用の video 要素）を、見えないようにした。小窓の機能はそのまま使える。
//        display:none / visibility:hidden にすると、iPhone等で小窓にできなくなったり映像が止まることがあるため、大きさ・位置・描画はそのままで、透明（opacity:0）にして、タップも通す（pointer-events:none）。
// trainnavi.js v1.8.0
// 1.8.0: 「⚙ 設定」に「乗っている号車（前から何両目）」を追加（localStorage tuts4_navi_carpos、既定1両目）。位置の判定を（号車−1）×20mだけ前へずらし、
//        常に自分が先頭にいる扱いにする（1両目+0m／2両目+20m／3両目+40m）。GPSの判定（次の停車駅までの距離 D、駅を出たかの判定）に反映。時刻だけの判定・デバッグ走行は変えない。
// trainnavi.js v1.7.0
// 1.7.0: 背景（小窓・ホーム画面・他アプリ表示中）でアナウンスが端末の音声に落ちるのを直した。
//        ①列車を選んだ時点で、その列車の全駅ぶんのアナウンス文を先に生成してキャッシュを温める（これまでは4区間先まで）。
//          生成は近い順。AudioContext が無い（まだタップされていない）間もキャッシュ保存だけ先に進める。生成のタイムアウトは10→25秒（先行生成は急がないため）。
//        ②再生時、デコード済みが無くてもキャッシュ（Cache Storage）に音声があれば、それを読んで合成音声で再生する。
//          AudioContext が止まっていたら resume を最大1.5秒待つ。それでも鳴らせない／キャッシュにも無い時だけ端末の音声。
// trainnavi.js v1.6.0
// 1.6.0: アナウンス音声を、外部の合成音声API（Colab等）に接続できるようにした。ベースURLは Train Navi 画面の「⚙ 音声設定」で入力し、localStorage（tuts4_navi_ttsurl）に保存する。空なら従来どおり speechSynthesis だけ。
//        設定がある時だけ: 開いた瞬間に GET /health（待たない）→200で音声OK。4分おきに /health（非表示の間は止める）。アナウンス文は POST /tts {"text"} → audio/wav で生成し、Cache Storage（キー＝文のハッシュ）に保存。
//        先頭3駅分（以後は再生位置の数駅先まで）を裏で先行生成（同時1本・不要になった要求は破棄）。API未準備・エラー・10秒タイムアウト・生成が間に合わない時は、その回だけ speechSynthesis で言う（先行生成は続ける）。
//        再生は AudioContext（最初のタップで resume）。
// 1.5.0: ダイヤ一覧の「両数」から、両数を自動で設定する（列車詳細から渡される entry.cars。無い時は今まで通り、手で入れた値）。タップで手動変更もできる
// 1.4.0: ④「n両、n両」の開始を速度検知型に変更。駅の手前200m以内で、速度が25km/h以下になり、かつ③（ホーム進入の「n両、停車。」）を言い終えたら始める（一度始めたら停車まで続ける）。速度が取れない時は従来どおり45mで開始
// 1.3.1: iPhoneで小窓にできなかったのを修正（動画を先に用意してボタンを押した直後に小窓を要求／iPhone独自方式を先に試す／失敗した理由を表示）
// 1.3.0: ピクチャ・イン・ピクチャ（📺 小窓）を追加。画面をcanvasに描いてvideoにして小窓表示するので、他のアプリを開いても小さく出したままにできる。停止制動の位置を駅の500m手前に固定
// 1.2.0: 家でデバッグできるように「🛠 デバッグ」を追加（GPSなしのシミュレーション：自動走行／倍速／駅間スライダー／速度指定／駅の前後移動／判定の数値表示）
// Train Navi表示：運転台のモニター風の画面（列車種別／次駅／列車番号／両数）を出し、
// GPSで現在位置を判定して、合成音声（女声）で停車駅ごとに4回注意喚起する。
//   ① 発車直後          ：種別＋次駅を表示、「次は、○○、停車。」
//   ② 停止制動の開始位置：「停車」を赤白点滅、「停車、停車、停車。」
//   ③ 入駅（ホーム端）  ：「N両」を表示、「N両、停車。N両、停車。」
//   ④ ホーム中間付近    ：速度が25km/h以下になったら「N両」を表示、「N両、N両。」を停車まで繰り返す
// GPSが取れない間（地下など）は、ダイヤの時刻で代わりに判定する。
// timetable.js の ttTrainDetailRegistry / ttToSec / escapeHtmlTT / ttNormStation を共用する。
(function () {
  "use strict";
  const CAR_KEY = "tuts4_navi_cars";
  const CARPOS_KEY = "tuts4_navi_carpos"; // 乗っている号車（前から何両目）
  const CAR_LEN = 20;                     // 1両の長さ（m）
  const getCarPos = () => { const v = parseInt(lsGet(CARPOS_KEY, "1"), 10); return isFinite(v) && v >= 1 ? Math.min(v, 30) : 1; };
  const carOffset = () => (getCarPos() - 1) * CAR_LEN; // 判定位置を前へずらす量（m）
  const VOICE_KEY = "tuts4_navi_voice";
  const TTS_KEY = "tuts4_navi_ttsurl";
  const nv = { stops: null, ev: null, timer: null, voiceOn: true, cars: "", spoken: new Set(), audio: null, lastPhase: "", flash: false, flashTimer: null, watchId: null, pos: null, speed: 0, fixAt: 0, acc: 9999, seg: null, src: "time", sim: { on: false, run: false, k: 0, mode: "stop", D: 0, v: 0, dwell: 0, mult: 1, t: 0, kmh: 72, timer: null }, speaking: false, lastMid: 0, midK: -1, spokenAnything: false, token: 0, setup: false, ttsOff: false, preloadAbort: false };

  function esc(s) { return typeof escapeHtmlTT === "function" ? escapeHtmlTT(s) : String(s || ""); }
  function lsGet(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  // ---------- DOM（初回に作る） ----------
  function ensureDom() {
    if (document.getElementById("tnOverlay")) return;
    const css = document.createElement("style");
    css.textContent = `
      #tnOverlay { display:none; position:fixed; inset:0; z-index:10002; background:#000; color:#fff;
        font-family:"Hiragino Sans","Meiryo",sans-serif; user-select:none; -webkit-user-select:none; }
      #tnOverlay.show { display:flex; }
      #tnOverlay .tn-main { flex:1; display:flex; min-width:0; }
      #tnOverlay .tn-left { flex:1; display:flex; flex-direction:column; min-width:0; }
      #tnOverlay .tn-type { flex:1; background:#000; display:flex; align-items:center; justify-content:center;
        font-weight:bold; font-size:min(18vw,26vh); line-height:1; white-space:nowrap; position:relative; overflow:hidden; }
      #tnOverlay .tn-bound { position:absolute; left:10px; bottom:6px; font-size:min(4vw,6vh); font-weight:normal; color:#bbb; }
      #tnOverlay .tn-next { flex:1; background:#fff; color:#000; display:flex; align-items:center; justify-content:center;
        font-weight:bold; font-size:min(15vw,22vh); line-height:1.05; text-align:center; position:relative; padding:0 8px; overflow:hidden; }
      #tnOverlay .tn-next small { position:absolute; left:10px; top:4px; font-size:min(3.6vw,5.5vh); font-weight:normal; color:#555; }
      #tnOverlay .tn-next.fit { font-size:min(10vw,16vh); }
      #tnOverlay .tn-num { width:30%; background:#ffec1a; color:#000; display:flex; flex-direction:column; align-items:center;
        justify-content:space-around; padding:6px 0; }
      #tnOverlay .tn-num .no { font-size:min(6vw,9vh); }
      #tnOverlay .tn-num .cars { font-size:min(22vw,38vh); font-weight:bold; line-height:1; cursor:pointer; }
      #tnOverlay .tn-num .cars small { font-size:.28em; }
      #tnOverlay .tn-side { width:92px; background:#cfcfcf; display:flex; flex-direction:column; gap:8px; padding:8px; }
      #tnOverlay .tn-side button { border:none; border-radius:6px; color:#fff; font-weight:bold; font-size:14px; padding:12px 2px; cursor:pointer; }
      #tnOverlay .tn-clock { color:#333; font-size:13px; text-align:center; font-variant-numeric:tabular-nums; }
      #tnOverlay .b-voice { background:#5b8fd6; } #tnOverlay .b-voice.off { background:#888; } #tnOverlay .b-voice.wait { background:#d6a05b; font-size:11px; line-height:1.3; } #tnOverlay .b-cfg { background:#6b6b8a; font-size:12px; }
      #tnTtsCfg { display:none; position:absolute; inset:0; z-index:5; background:rgba(0,0,0,.82); align-items:center; justify-content:center; padding:16px; }
      #tnTtsCfg.show { display:flex; } #tnTtsCfg .box { background:#222; border:1px solid #666; border-radius:12px; padding:16px; width:min(460px,100%); color:#fff; font-size:14px; }
      #tnTtsCfg input { width:100%; box-sizing:border-box; padding:10px; border-radius:6px; border:1px solid #888; background:#111; color:#fff; font-size:14px; margin:8px 0; }
      #tnTtsCfg .row { display:flex; gap:8px; flex-wrap:wrap; } #tnTtsCfg button { flex:1; padding:10px; border:none; border-radius:6px; color:#fff; font-weight:bold; background:#5b8fd6; cursor:pointer; } #tnTtsCfg button.sub { background:#666; }
      #tnTtsCfg .st { font-size:12px; color:#bbb; margin-top:8px; white-space:pre-wrap; }
      #tnStart { display:none; position:absolute; inset:0; z-index:6; background:rgba(0,0,0,.92); align-items:center; justify-content:center; padding:16px; }
      #tnStart.show { display:flex; }
      #tnStart .box { background:#1c1c22; border:1px solid #666; border-radius:12px; padding:18px; width:min(480px,100%); color:#fff; font-size:14px; max-height:92%; overflow:auto; }
      #tnStart .ttl { font-size:20px; font-weight:bold; }
      #tnStart .sub { font-size:13px; color:#ccc; margin-top:4px; }
      #tnStart label { display:block; margin-top:14px; font-weight:bold; }
      #tnStart input { width:100%; box-sizing:border-box; padding:10px; border-radius:6px; border:1px solid #888; background:#111; color:#fff; font-size:14px; margin:8px 0; }
      #tnStart .note { font-size:12px; color:#bbb; white-space:pre-wrap; }
      #tnStart .row { display:flex; gap:8px; margin-top:10px; }
      #tnStart button { flex:1; padding:12px; border:none; border-radius:6px; color:#fff; font-weight:bold; background:#5b8fd6; cursor:pointer; font-size:14px; }
      #tnStart button.sub { background:#666; }
      #tnStart .bar { height:14px; background:#333; border-radius:7px; overflow:hidden; margin:12px 0 6px; }
      #tnStart .bar i { display:block; height:100%; width:0; background:#5b8fd6; transition:width .2s; }
      #tnOverlay .tn-gpsmsg { color:#333; font-size:11px; text-align:center; line-height:1.3; }
      #tnOverlay .tn-led { display:flex; justify-content:center; gap:6px; padding:4px 0; background:#000; }
      #tnOverlay .tn-led i { width:22px; height:8px; background:#5a2a2a; display:block; }
      #tnOverlay .tn-led.blink i { background:#e60012; animation:tnled .5s steps(1) infinite; }
      #tnOverlay .tn-led.blink i:nth-child(even) { animation-delay:.25s; }
      #tnOverlay .b-dbg { background:#6a4c93; }
      #tnDbg { display:none; position:absolute; left:0; right:92px; bottom:0; background:rgba(20,20,30,.93); color:#eee; font-size:12px; padding:8px 10px; z-index:2; max-height:62%; overflow:auto; }
      #tnDbg.show { display:block; }
      #tnDbg .row { display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin:4px 0; }
      #tnDbg button { border:none; border-radius:5px; background:#4a5a8a; color:#fff; padding:6px 9px; font-size:12px; cursor:pointer; }
      #tnDbg button.on { background:#2e9d4a; }
      #tnDbg input[type=range] { flex:1; min-width:120px; }
      #tnDbg .info { font-family:monospace; color:#9fe29f; white-space:pre-wrap; }
      @keyframes tnled { 50% { background:#5a2a2a; } }
      #tnOverlay .b-close { background:#c0392b; }
      #tnOverlay .b-pip { background:#1e8a8a; }
      #tnOverlay .tn-stop-card { color:#000; }
      #tnOverlay.brake .tn-type { background:#e60012; color:#fff; }
      #tnOverlay.brake.flash .tn-type { background:#fff; color:#e60012; }
      #tnOverlay.brake .tn-next, #tnOverlay.platform .tn-next { display:none; }
      #tnOverlay.platform .tn-type { background:#fff; color:#1a237e; font-size:min(30vw,44vh); }
      @media (orientation:portrait){ #tnOverlay .tn-main { flex-direction:column; } #tnOverlay .tn-num { width:auto; height:30%; flex-direction:row; }
        #tnOverlay .tn-type { font-size:min(26vw,16vh);} #tnOverlay .tn-next { font-size:min(18vw,12vh);} #tnOverlay .tn-num .cars{font-size:min(24vw,20vh);}
        #tnOverlay { flex-direction:column; } #tnOverlay .tn-side { width:auto; flex-direction:row; align-items:center; } #tnOverlay .tn-side button { flex:1; } }
    `;
    document.head.appendChild(css);
    const d = document.createElement("div");
    d.id = "tnOverlay";
    d.innerHTML = `
      <div class="tn-main">
        <div class="tn-left">
          <div class="tn-type" id="tnType"><span id="tnTypeTxt">普通</span><span class="tn-bound" id="tnBound"></span></div>
          <div class="tn-next" id="tnNext"><small id="tnNextLbl">次は</small><span id="tnNextTxt"></span></div>
          <div class="tn-led" id="tnLed"><i></i><i></i><i></i><i></i><i></i><i></i></div>
        </div>
        <div class="tn-num">
          <div class="no" id="tnNo"></div>
          <div class="cars" id="tnCars" title="タップで両数を設定"></div>
        </div>
      </div>
      <div class="tn-side">
        <button type="button" class="b-voice" id="tnVoiceBtn">🔊 音声</button>
        <button type="button" class="b-cfg" id="tnCfgBtn">⚙ 設定</button>
        <div class="tn-gpsmsg" id="tnGpsMsg"></div>
        <button type="button" class="b-dbg" id="tnDbgBtn">🛠 デバッグ</button>
        <div class="tn-clock" id="tnClock"></div>
        <button type="button" class="b-pip" id="tnPipBtn">📺 小窓</button>
        <button type="button" class="b-close" id="tnCloseBtn">閉じる</button>
      </div>`;
    document.body.appendChild(d);
    document.getElementById("tnVoiceBtn").onclick = () => { nv.voiceOn = !nv.voiceOn; lsSet(VOICE_KEY, nv.voiceOn ? "1" : "0"); renderBtns(); if (!nv.voiceOn) cancelSpeech(); else unlockAudio(); };
    document.getElementById("tnCloseBtn").onclick = closeNavi;
    // 音声API設定
    const cfg = document.createElement("div");
    cfg.id = "tnTtsCfg";
    cfg.innerHTML = `<div class="box"><b>乗っている号車</b>
      <div style="font-size:12px;color:#bbb;margin-top:4px">前から何両目か。位置の判定を（号車−1）×20mだけ前へずらして、いつも自分が先頭にいる扱いにします（1両目＝ずらさない）。</div>
      <div class="row" style="align-items:center;gap:6px"><input id="tnCarPos" type="number" inputmode="numeric" min="1" max="30" step="1" style="width:5em"> 両目 <span id="tnCarPosSt" style="font-size:12px;color:#bbb"></span></div>
      <hr style="border:0;border-top:1px solid #444;margin:10px 0">
      <b>音声APIの設定</b>
      <div style="font-size:12px;color:#bbb;margin-top:4px">合成音声APIのベースURL（例: https://xxxx.trycloudflare.com）。空にすると、端末の音声（speechSynthesis）だけで案内します。</div>
      <input id="tnTtsUrl" type="url" inputmode="url" placeholder="https://..." autocomplete="off">
      <div class="row"><button id="tnTtsSave">保存</button><button id="tnTtsClear" class="sub">空にして無効化</button><button id="tnTtsClose" class="sub">閉じる</button></div>
      <div class="st" id="tnTtsSt"></div></div>`;
    d.appendChild(cfg);
    const carPosSt = () => { const e = document.getElementById("tnCarPosSt"); if (e) e.textContent = `（判定を ${carOffset()}m 前へ）`; };
    document.getElementById("tnCarPos").onchange = e => {
      let v = parseInt(e.target.value, 10); if (!isFinite(v) || v < 1) v = 1; v = Math.min(v, 30);
      e.target.value = v; lsSet(CARPOS_KEY, String(v)); carPosSt();
    };
    document.getElementById("tnCfgBtn").onclick = () => { document.getElementById("tnCarPos").value = getCarPos(); carPosSt(); document.getElementById("tnTtsUrl").value = tts.base; ttsCfgStatus(); cfg.classList.add("show"); };
    document.getElementById("tnTtsClose").onclick = () => cfg.classList.remove("show");
    document.getElementById("tnTtsSave").onclick = () => {
      const u = ttsNormUrl(document.getElementById("tnTtsUrl").value);
      if (document.getElementById("tnTtsUrl").value.trim() && !u) { document.getElementById("tnTtsSt").textContent = "http:// か https:// で始まるURLを入れてください"; return; }
      ttsSetBase(u); cfg.classList.remove("show");
    };
    document.getElementById("tnTtsClear").onclick = () => { ttsSetBase(""); document.getElementById("tnTtsUrl").value = ""; cfg.classList.remove("show"); };
    // 開始画面（URL入力→音声読み込み→ナビ画面）1.9.0
    const st = document.createElement("div");
    st.id = "tnStart";
    st.innerHTML = `<div class="box">
      <div class="ttl">Train Navi</div>
      <div class="sub" id="tnStartInfo"></div>
      <div id="tnStartPhaseUrl">
        <label>音声サーバーのURL</label>
        <input id="tnStartUrl" type="url" inputmode="url" placeholder="https://....trycloudflare.com" autocomplete="off">
        <div class="note" id="tnStartNote"></div>
        <div class="row"><button id="tnStartGo">音声を読み込んで開始</button></div>
        <div class="row"><button id="tnStartSkip" class="sub">URLを入れずに開始（端末の音声）</button></div>
      </div>
      <div id="tnStartPhaseLoad" style="display:none">
        <div id="tnLoadMsg" style="margin-top:12px;font-weight:bold">音声を読み込んでいます…</div>
        <div class="bar"><i id="tnLoadBar"></i></div>
        <div class="note" id="tnLoadSub"></div>
        <div class="row"><button id="tnLoadSkip" class="sub">読み込みを待たずに開始</button><button id="tnStartClose" class="sub">やめる</button></div>
      </div>
    </div>`;
    d.appendChild(st);
    document.getElementById("tnStartGo").onclick = () => {
      unlockAudio();
      const raw = document.getElementById("tnStartUrl").value;
      const u = ttsNormUrl(raw);
      if (raw.trim() && !u) { document.getElementById("tnStartNote").textContent = "http:// か https:// で始まるURLを入れてください"; return; }
      if (!u) { enterNavi(); return; }
      nv.ttsOff = false;
      ttsSetBase(u);
      startLoad();
    };
    document.getElementById("tnStartSkip").onclick = () => { unlockAudio(); nv.ttsOff = true; enterNavi(); };
    document.getElementById("tnLoadSkip").onclick = () => { nv.preloadAbort = true; enterNavi(); };
    document.getElementById("tnStartClose").onclick = () => { nv.preloadAbort = true; closeNavi(); };
    document.getElementById("tnPipBtn").onclick = togglePip;
    // デバッグパネル
    const dbg = document.createElement("div");
    dbg.id = "tnDbg";
    dbg.innerHTML = `
      <div class="row"><b>🛠 シミュレーション（GPSなし）</b><button id="dbgOn">OFF</button></div>
      <div class="row"><button id="dbgPlay">▶ 自動走行</button><button id="dbgPrev">◀ 前の駅間</button><button id="dbgNext">次の駅間 ▶</button>
        <span>倍速</span><button data-m="1" class="mu on">×1</button><button data-m="3" class="mu">×3</button><button data-m="8" class="mu">×8</button></div>
      <div class="row"><span id="dbgSegLbl"></span></div>
      <div class="row"><span>次の駅まで</span><input type="range" id="dbgD" min="0" max="1500" step="5" value="1500"><span id="dbgDv">1500m</span></div>
      <div class="row"><span>速度</span><input type="range" id="dbgV" min="0" max="130" step="5" value="72"><span id="dbgVv">72km/h</span></div>
      <div class="row info" id="dbgInfo"></div>`;
    d.appendChild(dbg);
    document.getElementById("tnDbgBtn").onclick = () => dbg.classList.toggle("show");
    document.getElementById("dbgOn").onclick = () => simSetOn(!nv.sim.on);
    document.getElementById("dbgPlay").onclick = () => { if (!nv.sim.on) simSetOn(true); nv.sim.run = !nv.sim.run; simUi(); };
    document.getElementById("dbgPrev").onclick = () => simJump(-1);
    document.getElementById("dbgNext").onclick = () => simJump(1);
    dbg.querySelectorAll(".mu").forEach(b => b.onclick = () => { nv.sim.mult = Number(b.dataset.m); simUi(); });
    document.getElementById("dbgD").oninput = e => { if (!nv.sim.on) simSetOn(true); nv.sim.run = false; nv.sim.mode = "run"; nv.sim.D = Number(e.target.value); nv.sim.v = nv.sim.kmh / 3.6; nv.sim.t = nv.sim.D > nv.sim.L - 400 ? 5 : 60; simUi(); tick(); };
    document.getElementById("dbgV").oninput = e => { nv.sim.kmh = Number(e.target.value); nv.sim.v = nv.sim.kmh / 3.6; simUi(); tick(); };
    document.getElementById("tnCars").onclick = () => {
      const v = prompt("編成両数を入力（数字のみ。空欄で未設定）", nv.cars || "");
      if (v === null) return;
      nv.cars = String(v).replace(/[^0-9]/g, "").slice(0, 2);
      lsSet(CAR_KEY, nv.cars);
      renderCars();
    };
  }
  function renderBtns() {
    const v = document.getElementById("tnVoiceBtn"); v.classList.toggle("off", !nv.voiceOn);
    const waiting = nv.voiceOn && ttsEnabled() && !tts.ready; // 音声API設定あり＆まだ起きていない
    v.classList.toggle("wait", waiting);
    v.textContent = !nv.voiceOn ? "🔇 音声" : waiting ? "音声を準備しています…" : ttsEnabled() ? "🔊 音声（合成）" : "🔊 音声";
  }
  function renderCars() {
    document.getElementById("tnCars").innerHTML = nv.cars ? `${esc(nv.cars)}<small>両</small>` : `<small>両数<br>タップ</small>`;
  }

  // ---------- 音声（合成音声・女声） ----------
  function pickVoice() {
    if (!window.speechSynthesis) return null;
    const vs = speechSynthesis.getVoices().filter(v => /^ja/i.test(v.lang));
    if (!vs.length) return null;
    const male = /Ichiro|Otoya|Ken\b|Hattori|Takumi|Keita|Male|男/i;
    const female = /Kyoko|O-?Ren|Haruka|Ayumi|Nanami|Mizuki|Sayaka|Google 日本語|Female|女|Hikari|Shiori|Mayu/i;
    return vs.find(v => female.test(v.name) && !male.test(v.name)) || vs.find(v => !male.test(v.name)) || vs[0];
  }
  function unlockAudio() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC && !nv.audio) nv.audio = new AC();
      if (nv.audio && nv.audio.state === "suspended") nv.audio.resume();
    } catch (e) {}
    try { if (window.speechSynthesis) { speechSynthesis.getVoices(); const u = new SpeechSynthesisUtterance(" "); u.volume = 0; speechSynthesis.speak(u); } } catch (e) {}
  }
  function stopAudioSrc() { try { if (nv.curSrc) { nv.curSrc.onended = null; nv.curSrc.stop(); } } catch (e) {} nv.curSrc = null; }
  function cancelSpeech() { stopAudioSrc(); try { window.speechSynthesis && speechSynthesis.cancel(); } catch (e) {} }
  function playBuf(buf, text) {
    try {
      cancelSpeech();
      const src = nv.audio.createBufferSource(); src.buffer = buf; src.connect(nv.audio.destination);
      nv.speaking = true; nv.spokenAnything = true; nv.lastSaid = text + "（合成）";
      src.onended = () => { if (nv.curSrc === src) { nv.curSrc = null; nv.speaking = false; } };
      nv.curSrc = src; src.start(0);
      return true;
    } catch (e) { nv.curSrc = null; nv.speaking = false; return false; }
  }
  function sayDefault(text) {
    if (!window.speechSynthesis) { nv.speaking = false; return; }
    try {
      cancelSpeech();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "ja-JP"; u.pitch = 1.2; u.rate = 1.0; u.volume = 1;
      const v = pickVoice(); if (v) u.voice = v;
      nv.speaking = true; nv.spokenAnything = true; nv.lastSaid = text;
      u.onend = u.onerror = () => { nv.speaking = false; };
      speechSynthesis.speak(u);
    } catch (e) { nv.speaking = false; }
  }
  // 背景などで、すぐ鳴らせない時の再生（1.7.0）: AudioContext を起こし、デコード済みが無ければキャッシュから読んで、合成音声で鳴らす。無理な時だけ端末の音声
  async function saySynthSlow(text) {
    const my = nv.sayTok = (nv.sayTok || 0) + 1;
    nv.speaking = true; // 待っている間に次の注意喚起が重なって鳴らないように
    let ok = false;
    try {
      if (nv.audio.state !== "running") { try { await Promise.race([nv.audio.resume(), new Promise(r => setTimeout(r, 1500))]); } catch (e) {} }
      let buf = tts.mem.get(text);
      if (!buf) {
        const ab = await ttsCacheGet(text);
        if (ab) { try { buf = await ttsDecode(ab); tts.mem.set(text, buf); } catch (e) { buf = null; } }
      }
      if (nv.sayTok !== my) return; // もっと新しい再生が始まった
      if (buf && nv.audio.state === "running") ok = playBuf(buf, text);
    } catch (e) { /* 端末の音声へ */ }
    if (nv.sayTok !== my) return;
    if (!ok) { ttsPump(); sayDefault(text); }
  }
  function say(text) {
    if (!nv.voiceOn) return;
    // 合成音声API: デコード済みがあればすぐ再生。無い・AudioContext が止まっている時は saySynthSlow（キャッシュから再生を試みる）
    if (ttsEnabled() && nv.audio) {
      const buf = tts.mem.get(text);
      if (buf && nv.audio.state === "running" && playBuf(buf, text)) { nv.sayTok = (nv.sayTok || 0) + 1; return; }
      saySynthSlow(text);
      return;
    }
    sayDefault(text);
  }

  // ---------- 合成音声API（ベースURLが設定されている時だけ有効） ----------
  // GET /health（起動確認）、POST /tts {"text"} → audio/wav。無料枠でアイドル時はスリープし、復帰に数十秒〜数分かかる前提。
  const TTS_TIMEOUT = 25000;      // /tts のタイムアウト
  const TTS_AHEAD = 4;            // 再生位置から先、何駅分（区間）を裏で作っておくか（開始時は先頭3駅分で足りる）
  const TTS_KEEPALIVE = 4 * 60000; // /health を投げ続ける間隔
  const TTS_CACHE = "tuts4-navi-tts-v1";
  const tts = { base: "", ready: false, have: new Set(), mem: new Map(), fail: new Map(), inflight: null, busy: false, keepTimer: null, pollTimer: null, healthBusy: false, tok: 0 };
  function ttsNormUrl(v) { v = String(v || "").trim().replace(/\/+$/, ""); return /^https?:\/\/[^\s]+$/i.test(v) ? v : ""; }
  function ttsEnabled() { return !!tts.base && !nv.ttsOff; }
  tts.base = ttsNormUrl(lsGet(TTS_KEY, ""));
  function ttsCfgStatus() {
    const e = document.getElementById("tnTtsSt"); if (!e) return;
    e.textContent = !ttsEnabled() ? "状態: 未設定（端末の音声のみ）" : tts.ready ? `状態: 音声OK（生成済み ${tts.mem.size} 文）` : "状態: 準備中（APIが起動するのを待っています。その間は端末の音声で案内します）";
  }
  function ttsSetBase(u) {
    tts.base = u; lsSet(TTS_KEY, u);
    if (u) nv.ttsOff = false;
    tts.ready = false; tts.fail.clear(); ttsAbort();
    renderBtns();
    if (nv.stops) { if (u) ttsStart(); else ttsStop(); }
  }
  function ttsAbort() { try { tts.inflight && tts.inflight.ctl.abort(); } catch (e) {} tts.inflight = null; }
  async function ttsFetch(path, init, ms) {
    const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), ms);
    try { return await fetch(tts.base + path, Object.assign({ signal: ctl.signal, cache: "no-store" }, init || {})); }
    finally { clearTimeout(timer); }
  }
  // /health（結果は待たずに投げる）。200で音声OK。起きるまでは数秒おきにもう一度
  function ttsHealth() {
    if (!ttsEnabled() || tts.healthBusy) return;
    tts.healthBusy = true;
    const base = tts.base;
    ttsFetch("/health", {}, 90000).then(r => {
      if (base !== tts.base) return;
      if (r.ok) { if (!tts.ready) { tts.ready = true; renderBtns(); ttsCfgStatus(); } ttsPump(); }
      else if (tts.ready) { tts.ready = false; renderBtns(); }
    }).catch(() => { if (base === tts.base && tts.ready) { tts.ready = false; renderBtns(); } })
      .finally(() => { tts.healthBusy = false; });
  }
  function ttsStart() {
    ttsStop();
    if (!ttsEnabled() || !nv.stops) return;
    ttsHealth();
    tts.keepTimer = setInterval(() => { if (!document.hidden) ttsHealth(); }, TTS_KEEPALIVE);          // スリープ防止
    tts.pollTimer = setInterval(() => { if (!tts.ready && !document.hidden) ttsHealth(); }, 8000);       // 起きるまで様子を見る
    tts.vis = () => { if (document.hidden) return; ttsHealth(); };                                        // 非表示の間は止まる（戻ったらすぐ確認）
    document.addEventListener("visibilitychange", tts.vis);
    tts.tap = () => { try { if (nv.audio && nv.audio.state === "suspended") nv.audio.resume(); } catch (e) {} };
    document.addEventListener("pointerdown", tts.tap, true);
    ttsPrune();
  }
  function ttsStop() {
    clearInterval(tts.keepTimer); clearInterval(tts.pollTimer); tts.keepTimer = tts.pollTimer = null;
    if (tts.vis) { document.removeEventListener("visibilitychange", tts.vis); tts.vis = null; }
    if (tts.tap) { document.removeEventListener("pointerdown", tts.tap, true); tts.tap = null; }
    ttsAbort();
  }
  // 文のハッシュ（Cache Storageのキー）
  async function ttsHash(text) {
    try {
      if (window.crypto && crypto.subtle) {
        const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
        return Array.from(new Uint8Array(d)).map(b => b.toString(16).padStart(2, "0")).join("");
      }
    } catch (e) {}
    let h = 2166136261; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
    return "f" + (h >>> 0).toString(16) + "_" + text.length;
  }
  const ttsKey = async text => new Request("https://tts.cache.local/" + await ttsHash(text));
  async function ttsCacheGet(text) {
    try { if (!window.caches) return null; const c = await caches.open(TTS_CACHE); const r = await c.match(await ttsKey(text)); return r ? await r.arrayBuffer() : null; } catch (e) { return null; }
  }
  async function ttsCachePut(text, ab) {
    try { if (!window.caches) return; const c = await caches.open(TTS_CACHE); await c.put(await ttsKey(text), new Response(new Blob([ab], { type: "audio/wav" }), { headers: { "Content-Type": "audio/wav" } })); } catch (e) {}
  }
  async function ttsPrune() { // 増えすぎたら古いものから消す
    try { if (!window.caches) return; const c = await caches.open(TTS_CACHE); const ks = await c.keys(); if (ks.length > 600) for (const k of ks.slice(0, ks.length - 500)) await c.delete(k); } catch (e) {}
  }
  async function ttsDecode(ab) {
    if (!nv.audio) throw new Error("no audio ctx");
    const copy = ab.slice(0);
    return await new Promise((res, rej) => { const p = nv.audio.decodeAudioData(copy, res, rej); if (p && p.then) p.then(res, rej); });
  }
  // 先に作っておく文（区間ごとに「次は、○○、停車。」＋停車前の固定文）。列車を選んだ時点で、全駅ぶん。現在の区間に近い順（1.7.0）
  function ttsWanted() {
    const out = [], seen = new Set(), ev = nv.ev; if (!ev || !ev.length) return out;
    const cars = nv.cars, add = t => { if (t && !seen.has(t)) { seen.add(t); out.push(t); } };
    const n = ev.length - 1, k0 = Math.min(Math.max(0, nv.curK || 0), Math.max(0, n - 1));
    for (let q = 0; q < n; q++) {
      const j = (k0 + q) % n; // 今の区間から先へ、最後まで行ったら手前の区間
      add(`次は、${ev[j + 1].name}、停車。`);
      add("停車、停車、停車。");
      add(cars ? `${cars}両、停車。${cars}両、停車。` : "停車。停車。");
      add(cars ? `${cars}両、${cars}両。` : "停車、停車。");
    }
    return out;
  }
  // 生成を進める（同時1本。キャッシュにあれば読み込み、無ければ /tts）
  async function ttsPump() {
    if (!ttsEnabled() || !nv.stops || tts.busy || tts.preloading) return;
    tts.busy = true;
    const myTok = nv.token;
    try {
      for (let guard = 0; guard < 200; guard++) {
        if (!ttsEnabled() || !nv.stops || nv.token !== myTok) break;
        const text = ttsWanted().find(t => !tts.mem.has(t) && !(tts.fail.get(t) > Date.now()) && !(tts.have.has(t) && !nv.audio));
        if (!text) break;
        let ab = await ttsCacheGet(text);
        if (ab) tts.have.add(text);
        if (!ab) {
          if (!tts.ready) break; // APIがまだ起きていない
          const ctl = new AbortController(); tts.inflight = { text, ctl };
          const timer = setTimeout(() => ctl.abort(), TTS_TIMEOUT);
          try {
            const r = await fetch(tts.base + "/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }), signal: ctl.signal, cache: "no-store" });
            if (!r.ok) throw new Error("HTTP " + r.status);
            ab = await r.arrayBuffer();
            if (!ab.byteLength) throw new Error("empty");
            await ttsCachePut(text, ab); tts.have.add(text);
          } catch (e) {
            const stale = !ttsWanted().includes(text); // 駅を飛ばして不要になった要求の中止は失敗扱いにしない
            if (!stale) {
              tts.fail.set(text, Date.now() + 30000);
              if (e && (e.name === "AbortError" || e.name === "TypeError")) { tts.ready = false; renderBtns(); ttsHealth(); } // 寝てしまった可能性: /healthで見直す
            }
            ab = null;
          } finally { clearTimeout(timer); tts.inflight = null; }
        }
        if (ab && nv.audio) { try { tts.mem.set(text, await ttsDecode(ab)); } catch (e) { tts.fail.set(text, Date.now() + 30000); } } // AudioContext が無い間はキャッシュ保存だけ（タップ後にデコード）
      }
    } finally { tts.busy = false; ttsCfgStatus(); }
  }
  // 周期処理から呼ぶ: 駅を飛ばして不要になった要求は破棄し、先行生成を続ける
  function ttsTouch() {
    if (!ttsEnabled()) return;
    if (tts.inflight && !ttsWanted().includes(tts.inflight.text)) ttsAbort();
    ttsPump();
  }
  // 開始画面用（1.9.0）: その列車で使う文を全部、キャッシュ保存＋デコード済みまで仕上げる。進み具合を onp(done,total,failed) で知らせる
  async function ttsPreloadAll(onp) {
    const myTok = nv.token;
    const list = ttsWanted();
    let done = 0, failed = 0;
    tts.preloading = true;
    try {
      for (const text of list) {
        if (nv.token !== myTok || nv.preloadAbort || !nv.stops) return { aborted: true, done, total: list.length, failed };
        if (!tts.mem.has(text)) {
          let ab = await ttsCacheGet(text);
          if (!ab) {
            let waited = 0;
            while (!tts.ready && waited < 120000) {
              if (nv.token !== myTok || nv.preloadAbort || !nv.stops) return { aborted: true, done, total: list.length, failed };
              await new Promise(r => setTimeout(r, 1000)); waited += 1000;
              if (onp) onp(done, list.length, failed);
            }
            if (!tts.ready) return { notReady: true, done, total: list.length, failed };
            try {
              const r = await ttsFetch("/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) }, TTS_TIMEOUT);
              if (!r.ok) throw new Error("HTTP " + r.status);
              ab = await r.arrayBuffer();
              if (!ab.byteLength) throw new Error("empty");
              await ttsCachePut(text, ab);
            } catch (e) { failed++; if (onp) onp(done, list.length, failed); continue; }
          }
          tts.have.add(text);
          if (nv.audio) { try { tts.mem.set(text, await ttsDecode(ab)); } catch (e) { /* キャッシュにはあるので再生時に読む */ } }
        }
        done++; if (onp) onp(done, list.length, failed);
      }
      return { done, total: list.length, failed };
    } finally { tts.preloading = false; }
  }

  // ---------- 時刻列（停車する駅だけ） ----------
  function buildEvents(stops) {
    const ev = []; let prev = -1;
    stops.forEach((s, i) => {
      const last = i === stops.length - 1;
      if (!last && i > 0 && (s.pass === true || (!s.type && !s.bound && s.pass !== false))) return; // 通過
      const a0 = ttToSec(s.arr || s.dep, s.arr ? s.arrSec : s.depSec);
      const d0 = ttToSec(s.dep || s.arr, s.dep ? s.depSec : s.arrSec);
      if (a0 === null) return;
      let a = a0, d = d0;
      while (a < prev) a += 86400;
      while (d < a) d += 86400;
      prev = d;
      ev.push({ a, d: last ? a : d, i, name: s.station });
    });
    return ev;
  }

  // 位置：{kind:"wait"|"stop"|"run", k, E, R, dur}
  function locate(nowSec, ev) {
    if (!ev.length) return null;
    for (const n of [nowSec, nowSec + 86400]) {
      for (let k = 0; k < ev.length; k++) {
        const e = ev[k], nx = ev[k + 1];
        const stopEnd = nx ? Math.max(e.d, e.a + 20) : e.a + 180;
        if (n >= e.a && n <= stopEnd) return { kind: "stop", k };
        if (nx && n > stopEnd && n < nx.a) return { kind: "run", k, E: n - stopEnd, R: nx.a - n, dur: nx.a - stopEnd };
      }
      if (n < ev[0].a && n > ev[0].a - 600) return { kind: "wait", k: 0 };
    }
    return null;
  }

  const BRAKE_DIST = 500;
  const MID_DIST = 200; // ④の判定に入る距離（m）
  const MID_KMH = 25;   // ④を始める速度（km/h以下）
  function nowSec() { const d = new Date(); return (d.getHours() * 60 + d.getMinutes()) * 60 + d.getSeconds(); }

  // ---------- GPS（常にGPSで動かす。測位できない間（地下など）は時刻で代わりに判定） ----------
  const coordCache = new Map(); // 正規化した駅名 → [{lat,lon}...]（同名駅の候補）
  function dist(a, b) {
    const R = 6371000, rad = x => x * Math.PI / 180;
    const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function normName(n) { return typeof ttNormStation === "function" ? ttNormStation(n) : String(n || "").replace(/駅$/, ""); }

  // 駅の座標を取る（HeartRails：現在地検索と同じAPI）。同名の駅が複数あれば、基準の位置に一番近いものを選ぶ
  function fetchCoords(name) {
    const key = normName(name);
    if (coordCache.has(key)) return Promise.resolve(coordCache.get(key));
    const q = encodeURIComponent(String(name).replace(/駅$/, ""));
    return fetch(`https://express.heartrails.com/api/json?method=getStations&name=${q}`)
      .then(r => r.json())
      .then(d => {
        const list = ((d.response && d.response.station) || []).map(x => ({ lat: Number(x.y), lon: Number(x.x) })).filter(c => isFinite(c.lat) && isFinite(c.lon));
        coordCache.set(key, list);
        return list;
      })
      .catch(() => { coordCache.set(key, []); return []; });
  }
  // 手前の駅の座標（または現在地）に一番近い候補を、その停車駅の座標に決める
  function resolveCoords() {
    const ev = nv.ev; if (!ev) return;
    let ref = nv.pos ? { lat: nv.pos.lat, lon: nv.pos.lon } : null;
    for (let k = 0; k < ev.length; k++) {
      const cands = coordCache.get(normName(ev[k].name));
      if (!cands) { ev[k].c = null; continue; }
      if (!cands.length) { ev[k].c = null; continue; }
      const c = ref ? cands.reduce((b, x) => dist(ref, x) < dist(ref, b) ? x : b, cands[0]) : cands[0];
      ev[k].c = c; ref = c;
    }
  }
  async function loadCoords(token) {
    for (const e of nv.ev) {
      if (nv.token !== token) return;
      if (!coordCache.has(normName(e.name))) { await fetchCoords(e.name); resolveCoords(); }
    }
    resolveCoords();
  }
  function startGps() {
    stopGps();
    nv.pos = null; nv.speed = null; nv.fixAt = 0; nv.acc = 9999;
    if (!navigator.geolocation) { setGpsMsg("この端末ではGPSが使えません（時刻で判定）"); return; }
    setGpsMsg("GPS測位中…");
    nv.watchId = navigator.geolocation.watchPosition(p => onFix(p.coords, p.timestamp || Date.now()),
      err => setGpsMsg(err && err.code === 1 ? "位置情報が許可されていません（時刻で判定）" : "GPSを取得できません（時刻で判定）"),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 });
  }
  function stopGps() {
    if (nv.watchId != null && navigator.geolocation) navigator.geolocation.clearWatch(nv.watchId);
    nv.watchId = null;
  }
  function setGpsMsg(m) { const e = document.getElementById("tnGpsMsg"); if (e) e.textContent = m; }
  function onFix(c, t) {
    const cur = { lat: c.latitude, lon: c.longitude };
    let speed = (typeof c.speed === "number" && !isNaN(c.speed)) ? c.speed : null;
    if (speed === null && nv.pos && t > nv.fixAt) speed = dist(nv.pos, cur) / ((t - nv.fixAt) / 1000);
    nv.pos = cur; nv.speed = speed == null ? 0 : speed; nv.fixAt = Date.now(); nv.acc = c.accuracy || 0;
    if (!nv.coordsResolvedWithPos) { nv.coordsResolvedWithPos = true; resolveCoords(); }
    tick();
  }
  function gpsFresh() { return nv.pos && Date.now() - nv.fixAt < 20000 && nv.acc <= 150; }

  // ---------- デバッグ：GPSなしのシミュレーション ----------
  function segLen(k) {
    const a = nv.ev[k], b = nv.ev[k + 1];
    return a && b && a.c && b.c ? Math.max(300, Math.round(dist(a.c, b.c))) : 1500;
  }
  function simClearSpoken(k) { [...nv.spoken].forEach(x => { if (x.endsWith(":" + k)) nv.spoken.delete(x); }); if (nv.midK === k) nv.midK = -1; }
  function simSetOn(on) {
    const m = nv.sim;
    m.on = on; clearInterval(m.timer); m.timer = null;
    if (on) {
      nv.spoken = new Set(); nv.lastMid = 0; nv.midK = -1;
      m.k = 0; m.mode = "stop"; m.dwell = 0; m.run = false; m.L = segLen(0); m.D = m.L; m.v = 0;
      m.timer = setInterval(simStep, 200);
    }
    simUi(); tick();
  }
  function simJump(d) {
    const m = nv.sim; if (!m.on) simSetOn(true);
    m.k = Math.max(0, Math.min(nv.ev.length - 2, m.k + d));
    m.L = segLen(m.k); m.D = m.L; m.v = 0; m.t = 0; m.mode = "run"; m.dwell = 0;
    simClearSpoken(m.k); nv.lastMid = 0; simUi(); tick();
  }
  function simStep() {
    const m = nv.sim; if (!m.on || !m.run || !nv.stops) return;
    const dt = 0.2 * m.mult, vmax = Math.min(m.kmh / 3.6, 33);
    if (m.mode === "stop") {
      m.dwell += dt;
      if (m.dwell >= 6 && m.k < nv.ev.length - 1) { m.mode = "run"; m.L = segLen(m.k); m.D = m.L; m.v = 0; m.t = 0; simClearSpoken(m.k); }
    } else {
      m.t += dt;
      const brake = m.v * m.v / (2 * 0.9) + 10;
      if (m.D <= brake) m.v = Math.max(1.5, m.v - 0.9 * dt); else m.v = Math.min(vmax, m.v + 0.9 * dt);
      m.D -= m.v * dt;
      if (m.D <= 0.5) { m.D = 0; m.v = 0; m.mode = "stop"; m.k++; m.dwell = 0; if (m.k >= nv.ev.length - 1) m.run = false; }
    }
    simUi(); tick();
  }
  function simLoc() {
    const m = nv.sim;
    nv.src = "gps";
    if (m.mode === "stop") return { kind: "stop", k: m.k, src: "gps" };
    return { kind: "run", k: m.k, D: m.D, v: m.v, t: m.t, src: "gps" };
  }
  function simUi() {
    const m = nv.sim, q = id => document.getElementById(id);
    if (!q("dbgOn")) return;
    q("dbgOn").textContent = m.on ? "ON" : "OFF"; q("dbgOn").classList.toggle("on", m.on);
    q("dbgPlay").textContent = m.run ? "⏸ 一時停止" : "▶ 自動走行"; q("dbgPlay").classList.toggle("on", m.run);
    document.querySelectorAll("#tnDbg .mu").forEach(b => b.classList.toggle("on", Number(b.dataset.m) === m.mult));
    const a = nv.ev[m.k], b = nv.ev[m.k + 1];
    q("dbgSegLbl").textContent = a ? `${m.mode === "stop" ? "停車中：" : "区間："}${a.name}${b ? " → " + b.name : ""}（駅間 約${m.L || segLen(m.k)}m${a.c && b && b.c ? "" : "・座標なしの仮の長さ"}）` : "";
    q("dbgD").max = m.L || segLen(m.k); if (m.mode === "run") q("dbgD").value = Math.round(m.D);
    q("dbgDv").textContent = `${Math.round(m.D)}m`; q("dbgVv").textContent = `${Math.round(m.on && m.mode === "run" ? m.v * 3.6 : m.kmh)}km/h`;
  }

  // ---------- 位置の判定 ----------
  // 返り値：{kind:"wait"|"stop"|"run"|"end", k, D(次の停車駅までの距離m or null), R(時刻での残り秒 or null), t(発車からの秒), v, src}
  function timeLocate(n, ev) {
    if (!ev.length) return null;
    for (const nn of [n, n + 86400]) {
      for (let k = 0; k < ev.length; k++) {
        const e = ev[k], nx = ev[k + 1];
        const stopEnd = nx ? Math.max(e.d, e.a + 20) : e.a + 180;
        if (nn >= e.a && nn <= stopEnd) return { kind: "stop", k };
        if (nx && nn > stopEnd && nn < nx.a) return { kind: "run", k, t: nn - stopEnd, R: nx.a - nn, dur: nx.a - stopEnd };
      }
      if (nn < ev[0].a && nn > ev[0].a - 600) return { kind: "wait", k: 0 };
    }
    return null;
  }

  function locate() {
    if (nv.sim.on) return simLoc();
    const ev = nv.ev, n = nowSec();
    const tl = timeLocate(n, ev);
    nv.src = "time";
    if (!ev.length) return null;
    // GPSが使えない時（地下・未許可）は時刻のみ
    if (!gpsFresh()) return tl;
    resolveCoords();
    // 初期位置：最初は時刻の判定を採用
    if (nv.seg == null) nv.seg = tl && tl.k != null ? { k: tl.k, atStop: !tl.kind || tl.kind !== "run", depAt: Date.now() } : { k: 0, atStop: true, depAt: Date.now() };
    const seg = nv.seg, v = nv.speed || 0;
    // どこかの停車駅の近くで止まっていれば、そこにいると確定する（折り返し・遅延で時刻と食い違った時の補正）
    for (let j = 0; j < ev.length; j++) {
      if (ev[j].c && dist(nv.pos, ev[j].c) < 200 && v < 2 && (Math.abs(j - seg.k) <= 3)) {
        if (!(seg.k === j && seg.atStop)) { nv.seg = { k: j, atStop: true, depAt: Date.now() }; nv.spoken = new Set(); nv.lastMid = 0; nv.midK = -1; }
        break;
      }
    }
    const sg = nv.seg;
    const cur = ev[sg.k], nxt = ev[sg.k + 1];
    if (!nxt && sg.atStop) { nv.src = "gps"; return { kind: "stop", k: sg.k, src: "gps" }; }
    if (sg.atStop) {
      if (cur.c && dist(nv.pos, cur.c) > 200) { nv.seg = { k: sg.k, atStop: false, depAt: Date.now() }; }
      else { nv.src = "gps"; return { kind: "stop", k: sg.k, src: "gps" }; }
    }
    const sg2 = nv.seg;
    const nn = ev[sg2.k + 1];
    if (!nn) return tl;
    if (!nn.c) return tl; // 次の駅の座標が取れていない間は時刻で代用
    const D = Math.max(0, dist(nv.pos, nn.c) - carOffset()); // 自分が先頭にいる扱い（号車ぶん前へ）
    nv.src = "gps";
    return { kind: "run", k: sg2.k, D, v, t: (Date.now() - sg2.depAt) / 1000, src: "gps" };
  }

  function phaseOf(loc) {
    if (!loc) return "idle";
    if (loc.kind === "wait") return "wait";
    if (loc.kind === "stop") return loc.k === nv.ev.length - 1 ? "end" : "stopped";
    const spokenDepart = nv.spoken.has("depart:" + loc.k);
    if (loc.src === "gps") {
      const v = loc.v || 0;
      const brakeD = BRAKE_DIST; // 停止制動の開始位置：駅の500m手前
      // ④ホーム中間：駅の手前200m以内で、速度が25km/h以下、かつ③を言い終えた後。一度始めたら停車まで続ける
      if (nv.midK === loc.k) return "mid";
      const slow = v * 3.6 <= MID_KMH;
      if (loc.D <= 45 || (loc.D <= MID_DIST && slow && nv.spoken.has("pfend:" + loc.k) && !nv.speaking)) { nv.midK = loc.k; return "mid"; }
      if (loc.D <= 130) return "pfend";
      if (!spokenDepart && loc.t <= 30) return "depart";
      if (loc.D <= brakeD) return "brake";
      return loc.t <= 30 ? "depart" : "cruise";
    }
    const brakeAt = Math.min(30, loc.dur * 0.4), pfAt = Math.min(12, loc.dur * 0.2), midAt = Math.min(5, loc.dur * 0.08);
    if (loc.R <= midAt) return "mid";
    if (loc.R <= pfAt) return "pfend";
    if (!spokenDepart && loc.t <= 25) return "depart";
    if (loc.R <= brakeAt) return "brake";
    return loc.t <= 25 ? "depart" : "cruise";
  }

  // ---------- 周期処理 ----------
  function tick() {
    if (!nv.stops || nv.setup) return;
    const p2 = n => String(n).padStart(2, "0"), d = new Date();
    document.getElementById("tnClock").textContent = `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
    render(locate());
  }

  function render(loc) {
    const ov = document.getElementById("tnOverlay");
    const ev = nv.ev;
    const phase = phaseOf(loc);
    const typeTxt = nv.meta.type || "普通";
    const nextIdx = loc ? Math.min(loc.k + 1, ev.length - 1) : 0;
    const nextName = ev[nextIdx] ? ev[nextIdx].name : "";
    const endName = ev[ev.length - 1] ? ev[ev.length - 1].name : "";

    const warn = phase === "brake", pf = phase === "pfend" || phase === "mid";
    ov.classList.toggle("brake", warn);
    ov.classList.toggle("platform", pf);
    ov.classList.toggle("flash", (warn || phase === "pfend") && nv.flash);
    const typeEl = document.getElementById("tnTypeTxt");
    if (warn) typeEl.textContent = "停車";
    else if (pf) typeEl.textContent = nv.cars ? `${nv.cars}両` : "停車";
    else if (phase === "end") typeEl.textContent = "終点";
    else typeEl.textContent = typeTxt;
    document.getElementById("tnBound").textContent = (warn || pf || phase === "end" || !nv.meta.bound) ? "" : `${nv.meta.bound}行き`;
    document.getElementById("tnNextLbl").textContent = phase === "end" ? "" : "次は";
    const shown = phase === "end" ? endName : nextName;
    document.getElementById("tnNextTxt").textContent = shown;
    document.getElementById("tnNext").classList.toggle("fit", shown.length > 5);
    document.getElementById("tnLed").classList.toggle("blink", warn || pf);
    setGpsMsg(nv.sim.on ? "🛠 シミュレーション中" : nv.src === "gps" && gpsFresh() ? "📍 GPSで判定中" : (nv.watchId != null ? "GPS待ち（時刻で判定中）" : "時刻で判定中"));

    // 音声
    const k = loc ? loc.k : -1;
    nv.curK = loc ? loc.k : 0; ttsTouch();
    const once = key => { if (nv.spoken.has(key)) return false; nv.spoken.add(key); return true; };
    const cars = nv.cars;
    if (phase === "depart" && nextName) { if (once("depart:" + k)) say(`次は、${nextName}、停車。`); }
    else if (phase === "brake") { if (once("brake:" + k)) say("停車、停車、停車。"); }
    else if (phase === "pfend") { if (once("pfend:" + k)) say(cars ? `${cars}両、停車。${cars}両、停車。` : "停車。停車。"); }
    else if (phase === "mid") {
      // 停まるまで繰り返す（前の発声が終わってから）
      const now = Date.now();
      if (!nv.speaking && now - (nv.lastMid || 0) > 2500) { nv.lastMid = now; say(cars ? `${cars}両、${cars}両。` : "停車、停車。"); }
    } else if (phase === "stopped" || phase === "end") {
      if (nv.spokenAnything) { cancelSpeech(); nv.spokenAnything = false; }
    }
    nv.lastPhase = phase;
    nv.view = {
      typeTxt: typeEl.textContent, mode: warn ? (nv.flash ? "brakeB" : "brakeA") : pf ? "pf" : "norm",
      bound: document.getElementById("tnBound").textContent, nextLbl: document.getElementById("tnNextLbl").textContent,
      nextTxt: shown, no: document.getElementById("tnNo").textContent, cars: nv.cars, led: warn || pf
    };
    if (nv.pipOn) drawPip();
    const info = document.getElementById("dbgInfo");
    if (info && document.getElementById("tnDbg").classList.contains("show")) {
      info.textContent = `phase=${phase}  判定元=${nv.sim.on ? "シミュレーション" : nv.src}\n` +
        (loc && loc.kind === "run" ? `次駅まで ${loc.D != null ? Math.round(loc.D) + "m" : "(時刻判定) 残り" + Math.round(loc.R) + "秒"} / 速度 ${loc.v != null ? (loc.v * 3.6).toFixed(0) + "km/h" : "-"} / 発車から ${Math.round(loc.t || 0)}秒\n` : "") +
        `GPS: ${nv.pos ? nv.pos.lat.toFixed(5) + "," + nv.pos.lon.toFixed(5) + " 精度" + Math.round(nv.acc) + "m 速度" + ((nv.speed || 0) * 3.6).toFixed(0) + "km/h" : "なし"}\n` +
        `駅座標: ${nv.ev.map(e => e.name + (e.c ? "○" : "×")).join(" ")}\n` +
        `最後の発声: ${nv.lastSaid || "-"}`;
    }
  }

  // ---------- ピクチャ・イン・ピクチャ（小窓） ----------
  // 画面をcanvasに描き、それをvideoにして小窓に出す。他のアプリを開いても、小窓は前面に残る。
  function drawPip() {
    const cv = nv.pipCanvas, v = nv.view; if (!cv || !v) return;
    const g = cv.getContext("2d"), W = cv.width, H = cv.height;
    const pw = Math.round(W * 0.7), ph = H / 2;
    const font = (px, bold) => `${bold ? "bold " : ""}${px}px "Hiragino Sans","Meiryo",sans-serif`;
    const fit = (txt, px, max, bold) => { let p = px; g.font = font(p, bold); while (g.measureText(txt).width > max && p > 16) { p -= 4; g.font = font(p, bold); } };
    // 上：種別
    let bg = "#000", fg = "#fff";
    if (v.mode === "brakeA") { bg = "#e60012"; fg = "#fff"; } else if (v.mode === "brakeB") { bg = "#fff"; fg = "#e60012"; } else if (v.mode === "pf") { bg = "#fff"; fg = "#1a237e"; }
    g.fillStyle = bg; g.fillRect(0, 0, pw, v.mode === "pf" || v.mode.startsWith("brake") ? H : ph);
    g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = fg;
    const big = v.mode === "pf" || v.mode.startsWith("brake");
    fit(v.typeTxt, big ? 210 : 120, pw - 30, true);
    g.fillText(v.typeTxt, pw / 2, big ? H / 2 : ph / 2);
    if (!big) {
      if (v.bound) { g.font = font(22); g.fillStyle = "#bbb"; g.textAlign = "left"; g.fillText(v.bound, 12, ph - 18); g.textAlign = "center"; }
      // 下：次駅
      g.fillStyle = "#fff"; g.fillRect(0, ph, pw, ph);
      g.fillStyle = "#000"; fit(v.nextTxt, 100, pw - 30, true); g.fillText(v.nextTxt, pw / 2, ph + ph / 2 + 6);
      if (v.nextLbl) { g.font = font(20); g.fillStyle = "#555"; g.textAlign = "left"; g.fillText(v.nextLbl, 12, ph + 22); g.textAlign = "center"; }
    }
    // 右：黄色（列車番号・両数）
    g.fillStyle = "#ffec1a"; g.fillRect(pw, 0, W - pw, H);
    g.fillStyle = "#000"; g.font = font(30); g.fillText(v.no || "", pw + (W - pw) / 2, 44);
    const c = v.cars ? v.cars : "";
    g.font = font(c.length > 1 ? 120 : 170, true); g.fillText(c, pw + (W - pw) / 2 - (c ? 14 : 0), H / 2 + 20);
    if (c) { g.font = font(40, true); g.fillText("両", pw + (W - pw) / 2 + (c.length > 1 ? 74 : 56), H / 2 + 62); }
    // LED
    if (v.led) { for (let i = 0; i < 6; i++) { g.fillStyle = ((i + (nv.flash ? 1 : 0)) % 2) ? "#e60012" : "#5a2a2a"; g.fillRect(40 + i * 60, H - 14, 44, 8); } }
  }
  // 動画（canvasの映像）を先に用意しておく。小窓ボタンを押した時は、すぐに小窓を要求するだけにする
  // （iPhoneは、ボタンを押した操作の直後でないと小窓にできないため）
  function preparePip() {
    if (!nv.pipCanvas) { nv.pipCanvas = document.createElement("canvas"); nv.pipCanvas.width = 640; nv.pipCanvas.height = 360; }
    if (!nv.pipVideo) {
      const vd = document.createElement("video");
      vd.muted = true; vd.defaultMuted = true; vd.loop = true; vd.autoplay = true;
      vd.playsInline = true; vd.setAttribute("playsinline", ""); vd.setAttribute("webkit-playsinline", "");
      vd.style.cssText = "position:fixed;left:6px;bottom:6px;width:96px;height:54px;z-index:10003;opacity:0;pointer-events:none;border:0;background:transparent"; // 見えない（小窓用）。display:noneにはしない
      document.getElementById("tnOverlay").appendChild(vd);
      const onLeave = () => { nv.pipOn = false; clearInterval(nv.pipTimer); const b = document.getElementById("tnPipBtn"); if (b) b.textContent = "📺 小窓"; };
      vd.addEventListener("leavepictureinpicture", onLeave);
      vd.addEventListener("webkitpresentationmodechanged", () => { if (vd.webkitPresentationMode !== "picture-in-picture") onLeave(); });
      nv.pipVideo = vd;
    }
    const vd = nv.pipVideo;
    if (!vd.srcObject) {
      try { vd.srcObject = nv.pipCanvas.captureStream(5); } catch (e) { nv.pipErr = "captureStream: " + (e && e.message); return; }
    }
    drawPip();
    const pr = vd.play(); if (pr && pr.catch) pr.catch(e => { nv.pipErr = "play: " + (e && e.name); });
  }
  function togglePip() {
    unlockAudio(); // 小窓に切り替えるタップのついでに AudioContext を起こしておく（1.9.0）
    const btn = document.getElementById("tnPipBtn");
    if (nv.pipOn) { closePip(); return; }
    const vd = nv.pipVideo;
    const fail = why => {
      nv.pipOn = false; clearInterval(nv.pipTimer); btn.textContent = "📺 小窓";
      alert("小窓にできませんでした。\n" + why + (nv.pipErr ? "\n（" + nv.pipErr + "）" : "") + "\nSafariで開いているか、iOSを最新にしているか確認してな。");
    };
    if (!vd) return fail("準備ができていません");
    nv.pipOn = true; drawPip();
    clearInterval(nv.pipTimer); nv.pipTimer = setInterval(() => { if (nv.stops) tick(); }, 1000);
    const done = () => { btn.textContent = "📺 小窓 ON"; };
    try {
      // iPhoneのSafariは、独自の方式（webkitSetPresentationMode）を先に試す
      if (vd.webkitSupportsPresentationMode && vd.webkitSupportsPresentationMode("picture-in-picture")) {
        vd.webkitSetPresentationMode("picture-in-picture");
        setTimeout(() => { if (vd.webkitPresentationMode === "picture-in-picture") done(); else fail("webkitPresentationMode=" + vd.webkitPresentationMode); }, 700);
        return;
      }
      if (document.pictureInPictureEnabled && vd.requestPictureInPicture) {
        vd.requestPictureInPicture().then(done).catch(e => fail((e && e.name) + ": " + (e && e.message)));
        return;
      }
      fail("このブラウザは小窓に対応していません（pictureInPictureEnabled=" + document.pictureInPictureEnabled + "）");
    } catch (e) { fail((e && e.name) + ": " + (e && e.message)); }
  }
  function closePip() {
    nv.pipOn = false; clearInterval(nv.pipTimer);
    try { if (document.pictureInPictureElement) document.exitPictureInPicture(); if (nv.pipVideo && nv.pipVideo.webkitSetPresentationMode && nv.pipVideo.webkitPresentationMode === "picture-in-picture") nv.pipVideo.webkitSetPresentationMode("inline"); } catch (e) {}
    const b = document.getElementById("tnPipBtn"); if (b) b.textContent = "📺 小窓";
  }

  // ---------- 開始フロー（1.9.0）: URL入力 → 音声読み込み → ナビ画面 ----------
  function showStart() {
    const s = document.getElementById("tnStart"); if (!s) { enterNavi(); return; }
    document.getElementById("tnStartUrl").value = tts.base || "";
    const info = `${nv.meta.type || "普通"} ${nv.meta.bound ? nv.meta.bound + "行き" : ""} ${document.getElementById("tnNo").textContent || ""}`;
    document.getElementById("tnStartInfo").textContent = info.trim();
    document.getElementById("tnStartNote").textContent = "ColabのURLは毎回変わります。今日のURLを貼ってください（前回のURLが入っています）。";
    document.getElementById("tnStartPhaseUrl").style.display = "";
    document.getElementById("tnStartPhaseLoad").style.display = "none";
    s.classList.add("show");
  }
  function startLoad() {
    document.getElementById("tnStartPhaseUrl").style.display = "none";
    document.getElementById("tnStartPhaseLoad").style.display = "";
    document.getElementById("tnLoadMsg").textContent = "音声を読み込んでいます…";
    document.getElementById("tnLoadSub").textContent = "";
    document.getElementById("tnLoadBar").style.width = "0%";
    nv.preloadAbort = false;
    ttsPreloadAll((done, total, failed) => {
      const s = document.getElementById("tnStart"); if (!s || !s.classList.contains("show")) return;
      document.getElementById("tnLoadBar").style.width = (total ? Math.round(done / total * 100) : 100) + "%";
      document.getElementById("tnLoadSub").textContent = `${done} / ${total} 文` + (failed ? `（失敗 ${failed}）` : "") + (!tts.ready ? "\nサーバーが起きるのを待っています…" : "");
    }).then(res => {
      if (!nv.stops || !nv.setup) return; // 閉じた／もう開始した
      if (res && res.notReady) {
        document.getElementById("tnLoadMsg").textContent = "サーバーに繋がりませんでした";
        document.getElementById("tnLoadSub").textContent = "URLが合っているか、Colabが起動しているか確認してください。\nこのまま開始もできます（合成音声は出ない場合があります）。";
        return;
      }
      enterNavi();
    }).catch(() => { if (nv.stops && nv.setup) enterNavi(); });
  }
  function enterNavi() {
    if (!nv.stops || !nv.setup) return;
    nv.setup = false;
    const s = document.getElementById("tnStart"); if (s) s.classList.remove("show");
    tick();
    clearInterval(nv.timer);
    nv.timer = setInterval(tick, 1000);
  }

  // ---------- 開閉 ----------
  function open(entry) {
    if (!entry || !entry.stops || !entry.stops.length) return;
    ensureDom();
    nv.stops = entry.stops;
    nv.ev = buildEvents(entry.stops);
    nv.meta = { type: entry.type || "", bound: entry.bound || "" };
    nv.spoken = new Set(); nv.lastPhase = ""; nv.seg = null; nv.lastMid = 0; nv.midK = -1; nv.speaking = false; nv.coordsResolvedWithPos = false; nv.token++;
    nv.setup = true; nv.ttsOff = false; nv.preloadAbort = false;
    nv.voiceOn = lsGet(VOICE_KEY, "1") !== "0";
    nv.cars = entry.cars ? String(entry.cars) : (lsGet(CAR_KEY, "") || (window.__cars||""));
    document.getElementById("tnNo").textContent = entry.trainNumber || (entry.unban ? `運番${entry.unban}` : "");
    renderBtns(); renderCars();
    startGps(); loadCoords(nv.token);
    nv.pipErr = ""; preparePip();
    clearInterval(nv.flashTimer); nv.flashTimer = setInterval(() => { nv.flash = !nv.flash; const o = document.getElementById("tnOverlay"); if (o) o.classList.toggle("flash", nv.flash && (o.classList.contains("brake") || o.classList.contains("platform"))); if (nv.pipOn) { if (nv.view && nv.view.mode.startsWith("brake")) nv.view.mode = nv.flash ? "brakeB" : "brakeA"; drawPip(); } }, 500);
    document.getElementById("tnOverlay").classList.add("show");
    unlockAudio();
    nv.curK = 0; ttsStart(); renderBtns();
    clearInterval(nv.timer); nv.timer = null;
    showStart();
    try { if (navigator.wakeLock) navigator.wakeLock.request("screen").then(l => { nv.wake = l; }).catch(() => {}); } catch (e) {}
  }
  function closeNavi() {
    clearInterval(nv.timer); nv.timer = null;
    cancelSpeech(); ttsStop();
    nv.setup = false; nv.preloadAbort = true;
    const stEl = document.getElementById("tnStart"); if (stEl) stEl.classList.remove("show");
    const ov = document.getElementById("tnOverlay"); if (ov) ov.classList.remove("show", "brake", "platform");
    stopGps(); clearInterval(nv.flashTimer); nv.token++; simSetOn(false); closePip();
    try { nv.wake && nv.wake.release(); nv.wake = null; } catch (e) {}
    nv.stops = null;
  }

  window.ttShowNavi = function (idx) { open(ttTrainDetailRegistry[idx]); };
  window.TrainNavi = { _locate: locate, _tts: tts, _ttsWanted: ttsWanted, _say: say, open, close: closeNavi, _buildEvents: buildEvents, _onFix: onFix, _state: nv, _drawPip: drawPip, _sim: () => nv.sim, _coordCache: coordCache };
})();
