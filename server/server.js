const express = require('express');
const path = require('path');

const app = express();

// Middleware для разбора JSON
app.use(express.json());

// Middleware для установки Content-Security-Policy
app.use((req, res, next) => {
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; img-src 'self' https://tile.openstreetmap.org;"
    );
    next();
});

// Служба статических файлов
app.use(express.static(path.join(__dirname, '..')));

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});