import 'ol/ol.css';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Feature } from 'ol';
import Point from 'ol/geom/Point';
import { fromLonLat } from 'ol/proj';
import { Style, Icon } from 'ol/style';
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
            scale: 0.5, // Масштаб иконки
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

// Загрузка границ
fetch('/data/ukraine-borders.geojson') // Используем существующий файл
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        const vectorSource = new VectorSource({
            features: new GeoJSON().readFeatures(data),
        });

        const vectorLayer = new VectorLayer({
            source: vectorSource,
        });

        myMap.addLayer(vectorLayer);
    })
    .catch(error => {
        console.error('Error loading borders:', error);
    });

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