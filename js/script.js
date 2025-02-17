import 'ol/ol.css';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Feature } from 'ol';
import Point from 'ol/geom/Point';
import { fromLonLat } from 'ol/proj';
import { Style, Icon, Stroke, Fill } from 'ol/style';
import GeoJSON from 'ol/format/GeoJSON';

// Инициализация карты
const myMap = new Map({
    target: 'map',
    layers: [
        new TileLayer({
            source: new OSM(),
        }),
    ],
    view: new View({
        center: fromLonLat([30.5234, 50.4501]), // Центр Украины в проекции EPSG:3857
        zoom: 6,
    }),
});

// Функция для добавления маркера на карту
function addMarkerToMap(map, markerData) {
    const { coords, name, link } = markerData;

    const markerFeature = new Feature({
        geometry: new Point(fromLonLat(coords)), // Преобразование координат в проекцию EPSG:3857
        name: name,
        link: link, // Сохраняем ссылку в данных маркера
    });

    const markerStyle = new Style({
        image: new Icon({
            anchor: [0.5, 0.5], // Центр иконки совпадает с точкой координат
            src: '/images/marker-icon.png', // Путь к иконке маркера
            scale: 0.15, // Масштаб иконки
        }),
    });

    markerFeature.setStyle(markerStyle);

    const vectorSource = new VectorSource();
    vectorSource.addFeature(markerFeature);

    const vectorLayer = new VectorLayer({
        source: vectorSource,
    });

    map.addLayer(vectorLayer);

    // Добавляем обработчик клика на маркер
    map.on('click', (event) => {
        map.forEachFeatureAtPixel(event.pixel, (feature) => {
            const featureLink = feature.get('link'); // Получаем ссылку из данных маркера
            if (featureLink) {
                console.log('Opening link:', featureLink); // Логируем ссылку для отладки
                window.open(featureLink, '_blank'); // Открываем ссылку в новой вкладке
            }
        });
    });
}

//*************************************************************************************************************************

// Стиль для границ Украины
const ukraineStyle = new Style({
    stroke: new Stroke({
        color: 'red',
        width: 3,
    }),
    fill: new Fill({
        color: 'rgba(255, 0, 0, 0.3)', // Полупрозрачная красная заливка
    }),
});

// Стиль для новых территорий РФ
const territoriesStyle = new Style({
    stroke: new Stroke({
        color: 'darkblue',
        width: 3,
    }),
    fill: new Fill({
        color: 'rgba(187, 0, 255, 0.3)', // Полупрозрачная синяя заливка
    }),
});

// Стиль для территорий РФ (краснодарский край и крым)
const ugfedokrugStyle = new Style({
    stroke: new Stroke({
        color: 'darkblue',
        width: 3,
    }),
    fill: new Fill({
        color: 'rgba(11, 27, 253, 0.27)', // Желтая заливка
    }),
});

// Стиль для западных территорий
const zapadStyle = new Style({
    stroke: new Stroke({
        color: 'red',
        width: 3,
    }),
    fill: new Fill({
        color: 'rgba(238, 167, 3, 0.38)', // заливка
    }),
});

// Стиль для польши
const polandStyle = new Style({
    stroke: new Stroke({
        color: 'red',
        width: 3,
    }),
    fill: new Fill({
        color: 'rgba(238, 167, 3, 0.38)', // заливка
    }),
});

// Стиль для приднестровья
const prdnstrStyle = new Style({
    stroke: new Stroke({
        color: 'red',
        width: 3,
    }),
    fill: new Fill({
        color: 'rgba(238, 167, 3, 0.55)', // заливка
    }),
});

// *****************************************************************************************************************

// Загрузка границ Украины
fetch('/data/ukraine-borders.geojson')
    .then(response => response.json())
    .then(data => {
        const ukraineLayer = new VectorLayer({
            source: new VectorSource({
                features: new GeoJSON().readFeatures(data, {
                    featureProjection: 'EPSG:3857', // Преобразование координат
                }),
            }),
            style: ukraineStyle, // Используем стиль для Украины
        });
        myMap.addLayer(ukraineLayer); // Добавляем слой поверх базового
    })
    .catch(error => console.error('Error loading Ukraine borders:', error.message));

// Загрузка границ новых территорий РФ
fetch('/data/new-territories.geojson')
    .then(response => response.json())
    .then(data => {
        const territoriesLayer = new VectorLayer({
            source: new VectorSource({
                features: new GeoJSON().readFeatures(data, {
                    featureProjection: 'EPSG:3857', // Преобразование координат
                }),
            }),
            style: territoriesStyle,
        });
        myMap.addLayer(territoriesLayer); // Добавляем слой поверх базового
    })
    .catch(error => console.error('Error loading new territories borders:', error.message));

// Загрузка южного фед округа
fetch('/data/ugfedokrug.geojson')
    .then(response => response.json())
    .then(data => {
        const ugfedokrugLayer = new VectorLayer({
            source: new VectorSource({
                features: new GeoJSON().readFeatures(data, {
                    featureProjection: 'EPSG:3857', // Преобразование координат
                }),
            }),
            style: ugfedokrugStyle,
        });
        myMap.addLayer(ugfedokrugLayer); // Добавляем слой поверх базового
    })
    .catch(error => console.error('Error loading krasrndcrimea borders:', error.message));

// Загрузка западных территорий
fetch('/data/zapad.geojson')
    .then(response => response.json())
    .then(data => {
        const zapadLayer = new VectorLayer({
            source: new VectorSource({
                features: new GeoJSON().readFeatures(data, {
                    featureProjection: 'EPSG:3857', // Преобразование координат
                }),
            }),
            style: zapadStyle,
        });
        myMap.addLayer(zapadLayer); // Добавляем слой поверх базового
    })
    .catch(error => console.error('Error loading zapad borders:', error.message));

// Загрузка границ польши
fetch('/data/poland.geojson')
    .then(response => response.json())
    .then(data => {
        const polandLayer = new VectorLayer({
            source: new VectorSource({
                features: new GeoJSON().readFeatures(data, {
                    featureProjection: 'EPSG:3857', // Преобразование координат
                }),
            }),
            style: polandStyle,
        });
        myMap.addLayer(polandLayer); // Добавляем слой поверх базового
    })
    .catch(error => console.error('Error loading zapad borders:', error.message));

    // Загрузка границ польши
fetch('/data/prdnstr.geojson')
.then(response => response.json())
.then(data => {
    const prdnstrLayer = new VectorLayer({
        source: new VectorSource({
            features: new GeoJSON().readFeatures(data, {
                featureProjection: 'EPSG:3857', // Преобразование координат
            }),
        }),
        style: prdnstrStyle,
    });
    myMap.addLayer(prdnstrLayer); // Добавляем слой поверх базового
})
.catch(error => console.error('Error loading zapad borders:', error.message));

//*********************************************************************************************************************************

// Подключение к WebSocket для получения новых маркеров
const socket = new WebSocket('ws://localhost:8080');

socket.onopen = () => {
    console.log('WebSocket connection established');
};

socket.onmessage = (event) => {
    const marker = JSON.parse(event.data);
    addMarkerToMap(myMap, marker);
};

socket.onerror = (error) => {
    console.error('WebSocket error:', error);
};