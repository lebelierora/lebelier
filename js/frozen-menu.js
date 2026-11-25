// 冷凍ピザ店頭予約（冷凍予約モード）専用メニュー
// 価格基準（本人確定 2026-11-25）: STORES の割引価格（表示価格）に合わせる。
//   例外: ホールピザ3種セット 1,750円／揚げピザ3種セット 1,200円 は自販機価格
//   （STORES割引価格 1,948円／1,283円 より安いため）。
// 載せない（本人確定）: マルゲリータ2枚セット・チーズナン（自販機限定）、
//   マルゲリータだけセット、ゼッポレ2個セット、ラベルレス15枚／18枚セット。
// 新規オリジナル（このページ専用・本人確定）: 群馬ジルチキンだけセット／
//   群馬トロフロマッジだけセット（各6個入り、単品×6=2,700円 → 2,565円）。
// 写真は焼きピザ側メニュー（menu.js）と同一商品のものを流用。無い商品は写真なし表示。
// choice は STORES のバリエーション（単一選択）。チーズ量の価格差は STORES の
//   表示価格レンジ（例 650〜850円 = チーズ2倍で +200円）に基づく。

export const FROZEN_CATEGORIES = [
  { id: "fz-set", name: "セット" },
  { id: "fz-hall", name: "冷凍ホールピザ" },
  { id: "fz-age", name: "冷凍揚げピザ" },
  { id: "fz-sweetpizza", name: "冷凍スイーツピザ" },
  { id: "fz-sweetage", name: "冷凍スイーツ揚げピザ" },
  { id: "fz-side", name: "冷凍サイド・惣菜" },
];

const CHEESE2 = delta => ({
  label: "チーズの量をお選びください",
  options: [
    { label: "チーズ通常", delta: 0 },
    { label: "チーズ2倍", delta },
  ],
});

export const FROZEN_MENU = [
  // ---- セット ----
  { id: "fz-gokumi", cat: "fz-set", name: "るべりえ極みセット", price: 6786,
    desc: "ホールピザ（燻製チーズのマルゲリータ・るべりえミックス・カリカリベーコーン）、揚げピザ（プレミアムバジルチキン・プレミアムじゃがチーズ・太陽のトマトカレー）、スイーツピザ（マスカルポーネミックスベリー・レモンバターシュガー）、スイーツ揚げピザ（チョコバナナッツ・マスカルあんバター）、惣菜（もつトマト煮込み・ゼッポレ×2・るべりえクリスピーチキン）のセットです。" },
  { id: "fz-variety", cat: "fz-set", name: "るべりえバラエティーセット", price: 4256,
    desc: "ホールピザ（マルゲリータ・るべりえミックス）、揚げピザ（群馬ジルチキン・群馬トロフロマッジ）、スイーツピザ（マスカルポーネミックスベリー）、スイーツ揚げピザ（マスカルあんバター）、惣菜（もつトマト煮込み・ゼッポレ×2）のセットです。" },
  { id: "fz-wagahai", cat: "fz-set", name: "WAGAHAIが選ぶ‼︎お勧めピザ三選", price: 1323, seasonal: true,
    desc: "邑楽白菜のオルトラーナ・群馬ルゲリータ・群馬ジルチキンの3種セットです。白菜が終わり次第終了します。" },
  { id: "fz-karisome", cat: "fz-set", name: "マツコ&有吉 かりそめ天国で紹介されましたセット", price: 1705, seasonal: true,
    desc: "邑楽白菜のオルトラーナ・無花果アトロフロマッジ・群馬ルゲリータの3種セットです。白菜が終わり次第終了します。" },
  { id: "fz-hall3", cat: "fz-set", name: "ホールピザ3種セット", price: 1750,
    desc: "マルゲリータ・るべりえミックス・クアトロフロマッジの3枚セットです。店頭の冷凍自販機と同じ価格です。" },
  { id: "fz-age3", cat: "fz-set", name: "揚げピザ3種セット", price: 1200,
    desc: "群馬ルゲリータ・群馬ジルチキン・群馬トロフロマッジの3個セットです。店頭の冷凍自販機と同じ価格です。" },
  { id: "fz-rugerita-only", cat: "fz-set", name: "群馬ルゲリータだけセット", price: 2565,
    desc: "群馬県産小麦100%使用のマルゲリータの揚げピザ、6個入り（1個約150g）です。",
    choice: CHEESE2(855) },
  { id: "fz-jiru-only", cat: "fz-set", name: "群馬ジルチキンだけセット", price: 2565,
    desc: "群馬県産小麦100%使用のバジルチキンの揚げピザ、6個入りです。このページだけのオリジナルセットです。" },
  { id: "fz-toro-only", cat: "fz-set", name: "群馬トロフロマッジだけセット", price: 2565,
    desc: "群馬県産小麦100%使用のクアトロフロマッジの揚げピザ、6個入りです。このページだけのオリジナルセットです。" },

  // ---- 冷凍ホールピザ ----
  { id: "fz-hakusai-ortolana", cat: "fz-hall", name: "邑楽白菜のオルトラーナ", price: 650, img: "images/hakusai-ortolana.jpg", seasonal: true, choice: CHEESE2(200) },
  { id: "fz-spicy-hakusai-ortolana", cat: "fz-hall", name: "ピリ辛白菜のオルトラーナ", price: 680, img: "images/spicy-hakusai-ortolana.jpg", seasonal: true, choice: CHEESE2(200) },
  { id: "fz-gyosho-liana", cat: "fz-hall", name: "イタリアン魚醤リアーナ", price: 680, img: "images/gyosho-liana.jpg", seasonal: true },
  { id: "fz-spicy-meat", cat: "fz-hall", name: "ピリ辛ミートるべり〜え", price: 850, img: "images/spicy-meat.jpg", seasonal: true, choice: CHEESE2(200) },
  { id: "fz-bolognese", cat: "fz-hall", name: "るべりえボロネーゼ", price: 850, img: "images/bolognese.jpg", seasonal: true },
  { id: "fz-fig-quattro", cat: "fz-hall", name: "無花果アトロフロマッジ", price: 850, img: "images/fig-quattro.jpg" },
  { id: "fz-shichifuku", cat: "fz-hall", name: "七福アトロフロマッジ", price: 850, img: "images/shichifuku-quattro.jpg",
    choice: { label: "セミドライ無花果をお選びください", options: [
      { label: "無花果なし", delta: 0 }, { label: "セミドライ無花果のせ", delta: 150 } ] } },
  { id: "fz-margherita", cat: "fz-hall", name: "マルゲリータ", price: 650, img: "images/margherita.jpg", choice: CHEESE2(200) },
  { id: "fz-thank-you", cat: "fz-hall", name: "サンキューマルゲリータ♡", price: 700, img: "images/thank-you-margherita.jpg", choice: CHEESE2(200) },
  { id: "fz-smoked-margherita", cat: "fz-hall", name: "燻製チーズのマルゲリータ", price: 850, img: "images/smoked-margherita.jpg", choice: CHEESE2(400) },
  { id: "fz-ruberie-mix", cat: "fz-hall", name: "るべりえミックス", price: 700, img: "images/ruberie-mix.jpg" },
  { id: "fz-quattro", cat: "fz-hall", name: "クアトロフロマッジ", price: 700, img: "images/quattro.jpg" },
  { id: "fz-marinara", cat: "fz-hall", name: "マリナーラ", price: 500, img: "images/marinara.jpg" },
  { id: "fz-siciliana", cat: "fz-hall", name: "シシリアーナ", price: 680, img: "images/siciliana.jpg" },
  { id: "fz-genovese", cat: "fz-hall", name: "ジェノヴェーゼ", price: 680, img: "images/genovese.jpg", choice: CHEESE2(200) },
  { id: "fz-kinoko-bianca", cat: "fz-hall", name: "キノコのビアンカ", price: 750, img: "images/kinoko-bianca.jpg", choice: CHEESE2(200) },
  { id: "fz-kinoko-marinara", cat: "fz-hall", name: "キノコのマリナーラ", price: 750, img: "images/kinoko-marinara.jpg" },
  { id: "fz-basil-chicken", cat: "fz-hall", name: "バジルチキン", price: 750, img: "images/basil-chicken.jpg", choice: CHEESE2(200) },
  { id: "fz-teriyaki-chicken", cat: "fz-hall", name: "テリヤキチキン", price: 750, img: "images/teriyaki-chicken.jpg", choice: CHEESE2(200) },
  { id: "fz-bacon-corn", cat: "fz-hall", name: "カリカリベーコーン", price: 750, img: "images/bacon-corn.jpg" },
  { id: "fz-anchovy-corn", cat: "fz-hall", name: "アンチョビコーン", price: 750, img: "images/anchovy-corn.jpg" },

  // ---- 冷凍揚げピザ ----
  { id: "fz-hakusai-chicken-stew", cat: "fz-age", name: "邑楽白菜とチキンのシチュー", price: 480, img: "images/hakusai-chicken-stew.jpg", seasonal: true },
  { id: "fz-hakusai-chicken-gyoza", cat: "fz-age", name: "ピリ辛チキンと白菜の揚げ餃子風", price: 480, img: "images/hakusai-chicken-gyoza.jpg", seasonal: true },
  { id: "fz-hakusai-hotate-stew", cat: "fz-age", name: "邑楽白菜と帆立のシチュー", price: 500, img: "images/hakusai-hotate-stew.jpg", seasonal: true },
  { id: "fz-hakusai-hotate-gyoza", cat: "fz-age", name: "ピリ辛帆立と白菜の揚げ餃子風", price: 500, img: "images/hakusai-hotate-gyoza.jpg", seasonal: true },
  { id: "fz-winter-meat-fantasy", cat: "fz-age", name: "冬のミートファンタジー", price: 500, img: "images/winter-meat-fantasy.jpg", seasonal: true },
  { id: "fz-gunmatsuri", cat: "fz-age", name: "お祭り揚げピザ 群祭り（ぐんまつり）", price: 500 },
  { id: "fz-gunma-rugerita", cat: "fz-age", name: "群馬ルゲリータ", price: 450, img: "images/gunma-rugerita.jpg", choice: CHEESE2(150) },
  { id: "fz-gunma-jiru", cat: "fz-age", name: "群馬ジルチキン", price: 450, img: "images/gunma-jiru-chicken.jpg" },
  { id: "fz-gunma-toro", cat: "fz-age", name: "群馬トロフロマッジ", price: 450, img: "images/gunma-toro-fromaggi.jpg" },
  { id: "fz-taiyo-curry", cat: "fz-age", name: "ね？太陽のトマトカレー", price: 480, img: "images/taiyo-tomato-curry.jpg" },
  { id: "fz-tomato-corn-curry", cat: "fz-age", name: "トマトコーンカレー", price: 500, img: "images/tomato-corn-curry.jpg" },
  { id: "fz-abarenbo", cat: "fz-age", name: "暴れん坊帆立カレー", price: 500, img: "images/abarenbo-hotate-curry.jpg",
    desc: "辛いものが苦手な方は購入しないでください。" },
  { id: "fz-shukumeruri", cat: "fz-age", name: "るべりえシュクメルリ", price: 500, img: "images/shukumeruri.jpg" },
  { id: "fz-kinoko-cream-stew", cat: "fz-age", name: "いろいろキノコのクリームシチュー", price: 480, img: "images/kinoko-cream-stew.jpg" },
  { id: "fz-premium-jaga", cat: "fz-age", name: "プレミアムじゃがチーズ", price: 500, img: "images/premium-jaga-cheese.jpg" },
  { id: "fz-premium-basil", cat: "fz-age", name: "プレミアムバジルチキン", price: 500, img: "images/premium-basil-chicken.jpg" },

  // ---- 冷凍スイーツピザ ----
  { id: "fz-lemon-butter", cat: "fz-sweetpizza", name: "レモンバターシュガー", price: 550, img: "images/lemon-butter-sugar.jpg",
    desc: "加熱後バターが溢れやすいので注意してください。" },
  { id: "fz-mascarpone-berry", cat: "fz-sweetpizza", name: "マスカルポーネとミックスベリー", price: 680, img: "images/mascarpone-berry.jpg" },
  { id: "fz-banana-caramel", cat: "fz-sweetpizza", name: "バナナキャラメル", price: 680, img: "images/banana-caramel.jpg" },
  { id: "fz-tiramisu", cat: "fz-sweetpizza", name: "るべりえティラミス", price: 680, img: "images/tiramisu.jpg" },
  { id: "fz-melty-bitter", cat: "fz-sweetpizza", name: "メルティービター", price: 750, img: "images/melty-bitter.jpg" },
  { id: "fz-white-berry", cat: "fz-sweetpizza", name: "ホワイトベリー", price: 750, img: "images/white-berry.jpg" },
  { id: "fz-pacp", cat: "fz-sweetpizza", name: "PACP（ピザアップルシナモンパイ風）", price: 750, img: "images/pacp.jpg", seasonal: true },

  // ---- 冷凍スイーツ揚げピザ ----
  { id: "fz-mascar-anko-apple", cat: "fz-sweetage", name: "マスカルあんアップル", price: 480, img: "images/mascar-anko-apple.jpg", seasonal: true },
  { id: "fz-fig-anko-tiramisu", cat: "fz-sweetage", name: "イチジクあんティラミス", price: 480, img: "images/fig-anko-tiramisu.jpg" },
  { id: "fz-skull-apple", cat: "fz-sweetage", name: "群馬スカルアップル", price: 480, img: "images/skull-apple.jpg", seasonal: true },
  { id: "fz-choco-bana", cat: "fz-sweetage", name: "チョコバナナッツ", price: 480, img: "images/choco-bana-nuts.jpg" },
  { id: "fz-mascar-anko-butter", cat: "fz-sweetage", name: "マスカルあんバター", price: 450, img: "images/mascar-anko-butter.jpg" },
  { id: "fz-anko-cheddar", cat: "fz-sweetage", name: "あんチェダー", price: 450 },
  { id: "fz-anko-choco", cat: "fz-sweetage", name: "あんチョコビター", price: 450, img: "images/anko-choco-bitter.jpg" },

  // ---- 冷凍サイド・惣菜 ----
  { id: "fz-motsu-tomato", cat: "fz-side", name: "もつトマト煮込み", price: 500, img: "images/motsu-tomato.jpg" },
  { id: "fz-hakusai-motsu", cat: "fz-side", name: "邑楽白菜とピリ辛もつトマト煮込み", price: 500, img: "images/hakusai-motsu.jpg", seasonal: true },
  { id: "fz-crispy-chicken", cat: "fz-side", name: "るべりえクリスピーチキン", price: 500, img: "images/crispy-chicken.jpg" },
];

export function frozenById(id) { return FROZEN_MENU.find(m => m.id === id); }
export function frozenItemsForCategory(catId) { return FROZEN_MENU.filter(m => m.cat === catId); }
