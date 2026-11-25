// るべりえ テイクアウト注文 - メニューデータと共通ユーティリティ
// メニューのマスターは店内版診断ページ（Canvaメニューブック準拠）の実データ。
// 試作と同じ16品（ホール6／揚げ6／スイーツピザ2／サイド2）。

export const CATEGORIES = [
  { id: "hall", name: "ホールピザ" },
  { id: "age", name: "揚げピザ" },
  { id: "sweetpizza", name: "スイーツピザ" },
  { id: "side", name: "サイド" },
];

// cut: カット/包装の選択があるカテゴリ（ホール・スイーツのみ）
// noBox: 箱を選べない商品（レモンバターシュガー）
// toppings: [{label, delta}] delta は1個あたりの加算額（円）。
//   「チーズ2倍 850円」のような総額表記は、基本価格との差額に換算してある。
export const MENU = [
  // ---- ホールピザ ----
  { id: "margherita", cat: "hall", name: "マルゲリータ", price: 650,
    desc: "イタリア産完熟トマト・モッツァレラ・バジル。王道の一番人気",
    img: "https://imagedelivery.net/QondspN4HIUvB_R16-ddAQ/63e43a8bf54f677c995609ab/0b0e86af91999ddffc41.jpeg/fit=cover,w=924,h=660",
    toppings: [ { label: "チーズ2倍に変更", delta: 200 }, { label: "ハラペーニョ", delta: 80 } ] },
  { id: "ruberie-mix", cat: "hall", name: "るべりえミックス", price: 700,
    desc: "サラミ・ピーマン・レッドチェダー・イタリア産完熟トマト",
    img: "https://imagedelivery.net/QondspN4HIUvB_R16-ddAQ/63e43a8bf54f677c995609ab/7040ebfc800ba1b701c4.jpeg/fit=cover,w=924,h=660",
    toppings: [] },
  { id: "quattro", cat: "hall", name: "クアトロフロマッジ", price: 700,
    desc: "4種のチーズ。ハチミツトッピングもおすすめ",
    img: "https://imagedelivery.net/QondspN4HIUvB_R16-ddAQ/63e43a8bf54f677c995609ab/9caf8c2c8fd180fc2a9a.jpeg/fit=cover,w=924,h=660",
    toppings: [ { label: "ハラペーニョ", delta: 80 }, { label: "邑楽町産ハチミツ", delta: 100 } ] },
  { id: "marinara", cat: "hall", name: "マリナーラ", price: 500,
    desc: "チーズなし。トマト・オレガノ・ガーリックオイルのシンプルな味",
    img: "https://imagedelivery.net/QondspN4HIUvB_R16-ddAQ/63e43a8bf54f677c995609ab/6e5f56c6554d1e0972c0.jpeg/fit=cover,w=924,h=660",
    toppings: [ { label: "ハラペーニョ", delta: 80 } ] },
  { id: "genovese", cat: "hall", name: "ジェノヴェーゼ", price: 680,
    desc: "バジルペーストとモッツァレラ",
    img: "https://imagedelivery.net/QondspN4HIUvB_R16-ddAQ/63e43a8bf54f677c995609ab/c8d3923c4e8116e5ab5b.jpeg/fit=cover,w=924,h=660",
    toppings: [ { label: "チーズ2倍に変更", delta: 200 }, { label: "ハラペーニョ", delta: 80 } ] },
  { id: "siciliana", cat: "hall", name: "シシリアーナ", price: 680,
    desc: "アンチョビ・ペパロニ・ブラックオリーブ",
    img: "https://imagedelivery.net/QondspN4HIUvB_R16-ddAQ/63e43a8bf54f677c995609ab/c39be451273f9ea4bd41.jpeg/fit=cover,w=924,h=660",
    toppings: [ { label: "ハラペーニョ", delta: 80 } ] },
  // ---- 揚げピザ ----
  { id: "gunma-rugerita", cat: "age", name: "群馬ルゲリータ", price: 450,
    desc: "マルゲリータの揚げピザ。トマト・モッツァレラ・バジル",
    img: "https://imagedelivery.net/QondspN4HIUvB_R16-ddAQ/63e43a8bf54f677c995609ab/ff3b063f40bfb7dd3388.jpeg/fit=cover,w=924,h=660",
    toppings: [ { label: "チーズ2倍に変更", delta: 150 } ] },
  { id: "gunma-jiru-chicken", cat: "age", name: "群馬ジルチキン", price: 450,
    desc: "スモークチキン・モッツァレラ・バジルペースト",
    img: "https://imagedelivery.net/QondspN4HIUvB_R16-ddAQ/63e43a8bf54f677c995609ab/840c58aa3b2bf22b5378.jpeg/fit=cover,w=924,h=660",
    toppings: [] },
  { id: "gunma-toro-fromaggi", cat: "age", name: "群馬トロフロマッジ", price: 450,
    desc: "4種のチーズの揚げピザ",
    img: "https://imagedelivery.net/QondspN4HIUvB_R16-ddAQ/63e43a8bf54f677c995609ab/20d67ad795ec3afab892.jpeg/fit=cover,w=924,h=660",
    toppings: [] },
  { id: "kinoko-cream-stew", cat: "age", name: "いろいろキノコのクリームシチュー", price: 480,
    desc: "じゃがいもと4種のキノコのクリームシチュー",
    img: "https://imagedelivery.net/QondspN4HIUvB_R16-ddAQ/63e43a8bf54f677c995609ab/70f2227b385a16072c47.jpeg/fit=cover,w=924,h=660",
    toppings: [] },
  { id: "premium-jaga-cheese", cat: "age", name: "プレミアムじゃがチーズ", price: 500,
    desc: "5種のチーズとじゃがいも。るべりえ名物",
    img: "https://imagedelivery.net/QondspN4HIUvB_R16-ddAQ/63e43a8bf54f677c995609ab/004dfc8fe98814cb2894.jpeg/fit=cover,w=924,h=660",
    toppings: [] },
  { id: "premium-basil-chicken", cat: "age", name: "プレミアムバジルチキン", price: 500,
    desc: "スモークチキン・バジルペースト・フランス産マスタード",
    img: "https://imagedelivery.net/QondspN4HIUvB_R16-ddAQ/63e43a8bf54f677c995609ab/cdbfb07352ce1ba4149b.jpeg/fit=cover,w=924,h=660",
    toppings: [] },
  // ---- スイーツピザ ----
  { id: "lemon-butter-sugar", cat: "sweetpizza", name: "レモンバターシュガー", price: 550,
    desc: "バター・グラニュー糖・レモンのさっぱりした甘さ", noBox: true,
    img: "https://imagedelivery.net/QondspN4HIUvB_R16-ddAQ/63e43a8bf54f677c995609ab/50c568275bf2efbacd53.jpeg/fit=cover,w=924,h=660",
    toppings: [ { label: "邑楽町産ハチミツ", delta: 100 }, { label: "バニラアイス", delta: 150 } ] },
  { id: "mascarpone-berry", cat: "sweetpizza", name: "マスカルポーネとミックスベリー", price: 680,
    desc: "マスカルポーネとミックスベリー、自家製ベリーソース",
    img: "https://imagedelivery.net/QondspN4HIUvB_R16-ddAQ/63e43a8bf54f677c995609ab/30e2d18b5cfc4243af93.jpeg/fit=cover,w=924,h=660",
    toppings: [ { label: "邑楽町産ハチミツ", delta: 100 }, { label: "バニラアイス", delta: 150 } ] },
  // ---- サイド ----
  { id: "zeppole", cat: "side", name: "ゼッポレ", price: 330,
    desc: "ピザ生地に生海苔を練り込んだ揚げパン",
    img: "https://imagedelivery.net/QondspN4HIUvB_R16-ddAQ/63e43a8bf54f677c995609ab/3c16b1492c2f26fa8b48.jpeg/fit=cover,w=924,h=660",
    toppings: [] },
  { id: "crispy-chicken", cat: "side", name: "るべりえクリスピーチキン", price: 480,
    desc: "国産鶏胸肉の自家仕込み、5〜6個。ピリ辛変更もできます",
    img: "https://imagedelivery.net/QondspN4HIUvB_R16-ddAQ/63e43a8bf54f677c995609ab/165497a837d0f0d1a5c8.jpeg/fit=cover,w=924,h=660",
    toppings: [ { label: "ピリ辛に変更", delta: 30 } ] },
];

export const BOX_PRICE = 100; // 箱（1個あたり）
export const CUT_PACK_CATS = ["hall", "sweetpizza"]; // カット/包装があるカテゴリ
export const MAX_QTY = 20;

export function menuById(id) { return MENU.find(m => m.id === id); }

export function unitPrice(item, toppingLabels, pack) {
  let p = item.price;
  for (const t of item.toppings || []) {
    if (toppingLabels.includes(t.label)) p += t.delta;
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

// 電話番号の正規化（数字のみ）
export function normalizePhone(s) { return (s || "").replace(/[^0-9]/g, ""); }

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export function yen(n) { return "¥" + Number(n).toLocaleString("ja-JP"); }
