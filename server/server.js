require('dotenv').config();
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(express.json());

// Токен вашего Telegram-бота
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN);

// База данных (в данном случае просто массив)
let markers = [];

// Роут для получения данных карты
app.get('/api/markers', (req, res) => {
    res.json(markers);
});

// Роут для получения границ Украины
app.get('/api/borders/ukraine', (req, res) => {
    const filePath = path.join(__dirname, '../data/ukraine-borders.geojson');
    res.sendFile(filePath);
});

// Роут для получения границ новых территорий
app.get('/api/borders/new-territories', (req, res) => {
    const filePath = path.join(__dirname, '../data/new-territories.geojson');
    res.sendFile(filePath);
});

// Обработка входящих сообщений от Telegram
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // Ищем название населенного пункта в тексте
    const locationName = extractLocation(text);
    if (!locationName) {
        bot.sendMessage(chatId, 'Не удалось найти название населенного пункта.');
        return;
    }

    // Получаем координаты
    const coordinates = await getCoordinates(locationName);
    if (!coordinates) {
        bot.sendMessage(chatId, `Не удалось найти координаты для ${locationName}.`);
        return;
    }

    // Сохраняем маркер
    const marker = {
        name: locationName,
        coords: coordinates,
        link: msg.text.includes('https://') ? extractLink(msg.text) : null,
    };
    markers.push(marker);

    // Отправляем подтверждение
    bot.sendMessage(chatId, `Маркер добавлен: ${locationName} (${coordinates})`);
});

// Функция для извлечения названия населенного пункта
function extractLocation(text) {
    const keywords = ['город', 'деревня', 'поселок', 'село'];
    for (const keyword of keywords) {
        const match = text.match(new RegExp(`${keyword}\\s+(\\S+)`, 'i'));
        if (match) return match[1];
    }
    return null;
}

// Функция для извлечения ссылки
function extractLink(text) {
    const match = text.match(/https?:\/\/[^\s]+/);
    return match ? match[0] : null;
}

// Функция для получения координат через Nominatim (OpenStreetMap API)
async function getCoordinates(locationName) {
    try {
        const response = await axios.get('https://nominatim.openstreetmap.org/search', {
            params: {
                q: locationName,
                format: 'json',
                limit: 1,
            },
        });
        if (response.data.length > 0) {
            const { lat, lon } = response.data[0];
            return [parseFloat(lon), parseFloat(lat)];
        }
    } catch (error) {
        console.error('Error fetching coordinates:', error);
    }
    return null;
}

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});