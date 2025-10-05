// Firebase modular SDK configuration for ByteClave
// NOTE: Replace config only if project changes. Provided by user.
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getFirestore, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyANEe5mU0dVkZ2fZRR3u_nH67AoyTTyjRU",
  authDomain: "bytebyphilip-4c0e3.firebaseapp.com",
  projectId: "bytebyphilip-4c0e3",
  storageBucket: "bytebyphilip-4c0e3.firebasestorage.app",
  messagingSenderId: "714256793883",
  appId: "1:714256793883:web:8a3bc16f8b504fddeb53be"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
export { app, db, storage, serverTimestamp };
