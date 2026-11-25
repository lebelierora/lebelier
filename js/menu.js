// るべりえ 注文サイト（テイクアウト／店内）- メニューデータと共通ユーティリティ
// メニューは Airレジモバイルオーダー掲載メニューと同等（全86品・10カテゴリ）。
// ※「るべりえミルクアイストッピング」は独立商品にせず、るべりえミルク／るべりえソーダの
//   バニラアイストッピング（+100円）として選ぶ仕様（本人指示 2026-11-25）。
// 品名・価格・トッピング・カテゴリ振り分けは menu-airregi-mapping-2026-11-25.md が正。
// 説明文と写真は店内版診断マスターから、品名が一致する品のみ流用。

export const CATEGORIES = [
  { id: "seasonal", name: "季節メニュー" },
  { id: "hall", name: "ホールピザ" },
  { id: "age", name: "揚げピザ" },
  { id: "sweetpizza", name: "スイーツピザ" },
  { id: "kids", name: "キッズメニュー" },
  { id: "side", name: "サイドメニュー" },
  { id: "drink", name: "ソフトドリンク" },
  { id: "alcohol", name: "アルコール" },
  { id: "sweets", name: "スイーツ" },
  { id: "sweetage", name: "スイーツ揚げピザ" },
];

// cut: カット/包装の選択があるカテゴリ（ホール・スイーツピザのみ）
// noBox: 箱を選べない商品（レモンバターシュガー）
// seasonal: 季節メニュー（仮想カテゴリ）にも表示する商品
// toppings: [{label, delta}] チェックボックス式。delta は1個あたりの加算額（円）。
//   dineInOnly: true のトッピングは店内（イートイン）でのみ表示する（テイクアウトでは出さない）。
//   スイーツピザ6品の「バニラアイス +150円」が該当（本人指示 2026-11-25）。
// choice: {label, options:[{label, delta}]} 単一選択（必須・未選択スタート）。
//   詳細画面で選ぶまで「カートに入れる」は押せない。
//   選択した choice のラベルは注文データに保存され、厨房・お客側の両方に表示される。
export const MENU = [
  // ---- ホールピザ ----
  { id: "bolognese", cat: "hall", name: "るべりえボロネーゼ", price: 850, desc: "", seasonal: true, toppings: [{ label: "ハラペーニョ", delta: 80 }] },
  { id: "spicy-meat", cat: "hall", name: "ピリ辛ミートるべりーえ", price: 850, desc: "", seasonal: true, toppings: [{ label: "チーズ2倍に変更", delta: 200 }, { label: "ハラペーニョ", delta: 80 }] },
  { id: "hakusai-ortolana", cat: "hall", name: "邑楽白菜のオルトラーナ", price: 650, desc: "", seasonal: true, toppings: [{ label: "チーズ2倍に変更", delta: 200 }, { label: "ハラペーニョ", delta: 80 }] },
  { id: "spicy-hakusai-ortolana", cat: "hall", name: "ピリ辛白菜のオルトラーナ", price: 680, desc: "", seasonal: true, toppings: [{ label: "チーズ2倍に変更", delta: 200 }, { label: "ハラペーニョ", delta: 80 }] },
  { id: "gyosho-liana", cat: "hall", name: "イタリアン魚醤リアーナ", price: 680, desc: "", seasonal: true, toppings: [{ label: "ハラペーニョ", delta: 80 }] },
  { id: "margherita", cat: "hall", name: "マルゲリータ", price: 650, desc: "イタリア産完熟トマト・モッツァレラ・バジル。王道の一番人気", img: "https://imagedelivery.net/QondspN4HIUvB_R16-ddAQ/63e43a8bf54f677c995609ab/0b0e86af91999ddffc41.jpeg/fit=cover,w=924,h=660", toppings: [{ label: "チーズ2倍に変更", delta: 200 }, { label: "ハラペーニョ", delta: 80 }] },
  { id: "ruberie-mix", cat: "hall", name: "るべりえミックス", price: 700, desc: "サラミ・ピーマン・レッドチェダー・イタリア産完熟トマト", img: "https://imagedelivery.net/QondspN4HIUvB_R16-ddAQ/63e43a8bf54f677c995609ab/7040ebfc800ba1b701c4.jpeg/fit=cover,w=924,h=660", toppings: [{ label: "ハラペーニョ", delta: 80 }] },
  { id: "quattro", cat: "hall", name: "クアトロフロマッジ", price: 700, desc: "4種のチーズ。ハチミツトッピングもおすすめ", img: "https://imagedelivery.net/QondspN4HIUvB_R16-ddAQ/63e43a8bf54f677c995609ab/9caf8c2c8fd180fc2a9a.jpeg/fit=cover,w=924,h=660", toppings: [{ label: "ハラペーニョ", delta: 80 }, { label: "邑楽町産ハチミツ", delta: 100 }] },
  { id: "marinara", cat: "hall", name: "マリナーラ", price: 500, desc: "チーズなし。トマト・オレガノ・ガーリックオイルのシンプルな味", img: "https://imagedelivery.net/QondspN4HIUvB_R16-ddAQ/63e43a8bf54f677c995609ab/6e5f56c6554d1e0972c0.jpeg/fit=cover,w=924,h=660", toppings: [{ label: "ハラペーニョ", delta: 80 }] },
  { id: "genovese", cat: "hall", name: "ジェノヴェーゼ", price: 680, desc: "バジルペーストとモッツァレラ", img: "https://imagedelivery.net/QondspN4HIUvB_R16-ddAQ/63e43a8bf54f677c995609ab/c8d3923c4e8116e5ab5b.jpeg/fit=cover,w=924,h=660", toppings: [{ label: "チーズ2倍に変更", delta: 200 }, { label: "ハラペーニョ", delta: 80 }] },
  { id: "siciliana", cat: "hall", name: "シシリアーナ", price: 680, desc: "アンチョビ・ペパロニ・ブラックオリーブ", img: "https://imagedelivery.net/QondspN4HIUvB_R16-ddAQ/63e43a8bf54f677c995609ab/c39be451273f9ea4bd41.jpeg/fit=cover,w=924,h=660", toppings: [{ label: "ハラペーニョ", delta: 80 }] },
  { id: "basil-chicken", cat: "hall", name: "バジルチキン", price: 750, desc: "スモークチキンとバジルペースト", img: "https://imagedelivery.net/QondspN4HIUvB_R16-ddAQ/63e43a8bf54f677c995609ab/327806f3c878c1b68fdc.jpeg/fit=cover,w=924,h=660", toppings: [{ label: "チーズ2倍に変更", delta: 200 }, { label: "ハラペーニョ", delta: 80 }] },
  { id: "teriyaki-chicken", cat: "hall", name: "テリヤキチキン", price: 750, desc: "スモークチキンにテリヤキソースとマヨネーズ", img: "https://imagedelivery.net/QondspN4HIUvB_R16-ddAQ/63e43a8bf54f677c995609ab/fd36f94a800abb12bb6b.jpeg/fit=cover,w=924,h=660", toppings: [{ label: "チーズ2倍に変更", delta: 200 }, { label: "ハラペーニョ", delta: 80 }] },
  { id: "kinoko-bianca", cat: "hall", name: "キノコのビアンカ", price: 750, desc: "4種のキノコとモッツァレラの白いピザ", img: "https://imagedelivery.net/QondspN4HIUvB_R16-ddAQ/63e43a8bf54f677c995609ab/66ae56d931e7e4548ead.jpeg/fit=cover,w=924,h=660", toppings: [{ label: "チーズ2倍に変更", delta: 200 }, { label: "ハラペーニョ", delta: 80 }] },
  { id: "kinoko-marinara", cat: "hall", name: "キノコのマリナーラ", price: 750, desc: "4種のキノコとトマト", img: "https://imagedelivery.net/QondspN4HIUvB_R16-ddAQ/63e43a8bf54f677c995609ab/fa2a98125082eb9b96d2.jpeg/fit=cover,w=924,h=660", toppings: [{ label: "ハラペーニョ", delta: 80 }] },
  { id: "bacon-corn", cat: "hall", name: "カリカリベーコーン", price: 750, desc: "ベーコン・コーン・マスカルポーネ", img: "https://imagedelivery.net/QondspN4HIUvB_R16-ddAQ/63e43a8bf54f677c995609ab/e220e52406e94787112e.jpeg/fit=cover,w=924,h=660", toppings: [{ label: "ハラペーニョ", delta: 80 }] },
  { id: "anchovy-corn", cat: "hall", name: "アンチョビコーン", price: 750, desc: "コーン・アンチョビ・海苔の組み合わせ", img: "https://imagedelivery.net/QondspN4HIUvB_R16-ddAQ/63e43a8bf54f677c995609ab/75f9f2ad1cec733b362b.jpeg/fit=cover,w=924,h=660", toppings: [{ label: "ハラペーニョ", delta: 80 }] },
  { id: "smoked-margherita", cat: "hall", name: "燻製チーズのマルゲリータ", price: 850, desc: "イタリア産水牛モッツァレラの燻製を使ったマルゲリータ", img: "https://imagedelivery.net/QondspN4HIUvB_R16-ddAQ/63e43a8bf54f677c995609ab/a1218ed8b2e74f634f2f.jpeg/fit=cover,w=924,h=660", toppings: [{ label: "チーズ2倍に変更", delta: 400 }, { label: "ハラペーニョ", delta: 80 }] },
  { id: "thank-you-margherita", cat: "hall", name: "サンキューマルゲリータ", price: 700, desc: "ハートの形が目印のマルゲリータ", img: "https://imagedelivery.net/QondspN4HIUvB_R16-ddAQ/63e43a8bf54f677c995609ab/c247e56cc5175df28e8b.jpeg/fit=cover,w=924,h=660", toppings: [{ label: "チーズ2倍に変更", delta: 200 }, { label: "ハラペーニョ", delta: 80 }] },
  { id: "fig-quattro", cat: "hall", name: "無花果アトロフロマッジ", price: 850, desc: "邑楽町産セミドライ無花果と4種のチーズ", img: "https://imagedelivery.net/QondspN4HIUvB_R16-ddAQ/63e43a8bf54f677c995609ab/25f92a6c3a51b2ebdbab.jpeg/fit=cover,w=924,h=660", toppings: [{ label: "邑楽町産ハチミツ", delta: 100 }, { label: "ハラペーニョ", delta: 80 }] },
  { id: "shichifuku-quattro", cat: "hall", name: "七福アトロフロマッジ", price: 850, desc: "7種のチーズをのせた贅沢な一枚", img: "https://imagedelivery.net/QondspN4HIUvB_R16-ddAQ/63e43a8bf54f677c995609ab/549a5ea1f8cba6ad9074.jpeg/fit=cover,w=924,h=660", toppings: [{ label: "邑楽町産ハチミツ", delta: 100 }, { label: "ハラペーニョ", delta: 80 }, { label: "セミドライ無花果", delta: 150 }] },
  // ---- 揚げピザ ----
  { id: "hakusai-chicken-gyoza", cat: "age", name: "ピリ辛チキンと白菜の揚げ餃子風", price: 480, desc: "", seasonal: true, toppings: [] },
  { id: "hakusai-hotate-stew", cat: "age", name: "邑楽白菜と帆立のシチュー", price: 500, desc: "", seasonal: true, toppings: [] },
  { id: "hakusai-hotate-gyoza", cat: "age", name: "ピリ辛帆立と白菜の揚げ餃子風", price: 500, desc: "", seasonal: true, toppings: [] },
  { id: "hakusai-chicken-stew", cat: "age", name: "邑楽白菜とチキンのシチュー", price: 480, desc: "", seasonal: true, toppings: [] },
  { id: "winter-meat-fantasy", cat: "age", name: "冬のミートファンタジー", price: 500, desc: "", seasonal: true, toppings: [] },
  { id: "pork-redwine", cat: "age", name: "るべりえ特製 豚肉の赤ワイン煮", price: 600, desc: "", seasonal: true, toppings: [] },
  { id: "croquette", cat: "age", name: "るべりえ特製 洋風コロッケ仕立て", price: 480, desc: "", seasonal: true, toppings: [] },
  { id: "gunma-rugerita", cat: "age", name: "群馬ルゲリータ", price: 450, desc: "マルゲリータの揚げピザ。トマト・モッツァレラ・バジル", img: "https://imagedelivery.net/QondspN4HIUvB_R16-ddAQ/63e43a8bf54f677c995609ab/ff3b063f40bfb7dd3388.jpeg/fit=cover,w=924,h=660", toppings: [{ label: "チーズ2倍に変更", delta: 150 }] },
  { id: "gunma-jiru-chicken", cat: "age", name: "群馬ジルチキン", price: 450, desc: "スモークチキン・モッツァレラ・バジルペースト", img: "https://imagedelivery.net/QondspN4HIUvB_R16-ddAQ/63e43a8bf54f677c995609ab/840c58aa3b2bf22b5378.jpeg/fit=cover,w=924,h=660", toppings: [] },
  { id: "gunma-toro-fromaggi", cat: "age", name: "群馬トロフロマッジ", price: 450, desc: "4種のチーズの揚げピザ", img: "https://imagedelivery.net/QondspN4HIUvB_R16-ddAQ/63e43a8bf54f677c995609ab/20d67ad795ec3afab892.jpeg/fit=cover,w=924,h=660", toppings: [] },
  { id: "taiyo-tomato-curry", cat: "age", name: "太陽のトマトカレー", price: 480, desc: "じゃがいもとトマトカレー", img: "https://imagedelivery.net/QondspN4HIUvB_R16-ddAQ/63e43a8bf54f677c995609ab/f4f758627aaa59785d9f.jpeg/fit=cover,w=924,h=660", toppings: [] },
  { id: "tomato-corn-curry", cat: "age", name: "トマトコーンカレー", price: 500, desc: "トマトカレーにコーン", img: "https://imagedelivery.net/QondspN4HIUvB_R16-ddAQ/63e43a8bf54f677c995609ab/ea43bc9c58c9d208c1de.jpeg/fit=cover,w=924,h=660", toppings: [] },
  { id: "abarenbo-hotate-curry", cat: "age", name: "暴れん坊帆立カレー", price: 500, desc: "帆立入りのトマトカレー。ハバネロ入り（抜きもできます）", img: "https://imagedelivery.net/QondspN4HIUvB_R16-ddAQ/63e43a8bf54f677c995609ab/06af95c300ab4ca3b26d.jpeg/fit=cover,w=924,h=660", toppings: [{ label: "ハバネロ抜き", delta: 0 }] },
  { id: "shukumeruri", cat: "age", name: "るべりえシュクメルリ", price: 500, desc: "スモークチキンとキノコのガーリッククリーム風", img: "https://imagedelivery.net/QondspN4HIUvB_R16-ddAQ/63e43a8bf54f677c995609ab/80099fa8f34227fc85ff.jpeg/fit=cover,w=924,h=660", toppings: [] },
  { id: "kinoko-cream-stew", cat: "age", name: "いろいろキノコのクリームシチュー", price: 480, desc: "じゃがいもと4種のキノコのクリームシチュー", img: "https://imagedelivery.net/QondspN4HIUvB_R16-ddAQ/63e43a8bf54f677c995609ab/70f2227b385a16072c47.jpeg/fit=cover,w=924,h=660", toppings: [] },
  { id: "premium-basil-chicken", cat: "age", name: "プレミアムバジルチキン", price: 500, desc: "スモークチキン・バジルペースト・フランス産マスタード", img: "https://imagedelivery.net/QondspN4HIUvB_R16-ddAQ/63e43a8bf54f677c995609ab/cdbfb07352ce1ba4149b.jpeg/fit=cover,w=924,h=660", toppings: [] },
  { id: "premium-jaga-cheese", cat: "age", name: "プレミアムじゃがチーズ", price: 500, desc: "5種のチーズとじゃがいも。るべりえ名物", img: "https://imagedelivery.net/QondspN4HIUvB_R16-ddAQ/63e43a8bf54f677c995609ab/004dfc8fe98814cb2894.jpeg/fit=cover,w=924,h=660", toppings: [] },
  // ---- スイーツピザ ----
  { id: "lemon-butter-sugar", cat: "sweetpizza", name: "レモンバターシュガー", price: 550, desc: "バター・グラニュー糖・レモンのさっぱりした甘さ", noBox: true, img: "https://imagedelivery.net/QondspN4HIUvB_R16-ddAQ/63e43a8bf54f677c995609ab/50c568275bf2efbacd53.jpeg/fit=cover,w=924,h=660", toppings: [{ label: "邑楽町産ハチミツ", delta: 100 }, { label: "バニラアイス", delta: 150, dineInOnly: true }] },
  { id: "mascarpone-berry", cat: "sweetpizza", name: "マスカルポーネとミックスベリー", price: 680, desc: "マスカルポーネとミックスベリー、自家製ベリーソース", img: "https://imagedelivery.net/QondspN4HIUvB_R16-ddAQ/63e43a8bf54f677c995609ab/30e2d18b5cfc4243af93.jpeg/fit=cover,w=924,h=660", toppings: [{ label: "邑楽町産ハチミツ", delta: 100 }, { label: "バニラアイス", delta: 150, dineInOnly: true }] },
  { id: "banana-caramel", cat: "sweetpizza", name: "バナナキャラメル", price: 680, desc: "バナナとマスカルポーネ、自家製キャラメルソース", img: "https://imagedelivery.net/QondspN4HIUvB_R16-ddAQ/63e43a8bf54f677c995609ab/82a6fb67e08ff0b7fed1.jpeg/fit=cover,w=924,h=660", toppings: [{ label: "邑楽町産ハチミツ", delta: 100 }, { label: "バニラアイス", delta: 150, dineInOnly: true }] },
  { id: "tiramisu", cat: "sweetpizza", name: "るべりえティラミス", price: 680, desc: "マスカルポーネとコーヒーソースのティラミス風", img: "https://imagedelivery.net/QondspN4HIUvB_R16-ddAQ/63e43a8bf54f677c995609ab/273cb50594f19a984112.jpeg/fit=cover,w=924,h=660", toppings: [{ label: "邑楽町産ハチミツ", delta: 100 }, { label: "バニラアイス", delta: 150, dineInOnly: true }] },
  { id: "melty-bitter", cat: "sweetpizza", name: "メルティービター", price: 750, desc: "ビターチョコとミックスベリー", img: "https://imagedelivery.net/QondspN4HIUvB_R16-ddAQ/63e43a8bf54f677c995609ab/21ee74660d3e763933df.jpeg/fit=cover,w=924,h=660", toppings: [{ label: "邑楽町産ハチミツ", delta: 100 }, { label: "バニラアイス", delta: 150, dineInOnly: true }] },
  { id: "white-berry", cat: "sweetpizza", name: "ホワイトベリー", price: 750, desc: "ホワイトチョコとミックスベリー", img: "https://imagedelivery.net/QondspN4HIUvB_R16-ddAQ/63e43a8bf54f677c995609ab/0e0b6705bb51b58c2cbe.jpeg/fit=cover,w=924,h=660", toppings: [{ label: "邑楽町産ハチミツ", delta: 100 }, { label: "バニラアイス", delta: 150, dineInOnly: true }] },
  { id: "pacp", cat: "sweetpizza", name: "PACP（ピザアップルシナモンパイ風）", price: 750, desc: "", seasonal: true, toppings: [{ label: "シナモン抜き", delta: 0 }, { label: "邑楽町産ハチミツ", delta: 100 }] },
  // ---- キッズメニュー ----
  { id: "zeppole-kids", cat: "kids", name: "ゼッポレ塩無し", price: 330, desc: "", toppings: [] },
  { id: "jaga-kids", cat: "kids", name: "じゃがいも素揚げ塩無し", price: 400, desc: "", toppings: [] },
  { id: "rubepan", cat: "kids", name: "るべぱん", price: 280, desc: "", choice: { label: "サイズをお選びください", options: [{ label: "小", delta: 0 }, { label: "大", delta: 50 }] }, toppings: [] },
  // ---- サイドメニュー ----
  { id: "zeppole", cat: "side", name: "ゼッポレ", price: 330, desc: "ピザ生地に生海苔を練り込んだ揚げパン", img: "https://imagedelivery.net/QondspN4HIUvB_R16-ddAQ/63e43a8bf54f677c995609ab/3c16b1492c2f26fa8b48.jpeg/fit=cover,w=924,h=660", toppings: [] },
  { id: "crispy-chicken", cat: "side", name: "るべりえクリスピーチキン", price: 480, desc: "国産鶏胸肉の自家仕込み、5〜6個。ピリ辛変更もできます", img: "https://imagedelivery.net/QondspN4HIUvB_R16-ddAQ/63e43a8bf54f677c995609ab/165497a837d0f0d1a5c8.jpeg/fit=cover,w=924,h=660", choice: { label: "種類をお選びください", options: [{ label: "通常", delta: 0 }, { label: "ピリ辛", delta: 30 }, { label: "パーティー", delta: 420 }, { label: "ピリ辛パーティー", delta: 470 }] }, toppings: [] },
  { id: "age-moriawase", cat: "side", name: "揚げ物盛り合わせ", price: 700, desc: "内容は季節により変わります", toppings: [] },
  { id: "ham-moriawase", cat: "side", name: "ハム盛り合わせ", price: 1600, desc: "2〜3人前のハム盛り合わせ", toppings: [] },
  { id: "party-set", cat: "side", name: "パーティーセット", price: 2900, desc: "ハム盛り合わせ・チキン・ゼッポレ・じゃがいもの盛り合わせセット", toppings: [] },
  { id: "takunomi-set", cat: "side", name: "宅飲み！！るべりえセット", price: 1300, desc: "", toppings: [] },
  { id: "green-olive", cat: "side", name: "グリーンオリーブ種あり", price: 330, desc: "種あり6粒", toppings: [] },
  { id: "pickles", cat: "side", name: "ピクルス", price: 330, desc: "さっぱりした箸休め", toppings: [] },
  { id: "motsu-tomato", cat: "side", name: "もつトマト煮込み", price: 480, desc: "トマトで煮込んだもつ煮込み", img: "https://imagedelivery.net/QondspN4HIUvB_R16-ddAQ/63e43a8bf54f677c995609ab/48050b17d5a09487c307.jpeg/fit=cover,w=924,h=660", toppings: [] },
  { id: "hakusai-motsu", cat: "side", name: "邑楽白菜とピリ辛もつトマト煮込み", price: 500, desc: "", seasonal: true, toppings: [] },
  { id: "jaga-fry", cat: "side", name: "皮付きじゃがいもの素揚げ", price: 400, desc: "フレーバーが選べる素揚げ（塩／パルメザンチーズ／バジルソース ほか）", choice: { label: "味をお選びください", options: [{ label: "塩味", delta: 0 }, { label: "パルメザンチーズ", delta: 0 }, { label: "チェダーチーズ", delta: 0 }, { label: "アンチョビ＋パルメザンチーズ", delta: 0 }, { label: "ンドゥイヤ", delta: 0 }, { label: "バジルソース", delta: 0 }, { label: "魚醤バター", delta: 0 }] }, toppings: [] },
  // ---- ソフトドリンク ----
  { id: "oolong", cat: "drink", name: "烏龍茶", price: 350, desc: "ICE／HOT", toppings: [{ label: "バニラアイストッピング", delta: 100 }] },
  { id: "orange-juice", cat: "drink", name: "オレンジジュース", price: 400, desc: "定番ジュース", toppings: [{ label: "バニラアイストッピング", delta: 100 }] },
  { id: "hot-coffee", cat: "drink", name: "ホットコーヒー", price: 400, desc: "温かいコーヒー", toppings: [] },
  { id: "ice-coffee", cat: "drink", name: "アイスコーヒー", price: 450, desc: "冷たいコーヒー", toppings: [{ label: "バニラアイストッピング", delta: 100 }] },
  { id: "cafe-latte", cat: "drink", name: "カフェラテ", price: 450, desc: "ICE／HOT", choice: { label: "ホット／アイスをお選びください", options: [{ label: "ホット", delta: 0 }, { label: "アイス", delta: 0 }] }, toppings: [{ label: "バニラアイストッピング", delta: 100 }] },
  { id: "espresso-soda", cat: "drink", name: "エスプレッソソーダ", price: 450, desc: "エスプレッソのソーダ割り", toppings: [{ label: "バニラアイストッピング", delta: 100 }] },
  { id: "ruberie-soda", cat: "drink", name: "るべりえソーダ", price: 400, desc: "シロップが選べるオリジナルソーダ", choice: { label: "味をお選びください", options: [{ label: "ピーチ", delta: 0 }, { label: "パッション", delta: 0 }, { label: "ライチ", delta: 0 }, { label: "マンゴー", delta: 0 }, { label: "ブラッドオレンジ", delta: 0 }, { label: "ブルーキュラソー", delta: 0 }, { label: "イチゴ", delta: 0 }, { label: "スイカ", delta: 0 }, { label: "邑楽町産ゆず", delta: 0 }, { label: "緑色じゃないメロン", delta: 0 }] }, toppings: [{ label: "バニラアイストッピング", delta: 100 }] },
  { id: "cream-soda", cat: "drink", name: "緑色じゃないクリームソーダ", price: 500, desc: "色が選べる、緑色じゃないクリームソーダ", choice: { label: "味をお選びください", options: [{ label: "ピーチ", delta: 0 }, { label: "パッション", delta: 0 }, { label: "ライチ", delta: 0 }, { label: "マンゴー", delta: 0 }, { label: "ブラッドオレンジ", delta: 0 }, { label: "ブルーキュラソー", delta: 0 }, { label: "イチゴ", delta: 0 }, { label: "スイカ", delta: 0 }, { label: "邑楽町産ゆず", delta: 0 }, { label: "緑色じゃないメロン", delta: 0 }] }, toppings: [] },
  { id: "ruberie-milk", cat: "drink", name: "るべりえミルク", price: 450, desc: "シロップが選べるミルクドリンク", choice: { label: "味をお選びください", options: [{ label: "ピーチ", delta: 0 }, { label: "パッション", delta: 0 }, { label: "ライチ", delta: 0 }, { label: "マンゴー", delta: 0 }, { label: "ブラッドオレンジ", delta: 0 }, { label: "ブルーキュラソー", delta: 0 }, { label: "イチゴ", delta: 0 }, { label: "スイカ", delta: 0 }, { label: "邑楽町産ゆず", delta: 0 }, { label: "緑色じゃないメロン", delta: 0 }] }, toppings: [{ label: "バニラアイストッピング", delta: 100 }] },
  { id: "cocoa", cat: "drink", name: "人生のように甘過ぎないココア", price: 450, desc: "甘さ控えめのココア", toppings: [] },
  { id: "zero-ichi", cat: "drink", name: "キリンゼロイチ ノンアルコールビール", price: 400, desc: "ノンアルコールビール", toppings: [] },
  { id: "peche-oolong", cat: "drink", name: "ペシェウーロン（桃味）", price: 400, desc: "烏龍茶＋ピーチシロップ", toppings: [{ label: "バニラアイストッピング", delta: 100 }] },
  { id: "tropical-oolong", cat: "drink", name: "トロピカルウーロン（パッション味）", price: 400, desc: "烏龍茶＋パッションフルーツシロップ", toppings: [{ label: "バニラアイストッピング", delta: 100 }] },
  // ---- アルコール ----
  { id: "heartland-draft", cat: "alcohol", name: "キリンハートランド生ビール", price: 600, desc: "生ビール", toppings: [] },
  { id: "house-wine", cat: "alcohol", name: "ハウスワイン", price: 500, desc: "赤／白", choice: { label: "赤／白をお選びください", options: [{ label: "赤ワイン", delta: 0 }, { label: "白ワイン", delta: 0 }] }, toppings: [] },
  { id: "sangria", cat: "alcohol", name: "なんちゃってサングリア", price: 500, desc: "赤／白", choice: { label: "赤／白をお選びください", options: [{ label: "赤ワインベース", delta: 0 }, { label: "白ワインベース", delta: 0 }] }, toppings: [] },
  { id: "aperol-soda", cat: "alcohol", name: "アペロールソーダ", price: 500, desc: "アペロールのソーダ割り", toppings: [] },
  { id: "oharaki", cat: "alcohol", name: "邑楽館林の地酒 於波良岐（おはらき）", price: 500, desc: "", toppings: [] },
  { id: "campari-beer", cat: "alcohol", name: "カンパリビア", price: 700, desc: "カンパリのビアカクテル", toppings: [] },
  { id: "hot-wine", cat: "alcohol", name: "ホットワイン", price: 500, desc: "赤／白", choice: { label: "赤／白をお選びください", options: [{ label: "赤ワインベース", delta: 0 }, { label: "白ワインベース", delta: 0 }] }, toppings: [] },
  // ---- スイーツ ----
  { id: "apple-caramel-parfait", cat: "sweets", name: "りんごとキャラメルのミニパフェ", price: 600, desc: "", toppings: [] },
  // ---- スイーツ揚げピザ ----
  { id: "choco-bana-nuts", cat: "sweetage", name: "チョコバナナッツ", price: 480, desc: "ビターチョコ・バナナソテー・アーモンド", img: "https://imagedelivery.net/QondspN4HIUvB_R16-ddAQ/63e43a8bf54f677c995609ab/15f630fa481d4c69c797.jpeg/fit=cover,w=924,h=660", toppings: [] },
  { id: "skull-apple", cat: "sweetage", name: "群馬スカルアップル", price: 480, desc: "", seasonal: true, toppings: [] },
  { id: "mascar-anko-butter", cat: "sweetage", name: "マスカルあんバター", price: 450, desc: "つぶあん・マスカルポーネ・バター", img: "https://imagedelivery.net/QondspN4HIUvB_R16-ddAQ/63e43a8bf54f677c995609ab/ffa4c815b21aeeddefb0.jpeg/fit=cover,w=924,h=660", toppings: [] },
  { id: "anko-choco-bitter", cat: "sweetage", name: "あんチョコビター", price: 450, desc: "つぶあんとビターチョコ", img: "https://imagedelivery.net/QondspN4HIUvB_R16-ddAQ/63e43a8bf54f677c995609ab/8f1311b113b4345fb477.jpeg/fit=cover,w=924,h=660", toppings: [] },
  { id: "mascar-anko-apple", cat: "sweetage", name: "マスカルあんアップル", price: 480, desc: "", seasonal: true, toppings: [] },
  { id: "fig-anko-tiramisu", cat: "sweetage", name: "イチジクあんティラミス", price: 480, desc: "つぶあんと邑楽町産セミドライ無花果のティラミス風", img: "https://imagedelivery.net/QondspN4HIUvB_R16-ddAQ/63e43a8bf54f677c995609ab/be084b37fa3f8c56a988.jpeg/fit=cover,w=924,h=660", toppings: [] },
];

// カテゴリ表示用の商品一覧。季節メニューは seasonal フラグ付きを全カテゴリから集める（品自体は元のカテゴリにも残る）。
export function itemsForCategory(catId) {
  if (catId === "seasonal") return MENU.filter(m => m.seasonal);
  return MENU.filter(m => m.cat === catId);
}
export const BOX_PRICE = 100; // 箱（1個あたり）
export const CUT_PACK_CATS = ["hall", "sweetpizza"]; // カット/包装があるカテゴリ
export const MAX_QTY = 20;

export function menuById(id) { return MENU.find(m => m.id === id); }

export function unitPrice(item, toppingLabels, pack, choiceLabel) {
  let p = item.price;
  for (const t of item.toppings || []) {
    if ((toppingLabels || []).includes(t.label)) p += t.delta;
  }
  if (item.choice && choiceLabel) {
    const opt = item.choice.options.find(o => o.label === choiceLabel);
    if (opt) p += opt.delta;
  }
  if (pack === "box") p += BOX_PRICE;
  return p;
}

// ---------- Asia/Tokyo の日時ユーティリティ ----------
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

// 現在のJST日時要素を返す {y, mo, d, hh, mm, ss, wd} wd: 0=日..6=土
export function jstNowParts() {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo", year: "numeric", month: "numeric", day: "numeric",
    hour: "numeric", minute: "numeric", second: "numeric", hour12: false, weekday: "short",
  });
  const parts = {};
  for (const p of fmt.formatToParts(new Date())) parts[p.type] = p.value;
  const wdMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    y: +parts.year, mo: +parts.month, d: +parts.day,
    hh: +parts.hour % 24, mm: +parts.minute, ss: +parts.second,
    wd: wdMap[parts.weekday],
  };
}

export function dateKey(y, mo, d) {
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function todayKey() { const n = jstNowParts(); return dateKey(n.y, n.mo, n.d); }

// dateKey に n 日足した dateKey とその要素を返す
export function addDays(key, n) {
  const [y, mo, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d + n));
  return { key: dateKey(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate()),
           y: dt.getUTCFullYear(), mo: dt.getUTCMonth() + 1, d: dt.getUTCDate(), wd: dt.getUTCDay() };
}

// "2026年11月25日（水）" 形式
export function formatDateJP(key) {
  const [y, mo, d] = key.split("-").map(Number);
  const wd = new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
  return `${y}年${mo}月${d}日（${WEEKDAYS[wd]}）`;
}

export function weekdayOf(key) {
  const [y, mo, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
}

export function isThursday(key) { return weekdayOf(key) === 4; }

// その日の最終枠 "HH:MM"（日曜17:30 / それ以外19:30）
export function lastSlot(key) { return weekdayOf(key) === 0 ? "17:30" : "19:30"; }

export function toMin(hhmm) { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; }
export function toHHMM(min) { return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`; }

// 合計個数 → 最短リードタイム（分）
export function leadMinutes(totalQty) {
  if (totalQty >= 10) return 60;
  if (totalQty >= 5) return 40;
  return 30;
}

// 受け取り時刻の候補（10分刻み）を返す。定休日（木）は空配列。
export function timeSlots(key, totalQty) {
  if (isThursday(key)) return [];
  const last = toMin(lastSlot(key));
  let start;
  if (key === todayKey()) {
    const n = jstNowParts();
    const nowMin = n.hh * 60 + n.mm;
    start = Math.ceil((nowMin + leadMinutes(totalQty)) / 10) * 10;
    if (start < 11 * 60) start = 11 * 60;
  } else {
    start = 11 * 60;
  }
  const slots = [];
  for (let t = start; t <= last; t += 10) slots.push(toHHMM(t));
  return slots;
}

// 注文が受け取り枠を占有する時刻（確定済みは確定時刻、それ以外は希望時刻）
export function occupiedTime(o) {
  return o.status === "confirmed" && o.confirmedPickup ? o.confirmedPickup : o.requestedPickup;
}

// 指定日に既に注文が入っている受け取り時刻の集合（重複防止用）。
// 有効なのは「確認待ち（pending）」と「確定（confirmed）」のみ。
// お渡し済み（done）・来店なし（noshow）は枠を占有しない。
export function occupiedSlots(list, key) {
  return new Set(list
    .filter(o => o.pickupDate === key && (o.status === "pending" || o.status === "confirmed"))
    .map(occupiedTime));
}

// 電話番号の正規化（数字のみ）
export function normalizePhone(s) { return (s || "").replace(/[^0-9]/g, ""); }

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export function yen(n) { return "¥" + Number(n).toLocaleString("ja-JP"); }

// ---------- 店内オーダーの席 ----------
export const SEATS = [
  { id: "counter1", label: "カウンター1" },
  { id: "counter2", label: "カウンター2" },
  { id: "counter3", label: "カウンター3" },
  { id: "counter4", label: "カウンター4" },
  { id: "table", label: "テーブル席" },
  { id: "terrace1", label: "テラス1" },
  { id: "terrace2", label: "テラス2" },
];
export function seatLabel(id) {
  const s = SEATS.find(s => s.id === id);
  return s ? s.label : id;
}
