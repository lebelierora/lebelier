// 厨房受付ロジック：テイクアウト注文＋店内オーダーのリアルタイム表示・受付・完了・呼び出し対応・ブロック管理
// ログインは Firebase Auth（メールアドレス＋パスワード）。データ保護は Firestore ルール側で行う。

import { db, auth } from "./firebase-config.js?v=20251126-84";
import {
  collection, onSnapshot, query, where, doc, updateDoc, setDoc, deleteDoc, deleteField, serverTimestamp,
  getDocs, writeBatch,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  signInWithEmailAndPassword, onAuthStateChanged, signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  todayKey, addDays, isThursday, formatDateJP, lastSlot, toMin, toHHMM, occupiedTime, esc, yen, seatLabel,
} from "./menu.js?v=20251127-116";

const $ = id => document.getElementById(id);

// 表示用の短い注文番号（英字1文字＋数字4桁）。ドキュメントIDから決定的に算出する表示専用コードで、
// 保存データ（orderNo等）は変更しない。js/customer.js にも同じ実装があり、両者は必ず一致させること。
function orderCodeFromId(id) {
  let h = 2166136261; // FNV-1a 32bit（offset basis）
  const s = String(id || "");
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  const letter = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[h % 26];
  const digits = 1000 + (Math.floor(h / 26) % 9000);
  return letter + digits;
}

// ---------- ログイン（Firebase Auth） ----------
let kitchenOpen = false;
$("login-btn").addEventListener("click", tryLogin);
$("login-pass").addEventListener("keydown", e => { if (e.key === "Enter") tryLogin(); });
async function tryLogin() {
  $("login-error").innerHTML = "";
  try {
    await signInWithEmailAndPassword(auth, $("login-email").value.trim(), $("login-pass").value);
  } catch (e) {
    console.error(e);
    $("login-error").innerHTML = `<div class="err" style="margin-top:10px;">ログインできませんでした。メールアドレスとパスワードをご確認ください。</div>`;
  }
}
onAuthStateChanged(auth, user => { if (user) openKitchen(); });
$("logout-btn").addEventListener("click", async () => { await signOut(auth); location.reload(); });

// ---------- 状態 ----------
let orders = [];        // takeoutOrders のスナップショット（全件→表示対象を抽出）
let dineinOrders = [];  // dineInOrders のスナップショット
let calls = [];         // calls（status=open のもの）
let blocked = [];       // blockedPhones
let adj = {};           // docId -> 確定予定時刻の調整オフセット（分）
let tabFilter = "all";  // "all" | "dinein" | "takeout"
// 音声：iOS Safari の再生ロック解除はページ読み込みごとにリセットされる（PassPRNT印刷の戻りで
// 再読み込みされるたびに無効化される）。そのため「有効にしたい意思」は localStorage に残し、
// 読み込み直後は未武装（soundEnabled=false）として、最初のタップで再武装する。
const SOUND_FLAG_KEY = "kitchenSoundEnabled";
let soundIntent = false; // 音を有効にしたい意思（永続化）
try { soundIntent = localStorage.getItem(SOUND_FLAG_KEY) === "1"; } catch (e) {}
let soundEnabled = false; // この読み込みで実際に鳴らせる状態（武装済み）か
let knownPending = new Set();
let knownDineinPending = new Set();
let knownCalls = new Set();
let started = false;
let startedDinein = false;
let startedCalls = false;
// 本日のテイクアウト受付停止（daySlots/{今日}.takeoutStopped）。フラグは「その日のドキュメント」に
// だけ立つので、翌日は新しいドキュメントにフラグが無く自動で通常受付に戻る（切り戻し忘れ防止）。
let todayTakeoutStopped = false;
let stopDateKey = null; // 停止フラグを購読中の日付キー（日付が変わったら張り替える）
let stopUnsub = null;

// ---------- 伝票印刷 ----------
// プリンター：スター精密 mC-Print3（TCP:192.168.11.40／80mm）。
// 経路は2つ：CloudPRNT（Worker 経由・画面切り替えなし）が本経路、PassPRNT（アプリ経由）が予備経路。
// localStorage の printRoute（"cloud" | "pass"、既定 "cloud"）で切り替え、厨房画面のトグルでも変更できる。
// タイミング（本人の決定）：店内注文は注文が入った瞬間、テイクアウト・冷凍は厨房で確定した瞬間。呼び出しは印刷しない。
// どちらの経路でも、印刷済みフラグ（printedAt）を出す前に Firestore へ記録しておくことが
// 二重印刷・ループ防止の要（PassPRNT は戻りURLでこのページが再読み込みされるため特に重要）。
// CloudPRNT の受け口は http（プリンターが https ではこの宛先に接続できないため実機確認のうえ http）。
const PRINTER_PORT = "TCP:192.168.11.40";
const CLOUDPRNT_BASE_URL = "https://ruberie-cloudprnt.lebelierora.workers.dev/p/_-KzOkgw2j4sD61KOxNDN1AyJ2sLWAFh3qb7k318";
const PRINT_ROUTE_KEY = "printRoute"; // localStorage: "cloud" | "pass"（既定は "cloud"）
function printRoute() {
  try { return localStorage.getItem(PRINT_ROUTE_KEY) === "pass" ? "pass" : "cloud"; }
  catch (e) { return "cloud"; }
}
const autoPrintAttempted = new Set(); // このページ表示中に自動印刷を試みた注文（メモリ上のループ防止）
let printReturn = null;               // PassPRNT からの戻り情報 {code, message, kind, id}
let printMsg = "";
let printMsgOk = true;

// PassPRNT の戻り（?printcb=kind:docId&passprnt_code=0&passprnt_message=SUCCESS）を読み取り、URLから消す。
// コード体系は PassPRNT 公式マニュアル（iOS版 Data Specifications）：passprnt_code=0 が成功。
(function readPrintReturn() {
  try {
    const q = new URLSearchParams(location.search);
    if (!q.has("passprnt_code")) return;
    const [kind, id] = (q.get("printcb") || "").split(":");
    printReturn = { code: q.get("passprnt_code"), message: q.get("passprnt_message") || "", kind, id };
    history.replaceState(null, "", location.pathname);
  } catch (e) { console.error(e); }
})();

function showPrintMsg() {
  const el = $("print-msg");
  if (!el || !printMsg) return;
  el.textContent = printMsg;
  el.classList.toggle("fail", !printMsgOk);
  el.classList.remove("hidden");
}

// 戻ってきた印刷結果を画面に表示し、失敗なら注文ドキュメントにも printStatus=failed を残す
async function handlePrintReturn() {
  if (!printReturn) return;
  const r = printReturn;
  printReturn = null;
  printMsgOk = r.code === "0";
  printMsg = printMsgOk
    ? "🖨 伝票を印刷しました"
    : `⚠ 伝票の印刷に失敗しました${r.message ? `（${r.message}）` : ""}。注文カードの「伝票を再印刷」ボタンで出し直せます。`;
  showPrintMsg();
  if (r.id && (r.kind === "dinein" || r.kind === "takeout")) {
    try {
      await updateDoc(doc(db, r.kind === "dinein" ? "dineInOrders" : "takeoutOrders", r.id),
        { printStatus: printMsgOk ? "printed" : "failed" });
    } catch (e) { console.error("印刷結果の記録に失敗", e); }
  }
}

// ==== PRINT-TICKET-BEGIN ====
// 伝票（PassPRNT用HTML・80mm）。項目・選択肢の並べ方は厨房カードの itemsHtml と同じルール。
function ticketItemsHtml(o) {
  return (o.items || []).map(i => {
    const custom = [i.cut ? (i.cut === "cut4" ? "4カット" : i.cut === "cut6" ? "6カット" : "未カット") : null,
                    i.pack ? (i.pack === "box" ? "箱" : "紙皿・ホイル") : null,
                    i.choice || null,
                    ...(i.toppings || [])].filter(Boolean).join("／");
    // 伝票では提供タイミングを既定（すぐ提供／でき次第）でも常時表示する（厨房カードは非既定のみのまま）
    // 旧文言「できた順」で保存された注文も「でき次第」と表示する（表示側の読み替え）
    const timing = i.timing
      ? `<div style="font-size:36px;font-weight:bold;">提供：${esc(i.timing === "できた順" ? "でき次第" : i.timing)}</div>` : "";
    return `<div style="font-size:40px;font-weight:bold;">${esc(i.name)} × ${i.qty}</div>` +
      (custom ? `<div style="font-size:34px;">${esc(custom)}</div>` : "") + timing;
  }).join("");
}
function buildTicketHtml(kind, o) {
  let head, sub;
  if (kind === "dinein") {
    head = "店内注文";
    sub = esc(o.seatLabel || seatLabel(o.seat));
  } else if (o.kind === "frozen") {
    head = "冷凍";
    sub = `受け取り ${esc(formatDateJP(o.confirmedDate || o.pickupDate))} ${esc(o.confirmedPickup || o.requestedPickup || "")}`;
  } else {
    head = "テイクアウト";
    sub = `受け取り ${esc(formatDateJP(o.pickupDate))} ${esc(o.confirmedPickup || o.requestedPickup || "")}`;
  }
  const dineinTime = tsSortKey(o.createdAt);
  return '<html><head><meta charset="utf-8"><meta name="format-detection" content="telephone=no"></head><body style="font-family:sans-serif;">' +
    '<div style="text-align:center;font-size:48px;font-weight:bold;">るべりえ</div>' +
    `<div style="text-align:center;font-size:54px;font-weight:bold;">${head}</div>` +
    `<div style="text-align:center;font-size:48px;font-weight:bold;">${sub}</div>` +
    '<hr>' +
    (kind === "dinein"
      ? `<div style="font-size:60px;font-weight:bold;">注文番号 ${esc(orderCodeFromId(o.id))}</div>${dineinTime.startsWith("9999") ? "" : `<div style="font-size:36px;">注文時刻 ${esc(dineinTime.slice(11))}</div>`}`
      : `<div style="font-size:40px;font-weight:bold;">${esc(o.name || "")} 様</div><div style="font-size:60px;font-weight:bold;">注文番号 ${esc(orderCodeFromId(o.id))}</div>`) +
    ticketItemsHtml(o) +
    (o.setMeal ? '<div style="font-size:36px;font-weight:bold;">平日セット対象：揚げ物をサービスで付ける</div>' : "") +
    (o.note ? `<div style="font-size:36px;">備考：${esc(o.note)}</div>` : "") +
    (o.kind === "frozen" && o.seal ? `<div style="font-size:36px;font-weight:bold;">温め方シール：${o.seal === "none" ? "不要（貼らない）" : "必要（各商品に貼る）"}</div>` : "") +
    '<hr>' +
    `<div style="font-size:42px;font-weight:bold;">合計 ${yen(o.total)}</div>` +
    '</body></html>';
}

// 伝票（CloudPRNT用プレーンテキスト・80mm）。内容・並びは buildTicketHtml と同じ。
// HTML の文字サイズの強弱は再現できないため、区切り線と空行で代替する。
// 長い商品名はプリンター側の折り返しに任せる。
function ticketItemsText(o) {
  return (o.items || []).map(i => {
    const custom = [i.cut ? (i.cut === "cut4" ? "4カット" : i.cut === "cut6" ? "6カット" : "未カット") : null,
                    i.pack ? (i.pack === "box" ? "箱" : "紙皿・ホイル") : null,
                    i.choice || null,
                    ...(i.toppings || [])].filter(Boolean).join("／");
    const lines = [`${i.name} × ${i.qty}`];
    if (custom) lines.push(`　${custom}`);
    // HTML 版と同じく、伝票では提供タイミングを既定でも常時表示し、旧文言「できた順」は「でき次第」に読み替える
    if (i.timing) lines.push(`　提供：${i.timing === "できた順" ? "でき次第" : i.timing}`);
    return lines.join("\n");
  }).join("\n");
}
function buildTicketText(kind, o) {
  let head, sub;
  if (kind === "dinein") {
    head = "店内注文";
    sub = o.seatLabel || seatLabel(o.seat);
  } else if (o.kind === "frozen") {
    head = "冷凍";
    sub = `受け取り ${formatDateJP(o.confirmedDate || o.pickupDate)} ${o.confirmedPickup || o.requestedPickup || ""}`;
  } else {
    head = "テイクアウト";
    sub = `受け取り ${formatDateJP(o.pickupDate)} ${o.confirmedPickup || o.requestedPickup || ""}`;
  }
  const dineinTime = tsSortKey(o.createdAt);
  const lines = ["るべりえ", head, sub, "--------------------------------"];
  if (kind === "dinein") {
    lines.push(`注文番号 ${orderCodeFromId(o.id)}`);
    if (!dineinTime.startsWith("9999")) lines.push(`注文時刻 ${dineinTime.slice(11)}`);
  } else {
    lines.push(`${o.name || ""} 様`, `注文番号 ${orderCodeFromId(o.id)}`);
  }
  lines.push("--------------------------------", ticketItemsText(o));
  if (o.setMeal) lines.push("平日セット対象：揚げ物をサービスで付ける");
  if (o.note) lines.push(`備考：${o.note}`);
  if (o.kind === "frozen" && o.seal) {
    lines.push(`温め方シール：${o.seal === "none" ? "不要（貼らない）" : "必要（各商品に貼る）"}`);
  }
  lines.push("--------------------------------", `合計 ${yen(o.total)}`, "", "");
  return lines.join("\n").replace(/\r/g, "");
}
// ==== PRINT-TICKET-END ====

// ==== SJIS-LOGIC-BEGIN ====
// Shift_JIS エンコード（CloudPRNT の textB64 用）。外部ライブラリは使わず、
// TextDecoder('shift_jis') で全バイト列を復号して「文字→バイト列」の逆引き表を初回だけ作る。
// SJIS に無い文字は "?"（0x3F）にする。
let sjisMapCache = null;
function buildSjisMap() {
  const map = new Map();
  const dec = new TextDecoder("shift_jis");
  // 1バイト文字（ASCII・半角カナ）。リードバイト単独は復号エラー（U+FFFD）になるので自然に除かれる
  for (let b = 0x00; b <= 0xFF; b++) {
    const s = dec.decode(new Uint8Array([b]));
    if (s.length === 1 && s !== "�" && !map.has(s)) map.set(s, [b]);
  }
  // 2バイト文字
  const leads = [];
  for (let b = 0x81; b <= 0x9F; b++) leads.push(b);
  for (let b = 0xE0; b <= 0xFC; b++) leads.push(b);
  for (const lead of leads) {
    for (let t = 0x40; t <= 0xFC; t++) {
      if (t === 0x7F) continue;
      const s = dec.decode(new Uint8Array([lead, t]));
      if (s.length === 1 && s !== "�" && !map.has(s)) map.set(s, [lead, t]);
    }
  }
  // 復号側の割当ての都合で逆引きに現れないが、SJIS では同じバイトになる文字の補完
  if (!map.has("\\")) map.set("\\", [0x5C]);
  if (!map.has("~")) map.set("~", [0x7E]);
  map.set("¥", [0x5C]);        // U+00A5（円記号）。プリンターでは 0x5C が ¥ として印字される
  map.set("〜", [0x81, 0x60]); // U+301C（波ダッシュ）
  return map;
}
function encodeSjisBytes(str) {
  if (!sjisMapCache) sjisMapCache = buildSjisMap();
  const out = [];
  for (const ch of String(str)) {
    const bytes = sjisMapCache.get(ch);
    if (bytes) out.push(bytes[0], ...(bytes[1] !== undefined ? [bytes[1]] : []));
    else out.push(0x3F); // "?"
  }
  return new Uint8Array(out);
}
function encodeSjisBase64(str) {
  const bytes = encodeSjisBytes(str);
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}
// ==== SJIS-LOGIC-END ====

// PassPRNT を起動して伝票を出す（予備経路）。isAuto=true の自動印刷は「printedAt 未記録」の注文に1回だけ。
async function launchPrintPassPrnt(kind, o, isAuto) {
  const coll = kind === "dinein" ? "dineInOrders" : "takeoutOrders";
  const skey = `passprnt-launched:${kind}:${o.id}`;
  if (isAuto) {
    if (o.printedAt || autoPrintAttempted.has(o.id)) return false;
    try { if (sessionStorage.getItem(skey)) return false; } catch (e) {}
  }
  autoPrintAttempted.add(o.id);
  try { sessionStorage.setItem(skey, "1"); } catch (e) {}
  try {
    // 起動前に印刷済みフラグを記録する（戻り時の再読み込みで再び自動印刷しないため）
    await updateDoc(doc(db, coll, o.id), {
      printedAt: serverTimestamp(), printStatus: "sent", printCount: (o.printCount || 0) + 1,
    });
  } catch (e) {
    console.error("印刷フラグの記録に失敗", e);
    if (isAuto) return false; // フラグが書けないまま出すとループしかねないので自動は中止（手動ボタンで出せる）
  }
  const back = location.origin + location.pathname + "?printcb=" + encodeURIComponent(kind + ":" + o.id);
  const uri = "starpassprnt://v1/print/nopreview?" +
    "back=" + encodeURIComponent(back) +
    "&html=" + encodeURIComponent(buildTicketHtml(kind, o)) +
    "&size=576" +
    "&port=" + encodeURIComponent(PRINTER_PORT);
  window.location.href = uri;
  return true;
}

// ==== CLOUD-LOGIC-BEGIN ====
// CloudPRNT の状態確認の判定（純粋関数）。
// queued の間は、紙切れ・カバー開き等でプリンターが復旧後に同じジョブを自動で出すため、
// 絶対に failed にしない（先に failed にして再印刷すると二重印刷になる）。
// failed になるのは、プリンター側のエラーコードで完了した場合と、ジョブの有効期限
// （Worker 側10分）を過ぎて配布されなくなった場合だけ。
function cloudJobOutcome(st, elapsedMs) {
  if (st && st.state === "done") return st.ok ? "printed" : "failed";
  if (st && st.state === "expired") return "failed";
  if (elapsedMs > 11 * 60 * 1000) return "failed"; // 結果を確認できないまま保持期間を過ぎたら打ち切る
  return "wait";
}
// ==== CLOUD-LOGIC-END ====

const cloudWatchers = new Map(); // docId -> true（状態確認ポーリングの重複防止）

// CloudPRNT の印刷結果を約3秒間隔で追跡し、printStatus を確定させる。
// ページを開き直した場合は render() から再開される（cloudJobId が注文に残っているため）。
function watchCloudJob(kind, id, jobId) {
  if (cloudWatchers.has(id)) return;
  cloudWatchers.set(id, true);
  const coll = kind === "dinein" ? "dineInOrders" : "takeoutOrders";
  const startedAt = Date.now();
  const timer = setInterval(async () => {
    let st = null;
    try {
      const res = await fetch(`${CLOUDPRNT_BASE_URL}/status?job=${encodeURIComponent(jobId)}`);
      if (res.ok) st = await res.json();
    } catch (e) { /* 一時的な通信失敗は次の回に任せる */ }
    const outcome = cloudJobOutcome(st, Date.now() - startedAt);
    if (outcome === "wait") return;
    clearInterval(timer);
    cloudWatchers.delete(id);
    if (outcome === "printed") {
      await updateDoc(doc(db, coll, id), { printStatus: "printed" }).catch(() => {});
      printMsgOk = true;
      printMsg = "🖨 伝票を印刷しました";
    } else {
      await updateDoc(doc(db, coll, id), { printStatus: "failed" }).catch(() => {});
      printMsgOk = false;
      printMsg = "⚠ 伝票の印刷に失敗しました。注文カードの「伝票を再印刷」ボタンで出し直せます。";
    }
    showPrintMsg();
    maybeAutoPrintDinein(); // 店内注文の自動印刷の取りこぼし防止（ガード済みなので安全）
  }, 3000);
}

// CloudPRNT へ伝票ジョブを投入する（本経路）。ガード構造は PassPRNT 版と同じ
// （printedAt の先行記録・autoPrintAttempted・sessionStorage）。
// jobId は注文IDと印刷回数から決定的に作り、再送・二重タップでも同じジョブとして扱う。
async function launchPrintCloud(kind, o, isAuto) {
  const coll = kind === "dinein" ? "dineInOrders" : "takeoutOrders";
  const skey = `cloudprnt-launched:${kind}:${o.id}`;
  if (isAuto) {
    if (o.printedAt || autoPrintAttempted.has(o.id)) return false;
    try { if (sessionStorage.getItem(skey)) return false; } catch (e) {}
  }
  autoPrintAttempted.add(o.id);
  try { sessionStorage.setItem(skey, "1"); } catch (e) {}
  const jobId = `${kind}-${o.id}-${(o.printCount || 0) + 1}`;
  try {
    // PassPRNT 版と同じく「出す前に」フラグを記録する。cloudJobId も一緒に残し、
    // ページを開き直しても状態確認を再開できるようにする。
    await updateDoc(doc(db, coll, o.id), {
      printedAt: serverTimestamp(), printStatus: "sent",
      printCount: (o.printCount || 0) + 1, cloudJobId: jobId,
    });
  } catch (e) {
    console.error("印刷フラグの記録に失敗", e);
    if (isAuto) return false; // フラグが書けないまま出すとループしかねないので自動は中止（手動ボタンで出せる）
  }
  let submitted = false;
  try {
    const res = await fetch(CLOUDPRNT_BASE_URL + "/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, textB64: encodeSjisBase64(buildTicketText(kind, o)) }),
    });
    if (!res.ok) throw new Error("submit failed: " + res.status);
    submitted = true;
  } catch (e) {
    console.error("CloudPRNT へのジョブ投入に失敗", e);
    // 応答が途中で切れただけで Worker には届いている可能性があるため、状態確認で
    // キューに入っている（または完了済み）ことが分かれば投入できたものとして扱う。
    // 入っていないことが確かめられた場合だけ失敗にする（二重印刷防止のため、
    // PassPRNT への自動フォールバックはしない。再印刷は手動ボタンから行う）。
    try {
      const res = await fetch(`${CLOUDPRNT_BASE_URL}/status?job=${encodeURIComponent(jobId)}`);
      if (res.ok) {
        const st = await res.json();
        if (st.state === "queued" || st.state === "done") submitted = true;
      }
    } catch (e2) { /* 状態確認も届かない場合は失敗として扱う */ }
  }
  if (!submitted) {
    await updateDoc(doc(db, coll, o.id), { printStatus: "failed" }).catch(() => {});
    printMsgOk = false;
    printMsg = "⚠ 伝票データを送れませんでした。注文カードの「伝票を再印刷」ボタンで出し直せます。";
    showPrintMsg();
    return false;
  }
  watchCloudJob(kind, o.id, jobId);
  return true;
}

// 印刷の発火点はすべてこのディスパッチャを通す（経路は printRoute() で切り替え）。
function launchPrint(kind, o, isAuto) {
  return printRoute() === "cloud" ? launchPrintCloud(kind, o, isAuto)
                                  : launchPrintPassPrnt(kind, o, isAuto);
}

// 店内注文の自動印刷：未印刷の確認待ちを来た順に試みる。
// CloudPRNT は画面遷移がないので全件まとめて投入し、Worker 側の FIFO に任せる。
// PassPRNT は戻るたびにページが再読み込みされるため、先頭の1件だけを対象にする。
function maybeAutoPrintDinein() {
  const targets = dineinOrders
    .filter(o => o.status === "pending" && !o.printedAt)
    .sort((a, b) => tsMillis(a.createdAt) - tsMillis(b.createdAt));
  if (printRoute() === "cloud") targets.forEach(o => launchPrintCloud("dinein", o, true));
  else if (targets[0]) launchPrintPassPrnt("dinein", targets[0], true);
}

// カード内の印刷まわり（失敗警告／店内の大きな印刷ボタン／再印刷ボタン）
function printBlockHtml(kind, o) {
  const warn = o.printStatus === "failed" ? `<div class="print-warn">⚠ 印刷できていません</div>` : "";
  const big = kind === "dinein" && o.status === "pending" && !o.printedAt
    ? `<div class="act-row"><button class="print-flash-btn" data-print="${kind}|${o.id}">🖨 伝票を印刷</button></div>` : "";
  const re = `<div class="act-row"><button class="btn ghost" data-print="${kind}|${o.id}">${o.printedAt ? "伝票を再印刷" : "伝票を印刷"}</button></div>`;
  return warn + big + re;
}
function bindPrintButtons() {
  document.querySelectorAll("[data-print]").forEach(b => b.addEventListener("click", async () => {
    const [kind, id] = b.dataset.print.split("|");
    const o = (kind === "dinein" ? dineinOrders : orders).find(x => x.id === id);
    if (!o) return;
    b.disabled = true;
    await launchPrint(kind, o, false);
  }));
}

function openKitchen() {
  if (kitchenOpen) return;
  kitchenOpen = true;
  $("pin-gate").classList.add("hidden");
  $("kitchen-main").classList.remove("hidden");
  updateSoundUi();
  ensureRearm();
  startListeners();
  handlePrintReturn();
}

// ---------- 受け取り枠（daySlots）の保守 ----------
// 焼きピザの「1枠1注文」は日次サマリ daySlots/{日付}.taken{時刻: 注文番号} で管理する。
// お客様側が注文時に枠を取り、厨房側は確定時刻の変更・お渡し済み・来店なし・取り消しで枠を動かす/空ける。
async function freeSlot(o) {
  if (!o || o.kind === "frozen") return;
  const date = o.confirmedDate || o.pickupDate;
  const time = o.confirmedPickup || o.requestedPickup;
  if (!date || !time) return;
  try { await updateDoc(doc(db, "daySlots", date), { [`taken.${time}`]: deleteField() }); }
  catch (e) { console.error("枠の解放に失敗", e); }
}
async function takeSlot(o, date, time) {
  if (!o || o.kind === "frozen" || !date || !time) return;
  try { await setDoc(doc(db, "daySlots", date), { taken: { [time]: o.orderNo } }, { merge: true }); }
  catch (e) { console.error("枠の確保に失敗", e); }
}

// ---------- 本日のテイクアウト受付停止 ----------
// 対象は「今日受け取りのテイクアウト」だけ。店内注文・明日以降の予約・冷凍予約は止めない。
// フラグは daySlots/{今日} に merge で書く（taken マップは消さない）。厨房の全端末で状態を共有する。
function watchTodayStop() {
  if (stopUnsub) { stopUnsub(); stopUnsub = null; }
  stopDateKey = todayKey();
  stopUnsub = onSnapshot(doc(db, "daySlots", stopDateKey), snap => {
    todayTakeoutStopped = !!(snap.exists() && snap.data().takeoutStopped);
    renderStopControl();
  }, e => console.error("受付停止状態の購読に失敗", e));
}
function renderStopControl() {
  const banner = $("stop-banner");
  const btn = $("stop-btn");
  if (!banner || !btn) return;
  banner.classList.toggle("hidden", !todayTakeoutStopped);
  btn.textContent = todayTakeoutStopped ? "本日のテイクアウト受付を再開する" : "本日のテイクアウト受付を止める";
  btn.classList.toggle("stopped", todayTakeoutStopped);
}
async function setTakeoutStopped(stop) {
  if (stop && !confirm("本日のテイクアウト受付を止めますか？\n今日の受け取りのご注文ができなくなります（明日以降のご予約・店内注文・冷凍予約は通常通りです）。\n明日になると自動で通常受付に戻ります。")) return;
  const btn = $("stop-btn");
  if (btn) btn.disabled = true;
  try {
    if (stop) {
      await setDoc(doc(db, "daySlots", todayKey()),
        { takeoutStopped: true, takeoutStoppedAt: serverTimestamp() }, { merge: true });
    } else {
      await setDoc(doc(db, "daySlots", todayKey()),
        { takeoutStopped: false, takeoutStoppedAt: deleteField() }, { merge: true });
    }
  } catch (e) {
    console.error("受付停止状態の変更に失敗", e);
    alert("受付状態の変更に失敗しました。通信環境をご確認のうえ、もう一度お試しください。");
  } finally {
    if (btn) btn.disabled = false;
    renderStopControl(); // スナップショットでも更新されるが、失敗時表示の巻き戻しも兼ねる
  }
}
$("stop-btn").addEventListener("click", () => setTakeoutStopped(!todayTakeoutStopped));

// ---------- 伝票印刷の経路切替（この端末の localStorage に保存） ----------
function renderPrintRoute() {
  const btn = $("print-route-btn");
  const state = $("print-route-state");
  if (!btn || !state) return;
  const cloud = printRoute() === "cloud";
  state.textContent = cloud ? "クラウド印刷（画面切り替えなし）" : "PassPRNT（アプリ経由）";
  btn.textContent = cloud ? "PassPRNTに切り替える" : "クラウド印刷に切り替える";
}
const printRouteBtn = $("print-route-btn");
if (printRouteBtn) printRouteBtn.addEventListener("click", () => {
  try { localStorage.setItem(PRINT_ROUTE_KEY, printRoute() === "cloud" ? "pass" : "cloud"); } catch (e) {}
  renderPrintRoute();
});
renderPrintRoute();

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
    maybeAutoPrintDinein(); // 店内注文は入った瞬間に伝票を出す
  });
  onSnapshot(query(collection(db, "calls"), where("status", "==", "open")), snap => {
    calls = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => tsMillis(a.createdAt) - tsMillis(b.createdAt));
    const ids = new Set(calls.map(c => c.id));
    if (startedCalls) {
      for (const c of calls) if (!knownCalls.has(c.id)) playCallSound(c.purpose, c.custom);
    }
    knownCalls = ids;
    startedCalls = true;
    renderCalls();
  });
  onSnapshot(collection(db, "blockedPhones"), snap => {
    blocked = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderBlocked();
  });
  watchTodayStop();
  // カウントダウン更新＋日付が変わったら停止フラグの購読先（その日の daySlots）を張り替える
  setInterval(() => { render(); if (todayKey() !== stopDateKey) watchTodayStop(); }, 30000);
  // 未受付がある間は繰り返し知らせる。両方あるときは「呼び出しの声 → 注文の声」の順でキューに入れる
  setInterval(() => {
    if (calls.length > 0) playCallSound(calls[0].purpose, calls[0].custom); // 一番長く待っている呼び出しの用件で知らせる
    if (orders.some(o => o.status === "pending" && isVisible(o)) ||
        dineinOrders.some(o => o.status === "pending")) playSound();
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
  return orders.filter(o => o.status === "done" || o.status === "noshow" || o.status === "cancelled")
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
// 店内＋テイクアウトの統合表示リスト（タブで絞り込み）
// 未受付（pending）は常に先頭に固定し、来た順に並べる。受付済みは受け取り時刻順（店内は注文順）。
function displayActive() {
  const list = [];
  const push = (kind, o, key) => list.push({ kind, o, key, pend: o.status === "pending" ? 0 : 1, pkey: tsSortKey(o.createdAt) });
  if (tabFilter === "frozen") {
    for (const o of activeOrders().filter(o => o.kind === "frozen"))
      push("takeout", o, o.pickupDate + " " + (o.confirmedPickup || o.requestedPickup));
  } else if (tabFilter !== "dinein") {
    for (const o of activeOrders().filter(o => tabFilter !== "takeout" || o.kind !== "frozen"))
      push("takeout", o, o.pickupDate + " " + (o.confirmedPickup || o.requestedPickup));
  }
  if (tabFilter !== "takeout" && tabFilter !== "frozen")
    for (const o of activeDinein()) push("dinein", o, tsSortKey(o.createdAt));
  return list.sort((a, b) => (a.pend - b.pend) || (a.pend === 0 ? a.pkey.localeCompare(b.pkey) : a.key.localeCompare(b.key)));
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
  bindPrintButtons();
  renderStats();
  // CloudPRNT の結果待ち（printStatus=sent）の注文は、ページを開き直しても追跡を再開する
  if (printRoute() === "cloud") {
    for (const o of dineinOrders) if (o.printStatus === "sent" && o.cloudJobId) watchCloudJob("dinein", o.id, o.cloudJobId);
    for (const o of orders) if (o.printStatus === "sent" && o.cloudJobId) watchCloudJob("takeout", o.id, o.cloudJobId);
  }
}

// ==== 注文集計（純粋計算） STATS-LOGIC-BEGIN ====
// 追加の通信は一切せず、厨房が読み込み済みの注文データをメモリ上で数えるだけ。
// 日付はJSTの日付キー（YYYY-MM-DD）で判定する。
function statsJstKey(date) {
  if (!date) return "";
  const parts = {};
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit",
  });
  for (const p of fmt.formatToParts(date)) parts[p.type] = p.value;
  return `${parts.year}-${parts.month}-${parts.day}`;
}
// periods: [{label, test(key)->bool}]。orders=takeoutOrders、dineinOrders=店内注文。
function computeStats(takeoutList, dineinList, periods) {
  const blank = () => ({ n: 0, amt: 0 });
  const rows = periods.map(p => ({
    label: p.label, test: p.test,
    takeout: blank(), frozen: blank(), dinein: blank(), total: blank(),
    early: 0, noshow: 0, cancelled: 0,
  }));
  const add = (row, cat, o) => {
    if (o.status === "cancelled") { if (cat !== "dinein") row.cancelled++; return; }
    row[cat].n++; row.total.n++;
    if (o.status === "done") {
      const t = Number(o.total) || 0;
      row[cat].amt += t; row.total.amt += t;
    }
    if (cat !== "dinein") {
      if (o.status === "noshow") row.noshow++;
      if ((o.items || []).some(i => String(i.name || "").includes("早割"))) row.early++;
    }
  };
  for (const o of takeoutList || []) {
    const key = o.confirmedDate || o.pickupDate || "";
    const cat = o.kind === "frozen" ? "frozen" : "takeout";
    for (const row of rows) if (row.test(key)) add(row, cat, o);
  }
  for (const o of dineinList || []) {
    const key = o.createdAt && o.createdAt.toDate ? statsJstKey(o.createdAt.toDate()) : "";
    for (const row of rows) if (row.test(key)) add(row, "dinein", o);
  }
  return rows.map(({ test, ...rest }) => rest);
}
// ==== STATS-LOGIC-END ====

function renderStats() {
  const body = $("stats-body");
  if (!body) return;
  const tk = todayKey();
  const mo = tk.slice(0, 7); // YYYY-MM
  const periods = [
    { label: "今日", test: k => k === tk },
    { label: "今月", test: k => !!k && k.startsWith(mo) },
    { label: "累計", test: () => true },
  ];
  const rows = computeStats(orders, dineinOrders, periods);
  const cell = c => `${c.n}件<span class="amt">${yen(c.amt)}</span>`;
  const trs = rows.map(r => `<tr><th class="rowh">${r.label}</th><td>${cell(r.takeout)}</td><td>${cell(r.frozen)}</td><td>${cell(r.dinein)}</td><td>${cell(r.total)}</td></tr>`).join("");
  const subs = rows.map(r => `${r.label}：早割 ${r.early}件・来店なし ${r.noshow}件・キャンセル ${r.cancelled}件`).join("<br>");
  body.innerHTML = `<table class="stats-table"><thead><tr><th></th><th>テイクアウト</th><th>冷凍</th><th>店内</th><th>合計</th></tr></thead><tbody>${trs}</tbody></table><div class="stats-sub">${subs}</div>`;
}

// ---------- 店内オーダーのカード ----------
function dineinCardHtml(o) {
  const isPending = o.status === "pending";
  const stLabel = o.status === "pending" ? "確認待ち" : o.status === "accepted" ? "受付済み" : "提供済み";
  return `<div class="kcard ${isPending ? "pending" : ""}">
    <div>
      <div class="pdate"><span class="kind-chip">店内</span> ／ ${stLabel}</div>
      <div class="ptime">${esc(o.seatLabel || seatLabel(o.seat))}</div>
      <div style="font-weight:900;font-size:34px;letter-spacing:.05em;line-height:1.1;">注文番号 ${esc(orderCodeFromId(o.id))}</div>
    </div>
    <div>${itemsHtml(o)}</div>
    <div class="ktotal">合計 ${yen(o.total)}</div>
    ${printBlockHtml("dinein", o)}
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
      <div style="font-weight:800;">${c.custom
        ? `<span class="kind-chip">ご要望</span> ${esc(c.purpose || "")}`
        : (c.purpose && c.purpose !== "通常の呼び出し" ? esc(c.purpose) : "店員を呼んでいます")}</div>
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
    const custom = [i.cut ? (i.cut === "cut4" ? "4カット" : i.cut === "cut6" ? "6カット" : "未カット") : null,
                    i.pack ? (i.pack === "box" ? "箱" : "紙皿・ホイル") : null,
                    i.choice || null,
                    ...(i.toppings || [])].filter(Boolean).join("／");
    const timingLine = (i.timing && i.timing !== "すぐ提供" && i.timing !== "できた順" && i.timing !== "でき次第")
      ? `<div class="kcustom" style="color:#b3271e;font-weight:900;">⏰ 提供：${esc(i.timing)}</div>` : "";
    return `<div><div class="kitem">${esc(i.name)} × ${i.qty}</div>${custom ? `<div class="kcustom">${esc(custom)}</div>` : ""}${timingLine}</div>`;
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
      <div class="pdate">${o.kind === "frozen" ? `<span class="kind-chip" style="background:#5b2c6f;">冷凍予約</span>` : `<span class="kind-chip" style="background:#2e86c1;">テイクアウト</span>`} ${esc(formatDateJP(o.pickupDate))} ／ ${o.status === "pending" ? "確認待ち" : o.status === "confirmed" ? "確定" : o.status === "done" ? "お渡し済み" : o.status === "cancelled" ? "取り消し" : "来店なし"}</div>
      <div class="ptime">${esc(mainTime)}</div>
      ${countdownText(o) ? `<div>${countdownText(o)}</div>` : ""}
      <div style="font-weight:900;font-size:34px;letter-spacing:.05em;line-height:1.1;">注文番号 ${esc(orderCodeFromId(o.id))}</div>
    </div>
    <div>${regularBadge(o)} <strong style="font-size:18px;">${esc(o.name)} 様</strong>
      <a href="tel:${esc(o.phone)}" style="font-weight:800;">${esc(o.phone)}</a></div>
    ${o.setMeal ? `<div class="setmeal-badge">平日セット対象：揚げ物をサービスで付ける</div>` : ""}
    ${o.note ? `<div class="kcustom">備考：${esc(o.note)}</div>` : ""}
    ${o.kind === "frozen" && o.seal ? `<div class="kcustom" style="font-weight:900;${o.seal === "none" ? "color:#c0392b;" : ""}">温め方シール：${o.seal === "none" ? "不要（貼らない）" : "必要（各商品に貼る）"}</div>` : ""}
    <div>${itemsHtml(o)}</div>
    <div class="ktotal">合計 ${yen(o.total)}</div>
    ${printBlockHtml("takeout", o)}
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
      <button class="btn ghost danger" data-cancel="${o.id}">取り消し</button>
    </div>` : ""}
    ${o.status === "confirmed" ? `
    <div class="act-row">
      <button class="btn" data-done="${o.id}">お渡し済み</button>
      <button class="btn ghost" data-noshow="${o.id}">来店なし</button>
    </div>
    <div class="act-row">
      <button class="btn ghost danger" data-cancel="${o.id}">取り消し</button>
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
    if (o.kind !== "frozen") {
      const oldDate = o.confirmedDate || o.pickupDate;
      const oldTime = o.confirmedPickup || o.requestedPickup;
      const newDate = upd.pickupDate || oldDate;
      if (oldDate !== newDate || oldTime !== upd.confirmedPickup) {
        await freeSlot(o);
        await takeSlot(o, newDate, upd.confirmedPickup);
      }
    }
    // 確定した瞬間に伝票を印刷する（テイクアウト・冷凍共通、初回のみ。伝票には確定時刻を使う）
    if (!o.printedAt) {
      const confirmedOrder = { ...o, ...upd, pickupDate: upd.pickupDate || o.pickupDate };
      launchPrint("takeout", confirmedOrder, true);
    }
  }));
  document.querySelectorAll("[data-done]").forEach(b => b.addEventListener("click", async () => {
    const o = orders.find(x => x.id === b.dataset.done);
    b.disabled = true;
    await updateDoc(doc(db, "takeoutOrders", b.dataset.done), { status: "done", doneAt: serverTimestamp() });
    if (o) await freeSlot(o);
  }));
  document.querySelectorAll("[data-noshow]").forEach(b => b.addEventListener("click", async () => {
    const o = orders.find(x => x.id === b.dataset.noshow);
    if (!o) return;
    if (!confirm(`${o.name} 様の注文を「来店なし」にして、この電話番号を要注意リストに登録しますか？`)) return;
    b.disabled = true;
    await updateDoc(doc(db, "takeoutOrders", o.id), { status: "noshow", noshowAt: serverTimestamp() });
    await freeSlot(o);
    await setDoc(doc(db, "blockedPhones", o.phone), {
      phone: o.phone, name: o.name, reason: "来店なし", createdAt: serverTimestamp(),
    });
  }));
  // 取り消し：電話で取り消し連絡を受けた場合などに使う正式な取り消し。
  // 来店なしと違い、要注意リストには登録しない。枠はその場で空ける（冷凍は freeSlot が自動で何もしない）。
  document.querySelectorAll("[data-cancel]").forEach(b => b.addEventListener("click", async () => {
    const o = orders.find(x => x.id === b.dataset.cancel);
    if (!o) return;
    let msg = `${o.name} 様の注文を取り消しますか？取り消すと、この日時の枠が空いて他のお客様が注文できるようになります。`;
    if (o.printedAt) msg += `\n※伝票は印刷済みです。厨房の伝票は破棄してください。`;
    if (!confirm(msg)) return;
    b.disabled = true;
    await updateDoc(doc(db, "takeoutOrders", o.id), { status: "cancelled", cancelledAt: serverTimestamp() });
    await freeSlot(o);
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

// ---------- テストデータのリセット ----------
// 本番公開前に、テストで入れたデータを全削除してまっさらに戻すための機能。
// 削除対象：takeoutOrders / dineInOrders / calls の全ドキュメントと、daySlots の全ドキュメント（受け取り枠の解放）。
// blockedPhones（要注意リスト）は実データなので絶対に触らない。
// リセットが正常完了したらボタン一式を隠し、その端末の localStorage に覚えさせる（次回開いても出てこない）。
// 完全に消すのではなく、管理エリアの隅の小さいリンクから再表示できる。失敗・中断時は隠さない。
const RESET_HIDDEN_KEY = "kitchenTestResetHidden";
const RESET_TARGETS = [
  { name: "takeoutOrders", label: "テイクアウト・冷凍の注文" },
  { name: "dineInOrders", label: "店内注文" },
  { name: "calls", label: "呼び出し" },
  { name: "daySlots", label: "受け取り枠" },
];
let resetRefs = null; // 確認パネル表示時に取得した削除対象 { コレクション名: [参照...] }
let resetting = false;

function setResetStatus(msg, isErr) {
  const el = $("reset-status");
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle("err", !!isErr);
}
function applyResetVisibility() {
  let hidden = false;
  try { hidden = localStorage.getItem(RESET_HIDDEN_KEY) === "1"; } catch (e) {}
  $("reset-section").classList.toggle("hidden", hidden);
  $("reset-show-link").classList.toggle("hidden", !hidden);
}
$("reset-show-link").addEventListener("click", e => {
  e.preventDefault();
  try { localStorage.removeItem(RESET_HIDDEN_KEY); } catch (err) {}
  applyResetVisibility();
  $("reset-section").open = true;
});
applyResetVisibility();

$("reset-btn").addEventListener("click", async () => {
  if (resetting) return;
  const btn = $("reset-btn");
  btn.disabled = true;
  setResetStatus("件数を確認しています…", false);
  try {
    resetRefs = {};
    const lines = [];
    for (const t of RESET_TARGETS) {
      const snap = await getDocs(collection(db, t.name));
      resetRefs[t.name] = snap.docs.map(d => d.ref);
      lines.push(t.name === "daySlots" ? `受け取り枠：${snap.size}日分` : `${t.label}：${snap.size}件`);
    }
    $("reset-counts").textContent = lines.join(" ／ ");
    $("reset-confirm").classList.remove("hidden");
    setResetStatus("内容を確認して「削除を実行する」を押してください。", false);
  } catch (e) {
    console.error("リセット前の件数取得に失敗", e);
    resetRefs = null;
    setResetStatus(`件数の確認に失敗しました：${e.message || e}`, true);
  } finally {
    btn.disabled = false;
  }
});

$("reset-cancel").addEventListener("click", () => {
  resetRefs = null;
  $("reset-confirm").classList.add("hidden");
  setResetStatus("", false);
});

$("reset-exec").addEventListener("click", async () => {
  if (resetting || !resetRefs) return;
  const total = name => (resetRefs[name] || []).length;
  // 2回目の確認（1回目は確認パネルの表示）。文言を変えて誤操作を防ぐ。
  if (!confirm(`本当に全て削除しますか？\nテイクアウト・冷凍の注文 ${total("takeoutOrders")}件／店内注文 ${total("dineInOrders")}件／呼び出し ${total("calls")}件／受け取り枠 ${total("daySlots")}日分が消えます。\nこの操作は取り消せません。`)) return;
  resetting = true;
  $("reset-exec").disabled = true;
  $("reset-cancel").disabled = true;
  $("reset-btn").disabled = true;
  const doneCounts = {};
  try {
    for (const t of RESET_TARGETS) {
      const refs = resetRefs[t.name] || [];
      let deleted = 0;
      for (let i = 0; i < refs.length; i += 400) {
        const batch = writeBatch(db);
        refs.slice(i, i + 400).forEach(r => batch.delete(r));
        await batch.commit();
        deleted += Math.min(400, refs.length - i);
        doneCounts[t.name] = deleted;
        setResetStatus(`削除中… ${t.label} ${deleted}/${refs.length}${t.name === "daySlots" ? "日分" : "件"}`, false);
      }
      doneCounts[t.name] = deleted;
    }
    const orderTotal = (doneCounts.takeoutOrders || 0) + (doneCounts.dineInOrders || 0);
    setResetStatus(`リセット完了：注文${orderTotal}件（テイクアウト・冷凍 ${doneCounts.takeoutOrders || 0}件＋店内 ${doneCounts.dineInOrders || 0}件）・呼び出し${doneCounts.calls || 0}件・枠${doneCounts.daySlots || 0}日分を削除しました`, false);
    // 正常完了したのでボタン一式を隠し、この端末に覚えさせる（完了メッセージだけ残す）
    $("reset-confirm").classList.add("hidden");
    $("reset-controls").classList.add("hidden");
    resetRefs = null;
    try { localStorage.setItem(RESET_HIDDEN_KEY, "1"); } catch (e) {}
    $("reset-show-link").classList.remove("hidden");
  } catch (e) {
    console.error("リセットに失敗", e);
    const doneText = RESET_TARGETS.filter(t => doneCounts[t.name] !== undefined)
      .map(t => `${t.label} ${doneCounts[t.name]}${t.name === "daySlots" ? "日分" : "件"}`).join("／");
    setResetStatus(`リセットに失敗しました：${e.message || e}${doneText ? `（削除済み：${doneText}。残りはもう一度お試しください）` : ""}`, true);
    // 失敗時は隠さない（再実行できることを優先）
  } finally {
    resetting = false;
    $("reset-exec").disabled = false;
    $("reset-cancel").disabled = false;
    $("reset-btn").disabled = false;
  }
});

// ---------- 音声 ----------
// すべての通知音は単一キューを通して直列に鳴らす（同時に1つだけ。注文の声と呼び出しの声が重ならない）。
// 同じ audio 要素は「再生中＋待機中」で1つにまとめ、重複要求は捨てる。
// 次へ進む条件は 'ended' イベント。来ない場合の保険として「再生時間＋3秒」のタイムアウトでも進める。
// キュー先頭の再生がブラウザに拒否されたら、キューを空にして未武装状態に戻す（バナー表示）。
const playQueue = [];
let currentPlay = null; // { el, timer, finished }
function enqueuePlay(a) {
  if (!a) return;
  if (currentPlay && currentPlay.el === a) return;
  if (playQueue.includes(a)) return;
  playQueue.push(a);
  pumpQueue();
}
function pumpQueue() {
  if (currentPlay || playQueue.length === 0) return;
  const el = playQueue.shift();
  const state = { el, timer: null, finished: false };
  currentPlay = state;
  const finish = rejected => {
    if (state.finished) return;
    state.finished = true;
    el.removeEventListener("ended", onEnded);
    if (state.timer) clearTimeout(state.timer);
    if (currentPlay === state) currentPlay = null;
    if (rejected) {
      playQueue.length = 0; // 先頭が拒否されたら残りも鳴らさず、未武装化してタップ再武装を待つ
      handlePlayRejection();
      return;
    }
    pumpQueue();
  };
  const onEnded = () => finish(false);
  el.addEventListener("ended", onEnded);
  try { el.currentTime = 0; } catch (e) {}
  let p;
  try { p = el.play(); } catch (e) { finish(true); return; }
  if (p && p.catch) p.catch(err => { console.warn("音声の再生がブロックされました", err); finish(true); });
  const dur = isFinite(el.duration) && el.duration > 0 ? el.duration : 5;
  state.timer = setTimeout(() => finish(false), (dur + 3) * 1000);
}
function handlePlayRejection() {
  if (!soundIntent) return;
  soundEnabled = false; // この読み込みでは鳴らせない状態に戻す
  updateSoundUi();
  ensureRearm();
}
// ユーザージェスチャの中で audio 要素を一度再生→停止し、この読み込みでの再生ロックを解除する
function primeAudioEl(a) {
  if (!a) return;
  try {
    const p = a.play();
    if (p && p.catch) p.catch(() => {});
    a.pause();
    a.currentTime = 0;
  } catch (e) {}
}
// タップをきっかけに音声を再武装する。未対応の注文・呼び出しがあれば、その場で一度知らせる。
function armSound() {
  if (!soundIntent || soundEnabled) return;
  soundEnabled = true;
  primeAudioEl($("order-sound"));
  primeAudioEl($("call-sound"));
  for (const k of Object.keys(callAudioCache)) primeAudioEl(callAudioCache[k]);
  updateSoundUi();
  if (orders.some(o => o.status === "pending" && isVisible(o)) ||
      dineinOrders.some(o => o.status === "pending")) playSound();
  else if (calls.length > 0) playCallSound(calls[0].purpose, calls[0].custom);
}
let rearmListening = false;
function ensureRearm() {
  if (!soundIntent || soundEnabled || rearmListening) return;
  rearmListening = true;
  document.addEventListener("pointerdown", onRearmTap);
}
function onRearmTap() {
  document.removeEventListener("pointerdown", onRearmTap);
  rearmListening = false;
  armSound();
}
function updateSoundUi() {
  const banner = $("sound-banner");
  const state = $("sound-state");
  if (!state) return;
  if (soundIntent && !soundEnabled) {
    if (banner) banner.classList.remove("hidden");
    state.textContent = "音声：有効（画面をタップすると音が出るようになります）";
  } else if (soundEnabled) {
    if (banner) banner.classList.add("hidden");
    state.textContent = "音声：有効（新しい注文・呼び出しでモコの声が鳴ります）";
  } else {
    if (banner) banner.classList.add("hidden");
    state.textContent = "音声：未設定（ボタンを押すと鳴るようになります）";
  }
  $("sound-btn").textContent = soundIntent ? "音をテストする" : "音を有効にする";
}
function playSound() {
  if (!soundEnabled) return;
  enqueuePlay($("order-sound"));
}
// 呼び出しの用件ごとの音声（通常の呼び出しは従来の「お客様がお呼びです！」）
const CALL_SOUNDS = {
  "食後のドリンクをお願いします": "audio/moko-call-drink-v1.mp3",
  "食後のスイーツをお願いします": "audio/moko-call-sweets-v1.mp3",
  "空いた食器を下げてください": "audio/moko-call-dishes-v1.mp3",
  "お会計をお願いします": "audio/moko-call-bill-v1.mp3",
};
const callAudioCache = {};
function playCallSound(purpose, custom) {
  if (!soundEnabled) return;
  let a;
  // 自由記入の呼び出し（custom）は用件別音声を使わず、通常の呼び出し音にする
  if (!custom && purpose && CALL_SOUNDS[purpose]) {
    if (!callAudioCache[purpose]) { callAudioCache[purpose] = new Audio(CALL_SOUNDS[purpose]); callAudioCache[purpose].preload = "auto"; }
    a = callAudioCache[purpose];
  } else {
    a = $("call-sound");
  }
  enqueuePlay(a);
}
$("sound-btn").addEventListener("click", () => {
  soundIntent = true;
  try { localStorage.setItem(SOUND_FLAG_KEY, "1"); } catch (e) {}
  soundEnabled = true;
  primeAudioEl($("call-sound"));
  for (const k of Object.keys(callAudioCache)) primeAudioEl(callAudioCache[k]);
  updateSoundUi();
  playSound();
});
updateSoundUi();
ensureRearm();
