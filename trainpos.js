// trainpos.js v1.38.1
// 1.38.1: 臨時ダイヤの選択肢に添えていた運行日（M/D）をやめて、ダイヤ名だけで表示する（選んだ時の切り替わりは1.38.0のまま）。
// trainpos.js v1.38.0
// 1.38.0: パターンのプルダウンに、その路線にある臨時ダイヤ（臨時ダイヤ名のあるダイヤ）を、いま見ている日に走るかどうかに関係なく全部出す。
//         選ぶだけでその臨時ダイヤの運行日（今日以降でいちばん近い日。無ければ直近の過去の日）の走行位置に切り替わる（日付をいじらなくてよい）。選択肢には運行日（M/D）を添える。
//         日付を変えた時の、臨時ダイヤの自動選択・自動に戻す動きは従来どおり。
// trainpos.js v1.37.0
// 1.37.0: 回送・臨時・団体（非営業列車）は、種別チップだけでなく種別＋行先のラベル全体の背景も赤（#d32f2f）にする。営業列車は従来どおりチップのみ色付け。
// trainpos.js v1.36.0
// 1.36.0: 種別・行先ラベルの「種別」部分を四角い枠付きのチップにした。色は sujitype タブの「カラーコード」列（#RRGGBB）を（路線，種別）で引いて背景色にする
//         （文字は背景の明るさで白／黒）。空欄・無効な値は枠だけの標準表示。種別が「回送」「臨時」「団体」の列車は色指定にかかわらず赤。
//         sujitype は毎回取り直す（色の追加をすぐ反映）。取れなければ前回の控えを使う。
// trainpos.js v1.35.0
// 1.35.0: 停車駅と停車駅の間（途中の通過駅をまたぐ区間）を、時間に比例した「等間隔」ではなく「等速」で進める。
//         駅間距離は Train Navi と同じ仕組み・同じデータ元（HeartRails Express の駅座標＋2点間の直線距離）。新しいデータは要らない。
//         停車駅間の総距離と所要時間から速度を決め、進んだ距離を駅間距離の累積に当てはめて位置を決める（通過駅の通過時刻が距離比になり、
//         次の停車駅への到着は時刻表どおり）。座標が取れていない駅が区間に含まれる間・環状線・取得失敗の時は、従来どおり等間隔。
// trainpos.js v1.34.0
// 1.34.0: 列車番号が同じでも時刻表が違う列車（「回送0828」のように 回送＋発車時刻 で付く番号は、別ダイヤに同じ番号が何本もある）を、
//         1つの位置にまとめて描いていたのを直した。「列車番号が同じ列車は必ず併結」にするのは、時刻表（停車駅と時刻）も同じ時だけにした。
//         また、同じダイヤの同じ列車が2回入っていた（臨時列車が一覧と個別JSONの両方／日付違いで重複など）時は1つにする。
//         別ダイヤにある同一列車・同一時刻の重複（733T など。連結運用の判定に使う）は、これまでどおり残す。
// trainpos.js v1.33.0
// 1.33.0: 表示中の路線の駅に時刻のある停車が無い区間（時刻表の停車駅そのものが他路線の駅で、離れている区間）では、その路線の図の上に列車を置かない。
//         例：中野→（東西線の各駅）→西船橋 の列車を JR中央・総武線で見た時に、中野—西船橋の間をJRの駅並びで補間して走らせていたのをやめた。
//         境界駅での在線（出発前・到着後・停車中）は従来どおり。「時刻が書いてない通過駅を他路線でたどる」補間（サンダーバード等）は別物でそのまま。
// trainpos.js v1.32.0
// 1.32.0: 同名路線の全会社を合体表示。選んだ路線（と並走路線）について、manifest にある同名路線の他社ファイルも読み、その路線を走る全会社の列車を出す（臨時列車の extras も会社ごとに取る）。運用の目印(sheetKey)・ダイヤの重複判定は会社込みにして、会社が違って ID_運番 がぶつかっても混ざらない。キャッシュは tp_trains15 に変更。
// trainpos.js v1.31.1
// 1.31.1: 24時以上の時刻表記（24:17 など）を0時台（0:17）として読む。同じ列車に「24:17」と「0:17」が混ざっていると、日跨ぎの連続化で+24hされた駅に、さらに「始発が0〜2時台なら全駅+24h」が二重にかかり、24時間の区間ができて、深夜の最終列車が翌日の昼間に幽霊列車として走って見えていた。日跨ぎは今までの連続化＋始発シフトに任せる。
// trainpos.js v1.31.0
// 1.31.0: 「留置」表示を追加。表示時刻に営業運転していない運用（同じ運番＝同じ編成）が、どの駅に留まっているかを駅名の横に「留置 N」で出す。押すと、その駅の留置中の一覧（前運用の到着・次運用の発車）を開く。
//         判定は路線JSONのダイヤだけで行う：最初の発車前は始発駅、最後の到着後は終着駅、途中で次の列車まで間が空く時は直前の列車の終着駅（次の列車の始発駅と同じ時だけ。違う時は回送の記載が無いので出さない）。
// trainpos.js v1.30.0
// 1.30.0: 臨時ダイヤ（路線×ダイヤ名の個別JSON）に対応。索引にある臨時ダイヤは、路線ファイル内の同じ名前の行より個別JSONを使う（索引に無いダイヤは路線ファイルのまま）。
//         あわせて、JSON化されていない臨時（スプレッドシート「ダイヤ一覧」の臨時=TRUEの行）も DiagramStatic.tempsFor 経由で混ぜる。スプシが読めなくてもJSONだけで通常表示を続ける。
// 1.29.0: 臨時列車を個別JSON（extras-index.json）から読む。選択中の路線と日付（見ている日の前日・当日・翌日）で絞って、該当ファイルだけ取得し、その日の列車に混ぜる。索引が取れた時は路線ファイル内の旧臨時列車（臨時=TRUE かつ臨時ダイヤ名なし）は使わない（二重表示防止）。取れない時は従来どおり路線ファイルのものを使う。臨時ダイヤ（コミケ臨など）は従来どおり。
// 1.28.1: 臨時ダイヤの不具合2件。①臨時ダイヤを手で選ぶと、読み込み中に「自動」へ戻ってしまうのを直した ②臨時ダイヤの選択肢は「いま見ている日に走るもの」だけにした（他の日は出ない）。指定した日が臨時ダイヤの日なら読み込み後にも自動で選ぶ。確認用に、臨時ダイヤの曜日区分と該当／非該当を画面左下に出す。
// 1.28.0: 静的JSONの読み込みを diagram_static.js 1.1.0 に一本化（Cloudflare Worker を先に、だめなら pages.dev）。diagram_static.js が無い時は従来どおり pages.dev だけ。
// 1.27.0: 臨時列車と臨時ダイヤを区別する。ダイヤ一覧の新列「臨時ダイヤ名」に値がある行だけが臨時ダイヤ（パターンのプルダウンにその名前で出る）。
//         臨時ダイヤの日は「臨時ダイヤ＋その日の臨時列車（曜日区分が日付で、臨時ダイヤ名が空）」だけを表示して、定期（平日・土休日）は入れない。
//         臨時ダイヤの日でなければ、臨時列車は通常ダイヤと一緒にその日だけ表示する（プルダウンには出さない）。
// 1.26.0: 臨時ダイヤのパターンを汎用化。曜日区分が特定の日付（例「2025-12-31」）のダイヤがある路線では、パターンのプルダウンにその臨時ダイヤが出て、日付を指定すると自動で選ばれる。その運行日に臨時ダイヤが使われている路線では、平日・土休日の指定でも臨時ダイヤだけを表示する。路線を変えたら、その路線にある臨時ダイヤでプルダウンを組み直す
// 1.25.0: パターンに「コミケ臨ダイヤ」を追加（曜日区分が「2025-12-31」のダイヤだけを表示する。その日は平日ダイヤより臨時ダイヤを優先）。日時の入力で 2025-12-31 を指定するとパターンが自動でコミケ臨ダイヤに切り替わり、別の日に変えると「自動」に戻る
// 1.24.1: 直通先ピル（直通ラベル）を避けて車両アイコンを外側のレーンへずらすのをやめた（ピルとアイコンが重なってもよい）
// 1.24.0: 走行位置のアイコンが動き出す秒を、毎分00秒から一律30秒に変更（発車・到着とも、ダイヤ時刻の30秒後に動く）
// 1.23.1: 山手線と京浜東北線のように「別の路線のダイヤ」から来た列車は、並走区間で発車時刻が同じでも併結しない（同じ路線のダイヤ同士だけ併結する）
// 1.23.0: ①並走路線から取った列車が、この路線のダイヤにも同じ列番であると二重に出る（単一列番でアイコンが2つ並ぶ）のを1本にまとめる
//         ②アイコンを線に近づける（右側は線のすぐ脇、左側は並走線の本数ぶんだけ外へ）③直通先ピルと重なる時は外側のレーンへずらす
// 1.22.3: 描き直しのたびに「tp-rendered」を通知する（linemap の「飛んだ先の駅まで寄せる」を、行間隔の調整後にやり直すため）
// 1.22.2: 読み込みの所要時間を、画面の左下にも小さく出す（スマホ用。タップで消える）
// 1.22.1: どこで時間がかかってるか分かるよう、読み込みの所要時間をコンソールに出す（[trainpos] 読み込み…）。マニフェスト取得とキャッシュ確認を同時に行う
// 1.22.0: 列車のアイコンを押すと「時刻表を見る／乗車記録を上げる」を選べる。乗車記録は index の投稿フォームを、その列車の路線・駅・種別・行先・時刻（併結なら全部）入りで開く
// 1.20.0: ダイヤ一覧の「両数」列を読み、列車詳細・スタフ・Train Naviに渡す。併結（同じ位置にまとめた複数の列車）から開く時は、それぞれの両数を足した値を渡す
// 1.19.0: 現在時刻を指定する時に、時刻だけでなく日付も変えられるようにした（日時の入力欄）。指定した日の曜日・祝日でダイヤを選ぶ
// 1.18.0: 黒いラベル（列車番号・種別行先）の文字が見切れる時は、ラベルの中で文字を左右にスクロールして全部読めるようにした
// 1.17.2: 右側（下り＝画面の下へ進む列車）の併結・連結は、前の編成が下に来るよう縦の並びを逆にする（アイコン・種別行先・編成番号・列車番号。左側は前が上のまま）
// 1.17.1: ダイヤに無い乗車記録（乗車記録だけの列車）も、連結編成数ぶんのアイコンを縦に出す。乗車位置の編成だけに車両アイコン・編成番号を出し、ほかは汎用アイコン。記録に連結編成数が無い古い併結の記録は、行先の数を連結編成数とみなす
// 1.17.0: 乗車記録の「連結編成数」「乗車位置（前から何個目の編成）」に対応。連結編成数ぶんのアイコンを縦に出し、乗車位置の編成だけに車両アイコン・編成番号を反映する（それ以外は汎用アイコン／所定形式）。併結（ダイヤ上の複数列車）は前から並べた順。記録に乗車位置が無い古いものは、前から1個目として扱う
// 1.16.0: スタフの前の列車・次の列車（同じ運用）に飛べるよう、列車詳細に運用の列車一覧を渡す
// 1.15.2: 併結で列車番号・種別行先・編成番号が同じものは、1つにまとめて表示する（2020B+2020B → 2020B）。アイコンは1本ずつ出てタップで各列車の時刻表が開く
// 1.15.1: パターンを変えた時に、ダイヤ（キャッシュを使わず取り直し）と乗車記録を取得し直す
// 1.15.0: 現在時刻の枠に「パターン」のプルダウンを追加。自動（今日の曜日）／平日ダイヤ／土日祝ダイヤ を切り替えて表示できる（選んだパターンに当てはまる、いちばん近い日のダイヤで表示）
// 1.14.2: 一度広げた路線は、リロードするまで高さを一切変えない（以前は、まだ混んでいると広げ足していたので、列車が動くたびにサイズが変わってスクロールが戻されることがあった）
// 1.14.1: 列車番号が同じ列車が2本以上走っているときは、位置や時刻に関係なく必ず併結としてまとめる
// 1.14.0: 種別も行先も同じ列車でも、同じ位置・同じ時刻なら併結として1つにまとめる。併結のアイコンは1つずつ押せて、押した列車の時刻表（列車詳細）が出る
// 1.13.1: 他路線を通る区間の道のりを、via_（直通先の目印）が置いてある駅でだけ路線を乗り換える地図でたどるようにした（例: 湖西線の近江塩津の via_JR北陸本線 から北陸本線に移って敦賀へ）。同じ名前の駅に勝手に飛ばない。駅間の数の比で時刻を決める
// 1.13.0: 時刻が書いてない区間を他路線で走る列車（例: 京都→山科→敦賀のサンダーバード。近江塩津〜敦賀）の位置を、全路線の駅を隣同士でつないだ地図で一番短い道のりにたどり、途中のこの路線の駅を駅数の比で補って出す（今までは境界駅1つだけを推定していたので、間違った道で推定されたり出なかったりした）
// 1.12.2: 始発駅では併結の判定を発車時刻だけで行う（到着時刻は見ない）。在線表示の開始も発車の10分前から
// 1.12.1: 始発駅の在線表示の併結判定に、発車時刻も条件に追加（到着が同じで発車が1分違う列車も別々に表示）
// 1.12.0: 駅名の表記ゆれ（stationaliasシートの正式名称⇄通称、ひらがな・カタカナの違い）に対応。ダイヤの駅名が通称（例: なんば）でも、この路線の正式名称の駅（難波）の位置に出す
// 1.11.1: 併結のまとめ判定に、停車・発車・到着の時刻も条件に追加。始発駅の在線表示で、発車時刻が違う列車が併結にまとめられていたのを修正
// 1.11.0: 併結列車（同じ位置を同じ方向に進む、種別・行先が違う列車）を1つにまとめ、アイコンを縦に並べて表示。バッジは列車番号を「+」でつなぎ、種別行先は1本ずつ2行、編成番号は「G11+」「U1」のように2行
// 1.10.0: ダイヤ一覧の「曜日区分」の細かい指定（曜日／特定の日／期間／除外。dayrule.js）に対応。運行日（0:00〜2:59は前日）ごとに、その日に運転する列車だけ表示する
// 1.9.0: 列車の始発駅の発車（到着）10分前から、始発駅に在線表示する。同じ運用の前の列車がまだ走行中（全区間の時刻で判定）なら、在線表示は出さず前の列車を引き続き出す
// 1.8.2: 「所定形式」の複数画像は、列車ごとに順番ではなく、1秒ごとに 1,2,3,1,2,3… と切り替えて表示する
// 1.8.1: 「所定形式」に改行区切りでURLを複数入れると、その運用の列車に順番に 1,2,3,1,2,3… と割り当てて表示する
// 1.8.0: ダイヤ一覧の「所定形式」列に画像URLを入れると、その運用の編成が乗車記録で分かるまで、汎用アイコンの代わりにその画像を表示する。乗車記録があればそちらを優先（今まで通り）
// 1.7.2: 一度広げた駅間の高さは、リロードするまで路線ごとにそのまま維持する（列車が動くたびに高さが変わってスクロールが戻されるのを防ぐ）。広げる方向にだけ変わる
// 1.7.1: 同じ側で横に並ぶのは2本までOK。3本目（3列目）になる時に駅間を広げる判定にした
// 1.7.0: 駅間が長く列車が密な路線（東海道新幹線など）で、列車が枠の横からはみ出しそうな時は全区間の駅間の高さを均等に広げる。
// 1.6.0: 路線の列車データの読み込みを高速化。運番シートの取得を6本→16本同時に、1枚20秒のタイムアウトを付け、
//        列車データ（最新）と乗車記録・祝日・車両マスタの取得を同時に走らせる（今までは列車を全部読み終えてから順に取っていた）。
//        ダイヤ一覧の保持時間を1時間→1分にして、変更がほぼすぐ反映されるようにした。結果の並びはダイヤ一覧の順で毎回同じにした
// 1.5.0: 平日／休日ダイヤの切り替えを0:00→3:00にした。0:00〜2:59は前日の運行日の続きとして扱い、始発駅の発車が0:00〜2:59の列車は前日のダイヤ（24:13扱い）に入れる。日跨ぎ列車の仕組みはそのまま
// 1.4.0: ・終点駅の行が無くてもいい仕組みをやめた（最後に書いてある行は終着＝時刻1個なら到着のみ）。列車の詳細の終点補足も廃止
//        ・路線の境界駅が通過（時刻が書いていない）でも、列車が消えないようにした。時刻の無い行は前後の時刻から
//          按分して推定し、行が無い場合は、他路線と共通の駅（境界駅）を探して、駅数の比で推定する
//        ・路線マスタの「並走」で並走している路線の列車も、この路線の図に出す（この路線の駅に2駅以上かかる列車だけ）
// 1.3.0: 1.2.1 の変更（乗車記録を毎回取り直す・件数表示）を元に戻した（1.2.0 相当）。そのうえで、
//        ダイヤに無い乗車記録は「その日の分」ではなく、「路線マスタのダイヤ改正日より後の全ての日の記録のうち、
//        表示している日と同じ区分（平日／土休日）の記録」を使うようにした。記録の発車時刻が HH:MM なら、
//        HH:MM:00〜HH:MM:59 の間だけ乗車駅に表示する（同じ駅・時刻・行先が複数日にあれば一番新しい記録の編成を使う）
// 1.2.0: ダイヤに無い乗車記録も、HH:MM:00〜HH:MM:59 の間だけ乗車駅に表示する。ダイヤが無いのでタップしても何も起きない。
//        列車番号の代わりに発車時刻（HH:MM）を表示。ダイヤの列車と一致する記録（駅・時刻・行先）は、二重に出さない
// 1.1.2: 折り返しなどで列車番号が変わっても編成アイコン・編成番号が消えないようにした。
//        乗車記録の紐づけは、同じ運用（ダイヤ一覧の同じID＋運番＝同じ編成が1日走り続ける）の
//        他の列車の記録まで見て、1本でも一致すれば、その運用の全ての列車に同じ編成を出す
// 1.1.1: 種別・行先が両方空の行（通過駅）は「停車中」（緑）にせず、通過の時刻として位置の計算にだけ使う。
//        路線の境界駅が通過でも、時刻が入っていれば路線に入る／出る位置が正しく出る
// 1.1.0: 列車をタップすると、時刻表で時刻を押した時と同じ「列車の詳細」（各駅の到着時刻＋スタフ表示）を開く（timetable.js の ttOpenTrainDetail を使用）
// 乗車路線マップ（linemap.html）に「列車位置」を重ねて表示する。
//  ・ダイヤ（運用シート）の時刻から、今走っている列車の位置を計算（駅に停車中／駅間）
//  ・列車番号を黒いバッジで表示
//  ・同じ日の乗車記録（路線・駅・時刻・行先が一致）が上がっていれば、その編成アイコン／種別＋行先／編成番号も表示
//  ・乗車記録が無い列車は、汎用アイコン＋列車番号＋種別＋行先だけ表示
// 画面に触るのは #trainposBar（操作バー）と、.route-line-scroll 内に作る #tpLayer だけ。
(function () {
  "use strict";

  const MASTER_BASE = "https://opensheet.elk.sh/1ZooIjdlOwsLZVjQv6KN53h4X2JYUyULYuJTuhbgk95s/";
  const DIAGRAM_SHEET_ID = "1JzY1wIGbj2Z83ItsMnMrz1xQ-cviEv50P0mOHiyi70A";
  const RIDES_URL = "https://script.google.com/macros/s/AKfycbyWTr6ejDZKkaw9owEM8yLcl6-6w5pHeyk2hWdX6Lw1INNg5ZxuhvCx7PPfOmxWHC17/exec";
  const FALLBACK_TRAIN_IMAGE = "https://img.elesite-next.com/hatena.webp";
  const DAY_START = 3 * 3600;                // 運行日の切り替え時刻（3:00）
  const FETCH_CONCURRENCY = 16;              // 運番シートを同時に取る本数
  const SHEET_TIMEOUT_MS = 20000;            // 1枚あたりのタイムアウト
  const TRAINS_TTL_MS = 30 * 60 * 1000;      // 路線ごとの列車データ（IndexedDB）
  const RIDES_REFRESH_MS = 3 * 60 * 1000;    // 乗車記録の取り直し間隔
  const TICK_MS = 5000;
  const WAIT_SEC = 10 * 60;                  // 始発駅の発車の何秒前から在線表示するか（10分）
  const MOVE_OFFSET_SEC = 30;                // アイコンの動き出しを遅らせる秒数（発車・到着とも一律30秒＝毎分30秒に動く）
  const LS_ON = "tuts4_trainpos_on";

  const st = {
    ctx: null,            // { routeVal, stationsOnRoute, isLoop, company }
    trains: [],           // 今表示中の路線の列車（コンパクト化済み）
    trainsRoute: "",
    loading: false,
    loadSeq: 0,
    rides: null, ridesFetchedAt: 0, ridesLoading: false,
    holidaySet: null,
    modelRows: null, numberRows: null,
    timer: null, pending: null,
    on: false, live: true, manualSec: null, pattern: "auto",
  };

  /* ---------- 小物 ---------- */
  // 駅名の比較用：駅を取り、カタカナ→ひらがな、小さい仮名→大きい仮名にそろえる
  function nameKey(n) {
    return String(n == null ? "" : n).trim().replace(/駅$/, "").replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60))
      .replace(/[ぁぃぅぇぉっゃゅょ]/g, c => ({ "ぁ": "あ", "ぃ": "い", "ぅ": "う", "ぇ": "え", "ぉ": "お", "っ": "つ", "ゃ": "や", "ゅ": "ゆ", "ょ": "よ" }[c])).replace(/\s/g, "");
  }
  // 路線の駅の並び → 「駅名（通称・表記ゆれ込み）→ 行番号」の引き当て
  function makeIdx(names) {
    const m = new Map();
    names.forEach((n, i) => {
      const k = nameKey(n);
      const grp = st.aliasMap && st.aliasMap.get(k);
      [k, ...(grp ? [...grp] : [])].forEach(x => { if (!m.has(x)) m.set(x, i); });
    });
    return { get: x => m.get(nameKey(x)), has: x => m.has(nameKey(x)) };
  }
  const pad = n => String(n).padStart(2, "0");
  const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const cleanNum = n => String(n || "").trim().replace(/\*/g, "");
  const splitSlash = v => String(v || "").split("/").map(s => s.trim()).filter(Boolean);
  const isTrue = v => ["true", "TRUE", "1", "はい", "有", "✓"].includes(String(v).trim());
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  function idb() { return window.tuts4IdbCache || null; }

  function toDisplayableImageUrl(url) {
    const s = String(url || "").trim();
    if (!s) return "";
    let m = s.match(/drive\.google\.com\/file\/d\/([^/]+)/);
    if (m) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w200`;
    m = s.match(/[?&]id=([^&]+)/);
    if (m && s.includes("drive.google.com")) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w200`;
    return s;
  }

  /* ---------- ダイヤ読み込み（timetable.js と同じ規約。localStorageには書き込まない） ---------- */
  function readLsCache(key, ttl) {
    try {
      const p = JSON.parse(localStorage.getItem(key) || "null");
      if (!p || !Array.isArray(p.data) || !p.fetchedAt) return null;
      if (ttl && Date.now() - p.fetchedAt > ttl) return null;
      return p;
    } catch (e) { return null; }
  }

  async function getDiagramList() {
    const c = readLsCache("tuts4_diagram_list_cache", 60 * 1000); // 1分（変更がほぼすぐ反映される）
    if (c) return c.data;
    try {
      const res = await fetch(`https://opensheet.elk.sh/${DIAGRAM_SHEET_ID}/${encodeURIComponent("ダイヤ一覧")}`);
      const data = await res.json();
      if (Array.isArray(data)) return data;
    } catch (e) { /* ignore */ }
    const stale = readLsCache("tuts4_diagram_list_cache", 0);
    return stale ? stale.data : [];
  }

  async function fetchSheet(id, unban, lastUpdated) {
    const name = `${id}_${unban}`;
    const key = "tuts4_diagram_sheet_" + name;
    const meta = readLsCache(key, 14 * 24 * 60 * 60 * 1000);
    let force = false;
    if (lastUpdated && meta) {
      const u = new Date(lastUpdated);
      if (!isNaN(u) && u.getTime() > meta.fetchedAt) force = true;
    }
    if (meta && !force) return meta.data;
    try {
      const ctl = typeof AbortController === "function" ? new AbortController() : null;
      const timer = ctl ? setTimeout(() => ctl.abort(), SHEET_TIMEOUT_MS) : null;
      let data;
      try {
        const res = await fetch(`https://opensheet.elk.sh/${DIAGRAM_SHEET_ID}/${encodeURIComponent(name)}`, ctl ? { signal: ctl.signal } : undefined);
        data = await res.json();
      } finally { if (timer) clearTimeout(timer); }
      if (Array.isArray(data)) return data;
    } catch (e) { /* ignore */ }
    const stale = readLsCache(key, 0);
    return stale ? stale.data : [];
  }

  function filterLatestRevision(matches) {
    const today = new Date();
    const groups = {}, pass = [];
    matches.forEach(d => {
      const key = `${d["会社"] || ""}\t${d["ID"] || ""}_${d["運番"] || ""}`;
      const raw = String(d["適用開始日"] || "").trim();
      if (!raw) { pass.push(d); return; }
      const date = new Date(raw);
      if (isNaN(date) || date > today) return;
      if (!groups[key] || date > groups[key].date) groups[key] = { row: d, date };
    });
    return [...Object.values(groups).map(g => g.row), ...pass];
  }

  // 運用シートの行 → 列車（同じ列車番号が続くまとまり）ごとの停車情報。時刻は秒、日跨ぎは+24hで連続化
  function compactSheet(rows, listRow, viaParallel) {
    const dayRaw = String(listRow["曜日区分"] || "").trim();
    const dayType = dayRaw ? (dayRaw.includes("土") || dayRaw.includes("休") ? "holiday" : "weekday") : "both"; // dayrule.js が無い時の判定
    const groups = [];
    let cur = null, curNum = null;
    rows.forEach(r => {
      const num = r["列車番号"];
      if (cur && num === curNum) cur.push(r);
      else { cur = [r]; curNum = num; groups.push(cur); }
    });

    const out = [];
    // 「所定形式」は改行区切りで画像URLを複数書ける。1秒ごとに 1,2,3,1,2,3… と切り替えて表示する
    const icons = String(listRow["所定形式"] || "").split(/[\r\n]+/).map(x => toDisplayableImageUrl(x)).filter(Boolean);
    groups.forEach(group => {
      let prev = null; // 直前の時刻（秒）。24時間を跨いだら+86400して連続させる
      const stops = [];
      group.forEach((r, i) => {
        const found = [...String(r["発車時刻"] || "").matchAll(/(\d{1,2}):(\d{2})(?::(\d{2}))?/g)]
          .map(m => (Number(m[1]) % 24) * 3600 + Number(m[2]) * 60 + (m[3] ? Number(m[3]) : 0));
        const bounds = splitSlash(r["行先"]);
        const isTerminus = i === group.length - 1; // 最後に書いてある行は終着（時刻1個なら到着のみ）
        let a = found.length ? found[0] : null;
        let d = found.length >= 2 ? found[1] : (found.length === 1 ? (isTerminus ? null : found[0]) : null);
        // 日跨ぎの連続化
        [["a", a], ["d", d]].forEach(([k, v]) => {
          if (v == null) return;
          let t = v;
          while (prev != null && t < prev - 12 * 3600) t += 86400;
          prev = t;
          if (k === "a") a = t; else d = t;
        });
        if (!r["駅名"]) return;
        const type0 = splitSlash(r["種別"])[0] || "";
        stops.push({ s: String(r["駅名"]).trim(), a, d, type: type0, bound: bounds[0] || "", pass: !type0 && !bounds.length });
      });
      if (!stops.length) return;
      // 始発駅の発車が0:00〜2:59の列車は「前日の運行日の続き」（24:13のような扱い）にする。
      // 運行日の切り替えは3:00なので、前日の平日／休日のダイヤで、深夜0時台も走ってるように見える
      const firstT = stops[0].d != null ? stops[0].d : stops[0].a;
      if (firstT != null && firstT < DAY_START) {
        stops.forEach(sp => { if (sp.a != null) sp.a += 86400; if (sp.d != null) sp.d += 86400; });
      }
      const bounds = new Set();
      group.forEach(r => splitSlash(r["行先"]).forEach(b => bounds.add(b)));
      out.push({
        unban: listRow["運番"] || "",
        trainNumber: group[0]["列車番号"] || "",
        dayType, dayRaw, isExtra: isTrue(listRow["臨時"]),
        extraDiaName: String(listRow["臨時ダイヤ名"] || "").trim(), // 値がある行＝臨時ダイヤ（空なら臨時列車か通常ダイヤ）
        sheetKey: `${listRow["会社"] || ""}\t${listRow["ID"] || ""}_${listRow["運番"] || ""}_${dayRaw || dayType}`, // 同じ運用（＝同じ編成が走り続ける）の目印
        bounds: [...bounds], stops,
        cars: parseInt(listRow["両数"], 10) || 0, // ダイヤ一覧の「両数」列（スタフ・Train Naviの両数に使う）
        defaultIcons: icons, // 画像URLの一覧（複数なら1秒ごとに切り替え） // ダイヤ一覧の「所定形式」列の画像URL（編成の記録が無い時に使う）
        viaParallel: !!viaParallel // 並走路線のダイヤ一覧から取った列車（この路線のダイヤ一覧には無い）
      });
    });
    return out;
  }

  /* ---------- 静的JSON（Cloudflare Pages）。無い／壊れてたら従来どおりスプシから直接取る ---------- */
  const STATIC_BASE = "https://tuts4-data.pages.dev/";
  const STATIC_TIMEOUT_MS = 15000;
  const SHEET_COLS = ["列車番号", "駅名", "発車時刻", "行先", "種別"];
  let manifestP = null;

  async function fetchJsonTimeout(url, opt) {
    const ctl = typeof AbortController === "function" ? new AbortController() : null;
    const timer = ctl ? setTimeout(() => ctl.abort(), STATIC_TIMEOUT_MS) : null;
    try {
      const res = await fetch(url, Object.assign({}, opt || {}, ctl ? { signal: ctl.signal } : {}));
      if (!res.ok) throw new Error("HTTP " + res.status);
      return await res.json();
    } finally { if (timer) clearTimeout(timer); }
  }

  function getManifest(force) {
    if (window.DiagramStatic && window.DiagramStatic.getManifest) return window.DiagramStatic.getManifest(!!force);
    if (!manifestP || force) {
      manifestP = fetchJsonTimeout(STATIC_BASE + "manifest.json?t=" + Date.now(), { cache: "no-cache" }).then(m => {
        if (!m || !Array.isArray(m.files)) throw new Error("bad manifest");
        return m;
      });
      manifestP.catch(() => { manifestP = null; }); // 失敗は覚えない（次回また試す）
    }
    return manifestP;
  }

  // 1路線ぶんの静的データ → { list, sheets(オブジェクト行に変換済み), rev }。壊れてたら例外
  async function loadStaticRoute(entry) {
    const data = (window.DiagramStatic && window.DiagramStatic.fetchRoute)
      ? await window.DiagramStatic.fetchRoute(entry)
      : await fetchJsonTimeout(STATIC_BASE + entry.file + "?v=" + encodeURIComponent(entry.rev || ""));
    if (!data || !Array.isArray(data.list) || !data.sheets || typeof data.sheets !== "object") throw new Error("bad shape");
    const sheets = {};
    for (const d of data.list) {
      if (!d || typeof d !== "object") throw new Error("bad list row");
      const k = `${d["ID"] || ""}_${d["運番"] || ""}`;
      if (sheets[k]) continue;
      const raw = data.sheets[k];
      if (!Array.isArray(raw)) throw new Error("missing sheet " + k);
      sheets[k] = raw.map(r => {
        if (!Array.isArray(r)) throw new Error("bad row " + k);
        const o = {};
        SHEET_COLS.forEach((c, i) => { o[c] = r[i] == null ? "" : r[i]; });
        return o;
      });
    }
    return { list: data.list, sheets, rev: entry.rev || "" };
  }

  // 画面の左下に小さく出す（スマホはコンソールが見れないため）。タップで消える／20秒で自動で消える
  function diagShow(msg) {
    try {
      console.info(msg);
      let box = document.getElementById("diagLogBox");
      if (!box) {
        box = document.createElement("div");
        box.id = "diagLogBox";
        box.style.cssText = "position:fixed;left:6px;bottom:6px;z-index:99999;max-width:92vw;background:rgba(0,0,0,.78);color:#9f9;font:11px/1.4 monospace;padding:6px 8px;border-radius:8px;white-space:pre-wrap;word-break:break-all;";
        box.onclick = () => box.remove();
        (document.body || document.documentElement).appendChild(box);
      }
      const line = document.createElement("div");
      line.textContent = msg;
      box.appendChild(line);
      while (box.children.length > 8) box.removeChild(box.firstChild);
      clearTimeout(box._t);
      box._t = setTimeout(() => box.remove(), 20000);
    } catch (e) { /* ignore */ }
  }

  // 同名路線の他社ファイル(manifest にあるもの)も対象に足す。会社が空の指定は従来どおり（足さない）
  function expandSameRoute(targets, manifest) {
    if (!manifest || !Array.isArray(manifest.files)) return targets;
    const out = targets.slice(), have = new Set(targets.map(t => t.route + "\t" + (t.company || "")));
    targets.forEach(t => {
      if (!t.company) return;
      manifest.files.forEach(f => {
        if (!f || !f.file || f.route !== t.route || !f.company || f.company === t.company) return;
        const k = t.route + "\t" + f.company;
        if (have.has(k)) return;
        have.add(k);
        out.push({ route: t.route, company: f.company, via: t.via });
      });
    });
    return out;
  }

  async function loadRouteTrains(ctx, onProgress, force) {
    const par = (ctx.parallelRoutes || []).filter(p => p.route && p.route !== ctx.routeVal);
    const cacheKey = "tp_trains15_" + ctx.company + "_" + ctx.routeVal + "+" + par.map(p => p.route).sort().join(",");
    if (force) { try { localStorage.removeItem("tuts4_diagram_list_cache"); } catch (e) { /* ignore */ } }

    // マニフェスト（rev 一覧）。取れなければ null → 全部スプシから
    const T0 = performance.now(), lap = {};
    let manifest = null;
    const manP = getManifest(!!force).catch(() => null);
    const cachedP = (idb() && !force) ? idb().get(cacheKey) : Promise.resolve(null);
    manifest = await manP; lap.manifest = Math.round(performance.now() - T0);
    const findEntry = (route, company) => manifest && manifest.files.find(f =>
      f && f.file && f.route === route && (!company || f.company === company));
    const targets = expandSameRoute([{ route: ctx.routeVal, company: ctx.company, via: false }, ...par.map(p => ({ route: p.route, company: p.company, via: true }))], manifest);
    targets.forEach(t => { t.entry = findEntry(t.route, t.company) || null; });
    // 臨時列車の索引（取れなければ null＝従来どおり路線ファイルの臨時列車を使う）
    let extIdx = null;
    try { extIdx = (window.DiagramStatic && window.DiagramStatic.getExtrasIndex) ? await window.DiagramStatic.getExtrasIndex(!!force) : null; } catch (e) { extIdx = null; }
    const DS = window.DiagramStatic;
    targets.forEach(t => { t.keep = (extIdx && DS && DS.keepRow) ? DS.keepRow(extIdx, t.company, t.route) : (() => true); });
    // 索引の臨時ダイヤの顔ぶれが変わったら、路線ファイルから除く行も変わるのでキャッシュを作り直す
    const diaSig = extIdx ? extIdx.trains.filter(x => x && x.dia && targets.some(t => (x.routes || []).includes(t.route))).map(x => String(x.dia)).sort().join("/") : "";
    const sig = targets.map(t => t.entry ? t.entry.rev || "?" : "-").join(",") + (extIdx ? "|x" + diaSig : "");

    {
      const c = await cachedP;
      if (c && Array.isArray(c.trains) && Date.now() - c.fetchedAt < TRAINS_TTL_MS && (!manifest || c.sig === sig)) { diagShow(`[trainpos] 読み込み: キャッシュ ${Math.round(performance.now() - T0)}ms`); return c.trains; }
    }

    // 路線ごとに静的JSONを試す。失敗した路線だけスプシ直取りに切り替える
    await Promise.all(targets.map(async t => {
      if (!t.entry) return;
      try { t.stat = await loadStaticRoute(t.entry); }
      catch (e) { diagShow("[trainpos] 静的JSON失敗→スプシ: " + t.route + " " + (e && e.message)); t.stat = null; }
    }));
    lap.files = Math.round(performance.now() - T0);
    let sheetList = null;
    if (targets.some(t => !t.stat)) sheetList = await getDiagramList();
    lap.list = Math.round(performance.now() - T0);

    const jobs = [];
    const seen = new Set();
    const add = (d, viaParallel, sheets, srcRoute) => {
      const k = `${d["会社"] || ""}\t${d["ID"] || ""}_${d["運番"] || ""}_${d["曜日区分"] || ""}_${d["適用開始日"] || ""}`;
      if (seen.has(k)) return;
      seen.add(k);
      jobs.push({ d, viaParallel, sheets, srcRoute });
    };
    targets.forEach(t => {
      const src = t.stat ? t.stat.list : sheetList;
      const rows = filterLatestRevision(src.filter(d =>
        t.keep(d) &&
        (!t.company || d["会社"] === t.company) &&
        String(d["路線"] || "").split(",").map(x => x.trim()).includes(t.route)));
      rows.forEach(d => add(d, t.via, t.stat ? t.stat.sheets : null, t.route));
    });

    // シートを同時に取る（静的JSONぶんは即座）。列車はダイヤ一覧の順に並べる
    const perJob = new Array(jobs.length).fill(null);
    let done = 0, idx = 0;
    const worker = async () => {
      while (idx < jobs.length) {
        const i = idx++;
        const { d, viaParallel, sheets, srcRoute } = jobs[i];
        try {
          const rows = sheets ? sheets[`${d["ID"] || ""}_${d["運番"] || ""}`] : await fetchSheet(d["ID"], d["運番"], d["最終更新"]);
          perJob[i] = compactSheet(rows || [], d, viaParallel);
          (perJob[i] || []).forEach(tr => { tr.srcRoute = srcRoute || ""; }); // どの路線のダイヤから来たか（別路線同士は併結しない）
        } catch (e) { /* この運番はスキップ */ }
        done++;
        if (onProgress) onProgress(done, jobs.length);
      }
    };
    await Promise.all(Array.from({ length: Math.min(FETCH_CONCURRENCY, jobs.length) }, worker));
    let trains = perJob.flat().filter(Boolean);
    {
      // 同じ列車が「この路線」と「並走路線」の両方のダイヤに載っていると、二重に出て併結に見えてしまう。1本にまとめる
      const key = t => `${t.trainNumber}|${t.dayRaw || t.dayType || ""}`;
      const sig = t => { const s0 = t.stops && t.stops[0]; return s0 ? `${s0.s}@${s0.d != null ? s0.d : s0.a}` : ""; };
      const mainKeys = new Set(trains.filter(t => !t.viaParallel && t.trainNumber).map(key));
      const seenPar = new Set();
      trains = trains.filter(t => {
        if (!t.viaParallel || !t.trainNumber) return true;
        if (mainKeys.has(key(t))) return false;
        const k = key(t) + "|" + sig(t) + "|" + (t.srcRoute || "");
        if (seenPar.has(k)) return false;
        seenPar.add(k);
        return true;
      });
    }
    diagShow(`[trainpos] 読み込み: 静的JSON ${targets.filter(t => t.stat).length}/${targets.length}路線 マニフェスト${lap.manifest}ms → ファイル${lap.files}ms → 一覧${lap.list}ms → 完了${Math.round(performance.now() - T0)}ms（列車${trains.length}本・シート${jobs.length}枚）`);
    if (idb()) idb().set(cacheKey, { trains, fetchedAt: Date.now(), sig });
    return trains;
  }

  function effDateKey() { const d = effDate(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }

  // 臨時列車（個別JSON）。見ている日の前日・当日・翌日に走るものだけ取る。取れなければ空
  // 索引にある、この路線の臨時ダイヤ [{name, dates:[YYYY-MM-DD…]}]（昨日以降に運行日があるものだけ。日付が書いてなければ常に）
  function idxDiasOf(idx, ctx, DS) {
    if (!idx || !Array.isArray(idx.trains)) return [];
    const since = DS.defaultDates()[0], m = new Map();
    idx.trains.forEach(t => {
      if (!t || !t.dia || !Array.isArray(t.routes) || !t.routes.includes(ctx.routeVal)) return;
      if (t.company && ctx.company && t.company !== ctx.company) return;
      const ds = Array.isArray(t.dates) ? t.dates.filter(d => d >= since) : [];
      if (Array.isArray(t.dates) && t.dates.length && !ds.length) return; // 過去の臨時ダイヤは出さない
      const n = String(t.dia).trim(); if (!n) return;
      if (!m.has(n)) m.set(n, new Set());
      ds.forEach(d => m.get(n).add(d));
    });
    return [...m].map(([name, set]) => ({ name, dates: [...set].sort() }));
  }
  // 臨時ダイヤの運行日を索引から決める（見ている日以降でいちばん近い日。無ければ最後の日）。索引に日付が無ければ null
  function pickDiaDate(name) {
    const e = (st.idxDias || []).find(x => x.name === name);
    if (!e || !e.dates.length) return null;
    const base0 = st.manualDate || new Date();
    const b = ymd(new Date(base0.getFullYear(), base0.getMonth(), base0.getDate()));
    const d = e.dates.find(x => x >= b) || e.dates[e.dates.length - 1];
    const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
  }
  async function loadExtras(ctx) {
    const DS = window.DiagramStatic;
    if (!DS || !DS.tempsFor) return [];
    const par = (ctx.parallelRoutes || []).filter(p => p.route && p.route !== ctx.routeVal);
    let man = null; try { man = await getManifest(false); } catch (e) { man = null; }
    const targets = expandSameRoute([{ route: ctx.routeVal, company: ctx.company, via: false }, ...par.map(p => ({ route: p.route, company: p.company, via: true }))], man);
    let dates = DS.defaultDates(effDate());
    // 臨時ダイヤ（索引にあるもの）の一覧を覚える。選択中の臨時ダイヤがあれば、その運行日の臨時ダイヤ・臨時列車も読む（1.38.0）
    let idxAll = null; try { idxAll = DS.getExtrasIndex ? await DS.getExtrasIndex(false) : null; } catch (e) { idxAll = null; }
    st.idxDias = idxDiasOf(idxAll, ctx, DS);
    if (st.pattern && st.pattern.startsWith("dia:")) {
      const pd = pickDiaDate(st.pattern.slice(4));
      if (pd) dates = [...new Set(dates.concat(DS.defaultDates(pd)))];
    }
    const out = [];
    const seen = new Set();
    for (const t of targets) {
      let list = null;
      try { const r = await DS.tempsFor(t.company, t.route, dates); list = r ? r.items : null; } catch (e) { list = null; }
      (list || []).forEach(x => {
        const k = `${x.meta["会社"] || ""}\t${x.meta["ID"] || ""}_${x.meta["運番"] || ""}`;
        if (t.via && seen.has(k)) return; // 本線で出したものは並走側では出さない
        seen.add(k);
        let trs = [];
        try { trs = compactSheet(x.rows || [], x.meta, t.via) || []; } catch (e) { trs = []; }
        trs.forEach(tr => { tr.srcRoute = t.route; tr.isExtraFile = true; });
        out.push(...trs);
      });
    }
    return out;
  }

  // 列車の時刻表の目印（停車駅と時刻の並び）。列車番号が同じでも時刻表が違えば別の列車として扱うために使う（1.34.0）
  const _sigMemo = new WeakMap();
  function trainSig(t) {
    let v = _sigMemo.get(t);
    if (v == null) { v = (t.stops || []).map(x => `${x.s}@${x.a == null ? "" : x.a}/${x.d == null ? "" : x.d}`).join(","); _sigMemo.set(t, v); }
    return v;
  }
  function rebuildTrains() {
    const all = (st.baseTrains || []).concat(st.extraTrains || []);
    // 同じダイヤ（会社・ID・運番・曜日区分）の同じ列車（番号・時刻表が同じ）が2回入っていたら1つにする。
    // 別ダイヤ（sheetKey が違う）の同一列車は消さない（連結運用の判定に使うため）。この路線のダイヤを、並走路線経由のものより優先
    const seenT = new Map(), out = [];
    all.forEach(t => {
      if (!t.sheetKey) { out.push(t); return; }
      const k = `${t.sheetKey}|${t.trainNumber}|${trainSig(t)}`;
      const i = seenT.get(k);
      if (i == null) { seenT.set(k, out.length); out.push(t); }
      else if (out[i].viaParallel && !t.viaParallel) out[i] = t;
    });
    st.trains = out;
  }

  /* ---------- 平日/土休日 ---------- */
  async function getHolidaySet() {
    if (st.holidaySet) return st.holidaySet;
    try {
      const c = JSON.parse(localStorage.getItem("tuts4_holidays_cache") || "null");
      if (c && Array.isArray(c.dates)) { st.holidaySet = new Set(c.dates); return st.holidaySet; }
    } catch (e) { /* ignore */ }
    try {
      const res = await fetch("https://holidays-jp.github.io/api/v1/date.json");
      const data = await res.json();
      st.holidaySet = new Set(Object.keys(data));
    } catch (e) { st.holidaySet = new Set(); }
    return st.holidaySet;
  }
  function isHoliday(d) {
    const w = d.getDay();
    return w === 0 || w === 6 || (st.holidaySet && st.holidaySet.has(dateKey(d)));
  }

  /* ---------- 乗車記録（全ユーザー分。当日の記録だけ使う） ---------- */
  async function loadRides(force) {
    if (!force && st.rides && Date.now() - st.ridesFetchedAt < RIDES_REFRESH_MS) return st.rides;
    if (st.ridesLoading) return st.rides || [];
    st.ridesLoading = true;
    try {
      let data = null;
      if (!st.rides && !force) {
        const c = readLsCache("tuts4_tt_allrides_cache", 60 * 60 * 1000);
        if (c) data = c.data;
      }
      if (!data) {
        const res = await fetch(RIDES_URL);
        const j = await res.json();
        if (Array.isArray(j)) data = j;
      }
      if (data) { st.rides = data; st.ridesFetchedAt = Date.now(); }
    } catch (e) { /* 取れなければ前回分を使う */ }
    st.ridesLoading = false;
    return st.rides || [];
  }

  async function loadMasters() {
    if (st.modelRows && st.numberRows && st.aliasMap && st.sujiColor) return;
    const get = async (name) => {
      const key = "tp_master_" + name;
      let cached = null;
      if (name === "sujitype") { // 種別の色は毎回取り直す。取れなければ前回の控え（1.36.0）
        try { const res = await fetch(MASTER_BASE + name); const j = await res.json(); if (Array.isArray(j)) { if (idb()) idb().set(key, j); return j; } } catch (e) { /* 控えへ */ }
        if (idb()) { const c = await idb().get(key); if (Array.isArray(c)) return c; }
        return [];
      }
      if (idb() && name !== "stationalias") { const c = await idb().get(key); if (Array.isArray(c) && c.length) cached = c; } // 駅名の対応表は毎回取り直す（追加してすぐ反映）
      if (cached) return cached;
      try {
        const res = await fetch(MASTER_BASE + name);
        const j = await res.json();
        if (Array.isArray(j)) { if (idb()) idb().set(key, j); return j; }
      } catch (e) { /* ignore */ }
      return [];
    };
    const [m, n, al, sj] = await Promise.all([get("model"), get("number"), get("stationalias"), get("sujitype")]);
    st.modelRows = m; st.numberRows = n;
    // 種別の色: (路線,種別) → #RRGGBB。空欄・形式が違うものは入れない
    const sc = new Map();
    (sj || []).forEach(r => {
      const rt = String(r["路線"] || "").trim(), ty = String(r["種別"] || "").trim();
      let c = String(r["カラーコード"] || "").trim();
      if (/^#[0-9a-f]{3}$/i.test(c)) c = "#" + c.slice(1).split("").map(x => x + x).join("");
      if (rt && ty && /^#[0-9a-f]{6}$/i.test(c)) sc.set(rt + "\t" + ty, c.toLowerCase());
    });
    st.sujiColor = sc;
    // 駅名の表記ゆれ（stationaliasシート：正式名称⇄通称。ひらがな・カタカナの違いも同じ駅として扱う）
    const am = new Map();
    (al || []).forEach(r => {
      const o = nameKey(r["正式名称"]), a = nameKey(r["通称"]);
      if (!o || !a) return;
      const grp = am.get(o) || am.get(a) || new Set([o]);
      grp.add(o); grp.add(a);
      grp.forEach(x => am.set(x, grp));
    });
    st.aliasMap = am;
  }

  function resolveIcon(modelName, numberName) {
    const num = cleanNum(numberName);
    if (st.numberRows && num) {
      const row = st.numberRows.find(r => r["車両形式"] === modelName && cleanNum(r["車番"]) === num);
      const own = row ? toDisplayableImageUrl(row["画像URL"]) : "";
      if (own) return own;
    }
    if (st.modelRows && modelName) {
      for (const r of st.modelRows) {
        if (r["車両形式"] !== modelName) continue;
        const u = toDisplayableImageUrl(r["画像URL"]);
        if (u) return u;
      }
    }
    return FALLBACK_TRAIN_IMAGE;
  }

  // 日付キー|駅|HH:MM → 乗車記録[]
  function indexRides(rides) {
    const map = new Map();
    (rides || []).forEach(r => {
      const raw = String(r["時刻"] || "").trim();
      const d = new Date(raw.replace(" ", "T"));
      if (isNaN(d)) return;
      const key = `${dateKey(d)}|${String(r["乗車駅"] || "").trim()}|${pad(d.getHours())}:${pad(d.getMinutes())}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    });
    return map;
  }

  // この列車に一致する乗車記録（路線・駅・発車時刻・行先）から、車両形式と編成番号を決める
  function findFormation(train, serviceDate, ridesIdx) {
    const tally = new Map();
    const bset = new Set(train.bounds);
    train.stops.forEach(s => {
      [s.a, s.d].forEach(sec => {
        if (sec == null) return;
        const dayOffset = Math.floor(sec / 86400);
        const dt = new Date(serviceDate.getFullYear(), serviceDate.getMonth(), serviceDate.getDate() + dayOffset);
        const hh = Math.floor((sec % 86400) / 3600), mm = Math.floor((sec % 3600) / 60);
        const list = ridesIdx.get(`${dateKey(dt)}|${s.s}|${pad(hh)}:${pad(mm)}`);
        if (!list) return;
        list.forEach(r => {
          const rb = splitSlash(r["行先"]);
          if (rb.length && bset.size && !rb.some(b => bset.has(b))) return;
          const model = splitSlash(r["車両形式"])[0] || "";
          const number = splitSlash(r["車番"])[0] || "";
          if (!model && !number) return;
          const cnt = parseInt(r["連結編成数"], 10) || 0, pos = parseInt(r["乗車位置"], 10) || 0;
          const k = model + "\u0001" + number + "\u0001" + pos + "\u0001" + cnt;
          tally.set(k, (tally.get(k) || 0) + 1);
        });
      });
    });
    if (!tally.size) return null;
    return fmFromKey([...tally.entries()].sort((a, b) => b[1] - a[1])[0][0]);
  }
  function fmFromKey(key) {
    const b = key.split("\u0001");
    return { model: b[0], number: b[1], pos: Number(b[2]) || 0, count: Number(b[3]) || 0 };
  }

  // 自分の列車に記録が無くても、同じ運用（sheetKey）の他の列車に記録があれば、その編成を使う
  // （折り返すと列車番号は変わるが、編成は同じ運用のまま走り続けるため）
  function findFormationForSheet(train, serviceDate, ridesIdx, memo) {
    const own = findFormation(train, serviceDate, ridesIdx);
    if (own || !train.sheetKey) return own;
    const mk = train.sheetKey + "|" + dateKey(serviceDate);
    if (memo.has(mk)) return memo.get(mk);
    const tally = new Map();
    st.trains.forEach(t => {
      if (t.sheetKey !== train.sheetKey) return;
      const f = findFormation(t, serviceDate, ridesIdx);
      if (!f) return;
      const k = f.model + "\u0001" + f.number + "\u0001" + f.pos + "\u0001" + f.count;
      tally.set(k, (tally.get(k) || 0) + 1);
    });
    let result = null;
    if (tally.size) result = fmFromKey([...tally.entries()].sort((a, b) => b[1] - a[1])[0][0]);
    memo.set(mk, result);
    return result;
  }

  // ダイヤ改正日より後の全ての乗車記録を、「区分（平日/土休日）＋発車時刻(HH:MM)」ごとに整理する。
  // 同じ 駅・時刻・行先 が複数日にあれば、一番新しい記録（＝最近の編成）を代表にする。
  // 乗車記録の取得（st.rides）か路線が変わった時だけ作り直す。
  function buildRideSlotIndex(ctx) {
    const sig = `${ctx.routeVal}|${ctx.revisionDate ? ctx.revisionDate.getTime() : ""}|${st.ridesFetchedAt}|${st.rides ? st.rides.length : 0}`;
    if (st.slotIdx && st.slotIdxSig === sig) return st.slotIdx;
    const idxOf = makeIdx(ctx.stationsOnRoute);
    const rev = ctx.revisionDate && !isNaN(ctx.revisionDate) ? ctx.revisionDate : null;
    const best = new Map(); // 重複排除用：dtype|hm|station|bound → { d, ...記録 }
    (st.rides || []).forEach(r => {
      if (r["路線"] !== ctx.routeVal) return;
      if (ctx.company && r["会社"] && r["会社"] !== ctx.company) return;
      const station = String(r["乗車駅"] || "").trim();
      const row = idxOf.get(station);
      if (row == null) return;
      const d = new Date(String(r["時刻"] || "").trim().replace(" ", "T"));
      if (isNaN(d)) return;
      if (rev && d < rev) return; // ダイヤ改正日より前の記録は使わない
      const dtype = isHoliday(d) ? "holiday" : "weekday";
      const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
      const rb = splitSlash(r["行先"]);
      const key = [dtype, hm, station, rb[0] || ""].join("|");
      const prev = best.get(key);
      if (prev && prev.d >= d) return;
      best.set(key, {
        d, dtype, hm, station, row,
        bound: rb[0] || "", bounds: rb,
        type: splitSlash(r["種別"])[0] || "", types: splitSlash(r["種別"]),
        model: splitSlash(r["車両形式"])[0] || "",
        number: splitSlash(r["車番"])[0] || "",
        count: parseInt(r["連結編成数"], 10) || 0, pos: parseInt(r["乗車位置"], 10) || 0
      });
    });
    const idx = new Map(); // dtype|hm → [記録]
    best.forEach(v => {
      const k = v.dtype + "|" + v.hm;
      if (!idx.has(k)) idx.set(k, []);
      idx.get(k).push(v);
    });
    st.slotIdx = idx; st.slotIdxSig = sig;
    return idx;
  }

  // ダイヤに無い乗車記録を「その分の間だけ乗車駅に居る列車」として返す
  function computeRideOnly(ctx, sec, date) {
    if (!st.rides) return [];
    const hol = isHoliday(date);
    const dtype = hol ? "holiday" : "weekday";
    const nowH = Math.floor(sec / 3600) % 24, nowM = Math.floor((sec % 3600) / 60);
    const hm = `${pad(nowH)}:${pad(nowM)}`; // 今の「分」の間だけ（HH:MM:00〜HH:MM:59）
    const cands = buildRideSlotIndex(ctx).get(dtype + "|" + hm);
    if (!cands || !cands.length) return [];

    // ダイヤの列車が、駅・時刻（HH:MM）・行先で持っている組み合わせ（記録がそれと一致したらダイヤ側で表示済み）
    const diaIdx = new Map();
    const hmKey = (station, t) => {
      const day = ((t % 86400) + 86400) % 86400;
      return `${station}|${pad(Math.floor(day / 3600))}:${pad(Math.floor((day % 3600) / 60))}`;
    };
    st.trains.forEach(tr => {
      if (!runsOn(tr, date, hol)) return;
      tr.stops.forEach(sp => {
        [sp.a, sp.d].forEach(t => {
          if (t == null) return;
          const k = hmKey(sp.s, t);
          let set = diaIdx.get(k);
          if (!set) { set = new Set(); diaIdx.set(k, set); }
          if (!tr.bounds.length) set.add("*");
          tr.bounds.forEach(b => set.add(b));
        });
      });
    });

    const out = [];
    cands.forEach(c => {
      const dset = diaIdx.get(`${c.station}|${c.hm}`);
      if (dset && (dset.has("*") || !c.bounds.length || c.bounds.some(b => dset.has(b)))) return; // ダイヤの列車と同じ
      let sign = null;
      if (typeof window.ttResolveRideDirectionSign === "function" && c.bound) {
        try {
          sign = window.ttResolveRideDirectionSign(ctx.routeVal, window.ttRouteStationOrder(ctx.routeVal), window.ttRouteRawOrder(ctx.routeVal), c.station, c.bound);
        } catch (e) { sign = null; }
      }
      const n = Math.max(c.count || 0, c.bounds.length, 1);
      out.push({ row: c.row, sign: sign || 1, hm: c.hm, type: c.type, bound: c.bound, bounds: c.bounds, types: c.types, model: c.model, number: c.number, n, pos: Math.min(c.pos > 0 ? c.pos : 1, n) });
    });
    return out;
  }

  /* ---------- 位置計算 ---------- */
  // t: 秒（サービス日の0時起点）。戻り値 { row0, row1, frac, sign, atStation }（rowは描画行の番号）
  // ===== この路線の図での「通る駅と時刻」を作る =====
  // 1) 時刻の書いていない行（通過）は、前後の時刻のある行の間で行の並びに応じて按分して推定する
  // 2) 時刻のある駅からこの路線の外の駅へ出る（または外から入る）時に、境界駅の行が無ければ、他路線と共通の駅を
  //    探して、「駅数の比」で境界駅を通る時刻を推定して差し込む（これで境界駅までと境界駅から先の位置が消えない）
  function routeInfo(ctx) {
    if (ctx._ri && ctx._riRoute === ctx.routeVal) return ctx._ri;
    const idxOf = makeIdx(ctx.stationsOnRoute);
    const byRoute = new Map(); // 路線名 → 駅名の並び（via_を除く）
    (ctx.stationData || []).forEach(r => {
      const n = String(r["駅名"] || "");
      if (!n || n.startsWith("via_")) return;
      const k = r["路線"];
      if (!byRoute.has(k)) byRoute.set(k, []);
      byRoute.get(k).push(n);
    });
    const routesOf = new Map(); // 駅名 → その駅がある路線のSet
    byRoute.forEach((names, rt) => names.forEach(n => {
      if (!routesOf.has(n)) routesOf.set(n, new Set());
      routesOf.get(n).add(rt);
    }));
    ctx._ri = { idxOf, byRoute, routesOf, segD: null, segState: 0 }; ctx._riRoute = ctx.routeVal;
    return ctx._ri;
  }

  // 全路線の駅を「隣の駅同士」でつないだ地図。路線をまたぐのは、via_（直通先の目印）が置いてある駅だけ
  // （例: 湖西線の端の「近江塩津」に via_JR北陸本線 があれば、近江塩津で湖西線→北陸本線に乗り換えて進める）。
  // 同じ名前の駅だからといって、無関係な路線に勝手に飛ばないようにするため
  const canonKey = n => { const k = nameKey(n); const g = st.aliasMap && st.aliasMap.get(k); return g ? [...g].sort()[0] : k; };
  const nodeId = (r, n) => r + "\u0001" + canonKey(n);
  function stationGraph(ctx) {
    if (ctx._g && ctx._gRoute === ctx.routeVal) return ctx._g;
    const rowsBy = new Map(); // 路線 → 生の駅名の並び（via_込み）
    (ctx.stationData || []).forEach(r => {
      const n = String(r["駅名"] || "");
      if (!n) return;
      if (!rowsBy.has(r["路線"])) rowsBy.set(r["路線"], []);
      rowsBy.get(r["路線"]).push(n);
    });
    const adj = new Map(); // ノード → Map(隣ノード → 駅間の数(0 or 1))
    const link = (a, b, w) => {
      if (a === b) return;
      if (!adj.has(a)) adj.set(a, new Map()); if (!adj.has(b)) adj.set(b, new Map());
      if (!adj.get(a).has(b) || adj.get(a).get(b) > w) { adj.get(a).set(b, w); adj.get(b).set(a, w); }
    };
    const stationsOf = new Map(); // 路線 → 駅名キーのSet（via_を除く）
    rowsBy.forEach((rows, rt) => stationsOf.set(rt, new Set(rows.filter(n => !n.startsWith("via_")).map(canonKey))));
    const nodesOfStation = new Map(); // 駅名キー → ノード一覧
    rowsBy.forEach((rows, rt) => {
      const real = rows.filter(n => !n.startsWith("via_"));
      real.forEach(n => {
        const id = nodeId(rt, n), k = canonKey(n);
        if (!nodesOfStation.has(k)) nodesOfStation.set(k, []);
        nodesOfStation.get(k).push(id);
      });
      for (let i = 1; i < real.length; i++) link(nodeId(rt, real[i - 1]), nodeId(rt, real[i]), 1);
      // via_ の両隣の駅が、直通先の路線にもあれば、そこで乗り換えられる（駅間の数は増えない）
      rows.forEach((n, i) => {
        if (!n.startsWith("via_")) return;
        const target = n.slice(4);
        if (!stationsOf.has(target)) return;
        [rows.slice(0, i).reverse().find(x => !x.startsWith("via_")), rows.slice(i + 1).find(x => !x.startsWith("via_"))].forEach(nb => {
          if (nb && stationsOf.get(target).has(canonKey(nb))) link(nodeId(rt, nb), nodeId(target, nb), 0);
        });
      });
    });
    ctx._g = { adj, nodesOfStation, memo: new Map() }; ctx._gRoute = ctx.routeVal;
    return ctx._g;
  }
  // 2駅の間の一番短い道のり（駅間の数が最小）。[{r:路線, k:駅名キー, m:そこまでの駅間の数}] を返す。無ければ null
  function graphPath(ctx, from, to) {
    const g = stationGraph(ctx);
    const fk = canonKey(from), tk = canonKey(to), mk = fk + ">" + tk;
    if (g.memo.has(mk)) return g.memo.get(mk);
    let res = null;
    const starts = g.nodesOfStation.get(fk) || [], goals = new Set(g.nodesOfStation.get(tk) || []);
    if (starts.length && goals.size) {
      const dist = new Map(), prev = new Map();
      const dq = [];
      starts.forEach(n => { dist.set(n, 0); prev.set(n, null); dq.push(n); });
      // 0-1 BFS（乗り換えは0、駅間は1）
      let head = 0; const front = [];
      const pop = () => front.length ? front.pop() : dq[head++];
      while (front.length || head < dq.length) {
        const u = pop(), du = dist.get(u);
        for (const [v, w] of g.adj.get(u) || []) {
          const nd = du + w;
          if (!dist.has(v) || nd < dist.get(v)) { dist.set(v, nd); prev.set(v, u); if (w === 0) front.push(v); else dq.push(v); }
        }
      }
      let best = null;
      goals.forEach(n => { if (dist.has(n) && (best == null || dist.get(n) < dist.get(best))) best = n; });
      if (best != null) {
        res = [];
        for (let x = best; x != null; x = prev.get(x)) { const [r, k] = x.split("\u0001"); res.push({ r, k, m: dist.get(x) }); }
        res.reverse();
      }
    }
    g.memo.set(mk, res);
    return res;
  }

  // other（この路線に無い駅）から見た、この路線との境界駅 { C, dOther(境界駅までの駅数 on T), T }
  function findJunction(ctx, other) {
    const { idxOf, byRoute, routesOf } = routeInfo(ctx);
    const rts = routesOf.get(other);
    if (!rts) return null;
    let best = null;
    rts.forEach(T => {
      if (T === ctx.routeVal) return;
      const names = byRoute.get(T) || [];
      const io = names.indexOf(other);
      if (io < 0) return;
      names.forEach((n, j) => {
        if (!idxOf.has(n)) return;
        const dist = Math.abs(j - io);
        if (!best || dist < best.dOther) best = { C: n, dOther: dist, T };
      });
    });
    return best;
  }

  function buildOnRoute(train, ctx) {
    if (train._onRoute === ctx.routeVal && train._on) return train._on;
    const { idxOf } = routeInfo(ctx);
    const seq = train.stops.map(sp => ({
      s: sp.s,
      a: sp.a != null ? sp.a : sp.d,
      d: sp.d != null ? sp.d : sp.a,
      pass: !!sp.pass,
      orig: sp.a != null || sp.d != null // 時刻表に時刻が書いてある行（按分で時刻を補った行は false）
    }));
    // 1) 時刻の無い行を、前後の時刻から行の並びで按分
    const timed = [];
    seq.forEach((x, i) => { if (x.a != null) timed.push(i); });
    for (let k = 0; k + 1 < timed.length; k++) {
      const i0 = timed[k], i1 = timed[k + 1];
      for (let j = i0 + 1; j < i1; j++) {
        const f = (j - i0) / (i1 - i0);
        const t = seq[i0].d + (seq[i1].a - seq[i0].d) * f;
        seq[j].a = seq[j].d = t;
        seq[j].pass = true;
      }
    }
    const ent = seq.filter(x => x.a != null);

    // 1.33.0) この路線の駅どうしの間に、時刻の書いてある「この路線に無い駅」の停車が挟まる所は、列車が他路線を走っている区間。
    //         その前後のこの路線の駅（時刻つき）に gapTo を付け、locate でその間には置かない
    for (let k = 0; k < ent.length; k++) {
      if (!idxOf.has(ent[k].s)) continue;
      let kk = k + 1, offTimed = false;
      while (kk < ent.length && !idxOf.has(ent[kk].s)) { if (ent[kk].orig) offTimed = true; kk++; }
      if (kk < ent.length && kk > k + 1 && offTimed) ent[k].gapTo = ent[kk];
    }

    // 2) 路線の出入り口（境界駅）を補う
    const out = [];
    for (let k = 0; k < ent.length; k++) {
      const P = ent[k], Q = ent[k + 1];
      out.push(P);
      if (!Q) break;
      const pOn = idxOf.has(P.s), qOn = idxOf.has(Q.s);
      if (pOn && qOn) continue;
      // 2駅の間を、路線の駅を隣同士でつないだ地図で一番短い道のりでたどり、その途中のこの路線の駅を
      // 駅数の比で時刻を決めて差し込む（時刻の書いてない区間でも、他路線を通ってこの路線に入る列車の位置が出る）
      const gp = graphPath(ctx, P.s, Q.s);
      if (gp && gp[gp.length - 1].m > 0) {
        const H = gp[gp.length - 1].m;
        const seen = new Set();
        gp.forEach(nd => {
          if (nd.r !== ctx.routeVal || nd.m <= 0 || nd.m >= H || !idxOf.has(nd.k) || seen.has(nd.k)) return;
          seen.add(nd.k);
          const t = P.d + (Q.a - P.d) * nd.m / H;
          out.push({ s: nd.k, a: t, d: t, pass: true });
        });
        continue;
      }
      if (pOn === qOn) continue;
      const names = ctx.stationsOnRoute;
      if (pOn && !qOn) {
        const j = findJunction(ctx, Q.s);
        if (j && j.C !== P.s) {
          const dR = Math.abs(idxOf.get(j.C) - idxOf.get(P.s));
          const dT = j.dOther;
          const f = (dR + dT) ? dR / (dR + dT) : 0.5;
          const t = P.d + (Q.a - P.d) * f;
          out.push({ s: j.C, a: t, d: t, pass: true });
        }
      } else {
        const j = findJunction(ctx, P.s);
        if (j && j.C !== Q.s) {
          const dR = Math.abs(idxOf.get(j.C) - idxOf.get(Q.s));
          const dT = j.dOther;
          const f = (dR + dT) ? dT / (dR + dT) : 0.5;
          const t = P.d + (Q.a - P.d) * f;
          out.push({ s: j.C, a: t, d: t, pass: true });
        }
      }
    }
    const onObjs = out.filter(x => idxOf.has(x.s));
    const on = onObjs.map(x => ({ i: idxOf.get(x.s), a: x.a, d: x.d, pass: x.pass }));
    onObjs.forEach((x, n) => { if (x.gapTo) { const m = onObjs.indexOf(x.gapTo); if (m === n + 1) on[n].gapNext = on[m]; } });
    train._on = on; train._onRoute = ctx.routeVal;
    return on;
  }

  /* ---------- 駅間距離（Train Navi と同じ：HeartRails Express の駅座標 → 直線距離）（1.35.0） ---------- */
  const COORD_LS = "tuts4_tp_coords_v1";
  const coordMem = new Map(); // 正規化した駅名 → [{lat,lon}...]（同名駅の候補）
  let coordLsLoaded = false;
  const normSt = n => (typeof ttNormStation === "function" ? ttNormStation(n) : String(n || "").replace(/駅$/, ""));
  function coordLsLoad() {
    if (coordLsLoaded) return; coordLsLoaded = true;
    try { const o = JSON.parse(localStorage.getItem(COORD_LS) || "null"); if (o && o.d) Object.keys(o.d).forEach(k => coordMem.set(k, o.d[k])); } catch (e) { /* ignore */ }
  }
  function coordLsSave() {
    try { const d = {}; coordMem.forEach((v, k) => { if (v && v.length) d[k] = v; }); localStorage.setItem(COORD_LS, JSON.stringify({ d })); } catch (e) { /* ignore */ }
  }
  function geoDist(a, b) {
    const R = 6371000, rad = x => x * Math.PI / 180;
    const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function fetchCoordList(name) {
    const key = normSt(name);
    if (coordMem.has(key)) return Promise.resolve(coordMem.get(key));
    const q = encodeURIComponent(String(name).replace(/駅$/, ""));
    return fetch(`https://express.heartrails.com/api/json?method=getStations&name=${q}`)
      .then(r => r.json())
      .then(d => {
        const list = ((d.response && d.response.station) || []).map(x => ({ lat: Number(x.y), lon: Number(x.x) })).filter(c => isFinite(c.lat) && isFinite(c.lon));
        coordMem.set(key, list); return list;
      })
      .catch(() => []); // 失敗は覚えない（次の機会にまた試す）
  }
  // 路線の全駅の座標を取り、隣り合う駅の距離（m）の配列 segD[k]（k駅→k+1駅）を作る。取れない所は null。同名駅は手前の駅に一番近い候補（Train Navi と同じ）
  async function buildSegD(ctx, ri) {
    coordLsLoad();
    const names = ctx.stationsOnRoute, N = names.length;
    const todo = [...new Set(names.map(normSt))].filter(k => !coordMem.has(k));
    const byKey = new Map(names.map(n => [normSt(n), n]));
    let ci = 0;
    await Promise.all(Array.from({ length: Math.min(4, todo.length) }, async () => {
      while (ci < todo.length) { const k = todo[ci++]; await fetchCoordList(byKey.get(k)); }
    }));
    if (todo.length) coordLsSave();
    const cand = names.map(n => coordMem.get(normSt(n)) || []);
    const pick = new Array(N).fill(null);
    // 先頭は2駅目の候補と一番近い組、以降は手前の駅に一番近い候補
    let ref = null;
    for (let k = 0; k < N; k++) {
      const c = cand[k]; if (!c.length) { ref = null; continue; }
      if (!ref) {
        const nx = cand[k + 1];
        if (nx && nx.length) { let b = null, bd = Infinity; c.forEach(x => nx.forEach(y => { const d0 = geoDist(x, y); if (d0 < bd) { bd = d0; b = x; } })); pick[k] = b; }
        else pick[k] = c[0];
      } else pick[k] = c.reduce((b, x) => geoDist(ref, x) < geoDist(ref, b) ? x : b, c[0]);
      ref = pick[k];
    }
    const seg = [];
    for (let k = 0; k + 1 < N; k++) seg.push(pick[k] && pick[k + 1] ? Math.max(1, geoDist(pick[k], pick[k + 1])) : null);
    ri.segD = seg; ri.segState = 2;
  }
  function ensureSegD(ctx) {
    const ri = routeInfo(ctx);
    if (ri.segState === 0 && !ctx.isLoop && ctx.stationsOnRoute.length > 2) { ri.segState = 1; buildSegD(ctx, ri).catch(() => { ri.segState = 2; ri.segD = null; }); }
    return ri.segD;
  }
  // 駅 i→j（間に駅がある）を frac（0〜1、時間の進み具合）まで「等速」で進んだ位置。距離は駅間距離の累積。
  // 戻り値: 隣り合う2駅の行 r0,r1 とその間の割合 f。距離が足りない（座標が取れていない駅がある）時は null（呼び出し側が等間隔にする）
  function speedPos(segD, i, j, frac) {
    if (!segD) return null;
    const s = j > i ? 1 : -1, n = Math.abs(j - i), d = [0];
    for (let k = 0; k < n; k++) {
      const v = segD[Math.min(i + s * k, i + s * (k + 1))];
      if (!(v > 0)) return null;
      d.push(d[k] + v);
    }
    const x = Math.min(Math.max(frac, 0), 1) * d[n];
    for (let k = 0; k < n; k++) {
      if (x <= d[k + 1] || k === n - 1) return { r0: i + s * k, r1: i + s * (k + 1), f: Math.min(1, Math.max(0, (x - d[k]) / (d[k + 1] - d[k]))) };
    }
    return null;
  }
  function locate(train, t, ctx) {
    const N = ctx.stationsOnRoute.length;
    const on = buildOnRoute(train, ctx);
    // 並走路線の列車は、この路線の駅に2駅以上かかる場合だけ出す（乗換駅に停まるだけの列車は出さない）
    if (train.viaParallel && on.length < 2) return null;
    if (!on.length) return null;
    // 始発駅の発車（到着）の10分前から、始発駅に在線表示する（この路線に始発駅がある列車だけ）
    if (t < on[0].a) {
      const f0 = train.stops[0], idx0 = routeInfo(ctx).idxOf.get(f0.s);
      if (idx0 === on[0].i && (f0.a != null || f0.d != null) && t >= on[0].d - WAIT_SEC) {
        const nx = on[1];
        let sign = nx ? Math.sign(nx.i - on[0].i) : 1;
        if (ctx.isLoop && nx && Math.abs(nx.i - on[0].i) > N / 2) sign = -sign;
        return { row0: on[0].i, row1: on[0].i, frac: 0, sign: sign || 1, atStation: true, waiting: true, sig: `w${on[0].d}` }; // 始発駅は発車時刻だけで判定（発車が1秒でも違えば併結にしない）
      }
      return null;
    }
    if (t > on[on.length - 1].d) return null;
    // この路線の最初の駅が列車の始発駅なら、併結の判定は発車時刻だけで行う（到着時刻は見ない）
    const f1 = train.stops[0];
    const firstIsOrigin = (f1.a != null || f1.d != null) && routeInfo(ctx).idxOf.get(f1.s) === on[0].i;

    for (let k = 0; k < on.length; k++) {
      const cur = on[k];
      if (t >= cur.a && t <= cur.d) {
        const nx = on[k + 1], pv = on[k - 1];
        let sign = nx ? Math.sign(nx.i - cur.i) : (pv ? Math.sign(cur.i - pv.i) : 1);
        if (ctx.isLoop && nx && Math.abs(nx.i - cur.i) > N / 2) sign = -sign;
        return { row0: cur.i, row1: cur.i, frac: 0, sign: sign || 1, atStation: !cur.pass, sig: (k === 0 && firstIsOrigin) ? `s${cur.d}` : `s${cur.a}-${cur.d}` }; // 通過駅は停車扱いにしない
      }
      const nx = on[k + 1];
      if (nx && t > cur.d && t < nx.a) {
        if (cur.gapNext === nx) return null; // 他路線を走っている区間（1.33.0）
        let i = cur.i, j = nx.i;
        if (ctx.isLoop) {
          // 環状線：一周の最後の行（index N）を使って、0番駅を跨ぐ区間を描く
          if (i === N - 1 && j === 0) j = N;
          else if (i === 0 && j === N - 1) i = N;
        }
        const frac = (t - cur.d) / Math.max(1, nx.a - cur.d);
        // 等速（1.35.0）: 2つの停車駅の間に駅が挟まる時は、キロ程で位置を決める。使えない時は従来の等間隔
        if (!ctx.isLoop && Math.abs(j - i) > 1) {
          const sp = speedPos(ensureSegD(ctx), i, j, frac);
          if (sp) return { row0: sp.r0, row1: sp.r1, frac: sp.f, sign: Math.sign(j - i) || 1, atStation: false, sig: `r${cur.d}-${nx.a}` };
        }
        return { row0: i, row1: j, frac, sign: Math.sign(j - i) || 1, atStation: false, sig: `r${cur.d}-${nx.a}` };
      }
    }
    return null;
  }

  // ---------- 臨時ダイヤ／臨時列車 ----------
  // 臨時ダイヤ＝ダイヤ一覧の「臨時ダイヤ名」に値がある行。臨時列車＝臨時ダイヤ名が空で、曜日区分が日付の列車
  const DATE_LIKE = /\d{1,2}\s*[\/\-月]\s*\d{1,2}/;
  function isTempTrain(tr) { return !tr.extraDiaName && DATE_LIKE.test(String(tr.dayRaw || "")); }
  function ruleHit(tr, d) { return !!(window.DayRule && tr.dayRaw && DayRule.matches(tr.dayRaw, d, st.holidaySet || new Set())); }
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  // この路線のダイヤにある臨時ダイヤの名前の一覧
  function diaNamesOf() {
    const set = new Set();
    (st.trains || []).forEach(tr => { if (tr.extraDiaName) set.add(tr.extraDiaName); });
    return [...set];
  }
  // その運行日（d）に走る臨時ダイヤの名前（いちど調べた日は覚えておく）
  function activeDiasOn(d) {
    if (st._actFor !== st.trains) { st._act = new Map(); st._actFor = st.trains; }
    const key = ymd(d);
    if (st._act.has(key)) return st._act.get(key);
    const set = new Set();
    (st.trains || []).forEach(tr => { if (tr.extraDiaName && ruleHit(tr, d)) set.add(tr.extraDiaName); });
    st._act.set(key, set);
    return set;
  }
  // 臨時ダイヤのパターンで表示する日：指定した日（無ければ今日）がその臨時ダイヤの日ならその日、違えば今日以降でいちばん近い運行日
  function diaDateFor(name) {
    const base0 = st.manualDate || new Date();
    const base = new Date(base0.getFullYear(), base0.getMonth(), base0.getDate());
    const key = name + "|" + ymd(base);
    if (st._diaDates && st._diaDates.key === key && st._diaDates.f === st.trains) return st._diaDates.d;
    let hit = null;
    for (let i = 0; i <= 800 && !hit; i++) {
      const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
      if (activeDiasOn(d).has(name)) hit = d;
    }
    if (!hit) for (let i = 1; i <= 400 && !hit; i++) {
      const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() - i);
      if (activeDiasOn(d).has(name)) hit = d;
    }
    hit = hit || pickDiaDate(name) || base;
    st._diaDates = { key, f: st.trains, d: hit };
    return hit;
  }
  // いま見ている運行日（時刻を指定していれば指定した日、無ければ今日。3:00で切り替わる）
  function effDate() {
    if (st.manualDate) return st.manualDate;
    const n = new Date(Date.now() - DAY_START * 1000);
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  }
  // パターンのプルダウンを組み直す。臨時ダイヤは「いま見ている日に走るもの」だけを出す（路線のダイヤ読み込み後・日付を変えた時に呼ぶ）
  function refreshPatternOptions() {
    const loaded = !!(st.trains && st.trains.length && st.ctx && st.trainsRoute === st.ctx.routeVal);
    const cur = st.pattern && st.pattern.startsWith("dia:") ? st.pattern.slice(4) : "";
    let names = [];
    if (loaded) {
      const act = activeDiasOn(effDate());
      names = [...new Set(diaNamesOf().concat((st.idxDias || []).map(x => x.name)))]; // 見ている日に走らなくても全部出す（選ぶとその臨時ダイヤの運行日に切り替わる）。日付が遠くて列車がまだ読まれていない臨時ダイヤも、索引から出す
      if (cur && !names.includes(cur)) st.pattern = "auto";
      else if (st.pattern === "auto" && st.manualDate) { const hitNames = names.filter(n => act.has(n)); if (hitNames.length) st.pattern = "dia:" + hitNames[0]; } // 指定した日が臨時ダイヤの日なら自動で選ぶ（従来どおり）
      if (!st._diaDiag) {
        st._diaDiag = true;
        diaNamesOf().forEach(n => {
          const sample = (st.trains.find(tr => tr.extraDiaName === n) || {}).dayRaw || "";
          diagShow(`[trainpos] 臨時ダイヤ「${n}」 曜日区分="${sample}" ${ymd(effDate())}は${act.has(n) ? "該当" : "非該当"}`);
        });
      }
    } else if (cur) {
      names = [cur]; // 読み込み中は、選択中の臨時ダイヤを消さない
    }
    const sel = document.getElementById("tpPattern");
    if (!sel) return;
    const esc = s => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
    let html = `<option value="auto">自動（今日）</option><option value="weekday">平日ダイヤ</option><option value="holiday">土日祝ダイヤ</option>`;
    names.forEach(n => { html += `<option value="dia:${esc(n)}">${esc(n)}</option>`; }); // ダイヤ名だけ（日付は添えない・1.38.1）
    sel.innerHTML = html;
    sel.value = st.pattern;
  }

  // その運行日（sd）にこの列車が運転するか。曜日区分の細かい指定は dayrule.js、無い時は平日／土休日だけで判定
  function runsOn(tr, sd, hol) {
    // 臨時ダイヤのパターン（プルダウンで選択中）：その臨時ダイヤ＋その日の臨時列車だけを出す（定期は出さない）
    if (st.pattern && st.pattern.startsWith("dia:")) {
      const name = st.pattern.slice(4);
      if (tr.extraDiaName) return tr.extraDiaName === name && ymd(sd) === ymd(diaDateFor(name));
      return isTempTrain(tr) && ruleHit(tr, sd);
    }
    // その運行日に臨時ダイヤが走る路線では、定期（平日・土休日）は出さず、臨時ダイヤ＋その日の臨時列車だけを出す
    const act = activeDiasOn(sd);
    if (act.size) {
      if (tr.extraDiaName) return act.has(tr.extraDiaName) && (!tr.dayRaw || ruleHit(tr, sd));
      return isTempTrain(tr) && ruleHit(tr, sd);
    }
    // 臨時ダイヤの日でなければ、臨時ダイヤの列車は出さない（臨時列車は、下の曜日区分の判定でその日だけ通常ダイヤと一緒に出る）
    if (tr.extraDiaName) return false;
    if (window.DayRule && tr.dayRaw) return DayRule.matches(tr.dayRaw, sd, st.holidaySet || new Set());
    return tr.dayType === "both" || tr.dayType === (hol ? "holiday" : "weekday");
  }
  // 同じ運用（sheetKey）の他の列車が、全区間の時刻でいま走行中か
  function trainRange(tr) {
    if (tr._rng) return tr._rng;
    let lo = null, hi = null;
    tr.stops.forEach(sp => [sp.a, sp.d].forEach(v => { if (v == null) return; if (lo == null || v < lo) lo = v; if (hi == null || v > hi) hi = v; }));
    return (tr._rng = [lo, hi]);
  }
  function prevStillRunning(tr, t) {
    if (st._bkFor !== st.trains) {
      const m = new Map();
      st.trains.forEach(x => { if (!x.sheetKey) return; if (!m.has(x.sheetKey)) m.set(x.sheetKey, []); m.get(x.sheetKey).push(x); });
      st._bk = m; st._bkFor = st.trains;
    }
    const list = st._bk.get(tr.sheetKey);
    if (!list || list.length < 2) return false;
    const myLo = trainRange(tr)[0];
    return list.some(o => {
      if (o === tr) return false;
      const [lo, hi] = trainRange(o);
      return lo != null && lo < myLo && lo <= t && t <= hi;
    });
  }

  function computeActive(ctx, nowSec, baseDate) {
    const out = [];
    const holidayNow = isHoliday(baseDate);
    const yesterday = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() - 1);
    const holidayYest = isHoliday(yesterday);
    // 今日のダイヤ（t=現在秒）と、昨日のダイヤの日跨ぎ分（t=現在秒+24h）の両方を見る
    [[baseDate, nowSec, holidayNow], [yesterday, nowSec + 86400, holidayYest]].forEach(([sd, t, hol]) => {
      st.trains.forEach(tr => {
        if (!runsOn(tr, sd, hol)) return;
        const pos = locate(tr, t, ctx);
        if (!pos) return;
        // 在線表示は、同じ運用の前の列車がまだ走行中なら出さない（前の列車を引き続き出す）
        if (pos.waiting && prevStillRunning(tr, t)) return;
        out.push({ train: tr, pos, serviceDate: sd });
      });
    });
    return out;
  }

  /* ---------- 留置（営業運転していない運用が留まっている駅） ---------- */
  // 運用（sheetKey）ごとに、その日の列車を時刻順に並べて「いま走っていない」運用の居場所を決める。路線JSONの時刻だけで判定し、推測はしない
  //  ・最初の発車前 → 最初の列車の始発駅  ・最後の到着後 → 最後の列車の終着駅（運行日の切り替え3:00まで）
  //  ・列車と列車の間 → 直前の終着駅と次の始発駅が同じ時だけ、その駅（違う時は回送の記載が無いので判定しない）
  //  ・始発の10分前からは在線表示（走行位置の列車）になるので、留置には数えない
  function computeParked(ctx, nowSec, baseDate, active) {
    const { idxOf } = routeInfo(ctx);
    const shown = new Set(active.map(a => `${a.train.sheetKey}|${ymd(a.serviceDate)}`));
    const out = new Map(); // 行番号 → [{...}]
    const yesterday = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() - 1);
    st._parkWarn = st._parkWarn || new Set();
    [[baseDate, nowSec, isHoliday(baseDate)], [yesterday, nowSec + 86400, isHoliday(yesterday)]].forEach(([sd, t, hol]) => {
      const groups = new Map();
      st.trains.forEach(tr => {
        if (!tr.sheetKey || !runsOn(tr, sd, hol)) return;
        const [lo, hi] = trainRange(tr);
        if (lo == null) return;
        if (!groups.has(tr.sheetKey)) groups.set(tr.sheetKey, []);
        groups.get(tr.sheetKey).push(tr);
      });
      groups.forEach((list, key) => {
        const T = list.slice().sort((x, y) => trainRange(x)[0] - trainRange(y)[0]);
        if (T.some(tr => { const [lo, hi] = trainRange(tr); return lo <= t && t <= hi; })) return; // 走行中
        if (shown.has(`${key}|${ymd(sd)}`)) return;                                              // 在線表示中
        let at = null, prev = null, next = null;
        if (t < trainRange(T[0])[0]) { at = T[0].stops[0].s; next = T[0]; }
        else if (t > trainRange(T[T.length - 1])[1]) {
          if (t >= 86400 + DAY_START) return; // 翌運行日に入った後は、前日の運用の終夜留置は出さない（その日の運用の始発前として出る）
          prev = T[T.length - 1]; at = prev.stops[prev.stops.length - 1].s;
        } else {
          for (let k = 0; k + 1 < T.length; k++) {
            if (trainRange(T[k])[1] < t && t < trainRange(T[k + 1])[0]) {
              prev = T[k]; next = T[k + 1];
              const e = prev.stops[prev.stops.length - 1].s, b = next.stops[0].s;
              if (canonKey(e) !== canonKey(b)) {
                const w = `${key}:${prev.trainNumber}→${next.trainNumber}`;
                if (!st._parkWarn.has(w)) { st._parkWarn.add(w); console.info(`[留置] 判定できません（${prev.trainNumber} の終着 ${e} と ${next.trainNumber} の始発 ${b} が違い、回送の記載が無い）運番${prev.unban}`); }
                return;
              }
              at = e; break;
            }
          }
        }
        if (at == null || !idxOf.has(at)) return; // この路線の駅でなければ出さない
        const row = idxOf.get(at);
        if (!out.has(row)) out.set(row, []);
        out.get(row).push({ key, sd, at, prev, next, rep: next || prev });
      });
    });
    return out;
  }

  /* ---------- 列車の詳細（時刻表ページと同じ表示を開く） ---------- */
  function secToHm(sec) {
    if (sec == null) return { hm: "", sec: null };
    const day = ((sec % 86400) + 86400) % 86400;
    const h = Math.floor(day / 3600), m = Math.floor((day % 3600) / 60), s = day % 60;
    return { hm: `${h}:${pad(m)}`, sec: s ? s : null };
  }

  function trainToEntry(train) {
    const stops = train.stops.map(s => {
      const a = secToHm(s.a), d = secToHm(s.d);
      return {
        station: s.s,
        time: a.hm,          // 列車詳細には「到着時刻」を載せる（時刻表ページと同じ）
        arr: a.hm, dep: d.hm,
        arrSec: a.sec, depSec: d.sec,
        type: s.type, bound: s.bound, pass: !!s.pass
      };
    });
    const first = train.stops.find(s => s.bound) || train.stops[0] || {};
    return { unban: train.unban, trainNumber: train.trainNumber, type: first.type || "", bound: first.bound || "", stops, cars: train.cars || 0 };
  }
  // trains：併結でまとめた列車たち（あれば両数を足した値を渡す）
  // アイコンを押した時の選択（時刻表／乗車記録を上げる）
  function prefillFor(members, pos) {
    const ctx = st.ctx; if (!ctx) return null;
    const train = members[0];
    let name = ctx.stationsOnRoute[pos && pos.row0 != null ? pos.row0 : -1] || "";
    let stop = train.stops.find(s => s.s === name);
    if (!stop) { stop = train.stops.find(s => s.d != null) || train.stops[0]; name = stop ? stop.s : ""; }
    const pick = t => {
      const sp = t.stops.find(s => s.s === name && (s.type || s.bound)) || t.stops.find(s => s.type || s.bound) || {};
      return { type: sp.type || "", bound: sp.bound || "" };
    };
    const first = pick(train);
    return {
      t: Date.now(), company: ctx.company || "", route: ctx.routeVal, station: name,
      sec: stop && (stop.d != null ? stop.d : stop.a), isExtra: !!train.isExtra,
      type: first.type, bound: first.bound, trainNumber: train.trainNumber || "",
      coupled: members.length > 1 ? members.map(pick) : null
    };
  }
  function askIconAction(train, members, pos) {
    const old = document.getElementById("tpActSheet"); if (old) old.remove();
    const ov = document.createElement("div");
    ov.id = "tpActSheet";
    ov.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:10000;display:flex;align-items:flex-end;justify-content:center;";
    const box = document.createElement("div");
    box.style.cssText = "background:#fff;color:#222;width:min(420px,100%);border-radius:14px 14px 0 0;padding:14px 14px 18px;box-shadow:0 -4px 20px rgba(0,0,0,.25);";
    const btn = (label, bg, fg, fn) => {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = label;
      b.style.cssText = `display:block;width:100%;margin:8px 0 0;padding:13px;border:0;border-radius:10px;font-size:16px;font-weight:700;background:${bg};color:${fg};`;
      b.onclick = ev => { ev.stopPropagation(); ov.remove(); if (fn) fn(); };
      return b;
    };
    const title = document.createElement("div");
    title.style.cssText = "font-weight:700;text-align:center;font-size:15px;";
    title.textContent = [train.trainNumber, (train.stops.find(s => s.bound) || {}).bound].filter(Boolean).join(" ");
    box.appendChild(title);
    box.appendChild(btn("🕒 時刻表を見る", "#eef2f7", "#222", () => openDetail(train, members)));
    box.appendChild(btn("📝 乗車記録を上げる", "#1e6fd9", "#fff", () => {
      const pf = prefillFor(members, pos);
      if (!pf) return;
      try { localStorage.setItem("tuts4_prefill", JSON.stringify(pf)); } catch (e) { /* ignore */ }
      location.href = "index.html?prefill=1";
    }));
    box.appendChild(btn("キャンセル", "transparent", "#666", null));
    ov.appendChild(box);
    ov.onclick = () => ov.remove();
    document.body.appendChild(ov);
  }
  function openDetail(train, trains) {
    if (typeof window.ttOpenTrainDetail !== "function") return;
    const entry = trainToEntry(train);
    if (trains && trains.length > 1) entry.cars = trains.reduce((n, x) => n + (x.cars || 0), 0);
    // 同じ運用（シート）の列車を、シートの並び順で渡す（スタフで前・次の列車に飛ぶため）
    const list = train.sheetKey ? st.trains.filter(x => x.sheetKey === train.sheetKey) : [];
    const i = list.indexOf(train);
    if (list.length > 1 && i >= 0) {
      entry.seq = list.map(x => ({ trainNumber: x.trainNumber || "", unban: x.unban || "", build: () => trainToEntry(x) }));
      entry.seqIdx = i;
    }
    window.ttOpenTrainDetail(entry);
  }

  /* ---------- 描画 ---------- */
  // 運行日は3:00で切り替える（0:00〜2:59は前日の運行日の続き＝時刻に24時間足す）
  function currentNow() {
    const now = new Date();
    const manual = !st.live && st.manualSec != null;
    let sec = manual ? st.manualSec : now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    const base = manual && st.manualDate ? st.manualDate : now; // 指定した日（無ければ今日）
    let date = base;
    if (sec < DAY_START) { date = new Date(base.getFullYear(), base.getMonth(), base.getDate() - 1); sec += 86400; }
    // 臨時ダイヤのパターン：表示する日をその日に固定する（時刻は今のまま）
    if (st.pattern && st.pattern.startsWith("dia:")) date = diaDateFor(st.pattern.slice(4));
    // パターン指定（平日／土日祝）：その日がパターンに合わなければ、合ういちばん近い日で代用する
    if (st.pattern === "weekday" || st.pattern === "holiday") {
      const want = st.pattern === "holiday";
      if (isHoliday(date) !== want) {
        for (let i = 1; i <= 14; i++) {
          let hit = null;
          for (const sgn of [1, -1]) {
            const c = new Date(date.getFullYear(), date.getMonth(), date.getDate() + sgn * i);
            if (isHoliday(c) === want) { hit = c; break; }
          }
          if (hit) { date = hit; break; }
        }
      }
    }
    return { date, sec };
  }

  // 「留置 N」ボタンと、押した時に出る一覧
  function ensureParkCss() {
    if (document.getElementById("tpParkCss")) return;
    const c = document.createElement("style");
    c.id = "tpParkCss";
    c.textContent = `
      .tp-park{display:inline-block;margin-left:8px;padding:2px 9px;border:2px solid #9a9a9a;border-radius:8px;background:#fff;color:#333;font-size:13px;font-weight:700;letter-spacing:0;line-height:1.3;cursor:pointer}
      .tp-park b{font-size:15px;margin-left:3px}
      #tpParkOv{position:fixed;inset:0;z-index:10003;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:16px}
      #tpParkBox{width:min(420px,100%);max-height:80vh;overflow:auto;background:#fff;border-radius:6px;box-shadow:0 4px 20px rgba(0,0,0,.3)}
      #tpParkBox .pk-h{position:sticky;top:0;background:#16181d;color:#fff;font-weight:700;font-size:16px;padding:14px 16px;display:flex;align-items:center;justify-content:space-between}
      #tpParkBox .pk-x{width:30px;height:30px;border-radius:50%;border:0;background:#fff;color:#16181d;font-size:16px;line-height:1;cursor:pointer;padding:0}
      #tpParkBox .pk-u{padding:12px 16px;border-bottom:1px solid #eee}
      #tpParkBox .pk-t{display:flex;align-items:center;gap:8px;font-weight:700;font-size:18px;color:#111}
      #tpParkBox .pk-t img{width:40px;height:28px;object-fit:contain}
      #tpParkBox .pk-p{font-size:12px;font-weight:600;color:#555;border:1px solid #aaa;border-radius:12px;padding:1px 9px}
      #tpParkBox .pk-r{display:flex;margin-top:8px}
      #tpParkBox .pk-c{flex:1;min-width:0;padding:2px 10px 2px 0;font-size:14px;color:#111;cursor:pointer;background:none;border:0;border-radius:0;text-align:left;font:inherit}
      #tpParkBox .pk-c + .pk-c{border-left:1px solid #ddd;padding-left:12px}
      #tpParkBox .pk-c small{display:block;color:#888;font-size:12px}
      #tpParkBox .pk-c b{font-size:15px}
      #tpParkBox .pk-c.none{cursor:default;color:#999}
    `;
    document.head.appendChild(c);
  }
  function parkTripLabel(tr) {
    const f = tr.stops.find(x => x.bound) || tr.stops[0] || {};
    const b = f.bound ? (/行$/.test(f.bound) ? f.bound : f.bound + "行") : "";
    return `${f.type || ""} ${b}`.trim();
  }
  function parkContent(stName, units, ridesIdx) {
    const memo = new Map();
    const body = units.map((u, i) => {
      const fm = findFormationForSheet(u.rep, u.sd, ridesIdx, memo);
      const icon = fm && (fm.model || fm.number) ? resolveIcon(fm.model, fm.number) : ((u.rep.defaultIcons || [])[0] || FALLBACK_TRAIN_IMAGE);
      const num = fm && fm.number ? cleanNum(fm.number) : "";
      const title = num || ("運番" + (u.rep.unban || ""));
      const pill = num && u.rep.unban ? `<span class="pk-p">運番 ${esc(u.rep.unban)}</span>` : "";
      const cell = (label, tr, kind) => {
        if (!tr) return `<div class="pk-c none"><small>${label}</small>${kind === "prev" ? "始発前から留置" : "運用終了（終夜留置）"}</div>`;
        const stp = kind === "prev" ? tr.stops[tr.stops.length - 1] : tr.stops[0];
        const t = kind === "prev" ? (stp.a != null ? stp.a : stp.d) : (stp.d != null ? stp.d : stp.a);
        return `<button type="button" class="pk-c" data-i="${i}" data-k="${kind}"><small>${label}</small><b>${esc(secToHm(t).hm)}${kind === "prev" ? "着" : "発"}</b> ${esc(tr.trainNumber || "")}<br>${esc(parkTripLabel(tr))}</button>`;
      };
      return `<div class="pk-u"><div class="pk-t"><img src="${esc(icon)}" alt="" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${FALLBACK_TRAIN_IMAGE}';">${esc(title)}${pill}</div>
        <div class="pk-r">${cell("前運用", u.prev, "prev")}${cell("次運用", u.next, "next")}</div></div>`;
    }).join("");
    return `<div class="pk-h"><span>${esc(stName)}に留置中（${units.length}編成）</span><button type="button" class="pk-x" aria-label="閉じる">✕</button></div>${body || '<div class="pk-u" style="color:#888">いま留置中の列車はありません</div>'}`;
  }
  function closeParkModal() { const o = document.getElementById("tpParkOv"); if (o) o.remove(); st.parkOpen = null; }
  function paintParkModal(units, ridesIdx) {
    const o = document.getElementById("tpParkOv");
    if (!o || !st.parkOpen) return;
    const html = parkContent(st.parkOpen.name, units, ridesIdx);
    const box = o.firstElementChild;
    if (box._h === html) return; // 変わっていなければ描き直さない（押している最中に消えないように）
    box._h = html; box.innerHTML = html;
    box.querySelector(".pk-x").onclick = closeParkModal;
    box.querySelectorAll(".pk-c[data-i]").forEach(b => {
      b.onclick = () => { const u = units[+b.dataset.i]; const tr = u && (b.dataset.k === "prev" ? u.prev : u.next); if (tr) { closeParkModal(); openDetail(tr, [tr]); } };
    });
  }
  function openParkModal(row, name, units, ridesIdx) {
    ensureParkCss();
    closeParkModal();
    const o = document.createElement("div");
    o.id = "tpParkOv";
    o.innerHTML = '<div id="tpParkBox"></div>';
    o.addEventListener("click", e => { if (e.target === o) closeParkModal(); });
    document.body.appendChild(o);
    st.parkOpen = { row, name };
    paintParkModal(units, ridesIdx);
  }

  function renderLayer() {
    const ctx = st.ctx;
    const box = document.getElementById("mapResult");
    if (!box) return;
    const scroll = box.querySelector(".route-line-scroll");
    const old = document.getElementById("tpLayer");
    if (old) old.remove();
    if (scroll) scroll.querySelectorAll(".tp-park").forEach(e => e.remove());
    updateClock();
    if (!st.on || !ctx || !scroll || st.trainsRoute !== ctx.routeVal) return;

    const rows = [...scroll.querySelectorAll(".rt-row")];
    // 一度広げた高さは、リロードするまで路線ごとに維持する（縮めない＝スクロール位置が戻されない）
    st.rowH = st.rowH || {};
    const keptH = st.rowH[ctx.routeVal] || 0;
    rows.forEach(r => { r.style.minHeight = keptH ? keptH + "px" : ""; });
    const getCenters = () => rows.map(r => r.offsetTop + r.offsetHeight / 2);
    if (!rows.length) return;

    const { date, sec } = currentNow();
    const posSec = st.live ? sec - MOVE_OFFSET_SEC : sec; // ライブ表示は位置の判定を一律30秒遅らせる（時計表示は現在時刻のまま）
    const active = computeActive(ctx, posSec, date);
    const ridesIdx = indexRides(st.rides);
    const rideOnlyList = computeRideOnly(ctx, posSec, date);
    // 留置：営業運転していない運用が留まっている駅に「留置 N」を出す（行の高さを測る前に足す＝位置がずれない）
    ensureParkCss();
    let parked = new Map();
    try { parked = computeParked(ctx, posSec, date, active); } catch (e) { parked = new Map(); }
    parked.forEach((units, row) => {
      const nm = rows[row] && rows[row].querySelector(".rt-name");
      if (!nm) return;
      const b = document.createElement("button");
      b.type = "button"; b.className = "tp-park";
      b.innerHTML = `留置<b>${units.length}</b>`;
      b.onclick = ev => { ev.stopPropagation(); const nameTxt = (nm.dataset.xst || nm.firstChild && nm.firstChild.textContent || "").trim(); openParkModal(row, nameTxt, units, indexRides(st.rides)); };
      nm.appendChild(b);
    });
    if (st.parkOpen) paintParkModal(parked.get(st.parkOpen.row) || [], indexRides(st.rides));
    const fmMemo = new Map();
    const fmCache = new Map();
    const fmOf = a => {
      if (!fmCache.has(a)) fmCache.set(a, findFormationForSheet(a.train, a.serviceDate, ridesIdx, fmMemo));
      return fmCache.get(a);
    };
    // 1つの表示（単独または併結）の編成の並び：連結編成数ぶんの枠を前から並べ、記録の乗車位置の枠に車両を当てはめる
    const slotPlan = p => {
      const recs = [], seen = new Set();
      p.members.forEach(a => {
        const f = fmOf(a);
        if (!f) return;
        const k = f.model + "\u0001" + f.number + "\u0001" + f.pos + "\u0001" + f.count;
        if (seen.has(k)) return;
        seen.add(k); recs.push(f);
      });
      let n = p.members.length;
      recs.forEach(f => { if (f.count > n) n = f.count; });
      const assigned = new Array(n).fill(null);
      recs.forEach(f => {
        let s = (f.pos > 0 ? f.pos : 1) - 1;
        if (s >= n) s = n - 1;
        if (!assigned[s]) assigned[s] = f;
      });
      return { n, assigned };
    };

    // 現在の行位置から、配置する列車一覧を作る
    const build = (centers) => {
      const placedRaw = active.map(a => {
        const y0 = centers[a.pos.row0], y1 = centers[a.pos.row1];
        if (y0 == null || y1 == null) return null;
        return { kind: "dia", a, members: [a], sign: a.pos.sign, y: y0 + (y1 - y0) * a.pos.frac, h: 67 };
      }).filter(Boolean);
      // 併結：同じ位置（同じ区間・同じ進み具合）を同じ方向に進む、種別・行先が違う列車は1つにまとめて縦に並べて表示する
      const placed = [];
      const gm = new Map();
      placedRaw.forEach(p => {
        const ps = p.a.pos;
        const gk = [p.a.train.srcRoute || "", ps.row0, ps.row1, ps.frac.toFixed(4), ps.sign, ps.atStation ? 1 : 0, ps.sig].join("|"); // 時刻（発車・到着）も同じものだけ併結とみなす
        const g = gm.get(gk);
        if (g) { g.members.push(p.a); g.h = 67 + 55 * (g.members.length - 1); return; }
        gm.set(gk, p);
        placed.push(p);
      });
      // 列車番号も時刻表も同じ列車は、位置・時刻が違っても必ず併結扱いにする（先に出てきた方の位置にまとめる）。時刻表が違えば別の列車（1.34.0）
      const byNum = new Map();
      for (let i = 0; i < placed.length; i++) {
        const el = placed[i];
        const numKey = m => `${m.train.srcRoute || ""}|${m.train.trainNumber}|${trainSig(m.train)}`; // 時刻表も同じ時だけ（1.34.0）
        const nums = el.members.map(m => m.train.trainNumber ? numKey(m) : "").filter(Boolean);
        const hit = nums.map(n => byNum.get(n)).find(x => x && x !== el);
        if (hit) {
          hit.members.push(...el.members);
          hit.h = 67 + 55 * (hit.members.length - 1);
          placed.splice(i, 1); i--;
          hit.members.forEach(m => m.train.trainNumber && byNum.set(numKey(m), hit));
        } else {
          nums.forEach(n => byNum.set(n, el));
        }
      }
      placed.forEach(p => { p.h = 67 + 55 * (slotPlan(p).n - 1); });
      const rideOnly = rideOnlyList.map(r => {
        const y = centers[r.row];
        return y == null ? null : { kind: "ride", r, sign: r.sign, y, h: 67 + 55 * ((r.n || 1) - 1) };
      }).filter(Boolean);
      const all = placed.concat(rideOnly).sort((p, q) => p.y - q.y);
      return { placed, rideOnly, all };
    };
    // 同じ側で近い列車を横に積んだ時の最大段数(k)
    const maxStack = (all) => {
      const sl = { left: [], right: [] };
      let mk = 0;
      all.forEach(p => {
        const side = p.sign < 0 ? "left" : "right";
        let k = 0;
        while (sl[side].some(s => s.k === k && Math.abs(s.y - p.y) < (s.h + p.h) / 2 + 7)) k++;
        sl[side].push({ y: p.y, k, h: p.h });
        if (k > mk) mk = k;
      });
      return mk;
    };

    // 枠からはみ出す段数なら、全区間の行の高さを均等に広げる
    const W = scroll.clientWidth || 0;
    const capK = W ? Math.max(0, Math.floor((W / 2 - 18 - 64 - 4) / 66)) : 99;
    const kMax = Math.min(1, capK); // 横に並べるのは2本（2列）まで。3列目になる時は駅間を広げる
    let centers = getCenters();
    if (!centers.length) return;
    let built = build(centers);
    if (W && !keptH && maxStack(built.all) > kMax) {
      let h = Math.max(46, keptH, ...rows.map(r => r.offsetHeight));
      for (let i = 0; i < 14; i++) {
        h = Math.ceil(h * 1.25);
        rows.forEach(r => { r.style.minHeight = h + "px"; });
        centers = getCenters();
        built = build(centers);
        if (maxStack(built.all) <= kMax) break;
      }
      st.rowH[ctx.routeVal] = h;
    }
    const { placed, rideOnly, all } = built;

    const layer = document.createElement("div");
    layer.id = "tpLayer";
    scroll.appendChild(layer);

    const slots = { left: [], right: [] }; // 同じ側で近い列車を横にずらすための記録

    all.forEach(p => {
      const side = p.sign < 0 ? "left" : "right";
      let k = 0;
      while (slots[side].some(s => s.k === k && Math.abs(s.y - p.y) < (s.h + p.h) / 2 + 7)) k++;
      // 線から離す距離：右側は線のすぐ脇、左側は並走線の本数ぶんだけ外へ（並走線に重ならないように）
      const nPar = side === "left" ? Math.max(0, ...(p.kind === "ride" ? [p.r.row] : [p.a.pos.row0, p.a.pos.row1]).map(r => rows[r] ? rows[r].querySelectorAll(".parallel-line").length : 0)) : 0;
      const baseOff = 10 + 12 * nPar;
      slots[side].push({ y: p.y, k, h: p.h });
      const off = baseOff + 66 * k;
      const el = document.createElement("div");
      el.style.top = p.y + "px";
      // 上り（index減少）は線の左側、下り（index増加）は右側に置く
      if (side === "left") el.style.right = `calc(50% + ${off}px)`;
      else el.style.left = `calc(50% + ${off}px)`;

      if (p.kind === "ride") {
        // 乗車記録だけの列車：バッジは列車番号の代わりに発車時刻。ダイヤが無いのでタップしても何も起きない
        const r = p.r;
        const n = r.n || 1;
        const realIcon = (r.model || r.number) ? resolveIcon(r.model, r.number) : FALLBACK_TRAIN_IMAGE;
        // 連結編成数ぶんのアイコンを縦に並べ、乗車位置の編成だけに車両アイコンを出す（ほかは汎用アイコン）
        const icons = Array.from({ length: n }, (_, j) => j === r.pos - 1 ? realIcon : FALLBACK_TRAIN_IMAGE);
        const rr = (st.ctx && st.ctx.routeVal) || "";
        const labList = r.bounds && r.bounds.length > 1
          ? r.bounds.map((b, i) => labelHtml(rr, (r.types && (r.types[i] || r.types[0])) || "", b))
          : [labelHtml(rr, r.type, r.bound)];
        if (side === "right") { icons.reverse(); labList.reverse(); } // 右側は先頭の編成が下
        const labs = [...new Set(labList)];
        el.className = "tp-train tp-ride tp-" + side + (n > 1 ? " tp-coupled" : "");
        el.innerHTML = `
          <div class="tp-badge">${esc(r.hm)}</div>
          ${icons.map(ic => `<div class="tp-icon"><img src="${esc(ic)}" alt="" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${FALLBACK_TRAIN_IMAGE}';"></div>`).join("")}
          ${labs.map(labDiv).join("")}
          ${r.number ? `<div class="tp-num">${esc(cleanNum(r.number))}</div>` : ""}`;
        layer.appendChild(el);
        return;
      }

      // 1本（または併結の複数本）ぶんの表示を作る。アイコンは編成ごとに縦に並べ（連結編成数ぶん）、種別行先は列車ごとに1行ずつ、編成番号は「G11+」「U1」のように並べる
      const mviews = p.members.map(a => {
        const tb = typeBound(a);
        const defIcons = a.train.defaultIcons || [];
        const badge = a.train.trainNumber || (a.train.unban ? "運" + a.train.unban : "");
        return { badge, defIcons, label: labelHtml(a.train.srcRoute || (st.ctx && st.ctx.routeVal) || "", tb.type, tb.bound) };
      });
      const plan = slotPlan(p);
      const nM = mviews.length;
      const views = [];
      for (let j = 0; j < plan.n; j++) {
        const mi = Math.min(j, nM - 1);
        const fm = plan.assigned[j];
        const defIcons = !fm ? mviews[mi].defIcons : [];
        const icon = fm ? resolveIcon(fm.model, fm.number) : (defIcons.length ? defIcons[iconIdx(defIcons.length)] : FALLBACK_TRAIN_IMAGE);
        views.push({ icon, defIcons, mi, num: fm && fm.number ? cleanNum(fm.number) : "" });
      }
      // 右側は画面の下へ進むので、先頭の編成が下に来るよう逆順にする
      if (side === "right") { views.reverse(); mviews.reverse(); }
      const multi = views.length > 1;
      const nums = [...new Set(views.map(v => v.num).filter(Boolean))];
      const labels = [...new Set(mviews.map(v => v.label))];
      const badges = [...new Set(mviews.map(v => v.badge).filter(Boolean))];
      el.className = "tp-train tp-" + side + (p.a.pos.atStation ? " tp-stop" : "") + (multi ? " tp-coupled" : "");
      el.innerHTML = `
        <div class="tp-badge">${esc(badges.join("+"))}</div>
        ${views.map(v => `<div class="tp-icon" data-mi="${v.mi}"><img src="${esc(v.icon)}" ${v.defIcons.length > 1 ? `data-icons="${esc(v.defIcons.join("\n"))}"` : ""} alt="" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${FALLBACK_TRAIN_IMAGE}';"></div>`).join("")}
        ${labels.map(labDiv).join("")}
        ${nums.map((n, i) => `<div class="tp-num">${esc(n)}${i < nums.length - 1 ? "+" : ""}</div>`).join("")}`;
      el.onclick = () => openDetail(p.a.train, p.members.map(m => m.train));
      // アイコンを押すと、その列車の「時刻表／乗車記録を上げる」を選べる
      el.querySelectorAll(".tp-icon[data-mi]").forEach(ic => {
        ic.onclick = ev => { ev.stopPropagation(); const m = p.members[+ic.dataset.mi]; if (m) askIconAction(m.train, p.members.map(x => x.train), p.a.pos); };
      });
      layer.appendChild(el);
    });

    // 黒いラベル（列車番号・種別行先）の文字が見切れている時は、ラベルの中で文字を左右にスクロールする。
    // 1秒ごとに描き直すので、アニメの位置は現在時刻から決めて、描き直しても途切れず続くようにする
    layer.querySelectorAll(".tp-badge, .tp-label").forEach(lb => {
      const over = lb.scrollWidth - lb.clientWidth;
      if (over < 2) return;
      const span = document.createElement("span");
      span.innerHTML = lb.innerHTML; // チップ(span)も含めて動かす（1.36.0）
      lb.textContent = "";
      lb.appendChild(span);
      const dur = Math.max(2, over / 18); // 片道の秒数（遅めで読める速さ）
      lb.classList.add("tp-scroll");
      span.style.setProperty("--d", (over + 2) + "px");
      span.style.setProperty("--t", dur + "s");
      span.style.setProperty("--dl", "-" + ((Date.now() / 1000) % (dur * 2)).toFixed(3) + "s");
    });

    const status = document.getElementById("tpStatus");
    if (status && !st.loading) status.textContent = `運行中 ${placed.reduce((n, p) => n + p.members.length, 0)}本` + (rideOnly.length ? `（乗車記録のみ ${rideOnly.length}本）` : "");
    document.dispatchEvent(new Event("tp-rendered"));
  }

  // 種別チップ（1.36.0）。色: 回送・臨時・団体は赤、それ以外は sujitype のカラーコード、無ければ枠だけ
  const RED_TYPES = new Set(["回送", "臨時", "団体"]);
  function typeColor(route, type) {
    const t = String(type || "").trim();
    if (!t) return "";
    if (RED_TYPES.has(t)) return "#d32f2f";
    return (st.sujiColor && st.sujiColor.get(String(route || "") + "\t" + t)) || "";
  }
  function labelHtml(route, type, bound) {
    const t = String(type || "").trim();
    let chip = "";
    if (t) {
      const c = typeColor(route, t);
      let style = "";
      if (c) {
        const r = parseInt(c.slice(1, 3), 16), g = parseInt(c.slice(3, 5), 16), b = parseInt(c.slice(5, 7), 16);
        const fg = (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? "#111" : "#fff";
        style = ` style="background:${c};color:${fg};border-color:${c}"`;
      }
      chip = `<span class="tp-chip"${style}>${esc(t)}</span>`;
    }
    return (RED_TYPES.has(t) ? RED_MARK : "") + chip + esc(bound || "");
  }
  const RED_MARK = "<!--tp-red-->"; // 非営業列車のラベル全体を赤くする目印（labelHtml の先頭）
  const labDiv = h => `<div class="tp-label${h.startsWith(RED_MARK) ? " tp-label-red" : ""}">${h}</div>`;
  // この列車のいまの種別・行先（併結のまとめ判定と表示で共通）
  function typeBound(a) {
    const last = a.train.stops[a.train.stops.length - 1];
    const stopOnNow = a.train.stops.find(s => s.bound) || {};
    return { type: stopOnNow.type || "", bound: stopOnNow.bound || (last ? last.s : "") };
  }
  const tbKey = a => { const t = typeBound(a); return t.type + "|" + t.bound; };

  // 複数の所定形式画像は1秒ごとに切り替える
  const iconIdx = n => Math.floor(Date.now() / 1000) % n;
  function cycleIcons() {
    document.querySelectorAll("#tpLayer img[data-icons]").forEach(im => {
      const list = im.dataset.icons.split("\n").filter(Boolean);
      if (list.length < 2) return;
      const u = list[iconIdx(list.length)];
      if (im.getAttribute("src") !== u) { im.onerror = () => { im.onerror = null; im.src = FALLBACK_TRAIN_IMAGE; }; im.src = u; }
    });
  }

  function updateClock() {
    const el = document.getElementById("tpClock");
    if (!el) return;
    const { sec } = currentNow();
    el.textContent = `${pad(Math.floor(sec / 3600) % 24)}:${pad(Math.floor((sec % 3600) / 60))}:${pad(sec % 60)}`;
  }

  /* ---------- 操作バー ---------- */
  function ensureBar() {
    const bar = document.getElementById("trainposBar");
    if (!bar || bar.dataset.ready) return;
    bar.dataset.ready = "1";
    bar.innerHTML = `
      <label class="tp-sw"><input type="checkbox" id="tpOn"> 🚆 列車位置を表示</label>
      <span class="tp-opts" id="tpOpts" style="display:none;">
        <label class="tp-sw"><input type="checkbox" id="tpNow" checked> 現在時刻</label>
        <input type="datetime-local" id="tpTime" step="60" disabled>
        <label class="tp-sw" style="margin-left:6px;">パターン</label>
        <select id="tpPattern">
          <option value="auto">自動（今日）</option>
          <option value="weekday">平日ダイヤ</option>
          <option value="holiday">土日祝ダイヤ</option>
        </select>
        <span class="tp-clock">🕐 <span id="tpClock">--:--:--</span></span>
      </span>
      <div id="tpStatus" class="small" style="color:#888;margin-top:4px;"></div>`;
    const on = document.getElementById("tpOn");
    on.checked = lsGet(LS_ON) === "1";
    st.on = on.checked;
    on.onchange = () => { st.on = on.checked; lsSet(LS_ON, st.on ? "1" : "0"); applyState(); };
    document.getElementById("tpNow").onchange = e => {
      st.live = e.target.checked;
      const ti = document.getElementById("tpTime");
      ti.disabled = st.live;
      if (!st.live) {
        const n = new Date();
        ti.value = `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}T${pad(n.getHours())}:${pad(n.getMinutes())}`;
        st.manualSec = n.getHours() * 3600 + n.getMinutes() * 60;
        st.manualDate = new Date(n.getFullYear(), n.getMonth(), n.getDate());
      }
      refreshPatternOptions();
      renderLayer();
    };
    document.getElementById("tpPattern").onchange = e => {
      st.pattern = e.target.value;
      // パターンを変えたら、ダイヤと乗車記録を取り直す
      st.force = true; st.trains = []; st.trainsRoute = ""; st.pending = null;
      renderLayer();
      ensureData().then(renderLayer);
    };
    document.getElementById("tpTime").onchange = e => {
      const m = String(e.target.value || "").match(/^(\d{4})-(\d{2})-(\d{2})T(\d{1,2}):(\d{2})/);
      if (m) {
        st.manualDate = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
        st.manualSec = Number(m[4]) * 3600 + Number(m[5]) * 60;
        // その日に臨時ダイヤが走る路線では、パターンを自動でその臨時ダイヤにする（別の日にしたら「自動」に戻す）
        const sel = document.getElementById("tpPattern");
        const act = activeDiasOn(new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
        const cur = st.pattern && st.pattern.startsWith("dia:") ? st.pattern.slice(4) : "";
        if (act.size && !(cur && act.has(cur))) {
          st.pattern = "dia:" + [...act][0]; if (sel) sel.value = st.pattern;
          // パターンを変えた時と同じく、ダイヤと乗車記録を取り直す
          st.force = true; st.trains = []; st.trainsRoute = ""; st.pending = null;
          renderLayer();
          ensureData().then(renderLayer);
          return;
        }
        if (cur && !act.has(cur)) { st.pattern = "auto"; if (sel) sel.value = "auto"; }
        refreshPatternOptions();
        renderLayer();
        // 日付が変わったら、その日に走る臨時列車を取り直す
        if (st.ctx && st.trainsRoute === st.ctx.routeVal && st.extraDateKey !== effDateKey()) {
          const rt = st.ctx.routeVal, dk = effDateKey();
          loadExtras(st.ctx).then(ex => {
            if (!st.ctx || st.ctx.routeVal !== rt || st.trainsRoute !== rt) return;
            st.extraTrains = ex; st.extraDateKey = dk; rebuildTrains();
            refreshPatternOptions(); renderLayer();
          }).catch(() => {});
        }
      }
    };
  }

  async function applyState() {
    const opts = document.getElementById("tpOpts");
    if (opts) opts.style.display = st.on ? "inline" : "none";
    if (st.timer) { clearInterval(st.timer); st.timer = null; }
    if (st.iconTimer) { clearInterval(st.iconTimer); st.iconTimer = null; }
    if (!st.on) {
      renderLayer();
      const s = document.getElementById("tpStatus"); if (s) s.textContent = "";
      return;
    }
    await ensureData();
    renderLayer();
    st.iconTimer = setInterval(cycleIcons, 1000);
    st.timer = setInterval(async () => {
      if (st.live) {
        if (Date.now() - st.ridesFetchedAt > RIDES_REFRESH_MS) { await loadRides(true); }
        renderLayer();
      } else { updateClock(); }
    }, TICK_MS);
  }

  function ensureData() {
    const ctx = st.ctx;
    if (!ctx || !st.on) return Promise.resolve();
    // 同じ路線の読み込みが走ってる間は、それを使い回す（二重に取りに行かない）
    if (st.pending && st.pending.route === ctx.routeVal) return st.pending.promise;
    const promise = ensureDataImpl().finally(() => { if (st.pending && st.pending.promise === promise) st.pending = null; });
    st.pending = { route: ctx.routeVal, promise };
    return promise;
  }

  async function ensureDataImpl() {
    const ctx = st.ctx;
    const status = document.getElementById("tpStatus");
    if (!ctx || !st.on) return;
    const seq = ++st.loadSeq;
    const force = !!st.force; st.force = false;
    if (st.trainsRoute !== ctx.routeVal) {
      st.loading = true;
      st.trains = []; st.baseTrains = []; st.extraTrains = []; st.trainsRoute = "";
      refreshPatternOptions();
      if (status) status.textContent = "ダイヤを読み込み中…";
      // 乗車記録・祝日・車両マスタは、列車の読み込みと同時に取りに行く（順番待ちしない）
      const others = Promise.all([getHolidaySet(), loadRides(force), loadMasters()]);
      const trains = await loadRouteTrains(ctx, (d, n) => {
        if (seq === st.loadSeq && status) status.textContent = `ダイヤを読み込み中… ${d}/${n}`;
      }, force);
      if (seq !== st.loadSeq) return; // 路線が切り替わっていたら捨てる
      st.baseTrains = trains;
      st.extraTrains = [];
      st.trainsRoute = ctx.routeVal;
      rebuildTrains();
      try { st.extraTrains = await loadExtras(ctx); st.extraDateKey = effDateKey(); } catch (e) { st.extraTrains = []; }
      if (seq !== st.loadSeq) return;
      rebuildTrains();
      refreshPatternOptions();
      if (status) status.textContent = "乗車記録を確認中…";
      await others;
      if (seq !== st.loadSeq) return;
      st.loading = false;
      return;
    }
    if (status) status.textContent = "乗車記録を確認中…";
    await Promise.all([getHolidaySet(), loadRides(force), loadMasters()]);
    if (seq !== st.loadSeq) return;
    st.loading = false;
  }

  /* ---------- 公開API ---------- */
  window.TrainPos = {
    // linemap.html の renderMap() の最後で呼ぶ
    onMapRendered(ctx) {
      ensureBar();
      const routeChanged = !st.ctx || st.ctx.routeVal !== ctx.routeVal;
      st.ctx = ctx;
      if (!st.on) { renderLayer(); return; }
      if (routeChanged || st.trainsRoute !== ctx.routeVal) {
        ensureData().then(renderLayer);
      } else {
        renderLayer();
      }
    },
    init() { ensureBar(); if (st.on) applyState(); }
  };
})();
