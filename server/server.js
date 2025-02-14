require('dotenv').config();
const express = require('express');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');

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
        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;" // Разрешаем стили с CDN
    );
    next();
});

// Служба статических файлов
app.use(express.static(path.join(__dirname, '../dist')));

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

    // Получаем текущее состояние пользователя
    const userState = userStates[chatId];

    if (!userState) {
        bot.sendMessage(chatId, 'Начните с команды /start.');
        return;
    }

    if (userState.state === 'WAITING_FOR_POST') {
        // Проверяем, что сообщение является пересылкой
        if (!msg.forward_from && !msg.forward_from_chat) {
            bot.sendMessage(chatId, 'Пожалуйста, перешлите пост.');
            return;
        }

        // Сохраняем текст поста
        userState.postText = msg.text || 'Без текста';
        userState.state = 'WAITING_FOR_LOCATION';

        // Запрашиваем название населенного пункта
        bot.sendMessage(chatId, 'Укажите название населенного пункта, связанного с этой новостью.');
    } else if (userState.state === 'WAITING_FOR_LOCATION') {
        // Извлекаем название населенного пункта
        const locationName = extractLocation(text);
        if (!locationName) {
            bot.sendMessage(chatId, 'Не удалось найти название населенного пункта. Попробуйте снова.');
            return;
        }

        // Получаем координаты
        const coordinates = await getCoordinates(locationName);
        if (!coordinates) {
            bot.sendMessage(chatId, `Не удалось найти координаты для ${locationName}.`);
            return;
        }

        // Добавляем маркер
        const marker = {
            name: locationName,
            coords: coordinates,
            link: userState.postText.includes('https://') ? extractLink(userState.postText) : null,
        };

        markers.push(marker);

        // Отправляем подтверждение
        bot.sendMessage(chatId, `Маркер успешно добавлен: ${locationName} (${coordinates})`);

        // Сбрасываем состояние пользователя
        delete userStates[chatId];
    }
});

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
function extractLink(text) {
    const match = text.match(/https?:\/\/[^\s]+/);
    return match ? match[0] : null;
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