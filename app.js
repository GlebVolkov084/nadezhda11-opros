<script>
// ==================== 1. КОНФИГУРАЦИЯ ====================
const FIREBASE_URL = "https://poll-hope-11-default-rtdb.europe-west1.firebasedatabase.app"; // ⚠️ ПРОВЕРЬТЕ ТОЧНОСТЬ!

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
    storageKey: "jkhPollData",
    migrationFlag: "jkh_migrated_from_zhkh" // флаг, что миграция уже выполнена
};

// ==================== 2. ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ====================
let votes = [];

// ==================== 3. РАБОТА С FIREBASE (REST API) ====================

/** Загрузить все голоса из Firebase и объединить с локальными */
async function loadVotesFromFirebase() {
    try {
        const response = await fetch(`${FIREBASE_URL}/votes.json`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const firebaseVotes = data ? Object.values(data) : [];
        console.log(`📥 Загружено ${firebaseVotes.length} голосов из Firebase`);

        // Объединение без дубликатов (приоритет — серверные данные)
        const mergedMap = new Map();
        firebaseVotes.forEach(v => mergedMap.set(v.id, v));
        votes.forEach(v => { if (!mergedMap.has(v.id)) mergedMap.set(v.id, v); });

        votes = Array.from(mergedMap.values());
        saveToLocalStorage();
        updateVotesCounter();
    } catch (error) {
        console.warn("⚠️ Не удалось загрузить из Firebase:", error.message);
    }
}

/** Отправить один голос в Firebase (PUT /votes/{id}.json) */
async function sendVoteToFirebase(voteData) {
    try {
        const response = await fetch(`${FIREBASE_URL}/votes/${voteData.id}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(voteData)
        });
        if (response.ok) {
            console.log(`✅ Голос ${voteData.id} отправлен в Firebase`);
            return true;
        } else {
            console.warn(`❌ Ошибка отправки: ${response.status}`);
            return false;
        }
    } catch (error) {
        console.warn("❌ Ошибка сети при отправке в Firebase:", error.message);
        return false;
    }
}

/** Синхронизировать все локальные голоса, которых нет в Firebase */
async function syncLocalVotesToFirebase() {
    if (!votes.length) return;

    try {
        const response = await fetch(`${FIREBASE_URL}/votes.json?shallow=true`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const firebaseIds = await response.json(); // { id1: true, ... }
        const idSet = new Set(firebaseIds ? Object.keys(firebaseIds) : []);

        let synced = 0;
        for (const vote of votes) {
            if (!idSet.has(vote.id)) {
                const success = await sendVoteToFirebase(vote);
                if (success) synced++;
            }
        }
        if (synced > 0) console.log(`🔄 Синхронизировано ${synced} локальных голосов`);
    } catch (error) {
        console.warn("⚠️ Ошибка синхронизации:", error.message);
    }
}

// ==================== 4. LOCALSTORAGE И МИГРАЦИЯ ====================

function saveToLocalStorage() {
    try {
        localStorage.setItem(CONFIG.storageKey, JSON.stringify(votes));
    } catch (e) {
        console.error("Ошибка сохранения в localStorage:", e);
    }
}

function loadFromLocalStorage() {
    try {
        const saved = localStorage.getItem(CONFIG.storageKey);
        votes = saved ? JSON.parse(saved) : [];
        updateVotesCounter();
        console.log(`💾 Загружено ${votes.length} голосов из ${CONFIG.storageKey}`);
    } catch (e) {
        console.error("Ошибка загрузки из localStorage:", e);
        votes = [];
    }
}

/** АВТОМАТИЧЕСКАЯ МИГРАЦИЯ СТАРЫХ ГОЛОСОВ ИЗ zhkhVotes */
async function migrateOldVotes() {
    // Проверяем, есть ли старые данные
    const oldData = localStorage.getItem('zhkhVotes');
    if (!oldData) return;

    // Проверяем, выполнялась ли уже миграция
    if (localStorage.getItem(CONFIG.migrationFlag) === 'true') {
        console.log("ℹ️ Миграция старых голосов уже была выполнена ранее");
        return;
    }

    console.log("🔄 Начинаем миграцию старых голосов из zhkhVotes...");
    let oldVotes = [];
    try {
        oldVotes = JSON.parse(oldData);
    } catch (e) {
        console.error("Ошибка парсинга старых голосов:", e);
        return;
    }

    if (!Array.isArray(oldVotes) || oldVotes.length === 0) return;

    let imported = 0;
    for (let i = 0; i < oldVotes.length; i++) {
        const old = oldVotes[i];
        // Генерируем новый ID, чтобы избежать конфликтов
        const id = Date.now() + i + '_' + Math.random().toString(36).substring(2, 7);
        const newVote = {
            id: id,
            street: old.address?.split(', ')[1] || '',
            house: old.address?.split(', ')[2] || '',
            entrance: old.entrance || '',
            answers: Object.keys(old.ratings || {}).map(q => ({
                questionId: parseInt(q),
                value: old.ratings[q]
            })),
            timestamp: old.timestamp || new Date().toISOString(),
            district: CONFIG.district
        };

        // Проверяем, нет ли уже такого голоса (по улице+дому+времени)
        const exists = votes.some(v => 
            v.street === newVote.street && 
            v.house === newVote.house && 
            v.timestamp === newVote.timestamp
        );
        if (!exists) {
            votes.push(newVote);
            imported++;
        }
    }

    if (imported > 0) {
        saveToLocalStorage();
        updateVotesCounter();
        console.log(`✅ Мигрировано ${imported} старых голосов`);
        // Отправляем их в Firebase (асинхронно, не ждём)
        syncLocalVotesToFirebase();
    }

    // Устанавливаем флаг, что миграция выполнена
    localStorage.setItem(CONFIG.migrationFlag, 'true');
}

// ==================== 5. ОТПРАВКА НОВОГО ГОЛОСА ====================
window.submitVote = async function() {
    // Получаем адрес
    const street = document.getElementById('street')?.value.trim();
    const house = document.getElementById('house')?.value.trim();
    const entrance = document.getElementById('entrance')?.value.trim() || '';

    if (!street || !house) {
        alert('Укажите улицу и номер дома');
        return;
    }

    // Собираем ответы
    const answers = [];
    let allAnswered = true;

    for (const q of CONFIG.questions) {
        const answerEl = document.getElementById(`answer-${q.id}`);
        const value = answerEl?.value;
        if (!value) {
            allAnswered = false;
            const questionDiv = document.querySelector(`[data-id="${q.id}"]`);
            if (questionDiv) {
                questionDiv.style.border = '2px solid red';
                setTimeout(() => questionDiv.style.border = '', 2000);
            }
            break;
        }
        answers.push({
            questionId: q.id,
            question: q.text,
            value: value
        });
    }

    if (!allAnswered) {
        alert('Ответьте на все вопросы');
        return;
    }

    // Формируем голос
    const voteData = {
        id: Date.now() + '_' + Math.random().toString(36).substring(2, 10),
        street,
        house,
        entrance,
        answers,
        timestamp: new Date().toISOString(),
        district: CONFIG.district
    };

    // Сохраняем локально
    votes.push(voteData);
    saveToLocalStorage();
    updateVotesCounter();

    // Отправляем в Firebase
    const sent = await sendVoteToFirebase(voteData);
    if (sent) {
        const modalEl = document.getElementById('successModal');
        if (modalEl) {
            const modal = new bootstrap.Modal(modalEl);
            modal.show();
        }
    } else {
        alert('✅ Голос сохранён локально. Он будет автоматически отправлен при подключении к интернету.');
    }

    // Очищаем форму
    clearForm();
};

window.clearForm = function() {
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
};

function updateVotesCounter() {
    const counter = document.getElementById('totalVotes');
    if (counter) counter.textContent = votes.length;
}

// ==================== 6. ЗАГРУЗКА ВОПРОСОВ И ЗВЁЗД ====================
function loadQuestions() {
    const container = document.getElementById('questionsContainer');
    if (!container) return;

    container.innerHTML = '';

    CONFIG.questions.forEach(q => {
        if (q.category) {
            container.innerHTML += `
                <div class="category-header mt-4">
                    <h5>${q.category}</h5>
                    <hr>
                </div>
            `;
        }

        let html = `
            <div class="question" data-id="${q.id}">
                <h6>${q.id}. ${q.text}</h6>
                <div class="rating-stars mb-2" id="stars-${q.id}">
                    ${[1,2,3,4,5].map(num => `
                        <span class="star" data-question="${q.id}" data-value="${num}">
                            <i class="far fa-star"></i>
                        </span>
                    `).join('')}
                </div>
                <div class="text-muted small">${q.options.join(' • ')}</div>
                <input type="hidden" id="answer-${q.id}" required>
            </div>
        `;
        container.innerHTML += html;
    });

    setTimeout(() => {
        document.querySelectorAll('.star').forEach(star => {
            star.addEventListener('click', function(e) {
                const qid = this.dataset.question;
                const val = parseInt(this.dataset.value);

                document.querySelectorAll(`.star[data-question="${qid}"]`).forEach((s, index) => {
                    const icon = s.querySelector('i');
                    if (index < val) {
                        icon.className = 'fas fa-star';
                        s.classList.add('active');
                    } else {
                        icon.className = 'far fa-star';
                        s.classList.remove('active');
                    }
                });

                document.getElementById(`answer-${qid}`).value = val;
            });
        });
    }, 50);
}

// ==================== 7. ФУНКЦИЯ ДЛЯ РУЧНОГО ИМПОРТА (ОСТАВЛЕНА НА ВСЯКИЙ СЛУЧАЙ) ====================
window.loadFromGlobStorage = async function() {
    const oldVotes = JSON.parse(localStorage.getItem('zhkhVotes') || '[]');
    console.log(`📦 Ручной импорт: ${oldVotes.length} голосов`);
    for (let i = 0; i < oldVotes.length; i++) {
        const old = oldVotes[i];
        const id = Date.now() + i + '_' + Math.random().toString(36).substring(2, 7);
        const newVote = {
            id: id,
            street: old.address?.split(', ')[1] || '',
            house: old.address?.split(', ')[2] || '',
            entrance: old.entrance || '',
            answers: Object.keys(old.ratings || {}).map(q => ({
                questionId: parseInt(q),
                value: old.ratings[q]
            })),
            timestamp: old.timestamp || new Date().toISOString(),
            district: CONFIG.district
        };
        votes.push(newVote);
        await sendVoteToFirebase(newVote);
    }
    saveToLocalStorage();
    updateVotesCounter();
    console.log(`✅ Ручной импорт завершён. Всего голосов: ${votes.length}`);
};

// ==================== 8. ЗАПУСК ПРИ ЗАГРУЗКЕ СТРАНИЦЫ ====================
document.addEventListener('DOMContentLoaded', async function() {
    console.log("🚀 Инициализация...");

    // 1. Отрисовка формы
    loadQuestions();

    // 2. Загрузка локальных голосов (из jkhPollData)
    loadFromLocalStorage();

    // 3. МИГРАЦИЯ СТАРЫХ ГОЛОСОВ ИЗ zhkhVotes (однократно)
    await migrateOldVotes();

    // 4. Загрузка данных из Firebase и объединение
    await loadVotesFromFirebase();

    // 5. Синхронизация локальных голосов (отправка тех, которых нет в Firebase)
    await syncLocalVotesToFirebase();

    // 6. Периодическая синхронизация каждые 30 секунд
    setInterval(syncLocalVotesToFirebase, 30000);

    // 7. Слушаем событие online, чтобы сразу синхронизировать при появлении интернета
    window.addEventListener('online', syncLocalVotesToFirebase);
});
</script>
