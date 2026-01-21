// ================ КОНФИГУРАЦИЯ ================
const CONFIG = {
    district: "Ваш район", // Измените на название вашего района
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
    
    // === НАСТРОЙКИ GOOGLE SHEETS (опционально) ===
    googleSheets: {
        enabled: false, // Поставьте true когда настроите Google Sheets
        scriptUrl: "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec"
    }
};

// ================ ФУНКЦИИ УПРАВЛЕНИЯ ДАННЫМИ ================

// Инициализация хранилища
function initStorage() {
    if (!localStorage.getItem(CONFIG.storageKey)) {
        const initialData = {
            district: CONFIG.district,
            votes: [],
            createdAt: new Date().toISOString(),
            lastVote: null,
            totalVotes: 0
        };
        localStorage.setItem(CONFIG.storageKey, JSON.stringify(initialData));
    }
}

// Получение всех данных
function getPollData() {
    const data = localStorage.getItem(CONFIG.storageKey);
    return data ? JSON.parse(data) : null;
}

// ================ СОХРАНЕНИЕ ГОЛОСА ================

// Основная функция сохранения (локально + облако если настроено)
async function saveVote(voteData) {
    console.log('Сохранение голоса...', voteData);
    
    // 1. Всегда сохраняем локально (гарантированно работает)
    const localSaved = saveToLocalStorage(voteData);
    
    // 2. Пытаемся сохранить в облако (если настроено)
    let cloudSaved = false;
    if (CONFIG.googleSheets.enabled) {
        try {
            cloudSaved = await saveToGoogleSheets(voteData);
            console.log('Сохранено в облако:', cloudSaved);
        } catch (error) {
            console.warn('Не удалось сохранить в облако:', error.message);
        }
    }
    
    // 3. Обновляем интерфейс
    updateVotesCount();
    
    return localSaved; // Возвращаем успех локального сохранения
}

// Локальное сохранение в localStorage
function saveToLocalStorage(voteData) {
    try {
        const data = getPollData();
        
        // Проверяем дубликаты по адресу
        const existingVoteIndex = data.votes.findIndex(v => 
            v.street === voteData.street && 
            v.house === voteData.house
        );
        
        if (existingVoteIndex >= 0) {
            // Обновляем существующий голос
            data.votes[existingVoteIndex] = voteData;
        } else {
            // Добавляем новый голос
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

// Сохранение в Google Sheets (опционально)
async function saveToGoogleSheets(voteData) {
    if (!CONFIG.googleSheets.enabled) {
        console.log('Google Sheets отключен в настройках');
        return false;
    }
    
    try {
        // Подготавливаем данные для отправки
        const sheetData = {
            timestamp: new Date().toLocaleString('ru-RU'),
            district: CONFIG.district,
            street: voteData.street || '',
            house: voteData.house || '',
            entrance: voteData.entrance || '',
            comment: voteData.comment || ''
        };
        
        // Добавляем ответы на вопросы
        if (voteData.answers && Array.isArray(voteData.answers)) {
            voteData.answers.forEach((answer, index) => {
                sheetData[`question_${answer.questionId}`] = answer.value || '';
            });
        }
        
        // Отправляем данные
        const response = await fetch(CONFIG.googleSheets.scriptUrl, {
            method: 'POST',
            mode: 'no-cors', // Важно для Google Apps Script!
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(sheetData)
        });
        
        // При mode: 'no-cors' response всегда пустой, считаем успехом
        console.log('Данные отправлены в Google Sheets');
        return true;
        
    } catch (error) {
        console.error('Ошибка отправки в Google Sheets:', error);
        return false;
    }
}

// ================ СТАТИСТИКА ================

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
    
    // Инициализация структуры для вопросов
    CONFIG.questions.forEach(q => {
        stats.byQuestion[q.id] = {
            text: q.text,
            category: q.category,
            type: q.type,
            answers: {},
            total: 0
        };
        
        // Для рейтинговых вопросов считаем среднее
        if (q.type === 'rating') {
            stats.averageRatings[q.id] = {
                sum: 0,
                count: 0,
                average: 0
            };
        }
    });
    
    // Обработка всех голосов
    data.votes.forEach(vote => {
        // Статистика по улицам
        const streetKey = `${vote.street}, ${vote.house}`;
        stats.byStreet[streetKey] = (stats.byStreet[streetKey] || 0) + 1;
        
        // Статистика по вопросам
        if (vote.answers && Array.isArray(vote.answers)) {
            vote.answers.forEach(answer => {
                const questionId = answer.questionId;
                const answerValue = answer.value;
                
                if (!stats.byQuestion[questionId]) return;
                
                stats.byQuestion[questionId].total++;
                
                if (stats.byQuestion[questionId].type === 'rating') {
                    // Для рейтинга получаем числовое значение (первый символ)
                    const ratingValue = parseInt(answerValue.charAt(0));
                    if (!isNaN(ratingValue)) {
                        stats.averageRatings[questionId].sum += ratingValue;
                        stats.averageRatings[questionId].count++;
                        stats.averageRatings[questionId].average = 
                            stats.averageRatings[questionId].sum / stats.averageRatings[questionId].count;
                    }
                }
                
                // Считаем частоту каждого ответа
                if (!stats.byQuestion[questionId].answers[answerValue]) {
                    stats.byQuestion[questionId].answers[answerValue] = 0;
                }
                stats.byQuestion[questionId].answers[answerValue]++;
            });
        }
    });
    
    // Вычисляем проценты
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

// ================ ФУНКЦИИ ИНТЕРФЕЙСА ================

// Загрузка вопросов на страницу
function loadQuestions() {
    const container = document.getElementById('questionsContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    let currentCategory = '';
    
    CONFIG.questions.forEach(question => {
        // Заголовок категории
        if (question.category !== currentCategory) {
            currentCategory = question.category;
            container.innerHTML += `
                <div class="category-header mb-3">
                    <h5 class="text-primary mt-4">${currentCategory}</h5>
                    <hr>
                </div>
            `;
        }
        
        // Вопрос
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
    
    // Назначаем обработчики для звезд рейтинга
    setTimeout(() => {
        CONFIG.questions.forEach(q => {
            if (q.type === 'rating') {
                const stars = document.querySelectorAll(`#stars-${q.id} .star`);
                stars.forEach(star => {
                    star.addEventListener('click', function() {
                        const value = this.getAttribute('data-value');
                        const rating = parseInt(this.getAttribute('data-rating'));
                        
                        // Обновляем отображение звезд
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
                        
                        // Сохраняем значение в скрытое поле
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
    
    // Проверяем адрес
    const street = document.getElementById('street').value.trim();
    const house = document.getElementById('house').value.trim();
    
    if (!street || !house) {
        alert('Пожалуйста, укажите улицу и номер дома');
        return;
    }
    
    // Собираем ответы
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
            // Подсвечиваем неотвеченный вопрос
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
    
    // Создаем объект голоса
    const voteData = {
        id: Date.now(),
        street: street,
        house: house,
        entrance: document.getElementById('entrance').value.trim(),
        timestamp: new Date().toISOString(),
        answers: answers,
        comment: document.getElementById('comment').value.trim(),
        userAgent: navigator.userAgent
    };
    
    console.log('Данные голоса подготовлены:', voteData);
    
    // Сохраняем голос
    try {
        const saved = await saveVote(voteData);
        
        if (saved) {
            // Показываем модальное окно успеха
            const modal = new bootstrap.Modal(document.getElementById('successModal'));
            modal.show();
            
            // Очищаем форму
            clearForm();
            
            console.log('Голос успешно сохранен!');
        } else {
            alert('Не удалось сохранить голос. Попробуйте еще раз.');
        }
    } catch (error) {
        console.error('Ошибка при сохранении:', error);
        alert('Произошла ошибка: ' + error.message);
    }
}

// Очистка формы
function clearForm() {
    document.getElementById('street').value = '';
    document.getElementById('house').value = '';
    document.getElementById('entrance').value = '';
    document.getElementById('comment').value = '';
    
    // Сбрасываем все ответы
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

// Экспорт данных в JSON
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
            
            // Перезагружаем страницу если это страница результатов
            if (document.getElementById('resultsContainer')) {
                setTimeout(() => location.reload(), 1000);
            }
        } catch (error) {
            alert('Ошибка при импорте данных: ' + error.message);
        }
    };
    reader.readAsText(file);
}

// Объединение данных из нескольких источников
function mergeData(jsonFiles) {
    const mainData = getPollData();
    let totalMerged = 0;
    
    jsonFiles.forEach(file => {
        try {
            const externalData = JSON.parse(file);
            if (externalData && externalData.votes && Array.isArray(externalData.votes)) {
                externalData.votes.forEach(vote => {
                    // Проверяем, нет ли такого голоса уже
                    const exists = mainData.votes.some(v => 
                        v.street === vote.street && 
                        v.house === vote.house && 
                        v.timestamp === vote.timestamp
                    );
                    
                    if (!exists) {
                        mainData.votes.push(vote);
                        totalMerged++;
                    }
                });
            }
        } catch (error) {
            console.error('Ошибка при слиянии файла:', error);
        }
    });
    
    if (totalMerged > 0) {
        mainData.totalVotes = mainData.votes.length;
        localStorage.setItem(CONFIG.storageKey, JSON.stringify(mainData));
        alert(`Объединено ${totalMerged} новых голосов. Всего: ${mainData.totalVotes}`);
        updateVotesCount();
    } else {
        alert('Нет новых данных для объединения.');
    }
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
        
        // Если это страница голосования
        if (document.getElementById('questionsContainer')) {
            loadQuestions();
            updateVotesCount();
            console.log('Страница голосования инициализирована');
        }
        
        // Если это страница результатов, загружаем их
        if (document.getElementById('resultsContainer')) {
            loadResults();
            console.log('Страница результатов инициализирована');
        }
        
        // Тестовое сообщение
        console.log('Система опроса ЖКХ готова к работе!');
    });
}

// ================ ДЛЯ GOOGLE SHEETS ================

// Инструкция по настройке Google Sheets:
/*
1. Создайте Google Таблицу: https://sheets.google.com
2. Настройте заголовки:
   A: Дата, B: Улица, C: Дом, D: Подъезд, E-H: Вопросы 1-7, I: Комментарий

3. Создайте Google Apps Script:
   - Перейдите: https://script.google.com
   - Создайте новый проект
   - Вставьте код из файла google-script.js
   - Разверните как веб-приложение
   - Скопируйте URL в CONFIG.googleSheets.scriptUrl
   - Включите: CONFIG.googleSheets.enabled = true
*/

// Экспортируем функции для использования в других файлах
if (typeof window !== 'undefined') {
    window.saveVote = saveVote;
    window.clearForm = clearForm;
    window.submitVote = submitVote;
    window.exportData = exportData;
    window.getStatistics = getStatistics;
    window.importData = importData;
    window.mergeData = mergeData;
}
