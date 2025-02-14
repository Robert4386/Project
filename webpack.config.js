const path = require('path'); // Импортируем модуль path

module.exports = {
    entry: './js/script.js', // Точка входа
    output: {
        filename: 'bundle.js', // Выходной файл
        path: path.resolve(__dirname, 'dist'), // Путь к выходной папке
    },
    module: {
        rules: [
            {
                test: /\.css$/, // Обработка CSS
                use: ['style-loader', 'css-loader'],
            },
        ],
    },
    mode: 'development', // Режим разработки
    devtool: 'source-map', // Отключает использование eval()
};