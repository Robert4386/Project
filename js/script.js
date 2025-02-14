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
function addMarkerToMap(map, coordinates, name) {
    const markerFeature = new Feature({
        geometry: new Point(fromLonLat(coordinates)), // Преобразование координат в проекцию EPSG:3857
        name: name,
    });

    const markerStyle = new Style({
        image: new Icon({
            anchor: [0.5, 1], // Центрирование иконки
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
}

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

// Стиль для новых территорий
const territoriesStyle = new Style({
    stroke: new Stroke({
        color: 'blue',
        width: 3,
    }),
    fill: new Fill({
        color: 'rgba(0, 0, 255, 0.3)', // Полупрозрачная синяя заливка
    }),
});

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
            style: ukraineStyle,
        });
        myMap.addLayer(ukraineLayer); // Добавляем слой поверх базового
    })
    .catch(error => console.error('Error loading Ukraine borders:', error));

// Загрузка границ новых территорий
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
    .catch(error => console.error('Error loading new territories borders:', error));

// Подключение к WebSocket для получения новых маркеров
const socket = new WebSocket('ws://localhost:8080');

socket.onopen = () => {
    console.log('WebSocket connection established');
};

socket.onmessage = (event) => {
    const marker = JSON.parse(event.data);
    addMarkerToMap(myMap, marker.coords, marker.name);
};

socket.onerror = (error) => {
    console.error('WebSocket error:', error);
};