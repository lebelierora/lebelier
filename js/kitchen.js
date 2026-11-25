// 厨房受付ロジック：テイクアウト注文のリアルタイム表示・受付・完了・ブロック管理
// テスト段階の簡易保護として PIN ゲートを使う（本番前に Firebase Auth へ移行すること）。
const KITCHEN_PIN = "2321"; // テスト用PIN（店の電話番号の下4桁）

import { db } from "./firebase-config.js";
import {
  collection, onSnapshot, query, where, doc, updateDoc, setDoc, deleteDoc, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  todayKey, formatDateJP, lastSlot, toMin, toHHMM, esc, yen,
} from "./menu.js";

const $ = id => document.getElementById(id);

// ---------- PIN ----------
if (sessionStorage.getItem("ruberie_kitchen") === "ok") openKitchen();
$("pin-btn").addEventListener("click", tryPin);
$("pin-input").addEventListener("keydown", e => { if (e.key === "Enter") tryPin(); });
function tryPin() {
  if ($("pin-input").value === KITCHEN_PIN) {
    sessionStorage.setItem("ruberie_kitchen", "ok");
    openKitchen();
  } else {
    $("pin-error").innerHTML = `<div class="err" style="margin-top:10px;">PINが違います。</div>`;
  }
}

// ---------- 状態 ----------
let orders = [];        // takeoutOrders のスナップショット（全件→表示対象を抽出）
let blocked = [];       // blockedPhones
let adj = {};           // docId -> 確定予定時刻の調整オフセット（分）
let soundEnabled = false;
let knownPending = new Set();
let started = false;

function openKitchen() {
  $("pin-gate").classList.add("hidden");
  $("kitchen-main").classList.remove("hidden");
  startListeners();
}

function startListeners() {
  // テスト段階では全件購読し、表示は「昨日以降の受け取り分」に絞る（件数は少ない前提）
  onSnapshot(collection(db, "takeoutOrders"), snap => {
    orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // 新着（未受付）の検知
    const pendingIds = new Set(orders.filter(o => o.status === "pending").map(o => o.id));
    if (started) {
      for (const id of pendingIds) if (!knownPending.has(id)) playSound();
    }
    knownPending = pendingIds;
    started = true;
    render();
  });
  onSnapshot(collection(db, "blockedPhones"), snap => {
    blocked = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderBlocked();
  });
  setInterval(render, 30000); // カウントダウン更新
  setInterval(() => { if (orders.some(o => o.status === "pending" && isVisible(o))) playSound(); }, 4000); // 未受付がある間は繰り返し
}

// 表示対象：受け取り日が昨日以降（過ぎた未完了も見落とさない）
function isVisible(o) {
  const y = new Date(Date.now() - 24 * 3600 * 1000);
  return true; // テスト段階は全件表示（完了は畳む）。件数が増えたら pickupDate で絞ること。
}
function activeOrders() {
  return orders.filter(o => o.status === "pending" || o.status === "confirmed")
    .sort((a, b) => (a.pickupDate + (a.confirmedPickup || a.requestedPickup))
      .localeCompare(b.pickupDate + (b.confirmedPickup || b.requestedPickup)));
}
function finishedOrders() {
  return orders.filter(o => o.status === "done" || o.status === "noshow")
    .sort((a, b) => (b.pickupDate + b.requestedPickup).localeCompare(a.pickupDate + a.requestedPickup));
}
function doneCountFor(phone, excludeId) {
  return orders.filter(o => o.phone === phone && o.status === "done" && o.id !== excludeId).length;
}
function regularBadge(o) {
  const past = doneCountFor(o.phone, o.id);
  if (past === 0) return `<span class="badge first">初めての方</span>`;
  if (past >= 3) return `<span class="badge regular">⭐常連さん</span>`;
  return `<span class="badge">ご注文${past + 1}回目</span>`;
}

// JST現在時刻（分）
function nowMinJST() {
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Tokyo", hour: "numeric", minute: "numeric", hour12: false });
  const parts = {};
  for (const p of fmt.formatToParts(new Date())) parts[p.type] = p.value;
  return (+parts.hour % 24) * 60 + (+parts.minute);
}
function ceil5Now() { return Math.ceil((nowMinJST() + 1) / 5) * 5; } // 現在時刻を5分切り上げ（最低でも次の5分）

function adjRange(o) {
  const isToday = o.pickupDate === todayKey();
  const low = isToday ? Math.max(11 * 60, ceil5Now()) : 11 * 60;
  const high = toMin(lastSlot(o.pickupDate));
  return { low, high };
}
function proposedTime(o) {
  const base = toMin(o.requestedPickup);
  const { low, high } = adjRange(o);
  return Math.min(high, Math.max(low, base + (adj[o.id] || 0)));
}
function countdownText(o) {
  if (o.status !== "confirmed" || !o.confirmedPickup) return "";
  const target = toMin(o.confirmedPickup);
  let diff;
  if (o.pickupDate === todayKey()) diff = target - nowMinJST();
  else if (o.pickupDate > todayKey()) return `<span class="countdown">${formatDateJP(o.pickupDate)}の受け取り</span>`;
  else diff = -999;
  if (diff > 0) return `<span class="countdown">あと${diff}分で受け取り</span>`;
  return `<span class="countdown over">受け取り時刻を過ぎています</span>`;
}

function render() {
  const act = activeOrders();
  const pend = act.filter(o => o.status === "pending").length;
  const conf = act.filter(o => o.status === "confirmed").length;
  $("sum-pending").textContent = `未受付 ${pend}件`;
  $("sum-confirmed").textContent = `対応中 ${conf}件`;
  $("flash-banner").classList.toggle("hidden", pend === 0);
  $("flash-banner").textContent = `新しい注文 ${pend}件`;
  $("no-orders").classList.toggle("hidden", act.length > 0);
  const main = $("kitchen-main");
  main.classList.remove("density-xl", "density-lg", "density-md", "density-sm");
  main.classList.add(act.length <= 2 ? "density-xl" : act.length <= 4 ? "density-lg" : act.length <= 6 ? "density-md" : "density-sm");
  $("order-grid").innerHTML = act.map(cardHtml).join("");
  $("finished-list").innerHTML = finishedOrders().map(cardHtml).join("");
  bindCardButtons();
}

function itemsHtml(o) {
  return (o.items || []).map(i => {
    const custom = [i.cut ? (i.cut === "cut4" ? "4カット" : "未カット") : null,
                    i.pack ? (i.pack === "box" ? "箱" : "紙皿・ホイル") : null,
                    ...(i.toppings || [])].filter(Boolean).join("／");
    return `<div><div class="kitem">${esc(i.name)} × ${i.qty}</div>${custom ? `<div class="kcustom">${esc(custom)}</div>` : ""}</div>`;
  }).join("");
}

function cardHtml(o) {
  const isPending = o.status === "pending";
  const prop = proposedTime(o);
  const diff = prop - toMin(o.requestedPickup);
  const diffHtml = diff === 0
    ? `<span class="note">希望通り</span>`
    : diff > 0 ? `<span class="diff-up">+${diff}分</span>` : `<span class="diff-down">${diff}分（希望より早い）</span>`;
  const mainTime = o.status === "confirmed" && o.confirmedPickup ? o.confirmedPickup : o.requestedPickup;
  return `<div class="kcard ${isPending ? "pending" : ""}">
    <div>
      <div class="pdate">${esc(formatDateJP(o.pickupDate))} ／ ${esc(o.orderNo)} ／ ${o.status === "pending" ? "確認待ち" : o.status === "confirmed" ? "確定" : o.status === "done" ? "お渡し済み" : "来店なし"}</div>
      <div class="ptime">${esc(mainTime)}</div>
      ${countdownText(o) ? `<div>${countdownText(o)}</div>` : ""}
    </div>
    <div>${regularBadge(o)} <strong style="font-size:18px;">${esc(o.name)} 様</strong>
      <a href="tel:${esc(o.phone)}" style="font-weight:800;">${esc(o.phone)}</a></div>
    ${o.note ? `<div class="kcustom">備考：${esc(o.note)}</div>` : ""}
    <div>${itemsHtml(o)}</div>
    <div class="ktotal">合計 ${yen(o.total)}</div>
    ${isPending ? `
    <div>
      <div class="kcustom">お客様の希望：${esc(o.requestedPickup)}</div>
      <div style="font-weight:900;font-size:20px;">確定予定：${toHHMM(prop)} ${diffHtml}</div>
      <div class="adj-row" style="margin-top:8px;">
        <button data-adj="${o.id}|-5">−5分</button>
        <button data-fastest="${o.id}">最短</button>
        <button data-adj="${o.id}|5">＋5分</button>
      </div>
    </div>
    <div class="act-row">
      <button class="btn" data-accept="${o.id}">この時間で受付</button>
    </div>
    <div class="act-row">
      <button class="btn ghost" data-noshow="${o.id}">来店なし</button>
    </div>` : ""}
    ${o.status === "confirmed" ? `
    <div class="act-row">
      <button class="btn" data-done="${o.id}">お渡し済み</button>
      <button class="btn ghost" data-noshow="${o.id}">来店なし</button>
    </div>` : ""}
  </div>`;
}

function bindCardButtons() {
  document.querySelectorAll("[data-adj]").forEach(b => b.addEventListener("click", () => {
    const [id, d] = b.dataset.adj.split("|");
    adj[id] = (adj[id] || 0) + (+d);
    render();
  }));
  document.querySelectorAll("[data-fastest]").forEach(b => b.addEventListener("click", () => {
    const o = orders.find(x => x.id === b.dataset.fastest);
    if (!o) return;
    const { low } = adjRange(o);
    adj[o.id] = low - toMin(o.requestedPickup);
    render();
  }));
  document.querySelectorAll("[data-accept]").forEach(b => b.addEventListener("click", async () => {
    const o = orders.find(x => x.id === b.dataset.accept);
    if (!o) return;
    b.disabled = true;
    await updateDoc(doc(db, "takeoutOrders", o.id), {
      status: "confirmed", confirmedPickup: toHHMM(proposedTime(o)), confirmedAt: serverTimestamp(),
    });
  }));
  document.querySelectorAll("[data-done]").forEach(b => b.addEventListener("click", async () => {
    b.disabled = true;
    await updateDoc(doc(db, "takeoutOrders", b.dataset.done), { status: "done", doneAt: serverTimestamp() });
  }));
  document.querySelectorAll("[data-noshow]").forEach(b => b.addEventListener("click", async () => {
    const o = orders.find(x => x.id === b.dataset.noshow);
    if (!o) return;
    if (!confirm(`${o.name} 様の注文を「来店なし」にして、この電話番号を要注意リストに登録しますか？`)) return;
    b.disabled = true;
    await updateDoc(doc(db, "takeoutOrders", o.id), { status: "noshow", noshowAt: serverTimestamp() });
    await setDoc(doc(db, "blockedPhones", o.phone), {
      phone: o.phone, name: o.name, reason: "来店なし", createdAt: serverTimestamp(),
    });
  }));
}

// ---------- 要注意リスト ----------
function renderBlocked() {
  $("blocked-list").innerHTML = blocked.length === 0
    ? `<p class="note">登録されている番号はありません。</p>`
    : blocked.map(b => `<div class="card" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
        <strong>${esc(b.phone)}</strong><span class="note">${esc(b.name || "")}／${esc(b.reason || "")}</span>
        <button class="btn ghost small" data-unblock="${esc(b.phone)}" style="margin-left:auto;">解除する</button>
      </div>`).join("");
  document.querySelectorAll("[data-unblock]").forEach(btn => btn.addEventListener("click", async () => {
    if (!confirm(`${btn.dataset.unblock} のブロックを解除しますか？`)) return;
    await deleteDoc(doc(db, "blockedPhones", btn.dataset.unblock));
  }));
}

// ---------- 音声 ----------
function playSound() {
  if (!soundEnabled) return;
  const a = $("order-sound");
  a.currentTime = 0;
  a.play().catch(() => {});
}
$("sound-btn").addEventListener("click", () => {
  soundEnabled = true;
  $("sound-state").textContent = "音声：有効（新しい注文でモコの声が鳴ります）";
  $("sound-btn").textContent = "音をテストする";
  playSound();
});
