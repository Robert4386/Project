const path = require('path');

module.exports = {
    entry: './js/script.js', // Точка входа
    output: {
        filename: 'bundle.js', // Выходной файл
        path: path.resolve(__dirname, 'dist'),
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
};