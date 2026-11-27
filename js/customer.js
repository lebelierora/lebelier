// お客さん側ロジック：日時選択 → メニュー表示 → カスタマイズ → カート → 送信 → ライブ状況
import { db } from "./firebase-config.js?v=20251126-84";
import {
  collection, addDoc, doc, getDoc, onSnapshot, runTransaction, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  CATEGORIES, MENU, CUT_PACK_CATS, MAX_QTY, menuById, unitPrice, itemsForCategory,
  todayKey, addDays, formatDateJP, isClosedDay, closedReason, timeSlots, leadMinutes,
  normalizePhone, esc, yen, SEATS, seatLabel, toMin, bookingEndKey, advanceGate,
} from "./menu.js?v=20251127-111";
import {
  FROZEN_CATEGORIES, frozenById, frozenItemsForCategory,
} from "./frozen-menu.js?v=20251126-84";

// 焼きピザ・冷凍ピザ両方のメニューから商品を引く
const anyById = id => menuById(id) || frozenById(id);

// ---- 平日ランチ・ディナーセット判定（ピザ＋ドリンクで揚げ物サービス。祝日・年末年始は無効＝本人決定 2026-11-26） ----
const SET_PIZZA_CATS = ["hall", "age", "sweetpizza", "sweetage"];
const SET_DRINK_CATS = ["drink", "alcohol"];
const SET_HOLIDAYS = new Set([
  "2026-01-01","2026-01-12","2026-02-11","2026-02-23","2026-03-20","2026-04-29","2026-05-03","2026-05-04","2026-05-05","2026-05-06","2026-07-20","2026-08-11","2026-09-21","2026-09-22","2026-09-23","2026-10-12","2026-11-03","2026-11-23",
  "2027-01-01","2027-01-11","2027-02-11","2027-02-23","2027-03-21","2027-03-22","2027-04-29","2027-05-03","2027-05-04","2027-05-05","2027-07-19","2027-08-11","2027-09-20","2027-09-23","2027-10-11","2027-11-03","2027-11-23",
]);
// セット提供お休みの日（年末年始ポスター 2026-11-27：12/24・12/25は提供お休み。12/30〜1/3は下の年末年始リストで無効）
const SET_SUSPENDED = new Set(["2026-12-24", "2026-12-25"]);
function isSetDay(dateStr) {
  if (!dateStr) return false;
  if (SET_SUSPENDED.has(dateStr)) return false; // セット提供お休み
  const md = dateStr.slice(5);
  if (["12-29","12-30","12-31","01-01","01-02","01-03"].includes(md)) return false; // 年末年始は無効
  if (["08-13","08-14","08-15","08-16"].includes(md)) return false; // お盆は無効
  if (SET_HOLIDAYS.has(dateStr)) return false; // 祝日は無効
  const wd = new Date(dateStr + "T12:00:00").getDay();
  return [1, 2, 3, 5].includes(wd); // 月・火・水・金（木曜定休、土日は対象外）
}
function inSetWindow(timeStr) {
  if (!timeStr) return false;
  const m = toMin(timeStr);
  return (m >= 660 && m < 840) || (m >= 1020 && m < 1200); // 11:00–14:00 / 17:00–20:00
}
function cartHasSetCombo() {
  let pizza = false, drink = false;
  for (const c of cart) {
    const it = anyById(c.itemId);
    if (!it) continue;
    if (SET_PIZZA_CATS.includes(it.cat)) pizza = true;
    if (SET_DRINK_CATS.includes(it.cat)) drink = true;
  }
  return pizza && drink;
}
function setEligibleTakeout() {
  return mode === "takeout" && isSetDay(selDate) && inSetWindow(selTime) && cartHasSetCombo();
}
function updateSetNotes() {
  const t = $("set-note");
  if (t) t.classList.toggle("hidden", !setEligibleTakeout());
}

const $ = id => document.getElementById(id);

// 表示用の短い注文番号（英字1文字＋数字4桁）。ドキュメントIDから決定的に算出する表示専用コードで、
// 保存データ（orderNo等）は変更しない。js/kitchen.js にも同じ実装があり、両者は必ず一致させること。
function orderCodeFromId(id) {
  let h = 2166136261; // FNV-1a 32bit（offset basis）
  const s = String(id || "");
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  const letter = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[h % 26];
  const digits = 1000 + (Math.floor(h / 26) % 9000);
  return letter + digits;
}

const screens = ["scr-home", "scr-seat", "scr-order", "scr-pickup", "scr-detail", "scr-checkout", "scr-dinein", "scr-done", "scr-status"];
let currentScreen = "scr-home";
function show(id) {
  currentScreen = id;
  screens.forEach(s => $(s).classList.toggle("hidden", s !== id));
  $("cartbar").classList.toggle("hidden", id !== "scr-order");
  $("detailbar").classList.toggle("hidden", id !== "scr-detail");
  $("dinein-bar").classList.toggle("hidden", !(id === "scr-order" && mode === "dinein"));
  window.scrollTo(0, 0);
}

// ---------- モード（テイクアウト／店内／冷凍予約）と席 ----------
let mode = "takeout"; // "takeout" | "dinein" | "frozen"
let seat = null;      // 店内モードの席ID
let seatFixed = false; // ?seat= で固定された席か（席別QR用）
const seatParam = new URLSearchParams(location.search).get("seat");
if (seatParam && SEATS.some(s => s.id === seatParam)) { seat = seatParam; seatFixed = true; }
function updateHeader() {
  if (mode === "dinein") {
    $("page-title").textContent = "るべりえ 店内オーダー";
    $("page-sub").textContent = "創作ピザとスイーツのお店 るべりえ（群馬県邑楽町）／お席からご注文いただけます。お会計はお帰りの際にレジでお願いします";
  } else if (mode === "frozen") {
    $("page-title").textContent = "るべりえ 冷凍ピザ店頭予約";
    $("page-sub").textContent = `冷凍ピザの店頭受け取り予約です。受け取りは翌々日から${formatDateJP(bookingEndKey())}まで／お支払いは受け取り時にレジでお願いします（現金・PayPay・コハクペイ等）`;
  } else {
    $("page-title").textContent = "るべりえ テイクアウト注文";
    $("page-sub").textContent = "創作ピザとスイーツのお店 るべりえ（群馬県邑楽町）／お支払いは受け取り時にレジでお願いします（現金・PayPay・コハクペイ等）";
  }
}

// ---------- カート ----------
const carts = { takeout: [], dinein: [], frozen: [] }; // モードごとに分けて保持
let cart = carts.takeout; // {itemId, qty, cut, pack, choice:label|null, toppings:[label]}
function setMode(m) {
  mode = m;
  cart = carts[m];
  document.body.classList.toggle("frozen", m === "frozen");
  $("frozen-banner").classList.toggle("hidden", m !== "frozen");
  $("frozen-banner2").classList.toggle("hidden", m !== "frozen");
  $("frozen-banner0").classList.toggle("hidden", m !== "frozen");
  // 店内はお席カード内に同趣旨の案内があるため、一覧上の案内はテイクアウト／冷凍だけに出す
  $("order-guide").classList.toggle("hidden", m === "dinein");
  $("order-guide").textContent = m === "frozen"
    ? "ご予約は下のメニューから商品をお選びください"
    : "ご注文は下のメニューから商品をお選びください";
  updateHeader();
  updateCartbar(false);
  updatePickupBar();
}
function cartQty() { return cart.reduce((a, c) => a + c.qty, 0); }
function cartTotal() {
  return cart.reduce((a, c) => a + unitPrice(anyById(c.itemId), c.toppings, c.pack, c.choice) * c.qty, 0);
}
function updateCartbar(pop) {
  const q = cartQty();
  $("cartbar-info").textContent = q === 0 ? "カートは空です" : `${q}点 合計 ${yen(cartTotal())}`;
  const badge = $("cart-badge");
  badge.textContent = q;
  badge.classList.toggle("hidden", q === 0);
  if (pop && q > 0) { badge.classList.remove("pop"); void badge.offsetWidth; badge.classList.add("pop"); }
}

let toastTimer = null;
function toast(msg, ms = 1200) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), ms); // 既定は1.2秒
}

// ---------- メニュー ----------
let currentCat = "seasonal";
function renderTabs() {
  const cats = mode === "frozen" ? FROZEN_CATEGORIES : CATEGORIES.filter(c => !c.hidden && (mode === "dinein" || !c.dineInOnly)); // dineInOnly のカテゴリ（スイーツ）は店内のみ
  $("cat-tabs").innerHTML = cats.map(c =>
    `<button data-cat="${c.id}" class="${c.id === currentCat ? "active" : ""}">${esc(c.name)}</button>`).join("");
  $("cat-tabs").querySelectorAll("button").forEach(b =>
    b.addEventListener("click", () => { currentCat = b.dataset.cat; renderTabs(); renderGrid(); }));
}
// ---------- 早割（事前予約専用）商品のゲート ----------
// advanceOnly 商品は、受付開始日（fromDate）より前は一覧に出さない。受け取り日が当日の間は
// 「前日までのご予約専用です」と表示して注文できないようにする（存在を知ってもらい、
// 次回は前日までに予約してもらうため。当日でも通常版は注文できる）。
function advancePickupDate() {
  const p = pickupSel[mode];
  return p ? p.date : null;
}
function advanceStateOf(it) { return advanceGate(it, todayKey(), advancePickupDate()); }
function advanceBlocked(it) { return advanceStateOf(it) === "blocked"; }

function renderGrid() {
  const items = (mode === "frozen" ? frozenItemsForCategory(currentCat) : itemsForCategory(currentCat))
    .filter(m => !m.hidden && (mode === "dinein" || !m.dineInOnly) && (mode === "takeout" || !m.takeoutOnly)) // dineInOnly は店内のみ／takeoutOnly はテイクアウトのみ／hidden は常に出さない
    .filter(m => advanceStateOf(m) !== "hidden"); // 早割商品は受付開始日より前は出さない
  $("item-grid").innerHTML = items.map(m => `
    <button class="item" data-id="${m.id}">
      ${effImg(m) ? `<img src="${esc(effImg(m))}" alt="${esc(m.name)}" loading="lazy"${m.poster ? ` style="object-fit:contain;background:#f6efe3;"` : ""}>` : (m.img ? "" : `<div class="noimg">写真なし</div>`)}
      <div class="body">
        <div class="name">${esc(m.name)}${m.seasonal ? ` <span class="season-badge">季節</span>` : ""}${m.eatInBadge ? ` <span class="eatin-badge">イートイン限定</span>` : ""}</div>
        <!-- 一覧では説明文を表示しない（本人指示 2026-11-25：見づらいため。説明は詳細画面のみ） -->
        <div class="price">${yen(m.price)}${m.choice && m.choice.options.some(o => o.delta > 0) ? "〜" : ""}</div>
        ${advanceBlocked(m) ? `<div class="advance-note">前日までのご予約専用です</div>` : ""}
      </div>
    </button>`).join("");
  $("item-grid").querySelectorAll(".item").forEach(b =>
    b.addEventListener("click", () => openDetail(b.dataset.id)));
}

// 店内だけ写真・説明を差し替える商品用（例：生ビールは店内=ゴブレット／テイクアウト=プラカップ）
const NO_PHOTO_DINEIN_CATS = new Set(CATEGORIES.filter(c => c.noPhotoDineIn).map(c => c.id));
function effImg(it) {
  if (mode === "dinein" && it.imgDineIn) return it.imgDineIn;
  if (mode === "dinein" && NO_PHOTO_DINEIN_CATS.has(it.cat)) return ""; // 店内では写真自体を出さないカテゴリ
  return it.img;
}
function effDesc(it) { return (mode === "dinein" && it.descDineIn !== undefined) ? it.descDineIn : (it.desc || ""); }

// ---------- 商品詳細 ----------
// ---------- 提供タイミング（店内のみ） ----------
// ドリンク: すぐ提供／最初の商品と一緒／食後、スイーツ系: でき次第／最後。
// 2026-11-27 本人決定: 既定の事前選択はやめ、未選択スタートの必須選択にした（見ないお客様が意図しないタイミングで出てくる事故防止）。
// ※スイーツ系の文言は旧「できた順」から「でき次第」に変更済み（2026-11-27）。旧文言で保存された注文は表示側で読み替える
const TIMING_DRINK = ["すぐ提供", "最初の商品と一緒", "食後"];
const TIMING_SWEET = ["でき次第", "最後"];
function timingOptions(it) {
  if (mode !== "dinein") return null;
  const kind = it.timing || (it.cat === "drink" ? "drink"
    : ["sweetpizza", "sweetage", "sweets"].includes(it.cat) ? "sweet" : null);
  if (kind === "drink") return TIMING_DRINK;
  if (kind === "sweet") return TIMING_SWEET;
  return null;
}

let detail = null; // {item, cut, pack, choice, toppings:Set, qty, timing}
function openDetail(id) {
  const item = anyById(id);
  detail = { item, cut: null, pack: null,
             choice: null, // choice は未選択スタート。選ぶまでカートに入れられない
             toppings: new Set(), qty: 1, descOpen: false,
             timing: null }; // 提供タイミングも未選択スタート。タイミングがある商品は選ぶまでカートに入れられない
             // カットも未選択スタート（2026-11-27 本人決定）。カット選択が出る商品は選ぶまでカートに入れられない。
             // ただし店内でカットなし固定の商品（noCutDineIn）は選択肢がないので対象外（renderDetail で nocut に固定される）
             // 包装も未選択スタート（2026-11-27 本人決定で追加）。包装選択が出る商品（テイクアウトのみ）は選ぶまでカートに入れられない
  renderDetail();
  show("scr-detail");
}
// ---------- 商品説明の表示（詳細画面） ----------
// desc は Airレジ全文。本文とアレルギー表示（特定原材料〜）に分け、
// 長い場合は冒頭だけ見せて「さらに表示する」で全文に展開する（Airレジと同じ方式）。
const DESC_LIMIT = 120;   // この字数を超えたら折りたたむ
const DESC_PREVIEW = 80;  // 折りたたみ時に見せる冒頭の目安字数
function splitDesc(desc) {
  const m = desc.match(/・?\s*特定原材料/);
  if (!m) return { main: desc, allergy: "" };
  return {
    main: desc.slice(0, m.index).replace(/[・\s]+$/, ""),
    allergy: desc.slice(m.index).replace(/^・\s*/, ""),
  };
}
function descParas(text) {
  return text.split(/(?<=。)/).map(s => s.trim()).filter(Boolean)
    .map(s => `<p class="desc-p">${esc(s)}</p>`).join("");
}
function allergyHtml(allergy) {
  const parts = allergy.split(/(?=※)/).map(s => s.trim()).filter(Boolean);
  return `<div class="desc-allergy">${parts.map(p => `<p>${esc(p)}</p>`).join("")}</div>`;
}
function descHtml(it) {
  if (!it.desc) return "";
  const { main, allergy } = splitDesc(effDesc(it));
  const long = it.desc.length > DESC_LIMIT;
  if (!long || detail.descOpen) {
    return `<div class="desc-block">${descParas(main)}${allergy ? allergyHtml(allergy) : ""}` +
      (long ? `<button type="button" class="desc-toggle" id="desc-toggle">閉じる</button>` : "") + `</div>`;
  }
  // 折りたたみ時：文の区切りを崩さず、目安字数までの文だけ見せる
  const sentences = main.split(/(?<=。)/).map(s => s.trim()).filter(Boolean);
  const shown = [];
  let len = 0;
  for (const s of sentences) { shown.push(s); len += s.length; if (len >= DESC_PREVIEW) break; }
  return `<div class="desc-block">${shown.map(s => `<p class="desc-p">${esc(s)}</p>`).join("")}` +
    `<button type="button" class="desc-toggle" id="desc-toggle">さらに表示する</button></div>`;
}

function hasCutPack(item) { return CUT_PACK_CATS.includes(item.cat); }
function detailUnit() { return unitPrice(detail.item, [...detail.toppings], detail.pack, detail.choice); }
function detailChoiceMissing() {
  if (!detail || !detail.item.choice) return false;
  const choiceVisible = mode === "dinein" || !detail.item.choice.dineInOnly;
  return choiceVisible && !detail.choice;
}
function updateDetailbar() {
  if (!detail) return;
  const price = $("detailbar-price");
  if (!price) return;
  const unit = detailUnit();
  price.textContent = yen(unit * detail.qty);
  $("detailbar-sub").textContent = detail.qty > 1 ? `${yen(unit)} × ${detail.qty}点` : `数量 ${detail.qty}`;
}
let choiceGuideTimer = null;
function guideToRequiredChoice() {
  const group = $("choice-group");
  if (!group) return;
  group.scrollIntoView({ behavior: "smooth", block: "center" });
  group.classList.add("attention");
  const alert = $("choice-alert");
  if (alert) alert.classList.remove("hidden");
  toast("まずこちらをお選びください", 1800);
  clearTimeout(choiceGuideTimer);
  choiceGuideTimer = setTimeout(() => {
    group.classList.remove("attention");
    if (alert) alert.classList.add("hidden");
  }, 2400);
}
function detailCutMissing() {
  if (!detail) return false;
  // カット選択が出る商品だけ必須。店内でカットなし固定の商品（noCutDineIn）は選択肢自体がないので対象外
  return hasCutPack(detail.item) && !(mode === "dinein" && detail.item.noCutDineIn) && !detail.cut;
}
let cutGuideTimer = null;
function guideToRequiredCut() {
  const group = $("cut-group");
  if (!group) return;
  group.scrollIntoView({ behavior: "smooth", block: "center" });
  group.classList.add("attention");
  const alert = $("cut-alert");
  if (alert) alert.classList.remove("hidden");
  toast("カットの仕方をお選びください", 1800);
  clearTimeout(cutGuideTimer);
  cutGuideTimer = setTimeout(() => {
    group.classList.remove("attention");
    if (alert) alert.classList.add("hidden");
  }, 2400);
}
function detailPackMissing() {
  if (!detail) return false;
  // 包装選択が出るのはテイクアウトでカット/包装対象の商品だけ。その場合のみ必須
  return mode === "takeout" && hasCutPack(detail.item) && !detail.pack;
}
let packGuideTimer = null;
function guideToRequiredPack() {
  const group = $("pack-group");
  if (!group) return;
  group.scrollIntoView({ behavior: "smooth", block: "center" });
  group.classList.add("attention");
  const alert = $("pack-alert");
  if (alert) alert.classList.remove("hidden");
  toast("包装をお選びください", 1800);
  clearTimeout(packGuideTimer);
  packGuideTimer = setTimeout(() => {
    group.classList.remove("attention");
    if (alert) alert.classList.add("hidden");
  }, 2400);
}
function detailTimingMissing() {
  if (!detail) return false;
  return !!timingOptions(detail.item) && !detail.timing;
}
let timingGuideTimer = null;
function guideToRequiredTiming() {
  const group = $("timing-group");
  if (!group) return;
  group.scrollIntoView({ behavior: "smooth", block: "center" });
  group.classList.add("attention");
  const alert = $("timing-alert");
  if (alert) alert.classList.remove("hidden");
  toast("提供のタイミングをお選びください", 1800);
  clearTimeout(timingGuideTimer);
  timingGuideTimer = setTimeout(() => {
    group.classList.remove("attention");
    if (alert) alert.classList.add("hidden");
  }, 2400);
}
let advanceGuideTimer = null;
function guideToAdvance() {
  const group = $("advance-group");
  if (group) {
    group.scrollIntoView({ behavior: "smooth", block: "center" });
    group.classList.add("attention");
    clearTimeout(advanceGuideTimer);
    advanceGuideTimer = setTimeout(() => group.classList.remove("attention"), 2400);
  }
  toast("早割商品は前日までのご予約専用です", 2200);
}
function tryAddDetailToCart() {
  if (!detail) return;
  if (advanceBlocked(detail.item)) { guideToAdvance(); return; }
  if (detailCutMissing()) { guideToRequiredCut(); return; }
  if (detailPackMissing()) { guideToRequiredPack(); return; }
  if (detailChoiceMissing()) { guideToRequiredChoice(); return; }
  if (detailTimingMissing()) { guideToRequiredTiming(); return; }
  const it = detail.item;
  cart.push({ itemId: it.id, qty: detail.qty, cut: hasCutPack(it) ? detail.cut : null,
              pack: hasCutPack(it) && mode === "takeout" ? detail.pack : null,
              choice: detail.choice, toppings: [...detail.toppings], timing: detail.timing || null });
  updateCartbar(true);
  toast(`${it.name}をカートに入れました`);
  show("scr-order");
  checkLeadCrossing();
}
let detailHintObserver = null;
function setupDetailScrollHint() {
  const hint = $("detail-scroll-hint");
  if (!hint) return;
  const target = $("detail-body").querySelector(".opt-group");
  if (detailHintObserver) detailHintObserver.disconnect();
  if (!target || !("IntersectionObserver" in window)) { hint.classList.add("hidden"); return; }
  hint.classList.remove("hidden");
  detailHintObserver = new IntersectionObserver(entries => {
    hint.classList.toggle("hidden", entries[0].isIntersecting);
  }, { threshold: 0.12 });
  detailHintObserver.observe(target);
}
function renderDetail() {
  const it = detail.item;
  // onlyChoice 付きトッピングは、その選択肢を選んだときだけ有効（例：ラテのアイストッピングはアイスのみ）。選択が合わなければ自動で外す
  (it.toppings || []).forEach(t => { if (t.onlyChoice && detail.choice !== t.onlyChoice) detail.toppings.delete(t.label); });
  let html = `
    <div class="card" style="padding:0;overflow:hidden;">
      ${effImg(it) ? `<img class="detail-photo ${it.poster || mode === "frozen" ? "contain" : ""}" src="${esc(effImg(it))}" alt="${esc(it.name)}">
      <div class="scroll-hint" id="detail-scroll-hint">↓ 下で味や大きさなどを選べます</div>` : ""}
      <div style="padding:14px;">
        <div style="font-size:20px;font-weight:900;">${esc(it.name)}${it.seasonal ? ` <span class="season-badge">季節メニュー</span>` : ""}${it.eatInBadge ? ` <span class="eatin-badge">イートイン限定</span>` : ""}</div>
        ${descHtml(it)}
        <div style="font-weight:900;font-size:19px;margin-top:8px;">${yen(it.price)}</div>
      </div>
    </div>`;
  if (advanceBlocked(it)) {
    html += `
    <div class="opt-group" id="advance-group">
      <div class="choice-alert">この商品は早割のため、前日までのご予約専用です</div>
      <div class="opt-note">本日の受け取りではご注文いただけません。受け取り日時を明日以降に変更するとご注文いただけます（通常価格の商品は当日でもご注文いただけます）。</div>
    </div>`;
  }
  if (hasCutPack(it)) {
    const boxDisabledByCut = detail.cut === "cut4" || detail.cut === "cut6";
    const boxDisabled = it.noBox || boxDisabledByCut;
    if (mode === "dinein" && it.noCutDineIn) {
      detail.cut = "nocut";
      html += `
    <div class="opt-group">
      <div class="label">カット</div>
      <div class="opt-note">この商品は店内ではカットせずにご提供いたします。お客様ご自身でカットしてお召し上がりください。</div>
    </div>`;
    } else {
    html += `
    <div class="opt-group" id="cut-group">
      <div class="label">カット</div>
      <div class="opt-row">
        <button id="cut-nocut" class="${detail.cut === "nocut" ? "active" : ""}">未カット</button>
        <button id="cut-cut4" class="${detail.cut === "cut4" ? "active" : ""}" ${detail.pack === "box" ? "disabled" : ""}>4カット</button>${mode === "dinein" && (it.cat === "hall" || it.cat === "sweetpizza") ? `<button id="cut-cut6" class="${detail.cut === "cut6" ? "active" : ""}">6カット</button>` : ""}
      </div>
      ${detail.pack === "box" ? `<div class="opt-note">箱はカットなしのお渡しです</div>` : ""}
      ${detail.cut ? "" : `<div class="opt-note">お選びください（必須）</div><div class="choice-alert hidden" id="cut-alert">カットの仕方をお選びください</div>`}
    </div>`;
    }
    // 包装（箱）はテイクアウトのみ。店内では出さない
    if (mode === "takeout") {
      html += `
    <div class="opt-group" id="pack-group">
      <div class="label">包装</div>
      <div class="opt-row">
        <button id="pack-paper" class="${detail.pack === "paper" ? "active" : ""}">紙皿・ホイル（無料）</button>
        <button id="pack-box" class="${detail.pack === "box" ? "active" : ""}" ${boxDisabled ? "disabled" : ""}>箱（+100円）</button>
      </div>
      ${it.noBox ? `<div class="opt-note">バターがこぼれやすいため、箱での提供はしていません</div>`
                 : boxDisabledByCut ? `<div class="opt-note">箱はカットなしのお渡しです</div>` : ""}
      ${detail.pack ? "" : `<div class="opt-note">お選びください（必須）</div><div class="choice-alert hidden" id="pack-alert">包装をお選びください</div>`}
    </div>`;
    }
  }
  const choiceVisible = it.choice && (mode === "dinein" || !it.choice.dineInOnly); // dineInOnly の choice は店内のみ（例：生ビールの小サイズ）
  // 選択肢単位の dineInOnly（例：烏龍茶のホットは店内のみ。テイクアウトはアイスのみ）
  const visibleOptions = choiceVisible ? it.choice.options.filter(o => mode === "dinein" || !o.dineInOnly) : [];
  if (choiceVisible) {
    if (detail.choice && !visibleOptions.some(o => o.label === detail.choice)) detail.choice = null;
    if (!detail.choice && visibleOptions.length === 1) detail.choice = visibleOptions[0].label; // 残り1つなら自動選択
    const choiceLabel = mode === "takeout" && it.choice.labelTakeout ? it.choice.labelTakeout : it.choice.label;
    html += `<div class="opt-group" id="choice-group"><div class="label">${esc(choiceLabel)}</div><div class="opt-row">` +
      visibleOptions.map(o => `
        <button data-choice="${esc(o.label)}" class="${detail.choice === o.label ? "active" : ""}">${esc(o.label)}${o.delta ? ` <span style="color:var(--red-dark);">${o.delta > 0 ? "+" : "−"}${yen(Math.abs(o.delta))}</span>` : ""}</button>`).join("") +
      `</div>${detail.choice ? "" : `<div class="opt-note">お選びください（必須）</div><div class="choice-alert hidden" id="choice-alert">まずこちらをお選びください</div>`}</div>`;
  }
  // dineInOnly のトッピングは店内モードでのみ表示する（テイクアウトでは出さない）
  const visibleToppings = (it.toppings || []).filter(t => (mode === "dinein" || !t.dineInOnly) && (!t.onlyChoice || detail.choice === t.onlyChoice));
  const choiceRestricted = (it.toppings || []).filter(t => t.onlyChoice && detail.choice !== t.onlyChoice);
  if (!visibleToppings.length && choiceRestricted.length) {
    html += `<div class="opt-group"><div class="opt-note">${esc(choiceRestricted.map(t => t.label).join("・"))}は${esc(choiceRestricted[0].onlyChoice)}のみです</div></div>`;
  }
  if (visibleToppings.length) {
    html += `<div class="opt-group"><div class="label">トッピング・変更</div><div class="check-row">` +
      visibleToppings.map(t => `
        <label><span>${esc(t.label)}${t.delta ? ` <span style="color:var(--red-dark);">+${yen(t.delta)}</span>` : ""}</span>
        <input type="checkbox" data-top="${esc(t.label)}" ${detail.toppings.has(t.label) ? "checked" : ""}></label>`).join("") +
      `</div></div>`;
  }
  const topts = timingOptions(it);
  if (topts) {
    html += `<div class="opt-group" id="timing-group"><div class="label">提供のタイミング</div><div class="opt-row">` +
      topts.map(t => `<button data-timing="${esc(t)}" class="${detail.timing === t ? "active" : ""}">${esc(t)}</button>`).join("") +
      `</div>${detail.timing ? "" : `<div class="opt-note">お選びください（必須）</div><div class="choice-alert hidden" id="timing-alert">提供のタイミングをお選びください</div>`}</div>`;
  }
  html += `
    <div class="opt-group">
      <div class="label">数量</div>
      <div class="stepper">
        <button id="qty-minus">−</button><div class="qty">${detail.qty}</div><button id="qty-plus">＋</button>
      </div>
    </div>
    <button class="btn" id="add-cart">カートに入れる　${yen(detailUnit() * detail.qty)}</button>`;
  $("detail-body").innerHTML = html;

  if (hasCutPack(it) && $("cut-nocut")) {
    $("cut-nocut").addEventListener("click", () => { detail.cut = "nocut"; renderDetail(); });
    $("cut-cut4").addEventListener("click", () => { detail.cut = "cut4"; if (detail.pack === "box") detail.pack = "paper"; renderDetail(); });
    const cut6Btn = $("cut-cut6");
    if (cut6Btn) cut6Btn.addEventListener("click", () => { detail.cut = "cut6"; renderDetail(); });
    const paperBtn = $("pack-paper");
    if (paperBtn) paperBtn.addEventListener("click", () => { detail.pack = "paper"; renderDetail(); });
    const boxBtn = $("pack-box");
    if (boxBtn && !boxBtn.disabled) boxBtn.addEventListener("click", () => { detail.pack = "box"; detail.cut = "nocut"; renderDetail(); });
  }
  const descToggle = $("desc-toggle");
  if (descToggle) descToggle.addEventListener("click", () => { detail.descOpen = !detail.descOpen; renderDetail(); });
  $("detail-body").querySelectorAll("[data-choice]").forEach(b =>
    b.addEventListener("click", () => { detail.choice = b.dataset.choice; renderDetail(); }));
  $("detail-body").querySelectorAll("[data-top]").forEach(cb =>
    cb.addEventListener("change", () => { cb.checked ? detail.toppings.add(cb.dataset.top) : detail.toppings.delete(cb.dataset.top); renderDetail(); }));
  $("detail-body").querySelectorAll("[data-timing]").forEach(b =>
    b.addEventListener("click", () => { detail.timing = b.dataset.timing; renderDetail(); }));
  $("qty-minus").addEventListener("click", () => { if (detail.qty > 1) detail.qty--; renderDetail(); });
  $("qty-plus").addEventListener("click", () => { if (detail.qty < MAX_QTY) detail.qty++; renderDetail(); });
  $("add-cart").addEventListener("click", tryAddDetailToCart);
  updateDetailbar();
  setupDetailScrollHint();
}

// ---------- チェックアウト ----------
let selDate = todayKey();
let selTime = null;
let sealChoice = null; // 冷凍予約の温め方シール: "need" | "none"
let occupiedTimes = new Set(); // 選択中の受け取り日に既に注文が入っている時刻（重複防止）
let slotDocStopped = false;    // 選択中の日の daySlots に takeoutStopped が立っているか（意味を持つのは本日のみ）
let slotSub = null;            // 枠の埋まり状況の購読解除関数
let submitting = false;        // 注文送信中は、自分の注文で枠が埋まった通知を抑制する

// ---------- 受け取り日時の先行選択（テイクアウト／冷凍のみ。店内は対象外） ----------
// 2026-11-27 本人決定：商品より先に受け取り日時を選ぶフローに変更する。
// 当日受付停止や枠の埋まりを、商品を選ぶ前に知らせるため。
// 日時を選び直しても、カートの中身と入力済みフォームは保持される（状態はモード別に保持）。
const pickupSel = { takeout: { date: null, time: null }, frozen: { date: null, time: null } };
let pickupReturn = "menu"; // 日時選択画面から戻る先: "menu" | "checkout"
function fmtShort(key) { return formatDateJP(key).replace(/^\d+年/, ""); }
function updatePickupBar() {
  const bar = $("pickup-bar");
  if (!bar) return;
  const p = pickupSel[mode];
  const vis = mode !== "dinein" && !!p && !!p.time;
  bar.classList.toggle("hidden", !vis);
  if (vis) $("pickup-bar-text").textContent = `${fmtShort(p.date)} ${p.time}`;
}
// 選択済みの日時が、現在のカート内容では無効になっていないか（同期チェックのみ）。
// 当日テイクアウトの最短時刻は合計点数で変わるため、カートが増えると選んだ時刻が過去扱いになり得る。
function pickupProblemSync() {
  if (mode === "dinein") return null;
  const p = pickupSel[mode];
  if (!p || !p.date || !p.time) return { type: "unset", message: "受け取り日時が選ばれていません。日時をお選びください。" };
  // 早割商品がカートにあるのに受け取り日が当日になっている場合は注文できない
  // （早割を入れた後に、日時だけ当日へ変更されたケースをここで止める）
  if (p.date <= todayKey() && cart.some(c => { const it = anyById(c.itemId); return it && it.advanceOnly; })) {
    return { type: "advance", message: "早割商品は当日の受け取りでは注文できません。日時を明日以降に変更するか、早割商品をカートから外してください。" };
  }
  if (mode === "takeout" && p.date === todayKey() && !timeSlots(p.date, cartQty()).includes(p.time)) {
    const lead = leadMinutes(cartQty());
    return { type: "lead", message: cartQty() >= 5
      ? `ご注文点数が増えたため、受け取り時刻 ${p.time} では注文できません。最短で${lead}分後以降の時刻をお選びください。`
      : `受け取り時刻 ${p.time} は選べなくなりました。日時を選び直してください。` };
  }
  return null;
}
let leadWarned = false;
function checkLeadCrossing() {
  if (mode !== "takeout" || currentScreen !== "scr-order") return;
  const p = pickupSel.takeout;
  if (!p || p.date !== todayKey() || !p.time) { leadWarned = false; return; }
  const invalid = !timeSlots(p.date, cartQty()).includes(p.time);
  if (invalid && !leadWarned) {
    leadWarned = true;
    toast("点数が増えたため、受け取り時刻を選び直す必要があります", 2600);
  }
  if (!invalid) leadWarned = false;
}
function startPickupFlow(returnTo) {
  pickupReturn = returnTo;
  const p = pickupSel[mode];
  if (p && p.date) { selDate = p.date; selTime = p.time; }
  else {
    selDate = mode === "frozen" ? dateChipList().find(k => !isClosedDay(k)) : todayKey();
    selTime = null;
  }
  $("pickup-title").textContent = p && p.time ? "受け取り日時の変更" : "まず、受け取り日時をお選びください";
  $("pickup-cart-note").classList.toggle("hidden", cartQty() === 0);
  renderDateChips($("date-chips"), selDate, pickDate);
  renderSlots();
  // 冷凍予約は焼きピザの枠（1枠1注文）を占有しないため、枠の購読はしない
  if (mode === "frozen") { unwatchSlots(); occupiedTimes = new Set(); renderSlots(); }
  else watchSlots();
  show("scr-pickup");
}
function finishPickupFlow() { // 「この日時で注文する」
  if (!selTime) return;
  pickupSel[mode] = { date: selDate, time: selTime };
  unwatchSlots();
  leadWarned = false;
  if (pickupReturn === "checkout") showCheckout();
  else { updatePickupBar(); renderTabs(); renderGrid(); show("scr-order"); }
}
function backFromPickupFlow() {
  unwatchSlots();
  const p = pickupSel[mode];
  if (p && p.date) { selDate = p.date; selTime = p.time; }
  if (pickupReturn === "checkout" && p && p.time) showCheckout();
  else if (pickupReturn === "menu" && p && p.time) { updatePickupBar(); show("scr-order"); }
  else show("scr-home");
}

// 選択中の日の注文を購読し、埋まっている枠（1枠1注文）を即時に反映する
function watchSlots() {
  unwatchSlots();
  occupiedTimes = new Set();
  slotDocStopped = false;
  slotSub = onSnapshot(doc(db, "daySlots", selDate), snap => {
    const data = snap.exists() ? snap.data() : {};
    occupiedTimes = new Set(Object.keys(data.taken || {}));
    slotDocStopped = !!data.takeoutStopped;
    // 本日分が受付停止になったら、選択中の時刻も取り消す（停止はテイクアウトの当日分だけ）
    const stoppedNow = slotDocStopped && selDate === todayKey() && mode === "takeout";
    if (!submitting && selTime && (occupiedTimes.has(selTime) || stoppedNow)) {
      selTime = null;
      toast(stoppedNow ? "本日の注文受付が終了しました" : "選択していた時刻が埋まりました");
    }
    renderSlots();
  }, e => console.error(e));
}
function unwatchSlots() { if (slotSub) { slotSub(); slotSub = null; } slotDocStopped = false; }
function dateChipList() {
  const list = [];
  // 冷凍予約は翌々日（+2）から、焼きピザは今日から。最終日は bookingEndKey()
  // （通常は1週間先（+7）まで、年末年始は一時的に 2027-01-03 まで延長）
  const from = mode === "frozen" ? 2 : 0;
  const end = bookingEndKey();
  for (let i = from; ; i++) {
    const k = addDays(todayKey(), i).key;
    if (k > end) break;
    list.push(k);
  }
  return list;
}
function renderDateChips(el, selected, onPick) {
  const today = todayKey();
  const tomorrow = addDays(today, 1).key;
  el.innerHTML = dateChipList().map(k => `
    <button data-date="${k}" class="${k === selected ? "active" : ""}" ${isClosedDay(k) ? "disabled" : ""}>
      ${formatDateJP(k)}${k === today ? `<span class="today-badge">今日</span>` : k === tomorrow ? `<span class="today-badge">明日</span>` : ""}${closedReason(k) ? `（${closedReason(k)}）` : ""}
    </button>`).join("");
  el.querySelectorAll("button:not(:disabled)").forEach(b =>
    b.addEventListener("click", () => onPick(b.dataset.date)));
}
function renderCart() {
  if (cart.length === 0) {
    $("cart-list").innerHTML = `<p class="note" style="margin:0;">カートは空です。</p>`;
  } else {
    $("cart-list").innerHTML = cart.map((c, i) => {
      const it = anyById(c.itemId);
      const custom = [
        c.cut ? (c.cut === "cut4" ? "4カット" : c.cut === "cut6" ? "6カット" : "未カット") : null,
        c.pack ? (c.pack === "box" ? "箱（+100円）" : "紙皿・ホイル") : null,
        c.choice || null,
        ...(c.toppings || []),
      ].filter(Boolean).join("／");
      return `<div class="cart-line">
        <div class="grow">
          <div class="nm">${esc(it.name)}</div>
          ${custom ? `<div class="custom">${esc(custom)}</div>` : ""}
          <div class="mini-stepper" style="margin-top:6px;">
            <button data-dec="${i}">−</button><span style="font-weight:800;">${c.qty}</span><button data-inc="${i}">＋</button>
            <button class="del-btn" data-del="${i}">削除</button>
          </div>
        </div>
        <div class="amt">${yen(unitPrice(it, c.toppings, c.pack, c.choice) * c.qty)}</div>
      </div>`;
    }).join("") + `<div style="text-align:right;font-weight:900;font-size:19px;padding-top:10px;">合計 ${yen(cartTotal())}</div>`;
    $("cart-list").querySelectorAll("[data-inc]").forEach(b => b.addEventListener("click", () => {
      const c = cart[+b.dataset.inc]; if (c.qty < MAX_QTY) c.qty++; renderCart(); renderSlots(); updateCartbar(false); refreshCheckoutPickupWarn();
    }));
    $("cart-list").querySelectorAll("[data-dec]").forEach(b => b.addEventListener("click", () => {
      const c = cart[+b.dataset.dec]; if (c.qty > 1) c.qty--; else cart.splice(+b.dataset.dec, 1);
      renderCart(); renderSlots(); updateCartbar(false); refreshCheckoutPickupWarn();
    }));
    $("cart-list").querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", () => {
      cart.splice(+b.dataset.del, 1); renderCart(); renderSlots(); updateCartbar(false); refreshCheckoutPickupWarn();
    }));
  }
  updateSetNotes();
}
function renderSlots() {
  const slots = timeSlots(selDate, cartQty());
  // 厨房が本日のテイクアウト受付を止めている間は、当日枠を全て「受付終了」にする（将来日・冷凍は対象外）
  const stoppedToday = mode === "takeout" && selDate === todayKey() && slotDocStopped;
  if (stoppedToday) selTime = null;
  if (selTime && (!slots.includes(selTime) || occupiedTimes.has(selTime))) selTime = null;
  const lead = leadMinutes(cartQty());
  $("lead-note").textContent = mode === "frozen"
    ? `冷凍ピザはご用意に時間がかかるため、受け取りは翌々日から${formatDateJP(bookingEndKey())}までです。日時はご希望として受け付け、お店が確認して確定します。当日・翌日にお急ぎの場合はお電話ください（0276-70-2321）。`
    : selDate === todayKey()
    ? (cartQty() >= 5 ? `ご注文点数が多いため、最短で${lead}分後からの受け取りになります。` : `最短で${lead}分後からの受け取りになります。`)
    : "営業時間内（11:00〜最終受け取り 月〜土19:30／日曜17:30）でお選びください。";
  // 既に注文が入っている枠（1枠1注文）は選べないようにする。受付停止中は当日枠の全部が対象
  $("slot-grid").innerHTML = slots.map(s => {
    const full = occupiedTimes.has(s) || stoppedToday;
    return `<button data-slot="${s}" class="${s === selTime ? "active" : ""}" ${full ? "disabled" : ""}>${s}${full ? `<span class="full-label">受付終了</span>` : ""}</button>`;
  }).join("");
  $("slot-empty").textContent = stoppedToday
    ? "本日の注文受付は終了しました。明日以降の日付でご注文いただけます。"
    : slots.length === 0
    ? (isClosedDay(selDate) ? (closedReason(selDate) === "定休日" ? "木曜日は定休日です。別の日をお選びください。" : `${closedReason(selDate)}のためお休みです。別の日をお選びください。`) : "本日の受け取り枠は終了しました。別の日をお選びください。")
    : slots.every(s => occupiedTimes.has(s)) ? "この日の受け取り枠はすべて埋まっています。別の日をお選びください。" : "";
  $("slot-grid").querySelectorAll("button:not(:disabled)").forEach(b =>
    b.addEventListener("click", () => { selTime = b.dataset.slot; renderSlots(); }));
  // 日時選択画面の確定ボタンの状態も連動させる
  const pb = $("pickup-proceed");
  if (pb) {
    pb.disabled = !selTime;
    pb.textContent = selTime ? `この日時で注文する（${fmtShort(selDate)} ${selTime}）` : "時刻をお選びください";
  }
}
function openCheckout() {
  // 日時が未選択なら、まず日時選択画面へ（通常はメニュー入場時に選択済み）
  if (mode !== "dinein" && (!pickupSel[mode] || !pickupSel[mode].time)) { startPickupFlow("checkout"); return; }
  sealChoice = null; // カートから入り直したときはシール選択をリセット（従来動作）
  showCheckout();
}
let pickupWarnKind = null;
function setPickupWarn(kind, msg) {
  pickupWarnKind = kind;
  const w = $("pickup-warn");
  if (!w) return;
  w.textContent = msg || "";
  w.classList.toggle("hidden", !msg);
}
function renderPickupSummary() {
  const p = pickupSel[mode];
  $("pickup-summary").textContent = p && p.time ? `${fmtShort(p.date)} ${p.time}` : "未選択";
}
// 会計画面の日時警告を、カート増減に合わせて同期チェックだけで更新する
function refreshCheckoutPickupWarn() {
  if (mode === "dinein" || currentScreen !== "scr-checkout") return;
  const prob = pickupProblemSync();
  if (prob) { setPickupWarn(prob.type, prob.message); return; }
  if (pickupWarnKind === "lead" || pickupWarnKind === "unset" || pickupWarnKind === "advance") setPickupWarn(null, "");
}
// 会計画面に入った時点の日時チェック（受付停止・枠の埋まりは daySlots を読んで確認する）
async function validatePickupAtCheckout() {
  const prob = pickupProblemSync();
  if (prob) { setPickupWarn(prob.type, prob.message); return; }
  if (pickupWarnKind === "lead" || pickupWarnKind === "unset" || pickupWarnKind === "advance") setPickupWarn(null, "");
  if (mode !== "takeout") return;
  try {
    const snap = await getDoc(doc(db, "daySlots", selDate));
    const data = snap.exists() ? snap.data() : {};
    if (selDate === todayKey() && data.takeoutStopped) {
      setPickupWarn("stopped", "本日の注文受付は終了しました。明日以降の日付でご注文いただけます。日時を選び直してください。");
    } else if ((data.taken || {})[selTime]) {
      setPickupWarn("taken", "選択した受け取り時刻は、別のご注文が入りました。日時を選び直してください。");
    } else if (pickupWarnKind === "stopped" || pickupWarnKind === "taken") {
      setPickupWarn(null, "");
    }
  } catch (e) { console.error(e); }
}
function showCheckout() {
  const p = pickupSel[mode];
  if (p && p.date) { selDate = p.date; selTime = p.time; }
  $("seal-group").classList.toggle("hidden", mode !== "frozen");
  renderSeal();
  renderCart();
  renderPickupSummary();
  setPickupWarn(null, "");
  // 入力済みのフォームは保持する。保存済みの名前・電話は、未入力の欄にだけ補完する
  const savedName = localStorage.getItem("ruberie_name") || "";
  const savedPhone = localStorage.getItem("ruberie_phone") || "";
  if (savedName && !$("cust-name").value) $("cust-name").value = savedName;
  if (savedPhone && !$("cust-phone").value) $("cust-phone").value = savedPhone;
  $("order-error").innerHTML = "";
  show("scr-checkout");
  updateSetNotes();
  validatePickupAtCheckout();
}
function pickDate(k) { selDate = k; selTime = null; renderDateChips($("date-chips"), selDate, pickDate); renderSlots(); if (mode !== "frozen") watchSlots(); }

// ---------- 注文送信 ----------
function makeOrderNo() {
  const n = new Date();
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `${mode === "frozen" ? "F" : "T"}-${String(n.getTime()).slice(-8)}${rand}`;
}
let doneUnsub = null;
let sealGuideTimer = null;
function guideToSealChoice() {
  const group = $("seal-group");
  if (!group) return;
  group.scrollIntoView({ behavior: "smooth", block: "center" });
  const field = group.querySelector(".field");
  if (field) field.classList.add("attention");
  toast("温め方のシールが必要かお選びください", 2000);
  clearTimeout(sealGuideTimer);
  sealGuideTimer = setTimeout(() => { if (field) field.classList.remove("attention"); }, 2400);
}
async function submitOrder() {
  const name = $("cust-name").value.trim();
  const phone = normalizePhone($("cust-phone").value);
  const note = $("cust-note").value.trim();
  const err = msg => { $("order-error").innerHTML = `<div class="err" style="margin-top:12px;">${esc(msg)}</div>`; };
  if (cart.length === 0) return err("カートが空です。メニューから商品をお選びください。");
  // 送信は「最初に選んだ日時」で行う。カート増減で最短時刻を過ぎていないか等をここでも再確認する
  const pk = pickupSel[mode];
  if (pk && pk.date) { selDate = pk.date; selTime = pk.time; }
  const prob = pickupProblemSync();
  if (prob) {
    err(prob.message);
    $("pickup-summary-card").scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  if (!selTime) return err("受け取り時刻をお選びください。");
  if (mode === "frozen" && !sealChoice) { guideToSealChoice(); return err("温め方のシールが必要かお選びください。"); }
  if (!name) return err("お名前を入力してください。");
  if (phone.length < 10) return err("電話番号を正しく入力してください。");

  const btn = $("submit-order");
  btn.disabled = true; btn.textContent = "送信中…";
  submitting = true;
  try {
    // ブロック済み番号チェック
    const blockedSnap = await getDoc(doc(db, "blockedPhones", phone));
    if (blockedSnap.exists()) {
      btn.disabled = false; btn.textContent = "この内容で注文を送信する";
      return err("この番号でのご注文はお受けできません。お電話でご注文ください（0276-70-2321）");
    }
    const items = cart.map(c => {
      const it = anyById(c.itemId);
      const up = unitPrice(it, c.toppings, c.pack, c.choice);
      return { itemId: c.itemId, name: it.name, qty: c.qty, unitPrice: up, lineTotal: up * c.qty,
               cut: c.cut, pack: c.pack, choice: c.choice || null, toppings: c.toppings || [] };
    });
    const orderNo = makeOrderNo();
    const orderData = {
      orderNo, name, phone, note,
      kind: mode === "frozen" ? "frozen" : "takeout",
      setMeal: setEligibleTakeout(),
      seal: mode === "frozen" ? sealChoice : null,
      items, total: cartTotal(), totalQty: cartQty(),
      pickupDate: selDate, requestedDate: selDate, pickupTime: selTime, requestedPickup: selTime,
      confirmedPickup: null, confirmedDate: null, status: "pending",
      createdAt: serverTimestamp(),
    };
    let ref;
    if (mode === "frozen") {
      // 冷凍予約は枠を占有しない
      ref = await addDoc(collection(db, "takeoutOrders"), orderData);
    } else {
      // 焼きピザは「1枠1注文」：枠の日次サマリ（daySlots）と注文を同じトランザクションで確定する
      const orderRef = doc(collection(db, "takeoutOrders"));
      const slotRef = doc(db, "daySlots", selDate);
      try {
        await runTransaction(db, async (tx) => {
          const s = await tx.get(slotRef);
          const sdata = s.exists() ? s.data() : {};
          // 厨房が本日の受付を止めた直後に送信された当日注文は、ここで確実に弾く（この分岐はテイクアウトのみ）
          if (selDate === todayKey() && sdata.takeoutStopped) throw new Error("today-stopped");
          const taken = sdata.taken || {};
          if (taken[selTime]) throw new Error("slot-taken");
          tx.set(slotRef, { taken: { ...taken, [selTime]: orderNo } });
          tx.set(orderRef, orderData);
        });
      } catch (e) {
        if (e && e.message === "today-stopped") {
          btn.disabled = false; btn.textContent = "この内容で注文を送信する";
          // カートとフォームは保持したまま、日時だけ選び直してもらう
          toast("本日の注文受付が終了したため、注文できませんでした。日時を選び直してください", 4000);
          startPickupFlow("checkout");
          return;
        }
        if (e && e.message === "slot-taken") {
          btn.disabled = false; btn.textContent = "この内容で注文を送信する";
          // カートとフォームは保持したまま、日時だけ選び直してもらう
          toast("その受け取り時刻は別のご注文が入りました。別の時刻をお選びください", 4000);
          startPickupFlow("checkout");
          return;
        }
        throw e;
      }
      ref = orderRef;
    }
    // この端末の注文として記録（注文状況の確認はこの端末の記録から行う）
    try {
      const mine = JSON.parse(localStorage.getItem("ruberie_my_orders") || "[]");
      mine.push({ id: ref.id, orderNo, pickupDate: selDate, requestedDate: selDate });
      localStorage.setItem("ruberie_my_orders", JSON.stringify(mine.slice(-12)));
    } catch (e) { /* 保存できなくても注文は完了させる */ }
    localStorage.setItem("ruberie_name", name);
    localStorage.setItem("ruberie_phone", phone);
    cart.length = 0; updateCartbar(false);
    unwatchSlots();
    showDone(ref.id, orderNo);
  } catch (e) {
    console.error(e);
    err("送信に失敗しました。通信環境をご確認のうえ、もう一度お試しください。");
  } finally {
    submitting = false;
    btn.disabled = false; btn.textContent = "この内容で注文を送信する";
  }
}

// ---------- 注文状況の専用リンク（ブラウザ・端末が変わっても確認できる） ----------
// 注文IDだけを含むURL。電話番号や名前は入れない。IDを知っている人だけが単体取得できる
// （firestore.rules: takeoutOrders は get のみ全公開・list は厨房のみ）。
const SITE_TOP_URL = "https://lebelierora.github.io/lebelier/";
function statusUrlFor(id) { return `${SITE_TOP_URL}?order=${encodeURIComponent(id)}`; }
async function copyTextToClipboard(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch (e) { /* フォールバックへ */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return !!ok;
  } catch (e) { return false; }
}
// 完了画面の「注文状況の確認」欄：スクリーンショット1枚で受け取り予定とQRが残る形にする
function renderDoneLink(docId, o) {
  const box = $("done-link");
  if (!box) return;
  const url = statusUrlFor(docId);
  // 受け取り日時は注文時点では「ご希望」。確定で変わる場合があるため断定表現にしない
  const dateKey = o.pickupDate || o.requestedDate;
  const dateStr = dateKey ? formatDateJP(dateKey).replace(/^\d+年/, "") : "";
  const timeStr = o.requestedPickup || "";
  let qrHtml = "";
  try {
    if (typeof qrcode === "function") {
      const qr = qrcode(0, "M");
      qr.addData(url);
      qr.make();
      qrHtml = qr.createSvgTag(4, 6);
    }
  } catch (e) { console.error(e); qrHtml = ""; }
  box.innerHTML = `
    <h2 style="margin:6px 0;">注文状況の確認</h2>
    <p style="font-weight:900;font-size:18px;margin:8px 0;">この画面をスクリーンショットで保存してください</p>
    <p class="note" style="margin:0 0 12px;">あとからでも、下のQRコード／リンクを開くと注文状況を確認できます（別のブラウザやスマホでも見られます）。</p>
    <div style="font-weight:900;font-size:21px;line-height:1.55;">るべりえ<br>お受け取り予定：${esc(dateStr)}${timeStr ? ` ${esc(timeStr)}` : ""}</div>
    <p class="note" style="margin:2px 0 10px;">※お受け取り日時はご希望です。お店の確定で変更になる場合があります</p>
    <div style="margin:12px 0 2px;font-weight:800;">注文番号</div>
    <div style="font-weight:900;font-size:46px;letter-spacing:.06em;line-height:1.15;">${esc(orderCodeFromId(docId))}</div>
    <p class="note" style="margin:2px 0 10px;">お受け取りのとき、この番号をお見せください</p>
    ${qrHtml ? `<div style="margin:4px auto;">${qrHtml}</div>` : ""}
    <div style="word-break:break-all;font-size:13px;margin:10px 0;">${esc(url)}</div>
    <button class="btn" id="done-copy-link">リンクをコピー</button>
    <p class="note" id="done-copy-msg" style="margin:8px 0 0;"></p>`;
  box.classList.remove("hidden");
  const svg = box.querySelector("svg");
  if (svg) { svg.style.width = "180px"; svg.style.height = "180px"; }
  $("done-copy-link").addEventListener("click", async () => {
    const ok = await copyTextToClipboard(url);
    $("done-copy-msg").textContent = ok ? "リンクをコピーしました" : "コピーできませんでした。上のリンクを長押ししてコピーしてください";
  });
}
function clearDoneLink() {
  const box = $("done-link");
  if (!box) return;
  box.classList.add("hidden");
  box.innerHTML = "";
  delete box.dataset.forId;
}

// ---------- 完了画面（ライブ更新） ----------
function statusChip(st) {
  return { pending: `<span class="status-chip status-pending">確認待ち</span>`,
           confirmed: `<span class="status-chip status-confirmed">確定</span>`,
           done: `<span class="status-chip status-done">お渡し済み</span>`,
           noshow: `<span class="status-chip status-noshow">来店なし</span>`,
           cancelled: `<span class="status-chip status-cancelled">取り消し</span>` }[st] || st;
}
function showDone(docId, orderNo) {
  show("scr-done");
  $("done-dinein-extra").classList.add("hidden");
  clearDoneLink();
  if (dineinDoneUnsub) { dineinDoneUnsub(); dineinDoneUnsub = null; }
  if (doneUnsub) doneUnsub();
  doneUnsub = onSnapshot(doc(db, "takeoutOrders", docId), snap => {
    if (!snap.exists()) return;
    const o = snap.data();
    // 専用リンク欄は注文ごとに1回だけ描く（状態更新のたびに描き直さない）
    const linkBox = $("done-link");
    if (linkBox && linkBox.dataset.forId !== docId) { renderDoneLink(docId, o); linkBox.dataset.forId = docId; }
    let html = `<div class="card" style="text-align:center;">`;
    if (o.kind === "frozen") html += `<p class="note" style="font-weight:900;font-size:16px;">冷凍ピザの店頭予約</p><div class="frozen-banner">🧊 ご来店の際は、保冷バッグと保冷剤をご持参ください（冷凍ピザのお持ち帰り用です）</div>`;
    if (o.kind === "frozen" && o.seal) html += `<p class="note" style="font-weight:800;">温め方のシール：${o.seal === "none" ? "不用（お付けしません）" : "必要"}</p>`;
    if (o.setMeal) html += `<p class="set-note" style="text-align:left;">🍕 平日セット対象です。揚げ物をサービスでお付けします。</p>`;
    if (o.status === "pending") {
      html += `<div style="font-size:40px;">⌛</div>
        <h2 style="margin:8px 0;">お店の確認待ちです。確定までお待ちください</h2>
        <p class="note">この画面を開いたままでいると、確定が自動で表示されます。<br>閉じてしまった場合は、トップの「注文状況を見る」から確認できます。</p>`;
    } else if (o.status === "confirmed") {
      const changed = o.confirmedPickup && o.confirmedPickup !== o.requestedPickup;
      const dateChanged = o.confirmedDate && o.requestedDate && o.confirmedDate !== o.requestedDate;
      html += `<div style="font-size:40px;">✅</div>
        <h2 style="margin:8px 0;color:var(--ok);">ご注文が確定しました</h2>
        ${dateChanged ? `<p style="font-weight:800;color:var(--warn);">受け取り日が ${esc(formatDateJP(o.confirmedDate))} に変更になりました</p>` : ""}
        ${changed ? `<p style="font-weight:800;color:var(--warn);">受け取り時刻が ${esc(o.confirmedPickup)} に変更になりました</p>` : ""}
        <p class="note" style="margin-bottom:2px;">受け取り日時</p>
        <div class="big-time">${esc(formatDateJP(o.pickupDate))}<br>${esc(o.confirmedPickup || o.requestedPickup)}</div>`;
    } else if (o.status === "done") {
      html += `<h2 style="margin:8px 0;">お渡し済みです。ありがとうございました</h2>`;
    } else if (o.status === "noshow") {
      html += `<h2 style="margin:8px 0;">このご注文は「来店なし」として処理されました</h2>
        <p class="note">ご不明な点はお電話ください（0276-70-2321）。</p>`;
    } else if (o.status === "cancelled") {
      html += `<h2 style="margin:8px 0;">このご注文は取り消しになりました</h2>
        <p class="note">ご不明な点はお電話ください（0276-70-2321）。</p>`;
    }
    html += `<div style="margin-top:14px;"><div style="font-weight:800;">注文番号</div><div style="font-weight:900;font-size:40px;letter-spacing:.06em;line-height:1.15;">${esc(orderCodeFromId(docId))}</div></div>
    <p class="note" style="margin-top:8px;">
      受け取り日時：${esc(formatDateJP(o.pickupDate))} ${esc(o.requestedPickup)}
      ${o.confirmedPickup && o.confirmedPickup !== o.requestedPickup ? `（確定：${esc(o.confirmedPickup)}）` : ""}<br>
      合計：${yen(o.total)}（お支払いは受け取り時にレジでお願いします）</p></div>`;
    $("done-body").innerHTML = html;
  });
}

// ---------- 注文状況 ----------
let statusDate = todayKey();
let statusUnsubs = [];
let statusData = {};
function pickStatusDate(k) { statusDate = k; renderDateChips($("status-date-chips"), statusDate, pickStatusDate); searchStatus(); }
function searchStatus() {
  statusUnsubs.forEach(u => u()); statusUnsubs = []; statusData = {};
  let mine = [];
  try { mine = JSON.parse(localStorage.getItem("ruberie_my_orders") || "[]"); } catch (e) { mine = []; }
  mine = mine.filter(m => m.pickupDate === statusDate || m.requestedDate === statusDate);
  if (mine.length === 0) {
    $("status-results").innerHTML = `<div class="card"><p class="note" style="margin:0;">${esc(formatDateJP(statusDate))}のご注文は見つかりませんでした。<br>この端末で注文した分だけが表示されます。別の端末で注文した場合は、お電話でお問い合わせください。</p></div>`;
    return;
  }
  mine.forEach(m => {
    statusUnsubs.push(onSnapshot(doc(db, "takeoutOrders", m.id), snap => {
      if (snap.exists()) { statusData[m.id] = { ...snap.data(), _id: m.id }; renderStatusResults(); }
    }, e => console.error(e)));
  });
}
function renderStatusResults() {
    // 厨房が受け取り日を変更した場合（冷凍予約）でも見つかるよう、
    // 確定日と希望日のどちらか一致で拾う
  const orders = Object.values(statusData)
      .filter(o => o.pickupDate === statusDate || o.requestedDate === statusDate)
      .sort((a, b) => (a.confirmedPickup || a.requestedPickup).localeCompare(b.confirmedPickup || b.requestedPickup));
    if (orders.length === 0) {
      $("status-results").innerHTML = `<div class="card"><p class="note" style="margin:0;">${esc(formatDateJP(statusDate))}のご注文は見つかりませんでした。</p></div>`;
      return;
    }
    $("status-results").innerHTML = `<h3>${esc(formatDateJP(statusDate))}のご注文（${orders.length}件）</h3>` +
      orders.map(o => `<div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
          <span><span class="note" style="display:block;">注文番号${o.kind === "frozen" ? "（冷凍ピザ予約）" : ""}</span><span style="font-weight:900;font-size:30px;letter-spacing:.05em;">${esc(orderCodeFromId(o._id))}</span></span>${statusChip(o.status)}
        </div>
        <div class="big-time" style="font-size:26px;margin-top:8px;">受け取り：${esc(o.confirmedPickup || o.requestedPickup)}</div>
        ${o.setMeal ? `<p class="set-note">🍕 平日セット対象です。揚げ物をサービスでお付けします。</p>` : ""}
        ${o.status === "confirmed" && o.confirmedDate && o.requestedDate && o.confirmedDate !== o.requestedDate
          ? `<p style="font-weight:800;color:var(--warn);margin:4px 0;">受け取り日が ${esc(formatDateJP(o.confirmedDate))} に変更になりました</p>` : ""}
        ${o.status === "confirmed" && o.confirmedPickup && o.confirmedPickup !== o.requestedPickup
          ? `<p style="font-weight:800;color:var(--warn);margin:4px 0;">受け取り時刻が ${esc(o.confirmedPickup)} に変更になりました</p>` : ""}
        <div style="margin-top:8px;">${(o.items || []).map(i => {
          const custom = [i.cut ? (i.cut === "cut4" ? "4カット" : i.cut === "cut6" ? "6カット" : "未カット") : null,
                          i.pack ? (i.pack === "box" ? "箱" : "紙皿・ホイル") : null,
                          i.choice || null,
                          ...(i.toppings || [])].filter(Boolean).join("／");
          return `<div>${esc(i.name)} × ${i.qty}${custom ? `<span class="note">（${esc(custom)}）</span>` : ""}</div>`;
        }).join("")}</div>
        <div style="text-align:right;font-weight:900;margin-top:6px;">合計 ${yen(o.total)}</div>
        <button class="btn ghost small" data-copy-link="${esc(o._id)}" style="margin-top:10px;">確認リンクをコピー</button>
      </div>`).join("");
    $("status-results").querySelectorAll("[data-copy-link]").forEach(b =>
      b.addEventListener("click", async () => {
        const ok = await copyTextToClipboard(statusUrlFor(b.dataset.copyLink));
        toast(ok ? "リンクをコピーしました" : "コピーできませんでした", 2500);
      }));
}

// ---------- 店内オーダー ----------
function renderSeatGrid() {
  $("seat-grid").innerHTML = SEATS.map(s =>
    `<button data-seat="${s.id}">${esc(s.label)}</button>`).join("");
  $("seat-grid").querySelectorAll("button").forEach(b =>
    b.addEventListener("click", () => { seat = b.dataset.seat; enterDineinMenu(); }));
}
function enterDinein() {
  setMode("dinein");
  if (seat) enterDineinMenu();
  else { renderSeatGrid(); show("scr-seat"); }
}
function enterDineinMenu() {
  $("dinein-seat-label").textContent = seatLabel(seat);
  $("call-msg-order").textContent = "";
  renderTabs(); renderGrid();
  show("scr-order");
}
function renderDineinCart() {
  if (cart.length === 0) {
    $("dinein-cart-list").innerHTML = `<p class="note" style="margin:0;">カートは空です。</p>`;
  } else {
    $("dinein-cart-list").innerHTML = cart.map((c, i) => {
      const it = anyById(c.itemId);
      const custom = [
        c.cut ? (c.cut === "cut4" ? "4カット" : c.cut === "cut6" ? "6カット" : "未カット") : null,
        c.choice || null,
        ...(c.toppings || []),
        (c.timing && c.timing !== "すぐ提供" && c.timing !== "できた順" && c.timing !== "でき次第") ? `提供：${c.timing}` : null,
      ].filter(Boolean).join("／");
      return `<div class="cart-line">
        <div class="grow">
          <div class="nm">${esc(it.name)}</div>
          ${custom ? `<div class="custom">${esc(custom)}</div>` : ""}
          <div class="mini-stepper" style="margin-top:6px;">
            <button data-ddec="${i}">−</button><span style="font-weight:800;">${c.qty}</span><button data-dinc="${i}">＋</button>
            <button class="del-btn" data-ddel="${i}">削除</button>
          </div>
        </div>
        <div class="amt">${yen(unitPrice(it, c.toppings, c.pack, c.choice) * c.qty)}</div>
      </div>`;
    }).join("") + `<div style="text-align:right;font-weight:900;font-size:19px;padding-top:10px;">合計 ${yen(cartTotal())}</div>`;
    $("dinein-cart-list").querySelectorAll("[data-dinc]").forEach(b => b.addEventListener("click", () => {
      const c = cart[+b.dataset.dinc]; if (c.qty < MAX_QTY) c.qty++; renderDineinCart(); updateCartbar(false);
    }));
    $("dinein-cart-list").querySelectorAll("[data-ddec]").forEach(b => b.addEventListener("click", () => {
      const c = cart[+b.dataset.ddec]; if (c.qty > 1) c.qty--; else cart.splice(+b.dataset.ddec, 1);
      renderDineinCart(); updateCartbar(false);
    }));
    $("dinein-cart-list").querySelectorAll("[data-ddel]").forEach(b => b.addEventListener("click", () => {
      cart.splice(+b.dataset.ddel, 1); renderDineinCart(); updateCartbar(false);
    }));
  }
  updateSetNotes();
}
function openDineinCheckout() {
  $("dinein-checkout-seat").textContent = seatLabel(seat);
  $("dinein-error").innerHTML = "";
  $("call-msg-checkout").textContent = "";
  renderDineinCart();
  show("scr-dinein");
}
function makeDineinNo() {
  const n = new Date();
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `D-${String(n.getTime()).slice(-8)}${rand}`;
}
let dineinDoneUnsub = null;
async function submitDinein() {
  const err = msg => { $("dinein-error").innerHTML = `<div class="err" style="margin-top:12px;">${esc(msg)}</div>`; };
  if (!seat) return err("お席が選ばれていません。メニュー画面からお席を選び直してください。");
  if (cart.length === 0) return err("カートが空です。メニューから商品をお選びください。");
  const btn = $("submit-dinein");
  btn.disabled = true; btn.textContent = "送信中…";
  try {
    const items = cart.map(c => {
      const it = anyById(c.itemId);
      const up = unitPrice(it, c.toppings, null, c.choice);
      return { itemId: c.itemId, name: it.name, qty: c.qty, unitPrice: up, lineTotal: up * c.qty,
               cut: c.cut, pack: null, choice: c.choice || null, toppings: c.toppings || [], timing: c.timing || null };
    });
    const orderNo = makeDineinNo();
    const ref = await addDoc(collection(db, "dineInOrders"), {
      orderNo, seat, seatLabel: seatLabel(seat),
      items, total: cartTotal(), totalQty: cartQty(),
      status: "pending",
      createdAt: serverTimestamp(),
    });
    cart.length = 0; updateCartbar(false);
    showDineinDone(ref.id, orderNo);
  } catch (e) {
    console.error(e);
    err("送信に失敗しました。通信環境をご確認のうえ、もう一度お試しください。");
  } finally {
    btn.disabled = false; btn.textContent = "この内容で注文する";
  }
}
function showDineinDone(docId, orderNo) {
  show("scr-done");
  clearDoneLink(); // 専用リンクはテイクアウト・冷凍専用。店内では出さない
  $("done-dinein-extra").classList.remove("hidden");
  $("call-msg-done").textContent = "";
  if (doneUnsub) { doneUnsub(); doneUnsub = null; }
  if (dineinDoneUnsub) dineinDoneUnsub();
  dineinDoneUnsub = onSnapshot(doc(db, "dineInOrders", docId), snap => {
    if (!snap.exists()) return;
    const o = snap.data();
    let html = `<div class="card" style="text-align:center;">`;
    if (o.status === "pending") {
      html += `<div style="font-size:40px;">⌛</div>
        <h2 style="margin:8px 0;">お店の確認待ちです。確定までお待ちください</h2>
        <p class="note">この画面を開いたままでいると、受付状況が自動で表示されます。</p>`;
    } else if (o.status === "accepted") {
      html += `<div style="font-size:40px;">🔔</div>
        <h2 style="margin:8px 0;color:var(--ok);">受付しました</h2>
        <p class="note">ご用意でき次第、お席までお持ちします。</p>`;
    } else if (o.status === "done") {
      html += `<h2 style="margin:8px 0;">提供済みです。ありがとうございました</h2>`;
    }
    html += `<div style="margin-top:14px;"><div style="font-weight:800;">注文番号</div><div style="font-weight:900;font-size:40px;letter-spacing:.06em;line-height:1.15;">${esc(orderCodeFromId(docId))}</div></div>
    <p class="note" style="margin-top:8px;">
      お席：${esc(o.seatLabel || seatLabel(o.seat))}<br>
      合計：${yen(o.total)}（お会計はお帰りの際にレジでお願いします）</p></div>`;
    $("done-body").innerHTML = html;
  });
}

// ---------- 店員を呼ぶ ----------
let callBusy = false;
// 呼び出しの用件（後から増やすときはこのリストに足すだけ）
const CALL_PURPOSES = ["通常の呼び出し", "食後のドリンクをお願いします", "食後のスイーツをお願いします", "空いた食器を下げてください", "お会計をお願いします"];
let pendingCallMsg = null;
function openCallModal(msgEl) {
  if (!seat) { msgEl.textContent = "先にお席をお選びください。"; return; }
  pendingCallMsg = msgEl;
  $("call-purposes").innerHTML = CALL_PURPOSES.map(p =>
    `<button class="btn ghost" data-purpose="${esc(p)}" style="margin-top:8px;">${esc(p)}</button>`).join("") +
    `<button class="btn ghost" data-custom="1" style="margin-top:8px;">その他のご要望</button>`;
  $("call-purposes").querySelectorAll("[data-purpose]").forEach(b =>
    b.addEventListener("click", () => { $("call-modal").classList.add("hidden"); callStaff(pendingCallMsg, b.dataset.purpose); }));
  $("call-purposes").querySelector("[data-custom]").addEventListener("click", () => {
    $("call-custom").classList.remove("hidden");
    $("call-custom-input").focus();
  });
  // 自由記入欄はモーダルを開くたびにリセットする
  $("call-custom").classList.add("hidden");
  $("call-custom-input").value = "";
  $("call-custom-send").disabled = true;
  $("call-modal").classList.remove("hidden");
}
async function callStaff(msgEl, purpose, custom) {
  if (!seat) { msgEl.textContent = "先にお席をお選びください。"; return; }
  if (callBusy) return;
  callBusy = true;
  try {
    await addDoc(collection(db, "calls"), {
      seat, seatLabel: seatLabel(seat), status: "open",
      purpose: purpose || "通常の呼び出し",
      ...(custom ? { custom: true } : {}),
      createdAt: serverTimestamp(),
    });
    msgEl.textContent = "店員をお呼びしました。お席まで伺います。";
    toast("店員をお呼びしました。お席まで伺います", 3500);
  } catch (e) {
    console.error(e);
    msgEl.textContent = "呼び出しに失敗しました。お近くの店員にお声がけください。";
    toast("呼び出しに失敗しました。お近くの店員にお声がけください", 4000);
  }
  setTimeout(() => { callBusy = false; }, 3000);
}

// ---------- 初期化 ----------
// ご案内アコーディオン（初期状態は全て閉）
document.querySelectorAll(".guide-toggle").forEach(btn => {
  btn.addEventListener("click", () => {
    const body = btn.parentElement.querySelector(".guide-body");
    const open = btn.getAttribute("aria-expanded") === "true";
    btn.setAttribute("aria-expanded", String(!open));
    body.classList.toggle("hidden", open);
  });
});

$("go-order").addEventListener("click", () => {
  setMode("takeout"); currentCat = "seasonal";
  // 日時が選択済みならそのままメニューへ。未選択なら最初に日時を選んでもらう
  if (pickupSel.takeout.time) { updatePickupBar(); renderTabs(); renderGrid(); show("scr-order"); }
  else startPickupFlow("menu");
});
$("pickup-proceed").addEventListener("click", finishPickupFlow);
$("pickup-back").addEventListener("click", backFromPickupFlow);
$("pickup-change").addEventListener("click", () => startPickupFlow("menu"));
$("change-pickup").addEventListener("click", () => startPickupFlow("checkout"));
function renderSeal() {
  const y = $("seal-yes"), n = $("seal-no");
  if (!y || !n) return;
  y.classList.toggle("active", sealChoice === "need");
  n.classList.toggle("active", sealChoice === "none");
}
$("seal-yes").addEventListener("click", () => { sealChoice = "need"; renderSeal(); });
$("seal-no").addEventListener("click", () => { sealChoice = "none"; renderSeal(); });
$("go-frozen").addEventListener("click", () => {
  setMode("frozen"); currentCat = "fz-set";
  if (pickupSel.frozen.time) { updatePickupBar(); renderTabs(); renderGrid(); show("scr-order"); }
  else startPickupFlow("menu");
});
$("seat-back").addEventListener("click", () => { setMode("takeout"); show("scr-home"); });
$("dinein-back").addEventListener("click", () => show("scr-order"));
$("submit-dinein").addEventListener("click", submitDinein);
$("call-btn-order").addEventListener("click", () => openCallModal($("call-msg-order")));
// 店内→テイクアウトへの一方向リンク（店内バーの中だけに置く。逆向きの入口は作らない）
// カートはモード別にメモリ保持で永続化されないため、移動（再読み込み）で店内カートは消える。
// 店内限定商品がテイクアウト注文に混ざることはないが、カートが空になることだけ事前に確認する。
$("to-takeout").addEventListener("click", e => {
  const q = carts.dinein.reduce((a, c) => a + c.qty, 0);
  if (q > 0 && !confirm("テイクアウトのページへ移動すると、店内オーダーのカートは空になります。移動しますか？")) e.preventDefault();
});
$("call-btn-checkout").addEventListener("click", () => openCallModal($("call-msg-checkout")));
$("call-btn-done").addEventListener("click", () => openCallModal($("call-msg-done")));
$("call-custom-input").addEventListener("input", () => {
  $("call-custom-send").disabled = $("call-custom-input").value.trim().length === 0;
});
$("call-custom-send").addEventListener("click", () => {
  const text = $("call-custom-input").value.trim().slice(0, 50);
  if (!text || !pendingCallMsg) return;
  $("call-modal").classList.add("hidden");
  $("call-custom").classList.add("hidden");
  $("call-custom-input").value = "";
  $("call-custom-send").disabled = true;
  callStaff(pendingCallMsg, text, true);
});
$("call-cancel").addEventListener("click", () => $("call-modal").classList.add("hidden"));
$("call-modal").addEventListener("click", e => { if (e.target === $("call-modal")) $("call-modal").classList.add("hidden"); });
$("done-more").addEventListener("click", () => {
  if (dineinDoneUnsub) dineinDoneUnsub();
  $("done-dinein-extra").classList.add("hidden");
  enterDineinMenu();
});
$("go-status").addEventListener("click", () => {
  statusDate = todayKey();
  renderDateChips($("status-date-chips"), statusDate, pickStatusDate);
  searchStatus();
  show("scr-status");
});
$("detail-back").addEventListener("click", () => show("scr-order"));
$("checkout-back").addEventListener("click", () => { unwatchSlots(); show("scr-order"); });
$("status-back").addEventListener("click", () => show("scr-home"));
$("done-home").addEventListener("click", () => {
  if (doneUnsub) doneUnsub();
  if (dineinDoneUnsub) dineinDoneUnsub();
  $("done-dinein-extra").classList.add("hidden");
  setMode("takeout");
  show("scr-home");
});
$("detailbar-add").addEventListener("click", tryAddDetailToCart);
$("cartbar-btn").addEventListener("click", () => {
  if (cartQty() === 0) return;
  if (mode === "dinein") openDineinCheckout(); else openCheckout();
});
$("submit-order").addEventListener("click", submitOrder);
updateCartbar(false);
// 専用リンク（?order=注文ID）で開かれた場合は、その注文の状況を直接表示する。
// 端末の記録が空でも（別のブラウザ・スマホでも）IDで単体取得して表示できる。
const orderParam = new URLSearchParams(location.search).get("order");
async function openLinkedOrder(id) {
  show("scr-status");
  $("status-results").innerHTML = `<div class="card"><p class="note" style="margin:0;">注文状況を読み込んでいます…</p></div>`;
  try {
    const snap = await getDoc(doc(db, "takeoutOrders", id));
    if (!snap.exists()) throw new Error("not-found");
    const o = snap.data();
    // この端末の記録にも加えて、通常の注文状況表示（ライブ更新）に合流させる
    try {
      const mine = JSON.parse(localStorage.getItem("ruberie_my_orders") || "[]");
      if (!mine.some(m => m.id === id)) {
        mine.push({ id, orderNo: o.orderNo, pickupDate: o.pickupDate, requestedDate: o.requestedDate || o.pickupDate });
        localStorage.setItem("ruberie_my_orders", JSON.stringify(mine.slice(-12)));
      }
    } catch (e) { /* 保存できなくても表示は続ける */ }
    statusDate = o.pickupDate || o.requestedDate || todayKey();
    renderDateChips($("status-date-chips"), statusDate, pickStatusDate);
    searchStatus();
  } catch (e) {
    console.error(e);
    $("status-results").innerHTML = `<div class="card"><p class="note" style="margin:0;">ご注文が見つかりませんでした。<br>お手数ですが、お電話でお問い合わせください（<a href="tel:0276702321">0276-70-2321</a>）</p></div>`;
  }
}
if (orderParam) openLinkedOrder(orderParam);
// 席別QR（?seat=）で開かれた場合は、その席で店内オーダーを直接開始する
if (seatFixed) enterDinein();
