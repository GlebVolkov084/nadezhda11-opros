// === КОНФИГУРАЦИЯ FIREBASE ===
// ЗАМЕНИТЕ ЭТИ ДАННЫЕ НА СВОИ!
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBTS-0VOeGZguROG2MDbI_jk1jQZzLd3-U",
  authDomain: "poll-hope-11.firebaseapp.com",
  projectId: "poll-hope-11",
  storageBucket: "poll-hope-11.firebasestorage.app",
  messagingSenderId: "435823135667",
  appId: "1:435823135667:web:6ba49658720ffb5d9819c6",
  measurementId: "G-XJGQMVV4VW"
};

// === ИНИЦИАЛИЗАЦИЯ ===
let db;
let votes = [];

// Автозагрузка Firebase
function initFirebase() {
    const script = document.createElement('script');
    script.src = "https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js";
    script.onload = () => {
        const script2 = document.createElement('script');
        script2.src = "https://www.gstatic.com/firebasejs/9.0.0/firebase-database-compat.js";
        script2.onload = () => {
            firebase.initializeApp(FIREBASE_CONFIG);
            db = firebase.database();
            loadData();
        };
        document.head.appendChild(script2);
    };
    document.head.appendChild(script);
}

// Загрузка данных
async function loadData() {
    try {
        const snapshot = await db.ref('votes').once('value');
        votes = Object.values(snapshot.val() || {});
        updateUI();
    } catch (error) {
        console.log("Ошибка загрузки:", error);
    }
}

// Голосование
async function submitVote() {
    const newVote = {
        id: Date.now(),
        street: "Тестовая",
        house: "1",
        answers: ["5", "4", "3"],
        timestamp: new Date().toISOString()
    };
    
    // Сохраняем в Firebase
    await db.ref('votes/' + newVote.id).set(newVote);
    alert("Голос сохранен!");
}

// Запуск
document.addEventListener('DOMContentLoaded', initFirebase);
