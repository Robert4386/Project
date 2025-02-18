require('dotenv').config();
const express = require('express');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');
const WebSocket = require('ws');

const app = express();

// Middleware для разбора JSON
app.use(express.json());

// Настройка Content-Security-Policy
app.use((req, res, next) => {
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; " +
        "img-src 'self' https://tile.openstreetmap.org; " + // Разрешаем тайлы OpenStreetMap
        "script-src 'self'; " +
        "style-src 'self' 'unsafe-inline'; " + // Разрешаем локальные стили
        "connect-src 'self' https://nominatim.openstreetmap.org ws://localhost:8080;" // Разрешаем WebSocket
    );
    next();
});

// Служба статических файлов
app.use(express.static(path.join(__dirname, '../')));

// Токен вашего Telegram-бота
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!TELEGRAM_BOT_TOKEN) {
    console.error('Telegram Bot Token not provided!');
    process.exit(1); // Останавливаем сервер, если токен отсутствует
}

// Создаем экземпляр бота с использованием polling
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

// Хранилище состояний пользователей
const userStates = {};

// Хранилище маркеров
let markers = [];

// WebSocket-сервер
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
    console.log('WebSocket client connected');

    ws.on('close', () => {
        console.log('WebSocket client disconnected');
    });
});

function broadcastMarker(wsServer, marker) {
    wsServer.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(marker));
        }
    });
}

function removeMarkerFromMap(markerId) {
    // Удаляем маркер по его ID
    markers = markers.filter(marker => marker.id !== markerId);

    // Оповещаем всех WebSocket-клиентов об удалении маркера
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ action: 'remove', markerId }));
        }
    });
}

// Обработка команды /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;

    // Устанавливаем состояние "ожидание пересылки поста"
    userStates[chatId] = { state: 'WAITING_FOR_POST' };

    // Отправляем приветственное сообщение
    bot.sendMessage(chatId, 'Привет! Перешлите пост, связанный с новостью.');
});

// Обработка входящих сообщений
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    const userState = userStates[chatId];

    if (!userState) {
        bot.sendMessage(chatId, 'Начните с команды /start.');
        return;
    }

    if (userState.state === 'WAITING_FOR_POST') {
        if (!msg.forward_from && !msg.forward_from_chat) {
            bot.sendMessage(chatId, 'Пожалуйста, перешлите пост.');
            return;
        }

        userState.postText = msg.text || 'Без текста';
        userState.postLink = extractLink(msg);  // Извлекаем ссылку на пост

        console.log('Extracted link:', userState.postLink); // Логируем извлеченную ссылку

        if (!userState.postLink) {
            bot.sendMessage(chatId, 'Не удалось извлечь ссылку на пост. Попробуйте переслать другой пост.');
            return;
        }

        userState.state = 'WAITING_FOR_LOCATION';
        bot.sendMessage(chatId, 'Укажите название населенного пункта, связанного с этой новостью.');
    } else if (userState.state === 'WAITING_FOR_LOCATION') {
        const locationName = extractLocation(text);
        if (!locationName) {
            bot.sendMessage(chatId, 'Не удалось найти название населенного пункта. Попробуйте снова.');
            return;
        }

        const coordinates = await getCoordinates(locationName);
        if (!coordinates) {
            bot.sendMessage(chatId, `Не удалось найти координаты для ${locationName}.`);
            return;
        }

        const marker = {
            id: markers.length + 1,  // Уникальный ID маркера
            name: locationName,
            coords: coordinates,
            link: userState.postLink, // Добавляем ссылку
        };

        console.log('Marker added with link:', marker);
        markers.push(marker);
        broadcastMarker(wss, marker);

        bot.sendMessage(chatId, `Маркер успешно добавлен: ${locationName} (${coordinates})`);

        delete userStates[chatId];
    }
});



/****************************************************************************************************************************** */

// Обработка команды /markers
bot.onText(/\/markers/, (msg) => {
    const chatId = msg.chat.id;
    
    // Если нет маркеров, отправляем сообщение
    if (markers.length === 0) {
        bot.sendMessage(chatId, 'Нет доступных маркеров для удаления.');
        return;
    }

    // Создаем клавиатуру с кнопками для каждого маркера
    const keyboard = {
        reply_markup: {
            inline_keyboard: markers.map((marker, index) => [
                {
                    text: `Удалить маркер ${index + 1} - ${marker.name}`,
                    callback_data: `delete_marker_${index}`
                }
            ])
        }
    };

    bot.sendMessage(chatId, 'Выберите маркер для удаления:', keyboard);
});

// Обработка callback_query для удаления маркера
bot.on('callback_query', (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const markerIndex = parseInt(callbackQuery.data.split('_')[2], 10);

    // Проверка, существует ли маркер с таким индексом
    const deletedMarker = markers[markerIndex];
    if (deletedMarker) {
        // Удаляем маркер из массива
        markers.splice(markerIndex, 1);

        // Отправляем сообщение об удалении
        bot.answerCallbackQuery(callbackQuery.id, { text: `Маркер "${deletedMarker.name}" удален` });

        // Обновляем клавиатуру
        const keyboard = {
            reply_markup: {
                inline_keyboard: markers.map((marker, index) => [
                    {
                        text: `Удалить маркер ${index + 1} - ${marker.name}`,
                        callback_data: `delete_marker_${index}`
                    }
                ])
            }
        };

        // Обновляем клавиатуру в сообщении
        bot.editMessageReplyMarkup(keyboard, { chat_id: chatId, message_id: callbackQuery.message.message_id });

        // Удаляем маркер с карты и сообщаем клиенту
        const markerCoordinates = deletedMarker.coords;
        if (markerCoordinates) {
            // Отправляем данные для удаления маркера с карты на клиент
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        action: 'remove_marker',
                        coordinates: markerCoordinates
                    }));
                }
            });
        }

        // Обновление всей карты
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    action: 'update_map',
                    markers: markers
                }));
            }
        });

    } else {
        bot.answerCallbackQuery(callbackQuery.id, { text: 'Маркер не найден' });
    }
});

/************************************************************************************************************************************* */



// Функция для извлечения названия населенного пункта
function extractLocation(text) {
    const cleanedText = text.trim().toLowerCase();
    const keywords = ['город', 'деревня', 'поселок', 'село'];

    for (const keyword of keywords) {
        const regex = new RegExp(`${keyword}\\s+(\\S+)`, 'i');
        const match = cleanedText.match(regex);
        if (match) return match[1].trim();
    }

    return cleanedText;
}

// Функция для извлечения ссылки
function extractLink(msg) {
    if (msg.forward_from_chat && msg.forward_from_chat.username && msg.forward_from_message_id) {
        const username = msg.forward_from_chat.username; // Получаем username
        const messageId = msg.forward_from_message_id; // Получаем messageId
        const link = `https://t.me/${username}/${messageId}`;
        return link;
    } else if (msg.forward_from_chat && msg.forward_from_message_id) {
        // Если username нет, оставляем ссылку с ID
        const chatId = msg.forward_from_chat.id;
        const messageId = msg.forward_from_message_id;
        const link = `https://t.me/${chatId}/${messageId}`;
        return link;
    }

    return null;
}

// Функция для получения координат через Nominatim API
async function getCoordinates(locationName) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationName)}&format=json&limit=1`);
        if (response.ok) {
            const data = await response.json();
            if (data.length > 0) {
                const { lat, lon } = data[0];
                return [parseFloat(lon), parseFloat(lat)];
            }
        }
    } catch (error) {
        console.error('Error fetching coordinates:', error);
    }
    return null;
}

// Обработка ошибок polling
bot.on('polling_error', (error) => {
    console.error('Polling error:', error);
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
