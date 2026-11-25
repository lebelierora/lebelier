// お客さん側ロジック：メニュー表示 → カスタマイズ → カート → 日時選択 → 送信 → ライブ状況
import { db } from "./firebase-config.js";
import {
  collection, addDoc, getDocs, query, where, doc, onSnapshot, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  CATEGORIES, MENU, CUT_PACK_CATS, MAX_QTY, menuById, unitPrice,
  todayKey, addDays, formatDateJP, isThursday, timeSlots, leadMinutes,
  normalizePhone, esc, yen,
} from "./menu.js";

const $ = id => document.getElementById(id);
const screens = ["scr-home", "scr-order", "scr-detail", "scr-checkout", "scr-done", "scr-status"];
function show(id) {
  screens.forEach(s => $(s).classList.toggle("hidden", s !== id));
  $("cartbar").classList.toggle("hidden", !(id === "scr-order" || id === "scr-detail"));
  window.scrollTo(0, 0);
}

// ---------- カート ----------
let cart = []; // {itemId, qty, cut, pack, toppings:[label]}
function cartQty() { return cart.reduce((a, c) => a + c.qty, 0); }
function cartTotal() {
  return cart.reduce((a, c) => a + unitPrice(menuById(c.itemId), c.toppings, c.pack) * c.qty, 0);
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
function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 1200); // 1.2秒
}

// ---------- メニュー ----------
let currentCat = "hall";
function renderTabs() {
  $("cat-tabs").innerHTML = CATEGORIES.map(c =>
    `<button data-cat="${c.id}" class="${c.id === currentCat ? "active" : ""}">${esc(c.name)}</button>`).join("");
  $("cat-tabs").querySelectorAll("button").forEach(b =>
    b.addEventListener("click", () => { currentCat = b.dataset.cat; renderTabs(); renderGrid(); }));
}
function renderGrid() {
  $("item-grid").innerHTML = MENU.filter(m => m.cat === currentCat).map(m => `
    <button class="item" data-id="${m.id}">
      <img src="${esc(m.img)}" alt="${esc(m.name)}" loading="lazy">
      <div class="body">
        <div class="name">${esc(m.name)}</div>
        <div class="desc">${esc(m.desc)}</div>
        <div class="price">${yen(m.price)}</div>
      </div>
    </button>`).join("");
  $("item-grid").querySelectorAll(".item").forEach(b =>
    b.addEventListener("click", () => openDetail(b.dataset.id)));
}

// ---------- 商品詳細 ----------
let detail = null; // {item, cut, pack, toppings:Set, qty}
function openDetail(id) {
  const item = menuById(id);
  detail = { item, cut: "nocut", pack: "paper", toppings: new Set(), qty: 1 };
  renderDetail();
  show("scr-detail");
}
function hasCutPack(item) { return CUT_PACK_CATS.includes(item.cat); }
function detailUnit() { return unitPrice(detail.item, [...detail.toppings], detail.pack); }
function renderDetail() {
  const it = detail.item;
  let html = `
    <div class="card" style="padding:0;overflow:hidden;">
      <img src="${esc(it.img)}" alt="${esc(it.name)}" style="width:100%;aspect-ratio:16/9;object-fit:cover;display:block;">
      <div style="padding:14px;">
        <div style="font-size:20px;font-weight:900;">${esc(it.name)}</div>
        <div class="note" style="margin-top:4px;">${esc(it.desc)}</div>
        <div style="font-weight:900;font-size:19px;margin-top:8px;">${yen(it.price)}</div>
      </div>
    </div>`;
  if (hasCutPack(it)) {
    const boxDisabledByCut = detail.cut === "cut4";
    const boxDisabled = it.noBox || boxDisabledByCut;
    html += `
    <div class="opt-group">
      <div class="label">カット</div>
      <div class="opt-row">
        <button id="cut-nocut" class="${detail.cut === "nocut" ? "active" : ""}">未カット</button>
        <button id="cut-cut4" class="${detail.cut === "cut4" ? "active" : ""}" ${detail.pack === "box" ? "disabled" : ""}>4カット</button>
      </div>
      ${detail.pack === "box" ? `<div class="opt-note">箱はカットなしのお渡しです</div>` : ""}
    </div>
    <div class="opt-group">
      <div class="label">包装</div>
      <div class="opt-row">
        <button id="pack-paper" class="${detail.pack === "paper" ? "active" : ""}">紙皿・ホイル（無料）</button>
        <button id="pack-box" class="${detail.pack === "box" ? "active" : ""}" ${boxDisabled ? "disabled" : ""}>箱（+100円）</button>
      </div>
      ${it.noBox ? `<div class="opt-note">バターがこぼれやすいため、箱での提供はしていません</div>`
                 : boxDisabledByCut ? `<div class="opt-note">箱はカットなしのお渡しです</div>` : ""}
    </div>`;
  }
  if ((it.toppings || []).length) {
    html += `<div class="opt-group"><div class="label">トッピング・変更</div><div class="check-row">` +
      it.toppings.map(t => `
        <label><span>${esc(t.label)} <span style="color:var(--red-dark);">+${yen(t.delta)}</span></span>
        <input type="checkbox" data-top="${esc(t.label)}" ${detail.toppings.has(t.label) ? "checked" : ""}></label>`).join("") +
      `</div></div>`;
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

  if (hasCutPack(it)) {
    $("cut-nocut").addEventListener("click", () => { detail.cut = "nocut"; renderDetail(); });
    $("cut-cut4").addEventListener("click", () => { detail.cut = "cut4"; if (detail.pack === "box") detail.pack = "paper"; renderDetail(); });
    $("pack-paper").addEventListener("click", () => { detail.pack = "paper"; renderDetail(); });
    const boxBtn = $("pack-box");
    if (boxBtn && !boxBtn.disabled) boxBtn.addEventListener("click", () => { detail.pack = "box"; detail.cut = "nocut"; renderDetail(); });
  }
  $("detail-body").querySelectorAll("[data-top]").forEach(cb =>
    cb.addEventListener("change", () => { cb.checked ? detail.toppings.add(cb.dataset.top) : detail.toppings.delete(cb.dataset.top); renderDetail(); }));
  $("qty-minus").addEventListener("click", () => { if (detail.qty > 1) detail.qty--; renderDetail(); });
  $("qty-plus").addEventListener("click", () => { if (detail.qty < MAX_QTY) detail.qty++; renderDetail(); });
  $("add-cart").addEventListener("click", () => {
    cart.push({ itemId: it.id, qty: detail.qty, cut: hasCutPack(it) ? detail.cut : null,
                pack: hasCutPack(it) ? detail.pack : null, toppings: [...detail.toppings] });
    updateCartbar(true);
    toast(`${it.name}をカートに入れました`);
    show("scr-order");
  });
}

// ---------- チェックアウト ----------
let selDate = todayKey();
let selTime = null;
function dateChipList() {
  const list = [];
  for (let i = 0; i <= 7; i++) list.push(addDays(todayKey(), i).key);
  return list;
}
function renderDateChips(el, selected, onPick) {
  el.innerHTML = dateChipList().map((k, i) => `
    <button data-date="${k}" class="${k === selected ? "active" : ""}" ${isThursday(k) ? "disabled" : ""}>
      ${formatDateJP(k)}${i === 0 ? `<span class="today-badge">今日</span>` : i === 1 ? `<span class="today-badge">明日</span>` : ""}${isThursday(k) ? "（定休日）" : ""}
    </button>`).join("");
  el.querySelectorAll("button:not(:disabled)").forEach(b =>
    b.addEventListener("click", () => onPick(b.dataset.date)));
}
function renderCart() {
  if (cart.length === 0) {
    $("cart-list").innerHTML = `<p class="note" style="margin:0;">カートは空です。</p>`;
  } else {
    $("cart-list").innerHTML = cart.map((c, i) => {
      const it = menuById(c.itemId);
      const custom = [
        c.cut ? (c.cut === "cut4" ? "4カット" : "未カット") : null,
        c.pack ? (c.pack === "box" ? "箱（+100円）" : "紙皿・ホイル") : null,
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
        <div class="amt">${yen(unitPrice(it, c.toppings, c.pack) * c.qty)}</div>
      </div>`;
    }).join("") + `<div style="text-align:right;font-weight:900;font-size:19px;padding-top:10px;">合計 ${yen(cartTotal())}</div>`;
    $("cart-list").querySelectorAll("[data-inc]").forEach(b => b.addEventListener("click", () => {
      const c = cart[+b.dataset.inc]; if (c.qty < MAX_QTY) c.qty++; renderCart(); renderSlots(); updateCartbar(false);
    }));
    $("cart-list").querySelectorAll("[data-dec]").forEach(b => b.addEventListener("click", () => {
      const c = cart[+b.dataset.dec]; if (c.qty > 1) c.qty--; else cart.splice(+b.dataset.dec, 1);
      renderCart(); renderSlots(); updateCartbar(false);
    }));
    $("cart-list").querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", () => {
      cart.splice(+b.dataset.del, 1); renderCart(); renderSlots(); updateCartbar(false);
    }));
  }
}
function renderSlots() {
  const slots = timeSlots(selDate, cartQty());
  if (selTime && !slots.includes(selTime)) selTime = null;
  const lead = leadMinutes(cartQty());
  $("lead-note").textContent = selDate === todayKey()
    ? (cartQty() >= 5 ? `ご注文点数が多いため、最短で${lead}分後からの受け取りになります。` : `最短で${lead}分後からの受け取りになります。`)
    : "営業時間内（11:00〜最終受け取り 月〜土19:30／日曜17:30）でお選びください。";
  $("slot-grid").innerHTML = slots.map(s =>
    `<button data-slot="${s}" class="${s === selTime ? "active" : ""}">${s}</button>`).join("");
  $("slot-empty").textContent = slots.length === 0
    ? (isThursday(selDate) ? "木曜日は定休日です。別の日をお選びください。" : "本日の受け取り枠は終了しました。別の日をお選びください。") : "";
  $("slot-grid").querySelectorAll("button").forEach(b =>
    b.addEventListener("click", () => { selTime = b.dataset.slot; renderSlots(); }));
}
function openCheckout() {
  selDate = todayKey(); selTime = null;
  renderCart();
  renderDateChips($("date-chips"), selDate, pickDate);
  renderSlots();
  const savedName = localStorage.getItem("ruberie_name") || "";
  const savedPhone = localStorage.getItem("ruberie_phone") || "";
  if (savedName) $("cust-name").value = savedName;
  if (savedPhone) $("cust-phone").value = savedPhone;
  $("order-error").innerHTML = "";
  show("scr-checkout");
}
function pickDate(k) { selDate = k; selTime = null; renderDateChips($("date-chips"), selDate, pickDate); renderSlots(); }

// ---------- 注文送信 ----------
function makeOrderNo() {
  const n = new Date();
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `T-${String(n.getTime()).slice(-8)}${rand}`;
}
let doneUnsub = null;
async function submitOrder() {
  const name = $("cust-name").value.trim();
  const phone = normalizePhone($("cust-phone").value);
  const note = $("cust-note").value.trim();
  const err = msg => { $("order-error").innerHTML = `<div class="err" style="margin-top:12px;">${esc(msg)}</div>`; };
  if (cart.length === 0) return err("カートが空です。メニューから商品をお選びください。");
  if (!selTime) return err("受け取り時刻をお選びください。");
  if (!name) return err("お名前を入力してください。");
  if (phone.length < 10) return err("電話番号を正しく入力してください。");

  const btn = $("submit-order");
  btn.disabled = true; btn.textContent = "送信中…";
  try {
    // ブロック済み番号チェック
    const blocked = await getDocs(query(collection(db, "blockedPhones"), where("phone", "==", phone)));
    if (!blocked.empty) {
      btn.disabled = false; btn.textContent = "この内容で注文を送信する";
      return err("この番号でのご注文はお受けできません。お電話でご注文ください（0276-70-2321）");
    }
    const items = cart.map(c => {
      const it = menuById(c.itemId);
      const up = unitPrice(it, c.toppings, c.pack);
      return { itemId: c.itemId, name: it.name, qty: c.qty, unitPrice: up, lineTotal: up * c.qty,
               cut: c.cut, pack: c.pack, toppings: c.toppings || [] };
    });
    const orderNo = makeOrderNo();
    const ref = await addDoc(collection(db, "takeoutOrders"), {
      orderNo, name, phone, note,
      items, total: cartTotal(), totalQty: cartQty(),
      pickupDate: selDate, pickupTime: selTime, requestedPickup: selTime,
      confirmedPickup: null, status: "pending",
      createdAt: serverTimestamp(),
    });
    localStorage.setItem("ruberie_name", name);
    localStorage.setItem("ruberie_phone", phone);
    cart = []; updateCartbar(false);
    showDone(ref.id, orderNo);
  } catch (e) {
    console.error(e);
    err("送信に失敗しました。通信環境をご確認のうえ、もう一度お試しください。");
  } finally {
    btn.disabled = false; btn.textContent = "この内容で注文を送信する";
  }
}

// ---------- 完了画面（ライブ更新） ----------
function statusChip(st) {
  return { pending: `<span class="status-chip status-pending">確認待ち</span>`,
           confirmed: `<span class="status-chip status-confirmed">確定</span>`,
           done: `<span class="status-chip status-done">お渡し済み</span>`,
           noshow: `<span class="status-chip status-noshow">来店なし</span>` }[st] || st;
}
function showDone(docId, orderNo) {
  show("scr-done");
  if (doneUnsub) doneUnsub();
  doneUnsub = onSnapshot(doc(db, "takeoutOrders", docId), snap => {
    if (!snap.exists()) return;
    const o = snap.data();
    let html = `<div class="card" style="text-align:center;">`;
    if (o.status === "pending") {
      html += `<div style="font-size:40px;">⌛</div>
        <h2 style="margin:8px 0;">お店の確認待ちです。確定までお待ちください</h2>
        <p class="note">この画面を開いたままでいると、確定が自動で表示されます。<br>閉じてしまった場合は、トップの「注文状況を見る」から確認できます。</p>`;
    } else if (o.status === "confirmed") {
      const changed = o.confirmedPickup && o.confirmedPickup !== o.requestedPickup;
      html += `<div style="font-size:40px;">✅</div>
        <h2 style="margin:8px 0;color:var(--ok);">ご注文が確定しました</h2>
        ${changed ? `<p style="font-weight:800;color:var(--warn);">受け取り時刻が ${esc(o.confirmedPickup)} に変更になりました</p>` : ""}
        <p class="note" style="margin-bottom:2px;">受け取り日時</p>
        <div class="big-time">${esc(formatDateJP(o.pickupDate))}<br>${esc(o.confirmedPickup || o.requestedPickup)}</div>`;
    } else if (o.status === "done") {
      html += `<h2 style="margin:8px 0;">お渡し済みです。ありがとうございました</h2>`;
    } else if (o.status === "noshow") {
      html += `<h2 style="margin:8px 0;">このご注文は「来店なし」として処理されました</h2>
        <p class="note">ご不明な点はお電話ください（0276-70-2321）。</p>`;
    }
    html += `<p class="note" style="margin-top:12px;">注文番号：${esc(o.orderNo || orderNo)}<br>
      受け取り日時：${esc(formatDateJP(o.pickupDate))} ${esc(o.requestedPickup)}
      ${o.confirmedPickup && o.confirmedPickup !== o.requestedPickup ? `（確定：${esc(o.confirmedPickup)}）` : ""}<br>
      合計：${yen(o.total)}（お支払いは受け取り時にレジでお願いします）</p></div>`;
    $("done-body").innerHTML = html;
  });
}

// ---------- 注文状況 ----------
let statusDate = todayKey();
let statusUnsub = null;
function pickStatusDate(k) { statusDate = k; renderDateChips($("status-date-chips"), statusDate, pickStatusDate); searchStatus(); }
function searchStatus() {
  const phone = normalizePhone($("status-phone").value);
  if (phone.length < 10) { $("status-results").innerHTML = `<div class="err">電話番号を入力してください。</div>`; return; }
  localStorage.setItem("ruberie_phone", phone);
  if (statusUnsub) statusUnsub();
  const q = query(collection(db, "takeoutOrders"),
    where("phone", "==", phone), where("pickupDate", "==", statusDate));
  statusUnsub = onSnapshot(q, snap => {
    const orders = snap.docs.map(d => d.data())
      .sort((a, b) => (a.confirmedPickup || a.requestedPickup).localeCompare(b.confirmedPickup || b.requestedPickup));
    if (orders.length === 0) {
      $("status-results").innerHTML = `<div class="card"><p class="note" style="margin:0;">${esc(formatDateJP(statusDate))}のご注文は見つかりませんでした。</p></div>`;
      return;
    }
    $("status-results").innerHTML = `<h3>${esc(formatDateJP(statusDate))}のご注文（${orders.length}件）</h3>` +
      orders.map(o => `<div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
          <span class="note">注文番号 ${esc(o.orderNo)}</span>${statusChip(o.status)}
        </div>
        <div class="big-time" style="font-size:26px;margin-top:8px;">受け取り：${esc(o.confirmedPickup || o.requestedPickup)}</div>
        ${o.status === "confirmed" && o.confirmedPickup && o.confirmedPickup !== o.requestedPickup
          ? `<p style="font-weight:800;color:var(--warn);margin:4px 0;">受け取り時刻が ${esc(o.confirmedPickup)} に変更になりました</p>` : ""}
        <div style="margin-top:8px;">${(o.items || []).map(i => {
          const custom = [i.cut ? (i.cut === "cut4" ? "4カット" : "未カット") : null,
                          i.pack ? (i.pack === "box" ? "箱" : "紙皿・ホイル") : null,
                          ...(i.toppings || [])].filter(Boolean).join("／");
          return `<div>${esc(i.name)} × ${i.qty}${custom ? `<span class="note">（${esc(custom)}）</span>` : ""}</div>`;
        }).join("")}</div>
        <div style="text-align:right;font-weight:900;margin-top:6px;">合計 ${yen(o.total)}</div>
      </div>`).join("");
  });
}

// ---------- 初期化 ----------
$("go-order").addEventListener("click", () => { renderTabs(); renderGrid(); show("scr-order"); });
$("go-status").addEventListener("click", () => {
  statusDate = todayKey();
  renderDateChips($("status-date-chips"), statusDate, pickStatusDate);
  const savedPhone = localStorage.getItem("ruberie_phone") || "";
  if (savedPhone) { $("status-phone").value = savedPhone; searchStatus(); }
  show("scr-status");
});
$("detail-back").addEventListener("click", () => show("scr-order"));
$("checkout-back").addEventListener("click", () => show("scr-order"));
$("status-back").addEventListener("click", () => show("scr-home"));
$("done-home").addEventListener("click", () => { if (doneUnsub) doneUnsub(); show("scr-home"); });
$("cartbar-btn").addEventListener("click", () => { if (cartQty() > 0) openCheckout(); });
$("submit-order").addEventListener("click", submitOrder);
$("status-search").addEventListener("click", searchStatus);
updateCartbar(false);
