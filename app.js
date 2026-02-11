<script>
// ==================== КОНФИГУРАЦИЯ FIREBASE ====================
// ⚠️ ВАЖНО: ЗАМЕНИТЕ ЭТИ ЗНАЧЕНИЯ НА СВОИ ИЗ FIREBASE CONSOLE!
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyA9x1ZcFgHjklmnoiT2XqPq3RzABCDEFGH",
    authDomain: "poll-hope-11.firebaseapp.com",
    databaseURL: "https://poll-hope-11-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "poll-hope-11",
    storageBucket: "poll-hope-11.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef1234567890"
};

// ==================== КОНФИГУРАЦИЯ ОПРОСА ====================
const CONFIG = {
    district: "Заднепровский район",
    questions: [
        {
            id: 1,
            category: "🏠 Обслуживание дома",
            text: "Уборка подъездов и лестничных клеток",
            type: "rating",
            options: ["1 - Очень плохо", "2 - Плохо", "3 - Удовлетворительно", "4 - Хорошо", "5 - Отлично"]
        },
        {
            id: 2,
            category: "🏠 Обслуживание дома",
            text: "Вывоз мусора",
            type: "rating",
            options: ["1 - Постоянные проблемы", "2 - Частые задержки", "3 - Нерегулярно", "4 - В основном нормально", "5 - Регулярно и чисто"]
        },
        {
            id: 3,
            category: "🏠 Обслуживание дома",
            text: "Состояние лифтов (если есть)",
            type: "rating",
            options: ["1 - Не работают", "2 - Частые поломки", "3 - Работают с перебоями", "4 - Небольшие проблемы", "5 - Исправно работают"]
        },
        {
            id: 4,
            category: "🌳 Придомовая территория",
            text: "Уборка двора и детских площадок",
            type: "rating",
            options: ["1 - Очень грязно", "2 - Запущено", "3 - Бывает мусор", "4 - В целом чисто", "5 - Идеально убрано"]
        },
        {
            id: 5,
            category: "🌳 Придомовая территория",
            text: "Освещение двора и подъездов",
            type: "rating",
            options: ["1 - Нет освещения", "2 - Темно вечерами", "3 - Половина не работает", "4 - Большинство работает", "5 - Все фонари работают"]
        }
    ],
    storageKey: "jkhPollData"
};

// ==================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ====================
let db = null;
let firebaseInitialized = false;
let votes = [];

// ==================== ИНИЦИАЛИЗАЦИЯ FIREBASE ====================
function initializeFirebase() {
    console.log("Инициализация Firebase...");
    
    if (typeof firebase === 'undefined') {
        console.log("Загружаем Firebase SDK...");
        
        const firebaseAppScript = document.createElement('script');
        firebaseAppScript.src = "https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js";
        
        firebaseAppScript.onload = () => {
            console.log("Firebase App загружен");
            
            const firebaseDBScript = document.createElement('script');
            firebaseDBScript.src = "https://www.gstatic.com/firebasejs/9.0.0/firebase-database-compat.js";
            
            firebaseDBScript.onload = () => {
                console.log("Firebase Database загружен");
                initFirebaseApp();
            };
            
            firebaseDBScript.onerror = (error) => {
                console.error("Ошибка загрузки Firebase Database:", error);
                showError("Не удалось загрузить Firebase. Проверьте интернет-соединение.");
            };
            
            document.head.appendChild(firebaseDBScript);
        };
        
        firebaseAppScript.onerror = (error) => {
            console.error("Ошибка загрузки Firebase App:", error);
            showError("Не удалось загрузить Firebase. Проверьте интернет-соединение.");
        };
        
        document.head.appendChild(firebaseAppScript);
    } else {
        console.log("Firebase уже загружен");
        initFirebaseApp();
    }
}

function initFirebaseApp() {
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(FIREBASE_CONFIG);
            console.log("✅ Firebase инициализирован");
        } else {
            console.log("✅ Firebase уже был инициализирован");
        }
        
        db = firebase.database();
        firebaseInitialized = true;
        console.log("✅ Firebase Database готов к работе");
        
        // 1. Объединяем локальные и серверные данные
        loadAndMergeData();
        
        // 2. Слушаем новые голоса в реальном времени
        setupRealtimeListener();
        
        // 3. Отправляем в Firebase локальные голоса, которых там ещё нет
        syncLocalVotesToFirebase();
        
    } catch (error) {
        console.error("❌ Ошибка инициализации Firebase:", error);
        firebaseInitialized = false;
        showError("Ошибка подключения к базе данных. Голоса сохраняются локально.");
    }
}

// ==================== РАБОТА С ДАННЫМИ (ОБЪЕДИНЕНИЕ) ====================
async function loadAndMergeData() {
    if (!firebaseInitialized || !db) {
        console.log("Firebase не инициализирован, пропускаем объединение");
        return;
    }
    
    try {
        console.log("📥 Загрузка данных из Firebase...");
        const snapshot = await db.ref('votes').once('value');
        const firebaseData = snapshot.val();
        const firebaseVotes = firebaseData ? Object.values(firebaseData) : [];
        console.log(`   Из Firebase: ${firebaseVotes.length} голосов`);
        
        // Локальные голоса уже должны быть в votes (загружены из localStorage)
        const localVotes = votes;
        
        // Слияние без дубликатов (приоритет — серверные данные)
        const mergedMap = new Map();
        firebaseVotes.forEach(v => mergedMap.set(v.id, v));
        localVotes.forEach(v => {
            if (!mergedMap.has(v.id)) {
                mergedMap.set(v.id, v);
            }
        });
        
        votes = Array.from(mergedMap.values());
        console.log(`🔄 После объединения: ${votes.length} голосов`);
        
        // Сохраняем полный набор обратно в localStorage
        saveToLocalStorage();
        updateVotesCounter();
        
    } catch (error) {
        console.error("Ошибка загрузки из Firebase:", error);
        // Оставляем votes как есть (локальные данные)
    }
}

function setupRealtimeListener() {
    if (!firebaseInitialized || !db) return;
    
    db.ref('votes').on('child_added', (snapshot) => {
        const newVote = snapshot.val();
        console.log("🔔 Новый голос в реальном времени:", newVote);
        
        if (!votes.some(v => v.id === newVote.id)) {
            votes.push(newVote);
            saveToLocalStorage();
            updateVotesCounter();
        }
    });
}

// ==================== АВТОСИНХРОНИЗАЦИЯ ЛОКАЛЬНЫХ ГОЛОСОВ ====================
async function syncLocalVotesToFirebase() {
    if (!firebaseInitialized || !db) {
        console.log("Firebase не готов, синхронизация отложена");
        return;
    }
    
    try {
        // Получаем все ID голосов, уже существующих в Firebase
        const snapshot = await db.ref('votes').once('value');
        const firebaseVotes = snapshot.val() || {};
        const firebaseIds = new Set(Object.keys(firebaseVotes));
        
        let syncedCount = 0;
        for (const vote of votes) {
            if (!firebaseIds.has(vote.id)) {
                try {
                    await db.ref('votes/' + vote.id).set(vote);
                    console.log(`✅ Отправлен локальный голос ${vote.id}`);
                    syncedCount++;
                } catch (error) {
                    console.error(`❌ Ошибка отправки голоса ${vote.id}:`, error);
                }
            }
        }
        
        if (syncedCount > 0) {
            console.log(`🔄 Синхронизировано ${syncedCount} локальных голосов с Firebase`);
        }
    } catch (error) {
        console.error("Ошибка при синхронизации с Firebase:", error);
    }
}

// ==================== ИНТЕРФЕЙС ====================
function loadQuestions() {
    const container = document.getElementById('questionsContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    CONFIG.questions.forEach(question => {
        if (question.category) {
            container.innerHTML += `
                <div class="category-header mt-4">
                    <h5>${question.category}</h5>
                    <hr>
                </div>
            `;
        }
        
        let inputHtml = '';
        if (question.type === 'rating') {
            inputHtml = `
                <div class="rating-stars mb-2" id="stars-${question.id}">
                    ${[1, 2, 3, 4, 5].map(num => `
                        <span class="star" data-question="${question.id}" data-value="${num}">
                            <i class="far fa-star"></i>
                        </span>
                    `).join('')}
                </div>
                <div class="text-muted small">
                    ${question.options.join(' • ')}
                </div>
                <input type="hidden" id="answer-${question.id}" required>
            `;
        }
        
        container.innerHTML += `
            <div class="question" data-id="${question.id}">
                <h6>${question.id}. ${question.text}</h6>
                ${inputHtml}
            </div>
        `;
    });
    
    // Добавляем обработчики для звезд
    setTimeout(() => {
        document.querySelectorAll('.star').forEach(star => {
            star.addEventListener('click', function() {
                const questionId = this.getAttribute('data-question');
                const value = this.getAttribute('data-value');
                
                document.querySelectorAll(`.star[data-question="${questionId}"]`).forEach((s, index) => {
                    const icon = s.querySelector('i');
                    if (index < value) {
                        icon.className = 'fas fa-star';
                        s.classList.add('active');
                    } else {
                        icon.className = 'far fa-star';
                        s.classList.remove('active');
                    }
                });
                
                document.getElementById(`answer-${questionId}`).value = value;
            });
        });
    }, 100);
}

async function submitVote() {
    const street = document.getElementById('street').value.trim();
    const house = document.getElementById('house').value.trim();
    
    if (!street || !house) {
        alert('Пожалуйста, укажите улицу и номер дома');
        return;
    }
    
    const answers = [];
    let allAnswered = true;
    
    for (const question of CONFIG.questions) {
        const answerValue = document.getElementById(`answer-${question.id}`)?.value;
        
        if (!answerValue) {
            allAnswered = false;
            const questionElement = document.querySelector(`[data-id="${question.id}"]`);
            if (questionElement) {
                questionElement.style.border = '2px solid #dc3545';
                setTimeout(() => {
                    questionElement.style.border = 'none';
                }, 2000);
            }
            break;
        }
        
        answers.push({
            questionId: question.id,
            question: question.text,
            value: answerValue
        });
    }
    
    if (!allAnswered) {
        alert('Пожалуйста, ответьте на все вопросы');
        return;
    }
    
    const voteData = {
        id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        street: street,
        house: house,
        entrance: document.getElementById('entrance').value.trim() || '',
        answers: answers,
        timestamp: new Date().toISOString(),
        district: CONFIG.district
    };
    
    console.log("📤 Отправляем голос:", voteData);
    
    // Сохраняем локально
    votes.push(voteData);
    saveToLocalStorage();
    updateVotesCounter();
    
    // Отправляем в Firebase, если доступен
    if (firebaseInitialized && db) {
        try {
            await db.ref('votes/' + voteData.id).set(voteData);
            console.log("✅ Голос отправлен в Firebase");
            showSuccessModal();
        } catch (error) {
            console.error("❌ Ошибка отправки в Firebase:", error);
            alert('⚠️ Голос сохранён локально. При следующем подключении к интернету он будет синхронизирован автоматически.');
        }
    } else {
        alert('💾 Голос сохранён локально. При подключении к интернету синхронизируется с общей базой.');
    }
    
    clearForm();
}

function showSuccessModal() {
    const modal = new bootstrap.Modal(document.getElementById('successModal'));
    modal.show();
}

function clearForm() {
    document.getElementById('street').value = '';
    document.getElementById('house').value = '';
    document.getElementById('entrance').value = '';
    
    document.querySelectorAll('.star i').forEach(icon => {
        icon.className = 'far fa-star';
    });
    document.querySelectorAll('.star').forEach(star => {
        star.classList.remove('active');
    });
    
    CONFIG.questions.forEach(q => {
        const input = document.getElementById(`answer-${q.id}`);
        if (input) input.value = '';
    });
}

function updateVotesCounter() {
    const counter = document.getElementById('totalVotes');
    if (counter) {
        counter.textContent = votes.length;
    }
}

// ==================== LOCAL STORAGE ====================
function saveToLocalStorage() {
    try {
        localStorage.setItem(CONFIG.storageKey, JSON.stringify(votes));
        console.log(`💾 Сохранено ${votes.length} голосов в localStorage`);
    } catch (error) {
        console.error("Ошибка сохранения в localStorage:", error);
    }
}

function loadFromLocalStorage() {
    try {
        const saved = localStorage.getItem(CONFIG.storageKey);
        if (saved) {
            votes = JSON.parse(saved);
            updateVotesCounter();
            console.log(`📀 Загружено ${votes.length} голосов из localStorage`);
        } else {
            console.log("ℹ️ В localStorage нет сохранённых голосов");
        }
    } catch (error) {
        console.error("Ошибка загрузки из localStorage:", error);
        votes = [];
    }
    // ❌ УДАЛЕНО: loadFromGlobStorage(); – больше не вызывается автоматически!
}

// ==================== ФУНКЦИЯ ДЛЯ РАЗОВОГО ИМПОРТА СТАРЫХ ДАННЫХ ====================
// (Можно вызвать вручную из консоли, если нужно)
function loadFromGlobStorage() {
    const oldVotes = JSON.parse(localStorage.getItem('zhkhVotes')) || [];
    console.log('📦 Найдено старых голосов для импорта:', oldVotes.length);
    
    oldVotes.forEach((vote, i) => {
        const id = Date.now() + i + '_' + Math.random().toString(36).substr(2, 5);
        const newVote = {
            id: id,
            street: vote.address?.split(', ')[1] || '',
            house: vote.address?.split(', ')[2] || '',
            entrance: vote.entrance || '',
            answers: Object.keys(vote.ratings || {}).map(q => ({
                questionId: parseInt(q),
                value: vote.ratings[q]
            })),
            timestamp: vote.timestamp || new Date().toISOString(),
            district: CONFIG.district
        };
        
        // Добавляем в локальный массив
        votes.push(newVote);
        
        // Если Firebase доступен – отправляем сразу
        if (firebaseInitialized && db) {
            db.ref('votes/' + id).set(newVote)
                .then(() => console.log(`✅ Импорт ${i+1} завершён`))
                .catch(err => console.error(`❌ Ошибка импорта ${i+1}:`, err));
        }
    });
    
    saveToLocalStorage();
    updateVotesCounter();
    console.log(`✅ Импорт завершён. Всего голосов: ${votes.length}`);
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================
function showError(message) {
    console.error(message);
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger mt-3';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
    document.querySelector('.container')?.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// ==================== ЗАПУСК ПРИ ЗАГРУЗКЕ ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log("🚀 Страница загружена, запуск...");
    
    // 1. Загружаем вопросы
    loadQuestions();
    
    // 2. Загружаем локальные голоса
    loadFromLocalStorage();
    
    // 3. Инициализируем Firebase (он сам догрузит серверные данные и синхронизирует)
    initializeFirebase();
    
    // 4. Обновляем счётчик (локальные данные уже есть)
    updateVotesCounter();
});

// Экспортируем функции в глобальную область для консоли
window.submitVote = submitVote;
window.clearForm = clearForm;
window.loadFromGlobStorage = loadFromGlobStorage; // если нужен ручной импорт
window.syncLocalVotesToFirebase = syncLocalVotesToFirebase; // для ручной синхронизации
</script>
