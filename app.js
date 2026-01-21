// ================ КОНФИГУРАЦИЯ ================
const CONFIG = {
    district: "Ваш район", // Измените на название вашего района
    questions: [
        {
            id: 1,
            category: "🏠 Обслуживание дома",
            text: "Уборка подъездов и лестничных клеток",
            type: "rating", // rating, select, yesno
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
    votesKey: "jkhPollVotes"
};

// ================ ФУНКЦИИ УПРАВЛЕНИЯ ДАННЫМИ ================

// Инициализация хранилища
function initStorage() {
    if (!localStorage.getItem(CONFIG.storageKey)) {
        const initialData = {
            district: CONFIG.district,
            votes: [],
            createdAt: new Date().toISOString(),
            lastVote: null
        };
        localStorage.setItem(CONFIG.storageKey, JSON.stringify(initialData));
    }
}

// Получение всех данных
function getPollData() {
    const data = localStorage.getItem(CONFIG.storageKey);
    return data ? JSON.parse(data) : null;
}

// Сохранение голоса
https://docs.google.com/spreadsheets/d/1CxItNjLD5j9NGulYN_APZc8ATBvU9Q4X9FQQS-iB6_w/edit?usp=sharing

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
        vote.answers.forEach(answer => {
            const questionId = answer.questionId;
            const answerValue = answer.value;
            
            if (!stats.byQuestion[questionId]) return;
            
            stats.byQuestion[questionId].total++;
            
            if (stats.byQuestion[questionId].type === 'rating') {
                // Для рейтинга получаем числовое значение (первый символ)
                const ratingValue = parseInt(answerValue.charAt(0));
                stats.averageRatings[questionId].sum += ratingValue;
                stats.averageRatings[questionId].count++;
                stats.averageRatings[questionId].average = 
                    stats.averageRatings[questionId].sum / stats.averageRatings[questionId].count;
            }
            
            // Считаем частоту каждого ответа
            if (!stats.byQuestion[questionId].answers[answerValue]) {
                stats.byQuestion[questionId].answers[answerValue] = 0;
            }
            stats.byQuestion[questionId].answers[answerValue]++;
        });
    });
    
    // Вычисляем проценты
    Object.keys(stats.byQuestion).forEach(qId => {
        const question = stats.byQuestion[qId];
        Object.keys(question.answers).forEach(answer => {
            question.answers[answer] = {
                count: question.answers[answer],
                percentage: Math.round((question.answers[answer] / question.total) * 100)
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
function submitVote() {
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
                }, 1000);
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
        id: Date.now(), // Уникальный ID
        street: street,
        house: house,
        entrance: document.getElementById('entrance').value.trim(),
        timestamp: new Date().toISOString(),
        answers: answers,
        comment: document.getElementById('comment').value.trim(),
        userAgent: navigator.userAgent
    };
    
    // Сохраняем голос
    if (saveVote(voteData)) {
        // Показываем модальное окно успеха
        const modal = new bootstrap.Modal(document.getElementById('successModal'));
        modal.show();
        
        // Очищаем форму
        clearForm();
    } else {
        alert('Произошла ошибка при сохранении голоса');
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
            document.getElementById(`answer-${q.id}`).value = '';
        } else if (q.type === 'select') {
            document.getElementById(`answer-${q.id}`).selectedIndex = 0;
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
    
    if (countElement && data) {
        countElement.textContent = data.votes.length;
    }
}

// Проверка дублирующего голоса
function checkDuplicateVote() {
    const data = getPollData();
    if (!data) return;
    
    // Показываем предупреждение, если уже есть голоса
    if (data.votes.length > 0) {
        console.log(`В базе уже ${data.votes.length} голосов`);
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
        } catch (error) {
            alert('Ошибка при импорте данных: ' + error.message);
        }
    };
    reader.readAsText(file);
}

// Инициализация при загрузке страницы
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function() {
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
        }
        
        // Если это страница результатов, загружаем их
        if (document.getElementById('resultsContainer')) {
            loadResults();
        }
    });
}

// Экспортируем функции для использования в других файлах
if (typeof window !== 'undefined') {
    window.saveVote = saveVote;
    window.clearForm = clearForm;
    window.submitVote = submitVote;
    window.exportData = exportData;
    window.getStatistics = getStatistics;
}
