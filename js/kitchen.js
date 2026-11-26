// 厨房受付ロジック：テイクアウト注文＋店内オーダーのリアルタイム表示・受付・完了・呼び出し対応・ブロック管理
// テスト段階の簡易保護として PIN ゲートを使う（本番前に Firebase Auth へ移行すること）。
const KITCHEN_PIN = "2321"; // テスト用PIN（店の電話番号の下4桁）

import { db } from "./firebase-config.js?v=20251125-45";
import {
  collection, onSnapshot, query, where, doc, updateDoc, setDoc, deleteDoc, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  todayKey, addDays, isThursday, formatDateJP, lastSlot, toMin, toHHMM, occupiedTime, esc, yen, seatLabel,
} from "./menu.js?v=20251125-45";

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
let dineinOrders = [];  // dineInOrders のスナップショット
let calls = [];         // calls（status=open のもの）
let blocked = [];       // blockedPhones
let adj = {};           // docId -> 確定予定時刻の調整オフセット（分）
let tabFilter = "all";  // "all" | "dinein" | "takeout"
let soundEnabled = false;
let knownPending = new Set();
let knownDineinPending = new Set();
let knownCalls = new Set();
let started = false;
let startedDinein = false;
let startedCalls = false;

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
  onSnapshot(collection(db, "dineInOrders"), snap => {
    dineinOrders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const pendingIds = new Set(dineinOrders.filter(o => o.status === "pending").map(o => o.id));
    if (startedDinein) {
      for (const id of pendingIds) if (!knownDineinPending.has(id)) playSound();
    }
    knownDineinPending = pendingIds;
    startedDinein = true;
    render();
  });
  onSnapshot(query(collection(db, "calls"), where("status", "==", "open")), snap => {
    calls = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => tsMillis(a.createdAt) - tsMillis(b.createdAt));
    const ids = new Set(calls.map(c => c.id));
    if (startedCalls) {
      for (const id of ids) if (!knownCalls.has(id)) playCallSound();
    }
    knownCalls = ids;
    startedCalls = true;
    renderCalls();
  });
  onSnapshot(collection(db, "blockedPhones"), snap => {
    blocked = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderBlocked();
  });
  setInterval(render, 30000); // カウントダウン更新
  // 未受付がある間は繰り返し知らせる（注文＝注文の声、呼び出し＝呼び出しの声）
  setInterval(() => {
    if (orders.some(o => o.status === "pending" && isVisible(o)) ||
        dineinOrders.some(o => o.status === "pending")) playSound();
    if (calls.length > 0) playCallSound();
  }, 4000);
}

// Firestore Timestamp → ミリ秒（未確定なら大きい値にして後ろに並べる）
function tsMillis(ts) { return ts && ts.toMillis ? ts.toMillis() : Number.MAX_SAFE_INTEGER; }
// 統合表示のソートキー（JSTの日付+時刻文字列）
function tsSortKey(ts) {
  if (!ts || !ts.toDate) return "9999-99-99 99:99";
  const parts = {};
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
  for (const p of fmt.formatToParts(ts.toDate())) parts[p.type] = p.value;
  return `${parts.year}-${parts.month}-${parts.day} ${String(+parts.hour % 24).padStart(2, "0")}:${parts.minute}`;
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
  // 時刻の調整は当日予約のみ。前日以前の予約は希望時刻のまま確定する。
  if (o.pickupDate !== todayKey()) return base;
  const { low, high } = adjRange(o);
  return Math.min(high, Math.max(low, base + (adj[o.id] || 0)));
}
// 同じ日・同じ時刻に既にある別の有効な注文（確認待ち・確定）を返す。なければ null。
// 厨房で当日の時刻を調整したときの重複警告に使う。
function slotConflict(o, hhmm) {
  if (o.kind === "frozen") return null; // 冷凍予約は枠を占有しない
  return orders.find(x => x.id !== o.id && x.kind !== "frozen" && x.pickupDate === o.pickupDate
    && (x.status === "pending" || x.status === "confirmed") && occupiedTime(x) === hhmm) || null;
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

function activeDinein() {
  return dineinOrders.filter(o => o.status === "pending" || o.status === "accepted")
    .sort((a, b) => tsMillis(a.createdAt) - tsMillis(b.createdAt));
}
function finishedDinein() {
  return dineinOrders.filter(o => o.status === "done")
    .sort((a, b) => tsMillis(b.createdAt) - tsMillis(a.createdAt));
}
// 店内＋テイクアウトの統合表示リスト（タブで絞り込み、時刻順に混ぜて並べる）
function displayActive() {
  const list = [];
  if (tabFilter === "frozen") {
    for (const o of activeOrders().filter(o => o.kind === "frozen"))
      list.push({ kind: "takeout", o, key: o.pickupDate + " " + (o.confirmedPickup || o.requestedPickup) });
  } else if (tabFilter !== "dinein") {
    for (const o of activeOrders().filter(o => tabFilter !== "takeout" || o.kind !== "frozen"))
      list.push({ kind: "takeout", o, key: o.pickupDate + " " + (o.confirmedPickup || o.requestedPickup) });
  }
  if (tabFilter !== "takeout" && tabFilter !== "frozen")
    for (const o of activeDinein()) list.push({ kind: "dinein", o, key: tsSortKey(o.createdAt) });
  return list.sort((a, b) => a.key.localeCompare(b.key));
}
function displayFinished() {
  const list = [];
  for (const o of finishedOrders()) list.push({ kind: "takeout", o, key: o.pickupDate + " " + o.requestedPickup });
  for (const o of finishedDinein()) list.push({ kind: "dinein", o, key: tsSortKey(o.createdAt) });
  return list.sort((a, b) => b.key.localeCompare(a.key));
}

function render() {
  const disp = displayActive();
  // サマリーは店内＋テイクアウト合算（タブの絞り込みには影響されない）
  const pend = orders.filter(o => o.status === "pending").length
             + dineinOrders.filter(o => o.status === "pending").length;
  const conf = orders.filter(o => o.status === "confirmed").length
             + dineinOrders.filter(o => o.status === "accepted").length;
  $("sum-pending").textContent = `未受付 ${pend}件`;
  $("sum-confirmed").textContent = `対応中 ${conf}件`;
  $("flash-banner").classList.toggle("hidden", pend === 0);
  $("flash-banner").textContent = `新しい注文 ${pend}件`;
  $("no-orders").classList.toggle("hidden", disp.length > 0);
  const main = $("kitchen-main");
  main.classList.remove("density-xl", "density-lg", "density-md", "density-sm");
  main.classList.add(disp.length <= 2 ? "density-xl" : disp.length <= 4 ? "density-lg" : disp.length <= 6 ? "density-md" : "density-sm");
  $("order-grid").innerHTML = disp.map(e => e.kind === "takeout" ? cardHtml(e.o) : dineinCardHtml(e.o)).join("");
  $("finished-list").innerHTML = displayFinished().map(e => e.kind === "takeout" ? cardHtml(e.o) : dineinCardHtml(e.o)).join("");
  bindCardButtons();
  bindDineinButtons();
}

// ---------- 店内オーダーのカード ----------
function dineinCardHtml(o) {
  const isPending = o.status === "pending";
  const stLabel = o.status === "pending" ? "確認待ち" : o.status === "accepted" ? "受付済み" : "提供済み";
  return `<div class="kcard ${isPending ? "pending" : ""}">
    <div>
      <div class="pdate"><span class="kind-chip">店内</span> ／ ${esc(o.orderNo)} ／ ${stLabel}</div>
      <div class="ptime">${esc(o.seatLabel || seatLabel(o.seat))}</div>
    </div>
    <div>${itemsHtml(o)}</div>
    <div class="ktotal">合計 ${yen(o.total)}</div>
    ${isPending ? `
    <div class="act-row">
      <button class="btn" data-daccept="${o.id}">受付する</button>
    </div>` : ""}
    ${o.status === "accepted" ? `
    <div class="act-row">
      <button class="btn" data-ddone="${o.id}">提供済みにする</button>
    </div>` : ""}
  </div>`;
}
function bindDineinButtons() {
  document.querySelectorAll("[data-daccept]").forEach(b => b.addEventListener("click", async () => {
    b.disabled = true;
    await updateDoc(doc(db, "dineInOrders", b.dataset.daccept), { status: "accepted", acceptedAt: serverTimestamp() });
  }));
  document.querySelectorAll("[data-ddone]").forEach(b => b.addEventListener("click", async () => {
    b.disabled = true;
    await updateDoc(doc(db, "dineInOrders", b.dataset.ddone), { status: "done", doneAt: serverTimestamp() });
  }));
}

// ---------- 呼び出し ----------
function renderCalls() {
  const area = $("calls-area");
  if (calls.length === 0) { area.innerHTML = ""; area.classList.add("hidden"); return; }
  area.classList.remove("hidden");
  area.innerHTML = `<h2 style="margin:4px 0 10px;">🔔 呼び出し ${calls.length}件</h2>` +
    calls.map(c => `<div class="call-card">
      <div class="call-seat">${esc(c.seatLabel || seatLabel(c.seat))}</div>
      <div style="font-weight:800;">店員を呼んでいます</div>
      <div class="act-row">
        <button class="btn" data-call-done="${c.id}">対応した</button>
      </div>
    </div>`).join("");
  area.querySelectorAll("[data-call-done]").forEach(b => b.addEventListener("click", async () => {
    b.disabled = true;
    await updateDoc(doc(db, "calls", b.dataset.callDone), { status: "done", handledAt: serverTimestamp() });
  }));
}

// ---------- 絞り込みタブ ----------
document.querySelectorAll("#kind-tabs button").forEach(b => b.addEventListener("click", () => {
  tabFilter = b.dataset.tab;
  document.querySelectorAll("#kind-tabs button").forEach(x => x.classList.toggle("active", x === b));
  render();
}));

function itemsHtml(o) {
  return (o.items || []).map(i => {
    const custom = [i.cut ? (i.cut === "cut4" ? "4カット" : "未カット") : null,
                    i.pack ? (i.pack === "box" ? "箱" : "紙皿・ホイル") : null,
                    i.choice || null,
                    ...(i.toppings || [])].filter(Boolean).join("／");
    return `<div><div class="kitem">${esc(i.name)} × ${i.qty}</div>${custom ? `<div class="kcustom">${esc(custom)}</div>` : ""}</div>`;
  }).join("");
}

function cardHtml(o) {
  const isPending = o.status === "pending";
  const isTodayPickup = o.pickupDate === todayKey(); // 時刻調整ができるのは当日予約だけ
  const prop = proposedTime(o);
  const conflict = isPending && isTodayPickup ? slotConflict(o, toHHMM(prop)) : null;
  const diff = prop - toMin(o.requestedPickup);
  const diffHtml = diff === 0
    ? `<span class="note">希望通り</span>`
    : diff > 0 ? `<span class="diff-up">+${diff}分</span>` : `<span class="diff-down">${diff}分（希望より早い）</span>`;
  const mainTime = o.status === "confirmed" && o.confirmedPickup ? o.confirmedPickup : o.requestedPickup;
  return `<div class="kcard ${isPending ? "pending" : ""}">
    <div>
      <div class="pdate">${o.kind === "frozen" ? `<span class="kind-chip" style="background:#5b2c6f;">冷凍予約</span>` : `<span class="kind-chip" style="background:#2e86c1;">テイクアウト</span>`} ${esc(formatDateJP(o.pickupDate))} ／ ${esc(o.orderNo)} ／ ${o.status === "pending" ? "確認待ち" : o.status === "confirmed" ? "確定" : o.status === "done" ? "お渡し済み" : "来店なし"}</div>
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
      ${isTodayPickup ? `
      <div style="font-weight:900;font-size:20px;">確定予定：${toHHMM(prop)} ${diffHtml}</div>
      ${conflict ? `<div style="color:var(--warn);font-weight:900;font-size:17px;">⚠ ${toHHMM(prop)} には別の注文（${esc(conflict.name)} 様）が入っています</div>` : ""}
      <div class="adj-row" style="margin-top:8px;">
        <button data-adj="${o.id}|-5">−5分</button>
        <button data-fastest="${o.id}">最短</button>
        <button data-adj="${o.id}|5">＋5分</button>
      </div>` : o.kind === "frozen" ? `
      <div style="font-weight:900;font-size:20px;">確定予定：${esc(o.requestedPickup)} <span class="note">希望通り</span></div>
      <div class="kcustom">冷凍は日付の変更ができます（ご用意できない日は、別の日で受け付けてください）</div>
      <div class="adj-row" style="margin-top:8px;">
        <select data-fzdate="${o.id}" style="flex:1;font-size:18px;font-weight:800;min-height:56px;border-radius:12px;border:2px solid var(--line);padding:0 10px;">
          ${frozenDateOptions(o)}
        </select>
      </div>` : `
      <div style="font-weight:900;font-size:20px;">確定予定：${esc(o.requestedPickup)} <span class="note">希望通り</span></div>
      <div class="kcustom">前日以前のご予約は、希望時刻のまま受け付けます（時刻の調整は当日のご予約のみ）</div>`}
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

// 冷凍予約の日付変更候補：希望日から1週間先まで（木曜定休を除く）
function frozenDateOptions(o) {
  const base = o.requestedDate || o.pickupDate;
  const opts = [];
  for (let i = 0; i <= 7; i++) {
    const k = addDays(base, i).key;
    if (isThursday(k)) continue;
    opts.push(`<option value="${k}" ${k === o.pickupDate ? "selected" : ""}>${esc(formatDateJP(k))}${i === 0 ? "（希望日）" : ""}</option>`);
  }
  return opts.join("");
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
    const upd = {
      status: "confirmed", confirmedPickup: toHHMM(proposedTime(o)), confirmedAt: serverTimestamp(),
    };
    if (o.kind === "frozen") {
      const sel = document.querySelector(`[data-fzdate="${o.id}"]`);
      const newDate = sel ? sel.value : o.pickupDate;
      upd.pickupDate = newDate;
      upd.confirmedDate = newDate;
    }
    await updateDoc(doc(db, "takeoutOrders", o.id), upd);
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
function playCallSound() {
  if (!soundEnabled) return;
  const a = $("call-sound");
  a.currentTime = 0;
  a.play().catch(() => {});
}
$("sound-btn").addEventListener("click", () => {
  soundEnabled = true;
  $("sound-state").textContent = "音声：有効（新しい注文・呼び出しでモコの声が鳴ります）";
  $("sound-btn").textContent = "音をテストする";
  playSound();
});
