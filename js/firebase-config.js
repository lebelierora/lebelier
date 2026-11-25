// Firebase 初期化（ウェブ用 config は公開前提の識別子。保護は Firestore セキュリティルールで行う）
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCpEcwPm5l_vHIJIAFCRrGORFK0O2gfI9A",
  authDomain: "ruberie-order.firebaseapp.com",
  projectId: "ruberie-order",
  storageBucket: "ruberie-order.firebasestorage.app",
  messagingSenderId: "41573377057",
  appId: "1:41573377057:web:6c9a497f07701d77686f60"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
