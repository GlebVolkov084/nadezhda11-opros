// ================ КОНФИГУРАЦИЯ ================
const CONFIG = {
    district: "Ваш район",
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
        },
        {
            id: 6,
            category: "🔧 Ремонтные работы",
            text: "Своевременность ремонта",
            type: "select",
            options: ["Очень быстро", "В течение недели", "В течение месяца", "Долго ждать", "Не реагируют"]
        },
        {
            id: 7,
            category: "💬 Общение с УК",
            text: "Работа диспетчерской и реагирование на заявки",
            type: "yesno",
            options: ["Да, реагируют оперативно", "Нет, игнорируют обращения"]
        }
    ],
    storageKey: "jkhPollData",
    
    // === НАСТРОЙКИ FIREBASE (ЗАМЕНИТЕ НА СВОИ!) ===
    firebaseConfig: {
        apiKey: "AIzaSyA9x1ZcFgHjklmnoiT2XqPq3RzABCDEFGH",
        authDomain: "ваш-проект.firebaseapp.com",
        databaseURL: "https://ваш-проект-default-rtdb.firebaseio.com",
        projectId: "ваш-проект",
        storageBucket: "ваш-проект.appspot.com",
        messagingSenderId: "123456789012",
        appId: "1:123456789012:web:abcdef1234567890"
    }
};

// ================ ИНИЦИАЛИЗАЦИЯ FIREBASE ================
let database;
let isFirebaseInitialized = false;

function initFirebase() {
    try {
        // Проверяем, загружена ли Firebase
        if (typeof firebase === 'undefined') {
            console.warn('Firebase не загружен. Загружаем...');
            loadFirebaseSDK();
            return;
        }
        
        // Инициализируем Firebase
        if (!firebase.apps.length) {
            firebase.initializeApp(CONFIG.firebaseConfig);
        }
        
        database = firebase.database();
        isFirebaseInitialized = true;
        console.log('Firebase инициализирован');
        
        // Начинаем синхронизацию
        startDataSync();
        
    } catch (error) {
        console.error('Ошибка инициализации Firebase:', error);
        isFirebaseInitialized = false;
    }
}

function loadFirebaseSDK() {
    // Динамически загружаем Firebase SDK
    const script = document.createElement('script');
    script.src = "https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js";
    script.onload = () => {
        const script2 = document.createElement('script');
        script2.src = "https://www.gstatic.com/firebasejs/9.0.0/firebase-database-compat.js";
        script2.onload = () => initFirebase();
        document.head.appendChild(script2);
    };
    document.head.appendChild(script);
}

// ================ СИНХРОНИЗАЦИЯ ДАННЫХ ================

// Начать синхронизацию с облаком
function startDataSync() {
    if (!isFirebaseInitialized) {
        console.log('Firebase не инициализирован, пробуем снова через 3 секунды...');
        setTimeout(initFirebase, 3000);
        return;
    }
    
    console.log('Начинаем синхронизацию данных...');
    
    // 1. Загружаем данные из облака
    loadFromCloud();
    
    // 2. Отправляем локальные данные в облако
    syncLocalToCloud();
    
    // 3. Слушаем обновления в реальном времени
    listenForUpdates();
}

// Загрузить данные из облака
async function loadFromCloud() {
    if (!isFirebaseInitialized) return;
    
    try {
        console.log('Загрузка данных из облака...');
        const snapshot = await database.ref('votes').once('value');
        const cloudData = snapshot.val();
        
        if (cloudData) {
            // Преобразуем объект в массив
            const cloudVotes = Object.values(cloudData);
            
            // Получаем локальные данные
            const localData = getPollData();
            
            // Объединяем данные
            let newVotesAdded = 0;
            cloudVotes.forEach(cloudVote => {
                // Проверяем, есть ли такой голос локально
                const exists = localData.votes.some(localVote => 
                    localVote.id === cloudVote.id
                );
                
                if (!exists) {
                    localData.votes.push(cloudVote);
                    newVotesAdded++;
                }
            });
            
            if (newVotesAdded > 0) {
                localData.totalVotes = localData.votes.length;
                localStorage.setItem(CONFIG.storageKey, JSON.stringify(localData));
                
                console.log(`Добавлено ${newVotesAdded} новых голосов из облака`);
                updateVotesCount();
                
                // Обновляем статистику если на странице results
                if (typeof loadResults === 'function') {
                    loadResults();
                }
            }
        }
        
    } catch (error) {
        console.error('Ошибка загрузки из облака:', error);
    }
}

// Синхронизировать локальные данные с облаком
async function syncLocalToCloud() {
    if (!isFirebaseInitialized) return;
    
    try {
        const localData = getPollData();
        
        // Отправляем каждый голос в облако
        for (const vote of localData.votes) {
            await database.ref('votes/' + vote.id).set(vote);
        }
        
        // Обновляем общую статистику
        await database.ref('stats').set({
            totalVotes: localData.totalVotes,
            lastUpdate: new Date().toISOString(),
            district: CONFIG.district
        });
        
        console.log('Локальные данные синхронизированы с облаком');
        
    } catch (error) {
        console.error('Ошибка синхронизации с облаком:', error);
    }
}

// Слушать обновления в реальном времени
function listenForUpdates() {
    if (!isFirebaseInitialized) return;
    
    database.ref('votes').on('child_added', (snapshot) => {
        console.log('Новые данные в реальном времени:', snapshot.key);
        
        const newVote = snapshot.val();
        const localData = getPollData();
        
        // Проверяем, есть ли такой голос
        const exists = localData.votes.some(vote => vote.id === newVote.id);
        
        if (!exists) {
            localData.votes.push(newVote);
            localData.totalVotes = localData.votes.length;
            localStorage.setItem(CONFIG.storageKey, JSON.stringify(localData));
            
            updateVotesCount();
            
            // Показываем уведомление о новом голосе
            if (typeof showNewVoteNotification === 'function') {
                showNewVoteNotification(newVote);
            }
        }
    });
}

// ================ ОСНОВНЫЕ ФУНКЦИИ ================

// Инициализация хранилища
function initStorage() {
    if (!localStorage.getItem(CONFIG.storageKey)) {
        const initialData = {
            district: CONFIG.district,
            votes: [],
            createdAt: new Date().toISOString(),
            lastVote: null,
            totalVotes: 0,
            syncStatus: 'not_synced'
        };
        localStorage.setItem(CONFIG.storageKey, JSON.stringify(initialData));
    }
}

// Получение всех данных
function getPollData() {
    const data = localStorage.getItem(CONFIG.storageKey);
    return data ? JSON.parse(data) : null;
}

// Сохранение голоса (локально + в облако)
async function saveVote(voteData) {
    console.log('Сохранение голоса...');
    
    // 1. Сохраняем локально
    const localSaved = saveToLocalStorage(voteData);
    
    // 2. Отправляем в облако (если Firebase инициализирован)
    if (isFirebaseInitialized) {
        try {
            await database.ref('votes/' + voteData.id).set(voteData);
            console.log('Голос сохранен в облако');
            
            // Обновляем статистику в облаке
            const localData = getPollData();
            await database.ref('stats').set({
                totalVotes: localData.totalVotes,
                lastUpdate: new Date().toISOString(),
                district: CONFIG.district
            });
            
        } catch (error) {
            console.error('Ошибка сохранения в облако:', error);
            // Сохраняем для будущей синхронизации
            saveForLaterSync(voteData);
        }
    } else {
        saveForLaterSync(voteData);
    }
    
    return localSaved;
}

// Локальное сохранение
function saveToLocalStorage(voteData) {
    try {
        const data = getPollData();
        
        // Проверяем дубликаты
        const existingIndex = data.votes.findIndex(v => v.id === voteData.id);
        
        if (existingIndex >= 0) {
            data.votes[existingIndex] = voteData;
        } else {
            data.votes.push(voteData);
        }
        
        data.lastVote = new Date().toISOString();
        data.totalVotes = data.votes.length;
        
        localStorage.setItem(CONFIG.storageKey, JSON.stringify(data));
        
        console.log('Локальное сохранение: УСПЕХ. Всего голосов:', data.votes.length);
        return true;
        
    } catch (error) {
        console.error('Ошибка локального сохранения:', error);
        return false;
    }
}

// Сохранить для будущей синхронизации
function saveForLaterSync(voteData) {
    const pendingSync = JSON.parse(localStorage.getItem('pendingSync') || '[]');
    pendingSync.push({
        ...voteData,
        timestamp: new Date().toISOString()
    });
    localStorage.setItem('pendingSync', JSON.stringify(pendingSync));
    console.log('Голос сохранен для будущей синхронизации');
}

// Попытаться синхронизировать отложенные голоса
async function retryPendingSync() {
    if (!isFirebaseInitialized) return;
    
    const pendingSync = JSON.parse(localStorage.getItem('pendingSync') || '[]');
    
    if (pendingSync.length === 0) return;
    
    console.log(`Попытка синхронизации ${pendingSync.length} отложенных голосов...`);
    
    for (const vote of pendingSync) {
        try {
            await database.ref('votes/' + vote.id).set(vote);
            console.log(`Голос ${vote.id} синхронизирован`);
        } catch (error) {
            console.error(`Ошибка синхронизации голоса ${vote.id}:`, error);
        }
    }
    
    // Очищаем после успешной синхронизации
    localStorage.removeItem('pendingSync');
    console.log('Отложенные голосы синхронизированы');
}

// ================ ОСТАЛЬНЫЕ ФУНКЦИИ (без изменений) ================

// Загрузка вопросов на страницу
function loadQuestions() {
    const container = document.getElementById('questionsContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    let currentCategory = '';
    
    CONFIG.questions.forEach(question => {
        if (question.category !== currentCategory) {
            currentCategory = question.category;
            container.innerHTML += `
                <div class="category-header mb-3">
                    <h5 class="text-primary mt-4">${currentCategory}</h5>
                    <hr>
                </div>
            `;
        }
        
        let inputHtml = '';
        
        if (question.type === 'rating') {
            inputHtml = `
                <div class="rating-stars" id="stars-${question.id}">
                    ${question.options.map((opt, idx) => `
                        <span class="star" data-value="${opt}" data-rating="${idx + 1}">
                            <i class="far fa-star"></i>
                        </span>
                    `).join('')}
                </div>
                <div class="rating-labels mt-2">
                    <small class="text-muted">${question.options.join(' • ')}</small>
                </div>
                <input type="hidden" id="answer-${question.id}" name="q${question.id}" required>
            `;
        } else if (question.type === 'select') {
            inputHtml = `
                <select class="form-select" id="answer-${question.id}" required>
                    <option value="" selected disabled>Выберите ответ</option>
                    ${question.options.map(opt => `
                        <option value="${opt}">${opt}</option>
                    `).join('')}
                </select>
            `;
        } else if (question.type === 'yesno') {
            inputHtml = `
                <div class="btn-group w-100" role="group">
                    ${question.options.map(opt => `
                        <input type="radio" class="btn-check" name="q${question.id}" 
                               id="q${question.id}-${opt}" value="${opt}" autocomplete="off" required>
                        <label class="btn btn-outline-primary" for="q${question.id}-${opt}">
                            ${opt}
                        </label>
                    `).join('')}
                </div>
            `;
        }
        
        container.innerHTML += `
            <div class="question-card card fade-in" data-question-id="${question.id}">
                <div class="card-body">
                    <h6 class="card-title">${question.id}. ${question.text}</h6>
                    ${inputHtml}
                </div>
            </div>
        `;
    });
    
    setTimeout(() => {
        CONFIG.questions.forEach(q => {
            if (q.type === 'rating') {
                const stars = document.querySelectorAll(`#stars-${q.id} .star`);
                stars.forEach(star => {
                    star.addEventListener('click', function() {
                        const value = this.getAttribute('data-value');
                        const rating = parseInt(this.getAttribute('data-rating'));
                        
                        stars.forEach((s, idx) => {
                            const icon = s.querySelector('i');
                            if (idx < rating) {
                                icon.className = 'fas fa-star';
                                s.classList.add('active');
                            } else {
                                icon.className = 'far fa-star';
                                s.classList.remove('active');
                            }
                        });
                        
                        document.getElementById(`answer-${q.id}`).value = value;
                    });
                });
            }
        });
    }, 100);
}

// Отправка голоса
async function submitVote() {
    console.log('Начало отправки голоса...');
    
    const street = document.getElementById('street').value.trim();
    const house = document.getElementById('house').value.trim();
    
    if (!street || !house) {
        alert('Пожалуйста, укажите улицу и номер дома');
        return;
    }
    
    const answers = [];
    let allAnswered = true;
    
    CONFIG.questions.forEach(q => {
        let answerValue = '';
        
        if (q.type === 'rating') {
            const input = document.getElementById(`answer-${q.id}`);
            answerValue = input ? input.value : '';
        } else if (q.type === 'select') {
            const select = document.getElementById(`answer-${q.id}`);
            answerValue = select ? select.value : '';
        } else if (q.type === 'yesno') {
            const selected = document.querySelector(`input[name="q${q.id}"]:checked`);
            answerValue = selected ? selected.value : '';
        }
        
        if (!answerValue) {
            allAnswered = false;
            const questionCard = document.querySelector(`[data-question-id="${q.id}"]`);
            if (questionCard) {
                questionCard.style.borderColor = '#e74c3c';
                setTimeout(() => {
                    questionCard.style.borderColor = '#3498db';
                }, 2000);
            }
        }
        
        answers.push({
            questionId: q.id,
            question: q.text,
            value: answerValue,
            type: q.type
        });
    });
    
    if (!allAnswered) {
        alert('Пожалуйста, ответьте на все вопросы');
        return;
    }
    
    const voteData = {
        id: Date.now() + '-' + Math.random().toString(36).substr(2, 9), // Уникальный ID
        street: street,
        house: house,
        entrance: document.getElementById('entrance').value.trim(),
        timestamp: new Date().toISOString(),
        answers: answers,
        comment: document.getElementById('comment').value.trim(),
        userAgent: navigator.userAgent,
        ip: await getClientIP()
    };
    
    try {
        const saved = await saveVote(voteData);
        
        if (saved) {
            const modal = new bootstrap.Modal(document.getElementById('successModal'));
            modal.show();
            
            clearForm();
            
            // Показываем статус синхронизации
            showSyncStatus('Голос сохранен! Синхронизация с облаком...');
            
            console.log('Голос успешно сохранен!');
        } else {
            alert('Не удалось сохранить голос. Попробуйте еще раз.');
        }
    } catch (error) {
        console.error('Ошибка при сохранении:', error);
        alert('Произошла ошибка: ' + error.message);
    }
}

// Получить IP клиента (анонимно)
async function getClientIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        return 'unknown';
    }
}

// Показать статус синхронизации
function showSyncStatus(message) {
    const statusElement = document.getElementById('syncStatus');
    if (statusElement) {
        statusElement.innerHTML = `<i class="fas fa-sync-alt fa-spin"></i> ${message}`;
        statusElement.style.display = 'block';
        
        setTimeout(() => {
            statusElement.style.display = 'none';
        }, 5000);
    }
}

// Уведомление о новом голосе
function showNewVoteNotification(vote) {
    if (!('Notification' in window)) return;
    
    if (Notification.permission === 'granted') {
        new Notification('Новый голос!', {
            body: `${vote.street}, ${vote.house} только что проголосовал`,
            icon: '/icon.png'
        });
    }
}

// Очистка формы
function clearForm() {
    document.getElementById('street').value = '';
    document.getElementById('house').value = '';
    document.getElementById('entrance').value = '';
    document.getElementById('comment').value = '';
    
    CONFIG.questions.forEach(q => {
        if (q.type === 'rating') {
            const stars = document.querySelectorAll(`#stars-${q.id} .star`);
            stars.forEach(star => {
                star.querySelector('i').className = 'far fa-star';
                star.classList.remove('active');
            });
            const input = document.getElementById(`answer-${q.id}`);
            if (input) input.value = '';
        } else if (q.type === 'select') {
            const select = document.getElementById(`answer-${q.id}`);
            if (select) select.selectedIndex = 0;
        } else if (q.type === 'yesno') {
            const radios = document.querySelectorAll(`input[name="q${q.id}"]`);
            radios.forEach(radio => radio.checked = false);
        }
    });
}

// Обновление счетчика голосов
function updateVotesCount() {
    const data = getPollData();
    const countElement = document.getElementById('totalVotes');
    const resultsCountElement = document.getElementById('totalVotesCount');
    
    if (countElement && data) {
        countElement.textContent = data.votes.length;
    }
    if (resultsCountElement && data) {
        resultsCountElement.textContent = data.votes.length;
    }
}

// Экспорт данных
function exportData() {
    const data = getPollData();
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `jkh-poll-${CONFIG.district}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert(`Данные экспортированы! Всего голосов: ${data.votes.length}`);
}

// Импорт данных
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            localStorage.setItem(CONFIG.storageKey, JSON.stringify(data));
            alert('Данные успешно импортированы!');
            updateVotesCount();
            
            // Синхронизируем с облаком
            if (isFirebaseInitialized) {
                syncLocalToCloud();
            }
            
            if (document.getElementById('resultsContainer')) {
                setTimeout(() => location.reload(), 1000);
            }
        } catch (error) {
            alert('Ошибка при импорте данных: ' + error.message);
        }
    };
    reader.readAsText(file);
}

// Получение статистики
function getStatistics() {
    const data = getPollData();
    if (!data || data.votes.length === 0) {
        return null;
    }
    
    const stats = {
        totalVotes: data.votes.length,
        byStreet: {},
        byQuestion: {},
        averageRatings: {}
    };
    
    CONFIG.questions.forEach(q => {
        stats.byQuestion[q.id] = {
            text: q.text,
            category: q.category,
            type: q.type,
            answers: {},
            total: 0
        };
        
        if (q.type === 'rating') {
            stats.averageRatings[q.id] = {
                sum: 0,
                count: 0,
                average: 0
            };
        }
    });
    
    data.votes.forEach(vote => {
        const streetKey = `${vote.street}, ${vote.house}`;
        stats.byStreet[streetKey] = (stats.byStreet[streetKey] || 0) + 1;
        
        if (vote.answers && Array.isArray(vote.answers)) {
            vote.answers.forEach(answer => {
                const questionId = answer.questionId;
                const answerValue = answer.value;
                
                if (!stats.byQuestion[questionId]) return;
                
                stats.byQuestion[questionId].total++;
                
                if (stats.byQuestion[questionId].type === 'rating') {
                    const ratingValue = parseInt(answerValue.charAt(0));
                    if (!isNaN(ratingValue)) {
                        stats.averageRatings[questionId].sum += ratingValue;
                        stats.averageRatings[questionId].count++;
                        stats.averageRatings[questionId].average = 
                            stats.averageRatings[questionId].sum / stats.averageRatings[questionId].count;
                    }
                }
                
                if (!stats.byQuestion[questionId].answers[answerValue]) {
                    stats.byQuestion[questionId].answers[answerValue] = 0;
                }
                stats.byQuestion[questionId].answers[answerValue]++;
            });
        }
    });
    
    Object.keys(stats.byQuestion).forEach(qId => {
        const question = stats.byQuestion[qId];
        Object.keys(question.answers).forEach(answer => {
            question.answers[answer] = {
                count: question.answers[answer],
                percentage: question.total > 0 ? 
                    Math.round((question.answers[answer] / question.total) * 100) : 0
            };
        });
    });
    
    return stats;
}

// ================ ИНИЦИАЛИЗАЦИЯ ================

// Инициализация при загрузке страницы
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('Страница загружена, инициализация...');
        
        // Загружаем название района
        const districtElement = document.getElementById('districtName');
        if (districtElement) {
            districtElement.textContent = CONFIG.district;
        }
        
        // Инициализируем хранилище
        initStorage();
        
        // Инициализируем Firebase
        initFirebase();
        
        // Запрашиваем разрешение на уведомления
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
        
        // Если это страница голосования
        if (document.getElementById('questionsContainer')) {
            loadQuestions();
            updateVotesCount();
            console.log('Страница голосования инициализирована');
        }
        
        // Если это страница результатов
        if (document.getElementById('resultsContainer')) {
            // Загружаем данные из облака при открытии результатов
            if (isFirebaseInitialized) {
                loadFromCloud().then(() => {
                    if (typeof loadResults === 'function') {
                        loadResults();
                    }
                });
            } else {
                if (typeof loadResults === 'function') {
                    loadResults();
                }
            }
            console.log('Страница результатов инициализирована');
        }
        
        // Периодическая синхронизация (каждые 30 секунд)
        setInterval(() => {
            if (isFirebaseInitialized) {
                syncLocalToCloud();
                retryPendingSync();
            }
        }, 30000);
        
        console.log('Система опроса ЖКХ готова к работе!');
    });
}

// Экспортируем функции
if (typeof window !== 'undefined') {
    window.saveVote = saveVote;
    window.clearForm = clearForm;
    window.submitVote = submitVote;
    window.exportData = exportData;
    window.getStatistics = getStatistics;
    window.importData = importData;
    window.retryPendingSync = retryPendingSync;
}
