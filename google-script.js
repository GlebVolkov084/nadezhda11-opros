// Google Apps Script для сохранения данных в Google Sheets
// Разместите этот код в script.google.com

function doPost(e) {
  try {
    // Получаем данные из запроса
    const data = JSON.parse(e.postData.contents);
    
    // Открываем таблицу
    const spreadsheet = SpreadsheetApp.openById('ВАШ_ID_ТАБЛИЦЫ');
    let sheet = spreadsheet.getSheetByName('Голоса');
    
    // Если листа нет - создаем
    if (!sheet) {
      sheet = spreadsheet.insertSheet('Голоса');
      // Заголовки
      sheet.getRange(1, 1, 1, 12).setValues([[
        'Дата', 'Район', 'Улица', 'Дом', 'Подъезд',
        'Вопрос 1', 'Вопрос 2', 'Вопрос 3', 'Вопрос 4', 
        'Вопрос 5', 'Вопрос 6', 'Вопрос 7', 'Комментарий'
      ]]);
    }
    
    // Добавляем новую строку
    const newRow = [
      data.timestamp || new Date().toLocaleString('ru-RU'),
      data.district || '',
      data.street || '',
      data.house || '',
      data.entrance || '',
      data.question_1 || '',
      data.question_2 || '',
      data.question_3 || '',
      data.question_4 || '',
      data.question_5 || '',
      data.question_6 || '',
      data.question_7 || '',
      data.comment || ''
    ];
    
    sheet.appendRow(newRow);
    
    // Возвращаем успешный ответ
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: true, 
        message: 'Данные сохранены',
        row: sheet.getLastRow()
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    // Возвращаем ошибку
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: false, 
        error: error.toString(),
        stack: error.stack
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Тестовая функция для проверки
function doGet() {
  return ContentService
    .createTextOutput('Скрипт для опроса ЖКХ работает!\n' + 
                     'Используйте POST запрос для отправки данных.')
    .setMimeType(ContentService.MimeType.TEXT);
}

// Функция для очистки таблицы (только для админов)
function clearSheet() {
  const spreadsheet = SpreadsheetApp.openById('ВАШ_ID_ТАБЛИЦЫ');
  const sheet = spreadsheet.getSheetByName('Голоса');
  if (sheet) {
    sheet.clear();
    sheet.getRange(1, 1, 1, 12).setValues([[
      'Дата', 'Район', 'Улица', 'Дом', 'Подъезд',
      'Вопрос 1', 'Вопрос 2', 'Вопрос 3', 'Вопрос 4', 
      'Вопрос 5', 'Вопрос 6', 'Вопрос 7', 'Комментарий'
    ]]);
  }
  return 'Таблица очищена';
}
