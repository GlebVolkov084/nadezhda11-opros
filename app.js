// === КОНФИГУРАЦИЯ FIREBASE ===
// ЗАМЕНИТЕ ЭТИ ДАННЫЕ НА СВОИ!
const FIREBASE_CONFIG = {
    apiKey: "ВАШ_API_KEY",
    authDomain: "ВАШ_ПРОЕКТ.firebaseapp.com",
    databaseURL: "https://ВАШ_ПРОЕКТ-default-rtdb.firebaseio.com",
    projectId: "ВАШ_ПРОЕКТ",
    storageBucket: "ВАШ_ПРОЕКТ.appspot.com",
    messagingSenderId: "ВАШ_NUMBER",
    appId: "ВАШ_APP_ID"
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
