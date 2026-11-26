// るべりえ 注文サイト（テイクアウト／店内）- メニューデータと共通ユーティリティ
// メニューは Airレジモバイルオーダー掲載メニューと同等（全86品・10カテゴリ）。
// ※「るべりえミルクアイストッピング」は独立商品にせず、るべりえミルク／るべりえソーダの
//   バニラアイストッピング（+100円）として選ぶ仕様（本人指示 2026-11-25）。
// 品名・価格・トッピング・カテゴリ振り分けは menu-airregi-mapping-2026-11-25.md が正。
// 説明文は Airレジお客様向けページの全文（airregi-descriptions-2026-11-25.md）に差し替え済み。
// 写真は店内版診断マスターから、品名が一致する品のみ流用。

export const CATEGORIES = [
  { id: "seasonal", name: "季節メニュー" },
  { id: "hall", name: "ホールピザ" },
  { id: "age", name: "揚げピザ" },
  { id: "sweetpizza", name: "スイーツピザ" },
  { id: "kids", name: "キッズメニュー" },
  { id: "side", name: "サイドメニュー" },
  { id: "drink", name: "ソフトドリンク", noPhotoDineIn: true }, // 店内では写真なし（プラカップ写真が店内のグラス提供と違う／ドリンク同士の見分けにも写真が効かないため。本人指示 2026-11-25）
  { id: "alcohol", name: "アルコール" },
  { id: "sweets", name: "スイーツ", dineInOnly: true }, // 定番スイーツはイートイン限定のため店内でのみタブ表示（本人指示 2026-11-25）
  { id: "sweetage", name: "スイーツ揚げピザ" },
];

// cut: カット/包装の選択があるカテゴリ（ホール・スイーツピザのみ）
// noBox: 箱を選べない商品（レモンバターシュガー）
// seasonal: 季節メニュー（仮想カテゴリ）にも表示する商品
// toppings: [{label, delta}] チェックボックス式。delta は1個あたりの加算額（円）。
//   dineInOnly: true のトッピングは店内（イートイン）でのみ表示する（テイクアウトでは出さない）。
//   スイーツピザ6品の「バニラアイス +150円」が該当（本人指示 2026-11-25）。
//   商品自体の dineInOnly: true も同じ扱い（店内メニューにだけ出す商品。角ハイボールが該当、本人指示 2026-11-25）。
// choice: {label, options:[{label, delta}]} 単一選択（必須・未選択スタート）。
//   詳細画面で選ぶまで「カートに入れる」は押せない。
//   選択した choice のラベルは注文データに保存され、厨房・お客側の両方に表示される。
export const MENU = [
  // ---- ホールピザ ----
  { id: "bolognese", cat: "hall", name: "るべりえボロネーゼ", img: "images/bolognese.jpg", price: 850, desc: "自家製ミートソースとマスカルポーネのピザ。ペコリーノチーズ・ドライバジル・魚醤がアクセントになっています。寒い時期限定なのでお試しください。・特定原材料 (一部に小麦・乳成分・牛肉・豚肉・大豆・鶏肉を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", seasonal: true, toppings: [{ label: "ハラペーニョ", delta: 80 }] },
  { id: "spicy-meat", cat: "hall", name: "ピリ辛ミートるべりーえ", img: "images/spicy-meat.jpg", price: 850, desc: "自家製ミートソースの上にイタリアのピリ辛サラミペーストのンドゥイヤ・モッツァレラチーズが乗ってます。オレガノと魚醤がアクセントな旨辛ピザです。寒い時期限定なのでお試しください。・特定原材料 (一部に小麦・乳成分・牛肉・豚肉・大豆・鶏肉を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", seasonal: true, toppings: [{ label: "チーズ2倍に変更", delta: 200 }, { label: "ハラペーニョ", delta: 80 }] },
  { id: "hakusai-ortolana", cat: "hall", name: "邑楽白菜のオルトラーナ", img: "images/hakusai-ortolana.jpg", price: 650, desc: "邑楽町産松島兄弟のブランド白菜「黄芯白菜極」とアンチョビの塩味が相性抜群なチーズベースのピザです。季節の味わいを是非お試しください。チーズ量はバリエーションから変更出来ます。・特定原材料 (一部に小麦・乳成分を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", seasonal: true, toppings: [{ label: "チーズ2倍に変更", delta: 200 }, { label: "ハラペーニョ", delta: 80 }] },
  { id: "spicy-hakusai-ortolana", cat: "hall", name: "ピリ辛白菜のオルトラーナ", img: "images/spicy-hakusai-ortolana.jpg", price: 680, desc: "邑楽町産松島兄弟のブランド白菜「黄芯白菜極」とピリ辛サラミペーストンドゥイヤの旨辛なチーズベースのピザです。季節の味わいを是非お試しください。チーズ量はバリエーションから変更出来ます。・特定原材料 (一部に小麦・豚肉・乳成分を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", seasonal: true, toppings: [{ label: "チーズ2倍に変更", delta: 200 }, { label: "ハラペーニョ", delta: 80 }] },
  { id: "gyosho-liana", cat: "hall", name: "イタリアン魚醤リアーナ", img: "images/gyosho-liana.jpg", price: 680, desc: "邑楽町産松島兄弟の白菜「黄芯白菜極」と魚醤が相性抜群なトマトベースのピザです。季節の味わいを是非お試しください。・特定原材料 (一部に小麦・乳成分を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", seasonal: true, toppings: [{ label: "ハラペーニョ", delta: 80 }] },
  { id: "margherita", cat: "hall", name: "マルゲリータ", price: 650, desc: "るべりえの一番人気メニュー。群馬県産小麦100%のピザ生地とイタリア産トマト・モッツァレラチーズ・バジルのハーモニーが味わえる一枚です。最初の一枚に是非お試し下さい。チーズ量はバリエーションから選択できます。※トマトソースはケチャップのような感じではなくてさっぱりした果肉感のあるソースなので、濃いめのお味が好みの方はるべりえミックスがオススメです。・特定原材料 (一部に小麦・乳成分を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", img: "images/margherita.jpg", toppings: [{ label: "チーズ2倍に変更", delta: 200 }, { label: "ハラペーニョ", delta: 80 }] },
  { id: "ruberie-mix", cat: "hall", name: "るべりえミックス", price: 700, desc: "お客様との会話の中から、石窯で焼いたピザトーストをイメージして作りました。濃厚な味のチェダーチーズとサラミ・ピーマン・トマトの味わいが何だか昭和時代を思い出す味わい。少し濃いめの味わいが好きな方の最初の一枚にオススメです。※サラミやチェダーチーズの塩味や塩分が気になる方はさっぱり味で定番のマルゲリータをお試しください。特定原材料 (一部に小麦・乳成分・大豆・鶏肉・豚肉を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", img: "images/ruberie-mix.jpg", toppings: [{ label: "ハラペーニョ", delta: 80 }] },
  { id: "quattro", cat: "hall", name: "クアトロフロマッジ", price: 700, desc: "チーズ好きな方にオススメのピザ。チェダーチーズ、モッツァレラチーズ、ゴルゴンゾーラチーズ、ペコリーノ(羊チーズ)が乗っています。ハチミツトッピングおすすめです。数に限りがある商品ですが、無花果アトロフロマッジがチーズといちじくの相性が抜群なのでそちらもお試しください。・特定原材料 (一部に小麦・乳成分を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", img: "images/quattro.jpg", toppings: [{ label: "ハラペーニョ", delta: 80 }, { label: "邑楽町産ハチミツ", delta: 100 }] },
  { id: "marinara", cat: "hall", name: "マリナーラ", price: 500, desc: "トマト・オレガノ・ガーリックオイルの食欲を刺激する香りと味わいのピザです。チーズは使用していません。マリナーラというと海鮮が入っているイメージがありますが使用していません。諸説ありますが、船乗りの弁当や船乗りが好んで食べたことからついた名前だそうです。通常はにんにくのスライス等を使用するのですが、るべりえではガーリックオイルを使用して優しい仕上がりにしているので、物足りない方はにんにくを各ご家庭で足してみてください。・特定原材料 (一部に小麦を含む) ※厨房では乳成分・卵・えび・かにを含む製品を製造しています。", img: "images/marinara.jpg", toppings: [{ label: "ハラペーニョ", delta: 80 }] },
  { id: "genovese", cat: "hall", name: "ジェノヴェーゼ", price: 680, desc: "にんにく・パルメザンチーズ入りのバジルペーストとモッツァレラチーズのピザです。少し濃いめな味わいなのでお酒のお供にぴったりです。チーズ好きな方はバリエーションから選択出来ますのでご検討ください。・特定原材料 (一部に小麦・乳成分を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", img: "images/genovese.jpg", toppings: [{ label: "チーズ2倍に変更", delta: 200 }, { label: "ハラペーニョ", delta: 80 }] },
  { id: "siciliana", cat: "hall", name: "シシリアーナ", price: 680, desc: "トマト・オレガノ・ガーリックオイルのマリナーラピザにアンチョビ・ブラックオリーブ・ペコリーノ(羊のチーズ)が乗ったビールやワインのお供にぴったりなピザです。・特定原材料 (一部に小麦・乳成分を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", img: "images/siciliana.jpg", toppings: [{ label: "ハラペーニョ", delta: 80 }] },
  { id: "basil-chicken", cat: "hall", name: "バジルチキン", price: 750, desc: "にんにく・パルメザンチーズ入りのバジルペーストとモッツァレラチーズのジェノヴェーゼにスモークチキンとペコリーノ(羊のチーズ)が乗ったピザです。少し濃いめな味わいなのでお酒のお供にぴったりです。チーズ好きな方はバリエーションから選択出来ますのでご検討ください。特定原材料 (一部に小麦・乳成分・鶏肉・大豆を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", img: "images/basil-chicken.jpg", toppings: [{ label: "チーズ2倍に変更", delta: 200 }, { label: "ハラペーニョ", delta: 80 }] },
  { id: "teriyaki-chicken", cat: "hall", name: "テリヤキチキン", price: 750, desc: "モッツァレラチーズベースにスモークチキンとテリヤキのタレをかけて焼き上げました。葉物野菜とマヨネーズ等を仕上げに使用しています。チーズの量がバリエーションで変更できます。・特定原材料 (一部に小麦・乳成分・卵・大豆・鶏肉・豚肉・りんごを含む) ※厨房ではえび・かにを含む製品を製造しています。", img: "images/teriyaki-chicken.jpg", toppings: [{ label: "チーズ2倍に変更", delta: 200 }, { label: "ハラペーニョ", delta: 80 }] },
  { id: "kinoko-bianca", cat: "hall", name: "キノコのビアンカ", price: 750, desc: "キノコのオイル漬け(しめじ、まいたけ、エリンギ、えのきを炒めたもの)とモッツァレラチーズ・ペコリーノ(羊のチーズ)のピザです。ガーリックオイルも優しく香ります。キノコ好きな方にオススメです。チーズ量はバリエーションがありますのでそちらから選択できます。・特定原材料 (一部に小麦・乳成分を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", img: "images/kinoko-bianca.jpg", toppings: [{ label: "チーズ2倍に変更", delta: 200 }, { label: "ハラペーニョ", delta: 80 }] },
  { id: "kinoko-marinara", cat: "hall", name: "キノコのマリナーラ", price: 750, desc: "キノコのオイル漬け(しめじ、まいたけ、エリンギ、えのきを炒めたもの)とトマト・ペコリーノ(羊のチーズ)、オレガノのピザです。ガーリックオイルも優しく香ります。キノコ好きな方にオススメです。・特定原材料 (一部に小麦・乳成分を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", img: "images/kinoko-marinara.jpg", toppings: [{ label: "ハラペーニョ", delta: 80 }] },
  { id: "bacon-corn", cat: "hall", name: "カリカリベーコーン", price: 750, desc: "マスカルポーネチーズベースにスイートコーン、カリカリに焼いたベーコン、ドライバジル、ペコリーノ(羊のチーズ)が乗っています。コーン好きな方やお子様にもオススメです。・特定原材料 (一部に小麦・乳成分・豚肉を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", img: "images/bacon-corn.jpg", toppings: [{ label: "ハラペーニョ", delta: 80 }] },
  { id: "anchovy-corn", cat: "hall", name: "アンチョビコーン", price: 750, desc: "マスカルポーネベースにコーンとアンチョビ。オレガノと魚醤の香りがクセになるピザです。お酒のお供にオススメです。・特定原材料 (一部に小麦・乳成分を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", img: "images/anchovy-corn.jpg", toppings: [{ label: "ハラペーニョ", delta: 80 }] },
  { id: "smoked-margherita", cat: "hall", name: "燻製チーズのマルゲリータ", price: 850, desc: "マルゲリータのチーズをイタリア直送の燻製した水牛のモッツァレラチーズに変更したものです。通常のマルゲリータでは物足りない方へオススメです。チーズの量がバリエーション選択で変更出来ます。・特定原材料 (一部に小麦・乳成分を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", img: "images/smoked-margherita.jpg", toppings: [{ label: "チーズ2倍に変更", delta: 400 }, { label: "ハラペーニョ", delta: 80 }] },
  { id: "thank-you-margherita", cat: "hall", name: "サンキューマルゲリータ", price: 700, desc: "マルゲリータをハート型に焼きました。感謝の気持ちを伝える時にオススメです。チーズ量はバリエーションから選択できます。・特定原材料 (一部に小麦・乳成分を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", img: "images/thank-you-margherita.jpg", toppings: [{ label: "チーズ2倍に変更", delta: 200 }, { label: "ハラペーニョ", delta: 80 }] },
  { id: "fig-quattro", cat: "hall", name: "無花果アトロフロマッジ", price: 850, desc: "邑楽町産無花果のセミドライをクアトロフロマッジに乗せました。マツコ&有吉　かりそめ天国でも紹介されました。・特定原材料 (一部に小麦・乳成分を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", img: "images/fig-quattro.jpg", toppings: [{ label: "邑楽町産ハチミツ", delta: 100 }, { label: "ハラペーニョ", delta: 80 }] },
  { id: "shichifuku-quattro", cat: "hall", name: "七福アトロフロマッジ", price: 850, desc: "るべりえの三ヶ日営業で人気の７種のチーズを使用した運気右肩上がりの縁起の良いピザです。三ヶ日営業だけだと中々召し上がる機会がないとのご意見を頂き、再登場しました。たっぷりチーズ感を是非お試しください。チェダーチーズ、モッツァレラチーズ、ゴルゴンゾーラチーズ、ペコリーノ(羊チーズ)、燻製モッツァレラ、ゴーダチーズ、マスカルポーネが乗っています。ハチミツトッピングやセミドライ無花果トッピングおすすめです。・特定原材料 (一部に小麦・乳成分を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", img: "images/shichifuku-quattro.jpg", toppings: [{ label: "邑楽町産ハチミツ", delta: 100 }, { label: "ハラペーニョ", delta: 80 }, { label: "セミドライ無花果", delta: 150 }] },
  // ---- 揚げピザ ----
  { id: "hakusai-chicken-gyoza", cat: "age", name: "ピリ辛チキンと白菜の揚げ餃子風", img: "images/hakusai-chicken-gyoza.jpg", price: 480, desc: "邑楽町産松島兄弟のブランド白菜「黄芯白菜極」とスモークチキン・食べるラー油をピザ生地で包んで揚げました。キャノーラ油でカラッと揚げているので、そこまで油感なく召し上がれます。※油物が苦手、受け付けない方は御遠慮ください。・特定原材料 (一部に小麦・乳成分・大豆・鶏肉を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", seasonal: true, toppings: [] },
  { id: "hakusai-hotate-stew", cat: "age", name: "邑楽白菜と帆立のシチュー", img: "images/hakusai-hotate-stew.jpg", price: 500, desc: "邑楽町産松島兄弟のブランド白菜「黄芯白菜極」と帆立・マスカルポーネをシチュー仕立てにして、ピザ生地で包んで揚げました。キャノーラ油でカラッと揚げているので、そこまで油感なく召し上がれます。※油物が苦手、受け付けない方は御遠慮ください。・特定原材料 (一部に小麦・乳成分を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", seasonal: true, toppings: [] },
  { id: "hakusai-hotate-gyoza", cat: "age", name: "ピリ辛帆立と白菜の揚げ餃子風", img: "images/hakusai-hotate-gyoza.jpg", price: 500, desc: "邑楽町産松島兄弟のブランド白菜「黄芯白菜極」とベビー帆立・食べるラー油をピザ生地で包んで揚げました。キャノーラ油でカラッと揚げているので、そこまで油感なく召し上がれます。※油物が苦手、受け付けない方は御遠慮ください。・特定原材料 (一部に小麦を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", seasonal: true, toppings: [] },
  { id: "hakusai-chicken-stew", cat: "age", name: "邑楽白菜とチキンのシチュー", img: "images/hakusai-chicken-stew.jpg", price: 480, desc: "邑楽町産松島兄弟のブランド白菜「黄芯白菜極」とスモークチキン・マスカルポーネをクリームシチュー仕立てにしてピザ生地で包んで揚げました。キャノーラ油でカラッと揚げているので、そこまで油感なく召し上がれます。※油物が苦手、受け付けない方は御遠慮ください。・特定原材料 (一部に小麦・乳成分・大豆・鶏肉を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", seasonal: true, toppings: [] },
  { id: "winter-meat-fantasy", cat: "age", name: "冬のミートファンタジー", img: "images/winter-meat-fantasy.jpg", price: 500, desc: "自家製ミートソースとマスカルポーネチーズ・ペコリーノチーズ(羊乳)・じゃがいもをピザ生地で包んで揚げました。ドライバジルと魚醤がアクセントになっています。キャノーラ油でカラッと揚げているので、そこまで油感なく召し上がれます。※油物が苦手、受け付けない方は御遠慮ください。・特定原材料 (一部に小麦・乳成分・牛肉・豚肉・大豆・鶏肉を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", seasonal: true, toppings: [] },
  { id: "pork-redwine", cat: "age", name: "るべりえ特製 豚肉の赤ワイン煮", img: "images/pork-redwine.jpg", price: 600, desc: "", seasonal: true, toppings: [] },
  { id: "croquette", cat: "age", name: "るべりえ特製 洋風コロッケ仕立て", img: "images/croquette.jpg", price: 480, desc: "", seasonal: true, toppings: [] },
  { id: "gunma-rugerita", cat: "age", name: "群馬ルゲリータ", price: 450, desc: "群馬県産小麦100%使用したマルゲリータの揚げピザです。キャノーラ油でカラッと揚げているので、そこまで油感なく召し上がれます。※油物が苦手、受け付けない方はホールピザのマルゲリータをお選びください。チーズの量もバリエーションから選択出来ます。・特定原材料 (一部に小麦・乳成分を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", img: "images/gunma-rugerita.jpg", toppings: [{ label: "チーズ2倍に変更", delta: 150 }] },
  { id: "gunma-jiru-chicken", cat: "age", name: "群馬ジルチキン", price: 450, desc: "群馬県産小麦100%使用したバジルチキンの揚げピザです。キャノーラ油でカラッと揚げているので、そこまで油感なく召し上がれます。※油物が苦手、受け付けない方はホールピザのバジルチキンをお選びください。特定原材料 (一部に小麦・乳成分・鶏肉・大豆を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", img: "images/gunma-jiru-chicken.jpg", toppings: [] },
  { id: "gunma-toro-fromaggi", cat: "age", name: "群馬トロフロマッジ", price: 450, desc: "群馬県産小麦100%使用したクアトロフロマッジの揚げピザです。キャノーラ油でカラッと揚げているので、そこまで油感なく召し上がれます。※油物が苦手、受け付けない方はホールピザのクアトロフロマッジをお選びください。・特定原材料 (一部に小麦・乳成分を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", img: "images/gunma-toro-fromaggi.jpg", toppings: [] },
  { id: "taiyo-tomato-curry", cat: "age", name: "太陽のトマトカレー", price: 480, desc: "トマトたっぷりで作ったカレーとじゃがいも・チェダーチーズを群馬県産小麦100%のピザ生地で包んで揚げました。キャノーラ油でカラッと揚げているので、そこまで油感なく召し上がれます。※油物が苦手、受け付けない方は御遠慮ください。・特定原材料 (一部に小麦・乳成分・牛・豚を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", img: "images/taiyo-tomato-curry.jpg", toppings: [] },
  { id: "tomato-corn-curry", cat: "age", name: "トマトコーンカレー", price: 500, desc: "トマトたっぷりで作ったカレーとコーン・じゃがいも・チェダーチーズと一緒にピザ生地で包んで揚げました。キャノーラ油でカラッと揚げているので、そこまで油感なく召し上がれます。※油物が苦手、受け付けない方は御遠慮ください。・特定原材料 (一部に小麦・乳成分・牛・豚を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", img: "images/tomato-corn-curry.jpg", toppings: [] },
  { id: "abarenbo-hotate-curry", cat: "age", name: "暴れん坊帆立カレー", price: 500, desc: "トマトたっぷりで作ったカレーと帆立・チェダーチーズ・魚醤・ハバネロパウダーをピザ生地で包んで揚げました。キャノーラ油でカラッと揚げているので、そこまで油感なく召し上がれます。※油物・辛味が苦手、受け付けない方は御遠慮ください。ハバネロパウダー抜きも出来ます。・特定原材料 (一部に小麦・乳成分・牛・豚を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", img: "images/abarenbo-hotate-curry.jpg", toppings: [{ label: "ハバネロ抜き", delta: 0 }] },
  { id: "shukumeruri", cat: "age", name: "るべりえシュクメルリ", price: 500, desc: "マスカルポーネとじゃがいも・スモークチキン・キノコ・にんにくをピザ生地で包んで揚げました。キャノーラ油でカラッと揚げているので、そこまで油感なく召し上がれます。※油物が苦手、受け付けない方は御遠慮ください。・特定原材料 (一部に小麦・乳成分・大豆・鶏肉を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", img: "images/shukumeruri.jpg", toppings: [] },
  { id: "kinoko-cream-stew", cat: "age", name: "いろいろキノコのクリームシチュー", price: 480, desc: "マスカルポーネとキノコ(しめじ・まいたけ・エリンギ・えのき)とじゃがいもをクリームシチュー仕立てにしてピザ生地で包んで揚げました。キャノーラ油でカラッと揚げているので、そこまで油感なく召し上がれます。※油物が苦手、受け付けない方は御遠慮ください。・特定原材料 (一部に小麦・乳成分を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", img: "images/kinoko-cream-stew.jpg", toppings: [] },
  { id: "premium-basil-chicken", cat: "age", name: "プレミアムバジルチキン", price: 500, desc: "バジルチキンとモッツァレラチーズ・じゃがいも・マスタードをピザ生地で包んで揚げました。キャノーラ油でカラッと揚げているので、そこまで油感なく召し上がれます。※油物が苦手、受け付けない方は御遠慮ください。特定原材料 (一部に小麦・乳成分・鶏肉・大豆を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", img: "images/premium-basil-chicken.jpg", toppings: [] },
  { id: "premium-jaga-cheese", cat: "age", name: "プレミアムじゃがチーズ", price: 500, desc: "５種のチーズ(チェダーチーズ・マスカルポーネチーズ・モッツァレラチーズ・ゴルゴンゾーラチーズ・ペコリーノチーズ(羊乳))とじゃがいもをピザ生地で包んで揚げました。キャノーラ油でカラッと揚げているので、そこまで油感なく召し上がれます。※油物が苦手、受け付けない方は御遠慮ください。・特定原材料 (一部に小麦・乳成分を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", img: "images/premium-jaga-cheese.jpg", toppings: [] },
  // ---- スイーツピザ ----
  { id: "lemon-butter-sugar", cat: "sweetpizza", name: "レモンバターシュガー", price: 550, desc: "無塩バター・グラニュー糖・レモン果汁を乗せて焼き上げたスイーツピザです。ご自宅でバニラアイスを乗せると更に美味しく召し上がれますのでお試しください。・特定原材料 (一部に小麦・乳成分を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", descDineIn: "無塩バター・グラニュー糖・レモン果汁を乗せて焼き上げたスイーツピザです。お好みでバニラアイスを乗せても美味しく召し上がれますのでお試しください。・特定原材料 (一部に小麦・乳成分を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", noBox: true, img: "images/lemon-butter-sugar.jpg", toppings: [{ label: "邑楽町産ハチミツ", delta: 100 }, { label: "バニラアイス", delta: 150, dineInOnly: true }] },
  { id: "mascarpone-berry", cat: "sweetpizza", name: "マスカルポーネとミックスベリー", price: 680, desc: "マスカルポーネチーズベースにミックスベリー(いちご・ブルーベリー・木苺・クランベリー)とベリーソース・グラニュー糖を振りかけて焼き上げたスイーツピザです。※写真のミントは乗っていません！！お好みでバニラアイスを乗せても美味しく召し上がれますのでお試しください。・特定原材料 (一部に小麦・乳成分を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", descDineIn: "マスカルポーネチーズベースにミックスベリー(いちご・ブルーベリー・木苺・クランベリー)とベリーソース・グラニュー糖を振りかけて焼き上げたスイーツピザです。お好みでバニラアイスを乗せても美味しく召し上がれますのでお試しください。・特定原材料 (一部に小麦・乳成分を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", img: "images/mascarpone-berry.jpg", toppings: [{ label: "邑楽町産ハチミツ", delta: 100 }, { label: "バニラアイス", delta: 150, dineInOnly: true }] },
  { id: "banana-caramel", cat: "sweetpizza", name: "バナナキャラメル", price: 680, desc: "マスカルポーネベースにバナナ・自家製キャラメルソースとココアパウダー。※写真のミントは乗っていません！！お好みでバニラアイスを乗せても美味しく召し上がれますのでお試しください。・特定原材料 (一部に小麦・乳成分・バナナ・大豆を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", descDineIn: "マスカルポーネベースにバナナ・自家製キャラメルソースとココアパウダー。お好みでバニラアイスを乗せても美味しく召し上がれますのでお試しください。・特定原材料 (一部に小麦・乳成分・バナナ・大豆を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", img: "images/banana-caramel.jpg", toppings: [{ label: "邑楽町産ハチミツ", delta: 100 }, { label: "バニラアイス", delta: 150, dineInOnly: true }] },
  { id: "tiramisu", cat: "sweetpizza", name: "るべりえティラミス", price: 680, desc: "マスカルポーネベースにコーヒーソース。マルサラ酒とココアパウダー。※写真のミントは乗っていません！！お好みでバニラアイスを乗せても美味しく召し上がれますのでお試しください。・特定原材料 (一部に小麦・乳成分・大豆を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", descDineIn: "マスカルポーネベースにコーヒーソース。マルサラ酒とココアパウダー。お好みでバニラアイスを乗せても美味しく召し上がれますのでお試しください。・特定原材料 (一部に小麦・乳成分・大豆を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", img: "images/tiramisu.jpg", toppings: [{ label: "邑楽町産ハチミツ", delta: 100 }, { label: "バニラアイス", delta: 150, dineInOnly: true }] },
  { id: "melty-bitter", cat: "sweetpizza", name: "メルティービター", price: 750, desc: "ミックスベリー(苺・ブルーベリー・木苺・クランベリー)とビターチョコソースのほろ苦い味わい。※写真のミントは乗っていません！！お好みでバニラアイスを乗せても美味しく召し上がれますのでお試しください。・特定原材料 (一部に小麦・乳成分を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", descDineIn: "ミックスベリー(苺・ブルーベリー・木苺・クランベリー)とビターチョコソースのほろ苦い味わい。お好みでバニラアイスを乗せても美味しく召し上がれますのでお試しください。・特定原材料 (一部に小麦・乳成分を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", img: "images/melty-bitter.jpg", toppings: [{ label: "邑楽町産ハチミツ", delta: 100 }, { label: "バニラアイス", delta: 150, dineInOnly: true }] },
  { id: "white-berry", cat: "sweetpizza", name: "ホワイトベリー", price: 750, desc: "ホワイトチョコとミックスベリー(苺・ブルーベリー・木苺・クランベリー)マスカルポーネベースのスイーツピザです。※写真のミントは乗っていません！！お好みでバニラアイスを乗せても美味しく召し上がれますのでお試しください。・特定原材料 (一部に小麦・乳成分・大豆を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", descDineIn: "ホワイトチョコとミックスベリー(苺・ブルーベリー・木苺・クランベリー)マスカルポーネベースのスイーツピザです。お好みでバニラアイスを乗せても美味しく召し上がれますのでお試しください。・特定原材料 (一部に小麦・乳成分・大豆を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", img: "images/white-berry.jpg", toppings: [{ label: "邑楽町産ハチミツ", delta: 100 }, { label: "バニラアイス", delta: 150, dineInOnly: true }] },
  { id: "pacp", cat: "sweetpizza", name: "PACP（ピザアップルシナモンパイ風）", img: "images/pacp.jpg", price: 750, desc: "シナモン香るアップルパイをイメージしたマスカルポーネベースのスイーツピザです。※写真のミントは乗っていません！！お好みでバニラアイスを乗せても美味しく召し上がれますのでお試しください。シナモン抜きも出来ます。・特定原材料 (一部に小麦・りんご・乳成分を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", descDineIn: "シナモン香るアップルパイをイメージしたマスカルポーネベースのスイーツピザです。お好みでバニラアイスを乗せても美味しく召し上がれますのでお試しください。シナモン抜きも出来ます。・特定原材料 (一部に小麦・りんご・乳成分を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", seasonal: true, toppings: [{ label: "シナモン抜き", delta: 0 }, { label: "邑楽町産ハチミツ", delta: 100 }] },
  // ---- キッズメニュー ----
  { id: "zeppole-kids", cat: "kids", name: "ゼッポレ塩無し", img: "images/zeppole-kids.jpg", price: 330, desc: "ピザ生地に生のりを練り込んでキャノーラ油で揚げました。通常は塩をふりかけますが塩無しです。スナック感覚でお子様のおやつやビールのおつまみにおすすめです。生地自体には塩味があります。・特定原材料 (一部に小麦を含む) ※厨房では乳・卵・えび・かにを含む製品を製造しています。", toppings: [] },
  { id: "jaga-kids", cat: "kids", name: "じゃがいも素揚げ塩無し", img: "images/jaga-kids.jpg", price: 400, desc: "じゃがいもの素揚げ塩無しです。", toppings: [] },
  { id: "rubepan", cat: "kids", name: "るべぱん", img: "images/rubepan.jpg", price: 280, desc: "ピザ生地で作ったパンです。中身は空洞です。小は生地厚め。大は生地薄めです。大人の方でも具材を挟んでサンドイッチにおすすめです。・特定原材料 (一部に小麦を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", choice: { label: "サイズをお選びください", options: [{ label: "小", delta: 0 }, { label: "大", delta: 50 }] }, toppings: [] },
  // ---- サイドメニュー ----
  { id: "zeppole", cat: "side", name: "ゼッポレ", price: 330, desc: "ピザ生地に生のりを練り込んでキャノーラ油で揚げました。スナック感覚でお子様のおやつやビールのおつまみにおすすめです。・特定原材料 (一部に小麦を含む) ※厨房では乳・卵・えび・かにを含む製品を製造しています。", img: "images/zeppole.jpg", toppings: [] },
  { id: "crispy-chicken", cat: "side", name: "るべりえクリスピーチキン", price: 480, desc: "国産鶏胸肉を使用した自家製クリスピーチキンです。サクサク食感がたまらないビールのお供にもオススメです。お好みでシーズニングスパイスやレモン汁をふりかけてお召し上がりください。・特定原材料 (一部に豚肉・小麦・乳成分・卵・牛肉・大豆・鶏肉を含む) ※厨房ではえび・かにを含む製品を製造しています。", img: "images/crispy-chicken.jpg", choice: { label: "サイズと味付けをお選びください", options: [{ label: "通常サイズ（5〜6個）", delta: 0 }, { label: "通常サイズ＋ピリ辛パウダー", delta: 30 }, { label: "パーティーサイズ（10〜12個）", delta: 420 }, { label: "パーティーサイズ＋ピリ辛パウダー", delta: 470 }] }, toppings: [] },
  { id: "age-moriawase", cat: "side", name: "揚げ物盛り合わせ", img: "images/age-moriawase.jpg", price: 700, desc: "ゼッポレ9粒・皮付きじゃがいもの素揚げ６本クリスピーチキン3個入ってます。・特定原材料 (一部に豚肉・小麦・乳成分・卵・牛肉・大豆・鶏肉を含む) ※厨房ではえび・かにを含む製品を製造しています。", toppings: [] },
  { id: "ham-moriawase", cat: "side", name: "ハム盛り合わせ", img: "images/ham-moriawase.jpg", price: 1600, desc: "プロシュート・コッパ・スペック・ミラノサラミ・スモークチキンの盛り合わせです。・特定原材料 (一部に豚肉・鶏肉を含む) ※厨房ではえび・かにを含む製品を製造しています。", toppings: [] },
  { id: "party-set", cat: "side", name: "パーティーセット", img: "images/party-set.jpg", price: 2900, desc: "ハム盛り合わせ・パーティーるべりえチキン・ゼッポレ・じゃがいもの素揚げ粉チーズのセットです。・特定原材料 (一部に豚肉・小麦・乳成分・卵・豚肉・牛肉・大豆・鶏肉を含む) ※厨房ではえび・かにを含む製品を製造しています。", toppings: [] },
  { id: "takunomi-set", cat: "side", name: "宅飲み！！るべりえセット", img: "images/takunomi-set.jpg", price: 1300, desc: "ハートランド生ビール・ゼッポレ・もつトマト煮込みのセットです。※生ビールは御来店頂いてからご用意はじめます。もつトマト煮込みはテイクアウトはコーヒーカップに入れて提供致します。・特定原材料 (一部に豚肉・小麦・乳成分・牛肉・大豆・鶏肉を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", descDineIn: "ハートランド生ビール・ゼッポレ・もつトマト煮込みのセットです。※生ビールは御来店頂いてからご用意はじめます。・特定原材料 (一部に豚肉・小麦・乳成分・牛肉・大豆・鶏肉を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", toppings: [] },
  { id: "green-olive", cat: "side", name: "グリーンオリーブ種あり", img: "images/green-olive.jpg", price: 330, desc: "グリーンオリーブ種ありです。", toppings: [] },
  { id: "pickles", cat: "side", name: "ピクルス", img: "images/pickles.jpg", price: 330, desc: "群馬県産きゅうりのピクルスです。", toppings: [] },
  { id: "motsu-tomato", cat: "side", name: "もつトマト煮込み", price: 480, desc: "るべりえの人気メニュー自家製もつトマト煮込みです。じゃがいもやブラックオリーブが入っています。国産の豚モツを使用しています。テイクアウトはコーヒーカップに入れて提供致します。・特定原材料 (一部に豚肉・小麦・乳成分・牛肉・大豆・鶏肉を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", descDineIn: "るべりえの人気メニュー自家製もつトマト煮込みです。じゃがいもやブラックオリーブが入っています。国産の豚モツを使用しています。・特定原材料 (一部に豚肉・小麦・乳成分・牛肉・大豆・鶏肉を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", img: "images/motsu-tomato.jpg", toppings: [] },
  { id: "hakusai-motsu", cat: "side", name: "邑楽白菜とピリ辛もつトマト煮込み", img: "images/hakusai-motsu.jpg", price: 500, desc: "邑楽町産白菜と自家製ピリ辛もつトマト煮込みを合わせました。ピリ辛はイタリア生まれのピリ辛サラミペースト。ンドゥイヤを使用しています。(現在イタリアのものが輸入されていない為、北海道産を使用しています。)テイクアウトはコーヒーカップに入れて提供致します。・特定原材料 (一部に豚肉・小麦・乳成分・牛肉・大豆・鶏肉を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", descDineIn: "邑楽町産白菜と自家製ピリ辛もつトマト煮込みを合わせました。ピリ辛はイタリア生まれのピリ辛サラミペースト。ンドゥイヤを使用しています。(現在イタリアのものが輸入されていない為、北海道産を使用しています。)・特定原材料 (一部に豚肉・小麦・乳成分・牛肉・大豆・鶏肉を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", seasonal: true, toppings: [] },
  { id: "jaga-fry", cat: "side", name: "皮付きじゃがいもの素揚げ", img: "images/jaga-fry.jpg", price: 400, desc: "じゃがいもの素揚げです。種類をお選びください。", choice: { label: "味をお選びください", options: [{ label: "塩味", delta: 0 }, { label: "パルメザンチーズ", delta: 0 }, { label: "チェダーチーズ", delta: 0 }, { label: "アンチョビ＋パルメザンチーズ", delta: 0 }, { label: "ンドゥイヤ", delta: 0 }, { label: "バジルソース", delta: 0 }, { label: "魚醤バター", delta: 0 }] }, toppings: [] },
  { id: "angioletti", cat: "side", name: "アンジョレッティ", img: "images/angioletti.jpg", price: 600, desc: "ナポリ発祥。カリッと揚げたピザ生地に濃厚トマトソースと粉チーズを絡めた、天使のスナック。", dineInOnly: true, toppings: [] },
  { id: "zensai-moriawase", cat: "side", name: "前菜盛り合わせ", img: "images/zensai-moriawase.jpg", price: 1300, desc: "いろいろな味を少しずつ。みんなでシェアするのにぴったりの盛り合わせです。※内容は季節によって変更する場合があります。人数によってお作りいたしますのでご相談ください。", dineInOnly: true, toppings: [] },
  { id: "pizza-sandwich", cat: "side", name: "ピッツァサンドイッチ", img: "images/pizza-sandwich.jpg", price: 800, desc: "ピザ生地で作った新感覚サンドイッチ。香味野菜・生ハム・トマト・マスカルポーネ・フランス産マスタード・ペコリーノ。", dineInOnly: true, poster: true, toppings: [] },
  { id: "kunsei-mozzarella", cat: "side", name: "燻製モッツァレラチーズ", img: "images/kunsei-mozzarella.jpg", price: 500, desc: "燻製モッツァレラチーズ。", dineInOnly: true, toppings: [] },
  { id: "caprese", cat: "side", name: "カプレーゼ", img: "images/caprese.jpg", price: 500, desc: "トマトとモッツァレラチーズのカプレーゼ。", dineInOnly: true, toppings: [] },
  { id: "grill-sausage", cat: "side", name: "グリルソーセージ", img: "images/grill-sausage.jpg", price: 400, desc: "グリルソーセージ。4本から、本数をお選びください（1本追加ごとに+100円）。", dineInOnly: true, choice: { label: "本数をお選びください", options: [{ label: "4本", delta: 0 }, { label: "5本", delta: 100 }, { label: "6本", delta: 200 }, { label: "7本", delta: 300 }, { label: "8本", delta: 400 }] }, toppings: [] },
  { id: "milano-salami", cat: "side", name: "ミラノサラミ", img: "images/milano-salami.jpg", price: 550, desc: "ミラノサラミ。", dineInOnly: true, toppings: [] },
  { id: "prosciutto", cat: "side", name: "生ハム プロシュート", img: "images/prosciutto.jpg", price: 680, desc: "生ハム プロシュート。", dineInOnly: true, toppings: [] },
  { id: "coppa", cat: "side", name: "コッパ（豚肩ロースハム）", img: "images/coppa.jpg", price: 580, desc: "コッパ（豚肩ロースハム）。", dineInOnly: true, toppings: [] },
  { id: "speck", cat: "side", name: "スペック（燻製生ハム）", img: "images/speck.jpg", price: 580, desc: "スペック（燻製生ハム）。", dineInOnly: true, toppings: [] },
  { id: "smoked-chicken-slice", cat: "side", name: "スモークチキンスライス", img: "images/smoked-chicken-slice.jpg", price: 500, desc: "スモークチキンのスライス。", dineInOnly: true, toppings: [] },
  // ---- ソフトドリンク ----
  { id: "oolong", cat: "drink", name: "烏龍茶", img: "images/oolong.jpg", imgDineIn: "images/oolong-dinein.jpg", price: 350, desc: "", choice: { label: "ホット／アイスをお選びください", options: [{ label: "ホット", delta: 0 }, { label: "アイス", delta: 0 }] }, toppings: [{ label: "バニラアイストッピング", delta: 100, onlyChoice: "アイス" }] },
  { id: "orange-juice", cat: "drink", name: "オレンジジュース", img: "images/orange-juice.jpg", price: 400, desc: "", toppings: [{ label: "バニラアイストッピング", delta: 100 }] },
  { id: "hot-coffee", cat: "drink", name: "ホットコーヒー", img: "images/hot-coffee.jpg", imgDineIn: "images/hot-coffee-dinein.jpg", price: 400, desc: "イタリアンローストのコーヒーです。テイクアウト用コーヒーカップで提供致します。", descDineIn: "イタリアンローストのコーヒーです。", toppings: [{ label: "バニラアイストッピング", delta: 100 }] },
  { id: "ice-coffee", cat: "drink", name: "アイスコーヒー", img: "images/ice-coffee.jpg", imgDineIn: "images/ice-coffee-dinein.jpg", price: 450, desc: "イタリアンローストのアイスコーヒーです。", toppings: [{ label: "バニラアイストッピング", delta: 100 }] },
  { id: "cafe-latte", cat: "drink", name: "カフェラテ", img: "images/cafe-latte.jpg", imgDineIn: "images/cafe-latte-dinein.jpg", price: 450, desc: "イタリアンローストのカフェラテです。アイス・ホット選べます。", choice: { label: "ホット／アイスをお選びください", options: [{ label: "ホット", delta: 0 }, { label: "アイス", delta: 0 }] }, toppings: [{ label: "バニラアイストッピング", delta: 100, onlyChoice: "アイス" }] },
  { id: "espresso", cat: "drink", name: "エスプレッソ", img: "images/espresso.jpg", imgDineIn: "images/espresso.jpg", price: 350, desc: "エスプレッソ。ダブルもお選びいただけます。", dineInOnly: true, choice: { label: "シングル／ダブルをお選びください", options: [{ label: "シングル", delta: 0 }, { label: "ダブル", delta: 100 }] }, toppings: [] },
  { id: "espresso-soda", cat: "drink", name: "エスプレッソソーダ", img: "images/espresso-soda.jpg", imgDineIn: "images/espresso-soda-dinein.jpg", price: 450, desc: "エスプレッソを炭酸水で割った飲み物です。黒ビールのような味わいです。プラカップで提供致します。", descDineIn: "エスプレッソを炭酸水で割った飲み物です。黒ビールのような味わいです。", toppings: [{ label: "バニラアイストッピング", delta: 100 }] },
  { id: "ruberie-soda", cat: "drink", name: "るべりえソーダ", img: "images/ruberie-soda.jpg", imgDineIn: "images/ruberie-soda-dinein.jpg", price: 400, desc: "シロップを炭酸水で割った飲み物です。ミントは入っていません。", descDineIn: "シロップを炭酸水で割った飲み物です。", choice: { label: "味をお選びください", options: [{ label: "ピーチ", delta: 0 }, { label: "パッション", delta: 0 }, { label: "ライチ", delta: 0 }, { label: "マンゴー", delta: 0 }, { label: "ブラッドオレンジ", delta: 0 }, { label: "ブルーキュラソー", delta: 0 }, { label: "イチゴ", delta: 0 }, { label: "スイカ", delta: 0 }, { label: "邑楽町産ゆず", delta: 0 }, { label: "緑色じゃないメロン", delta: 0 }] }, toppings: [{ label: "バニラアイストッピング", delta: 100 }] },
  { id: "cream-soda", cat: "drink", name: "緑色じゃないクリームソーダ", img: "images/cream-soda.jpg", price: 500, desc: "るべりえソーダにアイストッピングした飲み物です。テイクアウトはプラカップで提供致します。ミントはつきません。", descDineIn: "るべりえソーダにアイストッピングした飲み物です。", choice: { label: "味をお選びください", options: [{ label: "ピーチ", delta: 0 }, { label: "パッション", delta: 0 }, { label: "ライチ", delta: 0 }, { label: "マンゴー", delta: 0 }, { label: "ブラッドオレンジ", delta: 0 }, { label: "ブルーキュラソー", delta: 0 }, { label: "イチゴ", delta: 0 }, { label: "スイカ", delta: 0 }, { label: "邑楽町産ゆず", delta: 0 }, { label: "緑色じゃないメロン", delta: 0 }] }, toppings: [] },
  { id: "ruberie-milk", cat: "drink", name: "るべりえミルク", img: "images/ruberie-milk.jpg", imgDineIn: "images/ruberie-milk-dinein.jpg", price: 450, desc: "シロップを牛乳で割った飲み物です。ミントは入っていません。", descDineIn: "シロップを牛乳で割った飲み物です。", choice: { label: "味をお選びください", options: [{ label: "ピーチ", delta: 0 }, { label: "パッション", delta: 0 }, { label: "ライチ", delta: 0 }, { label: "マンゴー", delta: 0 }, { label: "ブラッドオレンジ", delta: 0 }, { label: "ブルーキュラソー", delta: 0 }, { label: "イチゴ", delta: 0 }, { label: "スイカ", delta: 0 }, { label: "邑楽町産ゆず", delta: 0 }, { label: "緑色じゃないメロン", delta: 0 }] }, toppings: [{ label: "バニラアイストッピング", delta: 100 }] },
  { id: "cocoa", cat: "drink", name: "人生のように甘過ぎないココア", img: "images/cocoa.jpg", imgDineIn: "images/cocoa-dinein.jpg", price: 450, desc: "テイクアウト用コーヒーカップで提供致します。", descDineIn: "", toppings: [] },
  { id: "zero-ichi", cat: "drink", name: "キリンゼロイチ ノンアルコールビール", img: "images/zero-ichi.jpg", price: 400, desc: "", toppings: [] },
  { id: "peche-oolong", cat: "drink", name: "ペシェウーロン（桃味）", img: "images/peche-oolong.jpg", imgDineIn: "images/peche-oolong-dinein.jpg", price: 400, desc: "ピーチシロップを烏龍茶で割った飲み物です。", toppings: [{ label: "バニラアイストッピング", delta: 100 }] },
  { id: "tropical-oolong", cat: "drink", name: "トロピカルウーロン（パッション味）", img: "images/tropical-oolong.jpg", imgDineIn: "images/tropical-oolong-dinein.jpg", price: 400, desc: "パッションシロップを烏龍茶で割った飲み物です。", toppings: [{ label: "バニラアイストッピング", delta: 100 }] },
  // ---- アルコール ----
  { id: "heartland-draft", cat: "alcohol", name: "キリンハートランド生ビール", img: "images/heartland-draft.jpg", price: 600, desc: "プラカップで提供致します。", imgDineIn: "images/heartland-draft-dinein.jpg", descDineIn: "ゴブレットで提供致します。", choice: { label: "サイズをお選びください", dineInOnly: true, options: [{ label: "通常", delta: 0 }, { label: "小（ちビール）", delta: -110 }] }, toppings: [] },
  { id: "house-wine", cat: "alcohol", name: "ハウスワイン", img: "images/house-wine.jpg", price: 500, desc: "プラカップで提供致します。", descDineIn: "", choice: { label: "赤／白をお選びください", options: [{ label: "赤ワイン", delta: 0 }, { label: "白ワイン", delta: 0 }] }, toppings: [] },
  { id: "sangria", cat: "alcohol", name: "なんちゃってサングリア", img: "images/sangria.jpg", price: 500, desc: "ワインを柑橘類で割った、爽やかなサングリア。フルーツの香りとワインの風味を楽しめる、すっきり飲みやすい一杯です。赤・白の2種類からお選びいただけます。プラカップで提供致します。", descDineIn: "ワインを柑橘類で割った、爽やかなサングリア。フルーツの香りとワインの風味を楽しめる、すっきり飲みやすい一杯です。赤・白の2種類からお選びいただけます。", choice: { label: "赤／白をお選びください", options: [{ label: "赤ワインベース", delta: 0 }, { label: "白ワインベース", delta: 0 }] }, toppings: [] },
  { id: "aperol-soda", cat: "alcohol", name: "アペロールソーダ", img: "images/aperol-soda.jpg", price: 500, desc: "柑橘類とハーブを使ったお酒です。爽やかな柑橘の香りと、すっきりとした味わいが楽しめます。最初の一杯にもおすすめです♪ プラカップで提供致します。", descDineIn: "柑橘類とハーブを使ったお酒です。爽やかな柑橘の香りと、すっきりとした味わいが楽しめます。最初の一杯にもおすすめです♪", toppings: [] },
  { id: "oharaki", cat: "alcohol", name: "邑楽館林の地酒 於波良岐（おはらき）", img: "images/oharaki.jpg", price: 500, desc: "プラカップで提供致します。", descDineIn: "", toppings: [] },
  { id: "campari-beer", cat: "alcohol", name: "カンパリビア", img: "images/campari-beer.jpg", price: 700, desc: "キリンハートランド生ビールにカンパリを合わせたお酒です。プラカップで提供致します。", descDineIn: "キリンハートランド生ビールにカンパリを合わせたお酒です。", toppings: [] },
  { id: "highball", cat: "alcohol", name: "角ハイボール", img: "images/highball.jpg", price: 500, desc: "定番ハイボール", dineInOnly: true, toppings: [] },
  { id: "hot-wine", cat: "alcohol", name: "ホットワイン", img: "images/hot-wine.jpg", price: 500, desc: "テイクアウト用コーヒーカップで提供致します。", descDineIn: "", choice: { label: "赤／白をお選びください", options: [{ label: "赤ワインベース", delta: 0 }, { label: "白ワインベース", delta: 0 }] }, toppings: [] },
  { id: "wee-bee", cat: "alcohol", name: "ウィービー", img: "images/wee-bee.jpg", price: 700, desc: "ハートランド×角ウイスキー。ハートランドの爽やかさに、角ウイスキーのコクをプラス。祖父がよく飲んでいた一杯。", dineInOnly: true, poster: true, toppings: [] },
  { id: "bottle-beer", cat: "alcohol", name: "キリンハートランド瓶ビール", price: 700, desc: "キリンハートランドの瓶ビール。", dineInOnly: true, toppings: [] },
  { id: "bottle-wine", cat: "alcohol", name: "ボトルワイン", price: 1800, desc: "ボトルワインです。赤・白からお選びください。", dineInOnly: true, choice: { label: "赤／白をお選びください", options: [{ label: "赤ワイン", delta: 0 }, { label: "白ワイン", delta: 0 }] }, toppings: [] },
  { id: "sparkling-wine", cat: "alcohol", name: "スパークリングワイン", price: 2900, desc: "スパークリングワイン（ボトル）。", dineInOnly: true, toppings: [] },
  { id: "ruberie-cocktail", cat: "alcohol", name: "るべりえカクテル", img: "images/ruberie-cocktail.jpg", price: 500, desc: "味をお選びください。", dineInOnly: true, choice: { label: "味をお選びください", options: [{ label: "ピーチ", delta: 0 }, { label: "パッション", delta: 0 }, { label: "ライチ", delta: 0 }, { label: "マンゴー", delta: 0 }, { label: "ブラッドオレンジ", delta: 0 }, { label: "ブルーキュラソー", delta: 0 }, { label: "いちご", delta: 0 }, { label: "スイカ", delta: 0 }, { label: "邑楽町産ゆず", delta: 0 }, { label: "緑色じゃないメロン", delta: 0 }] }, toppings: [] },
  { id: "otona-cream-soda", cat: "alcohol", name: "大人のクリームソーダ", price: 600, desc: "ミントのお酒を使ったクリームソーダ。", dineInOnly: true, toppings: [] },
  { id: "limoncello", cat: "alcohol", name: "リモンチェッロ", img: "images/limoncello.jpg", price: 400, desc: "レモンのリキュール。", dineInOnly: true, choice: { label: "飲み方をお選びください", options: [{ label: "ショット", delta: 0 }, { label: "ソーダ割り", delta: 100 }] }, toppings: [] },
  { id: "lemon-chuhai", cat: "alcohol", name: "レモンチューハイ", img: "images/lemon-chuhai.jpg", price: 450, desc: "レモンのチューハイ。", dineInOnly: true, toppings: [] },
  { id: "liqueur", cat: "alcohol", name: "リキュール各種（ソーダ割り）", img: "images/liqueur.jpg", price: 500, desc: "すべてソーダ割りでご提供します。種類をお選びください。", dineInOnly: true, choice: { label: "種類をお選びください", options: [{ label: "パスティス", delta: 0 }, { label: "カルヴァドス", delta: 0 }, { label: "アマレット", delta: 0 }, { label: "ジン", delta: 0 }, { label: "ラム", delta: 0 }, { label: "ジェット（ミント）", delta: 0 }, { label: "カンパリ", delta: 0 }] }, toppings: [] },
  // ---- スイーツ ----
  { id: "apple-caramel-parfait", cat: "sweets", name: "りんごとキャラメルのミニパフェ", price: 600, desc: "", hidden: true, toppings: [] },
  { id: "gateau-chocolat", cat: "sweets", name: "ガトーショコラ", img: "images/gateau-chocolat.jpg", price: 500, desc: "濃厚なカカオの風味としっとりとした口どけ。食後にぴったりの定番スイーツです。", dineInOnly: true, toppings: [{ label: "バニラアイス", delta: 150 }] },
  { id: "choco-banana-sundae", cat: "sweets", name: "スペシャルチョコバナナサンデー", img: "images/choco-banana-sundae.jpg", price: 600, desc: "ベルギーチョコアイス・バナナ・ホイップクリーム・ビターチョコ・チョコクッキー（小麦粉無し）のスペシャルサンデー。", dineInOnly: true, toppings: [] },
  { id: "affogato", cat: "sweets", name: "アッフォガード", img: "images/affogato.jpg", price: 500, desc: "エスプレッソとバニラアイスのデザート。", dineInOnly: true, toppings: [] },
  { id: "ice-cream", cat: "sweets", name: "アイスクリーム（単品）", img: "images/ice-cream.jpg", price: 150, desc: "アイスクリームの単品です。", dineInOnly: true, choice: { label: "味をお選びください", options: [{ label: "バニラアイス", delta: 0 }, { label: "ベルギーチョコアイス", delta: 0 }] }, toppings: [] },
  // ---- スイーツ揚げピザ ----
  { id: "choco-bana-nuts", cat: "sweetage", name: "チョコバナナッツ", price: 480, desc: "バターでソテーしたバナナ・チョコ・ビターチョコソース・アーモンドをピザ生地で包んで揚げました。キャノーラ油でカラッと揚げているので、そこまで油感なく召し上がれます。※油物が苦手、受け付けない方は御遠慮ください。・特定原材料 (一部に小麦・バナナ・アーモンド・乳成分・大豆を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", img: "images/choco-bana-nuts.jpg", toppings: [] },
  { id: "skull-apple", cat: "sweetage", name: "群馬スカルアップル", img: "images/skull-apple.jpg", price: 480, desc: "群馬県産小麦100%使用したピザ生地で紅玉のプレザーブとマスカルポーネを包んで揚げました。キャノーラ油でカラッと揚げているので、そこまで油感なく召し上がれます。※油物が苦手、受け付けない方はスイーツピザのPACPをお試しください。・特定原材料 (一部に小麦・乳成分・りんごを含む) ※厨房では卵・えび・かにを含む製品を製造しています。", seasonal: true, toppings: [] },
  { id: "mascar-anko-butter", cat: "sweetage", name: "マスカルあんバター", price: 450, desc: "マスカルポーネとあんこ・バターを群馬県産小麦100%のピザ生地で包んで揚げました。キャノーラ油でカラッと揚げているので、そこまで油感なく召し上がれます。※油物が苦手、受け付けない方は御遠慮ください。・特定原材料 (一部に小麦・乳成分・大豆を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", img: "images/mascar-anko-butter.jpg", toppings: [] },
  { id: "anko-choco-bitter", cat: "sweetage", name: "あんチョコビター", price: 450, desc: "つぶあん・ビターチョコ・チョコソースを群馬県産小麦100%のピザ生地で包んで揚げました。キャノーラ油でカラッと揚げているので、そこまで油感なく召し上がれます。※油物が苦手、受け付けない方は御遠慮ください。・特定原材料 (一部に小麦・乳成分・大豆を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", img: "images/anko-choco-bitter.jpg", toppings: [] },
  { id: "mascar-anko-apple", cat: "sweetage", name: "マスカルあんアップル", img: "images/mascar-anko-apple.jpg", price: 480, desc: "つぶあん・紅玉りんごのプレザーブ・マスカルポーネを群馬県産小麦100%のピザ生地で包んで揚げました。キャノーラ油でカラッと揚げているので、そこまで油感なく召し上がれます。※油物が苦手、受け付けない方は御遠慮ください。・特定原材料 (一部に小麦・りんご・乳成分・大豆を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", seasonal: true, toppings: [] },
  { id: "fig-anko-tiramisu", cat: "sweetage", name: "イチジクあんティラミス", price: 480, desc: "邑楽町産無花果のセミドライとつぶあん。マスカルポーネとコーヒーソース・マルサラ酒を群馬県産小麦100%のピザ生地で包んで揚げました。キャノーラ油でカラッと揚げているので、そこまで油感なく召し上がれます。※油物が苦手、受け付けない方は御遠慮ください。・特定原材料 (一部に小麦・乳成分・大豆を含む) ※厨房では卵・えび・かにを含む製品を製造しています。", img: "images/fig-anko-tiramisu.jpg", toppings: [] },
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
    .filter(o => o.kind !== "frozen" && o.pickupDate === key && (o.status === "pending" || o.status === "confirmed"))
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
