import 'ol/ol.css';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import { Style, Fill, Stroke, Icon } from 'ol/style';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { fromLonLat } from 'ol/proj';

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

// Функция для создания векторного слоя из GeoJSON с пользовательским стилем
function addGeoJSONLayer(url, strokeColor, fillColor) {
    const vectorSource = new VectorSource({
        url: url,
        format: new GeoJSON(),
    });

    const vectorLayer = new VectorLayer({
        source: vectorSource,
        style: new Style({
            stroke: new Stroke({
                color: strokeColor, // Цвет границы
                width: 3, // Толщина линии
            }),
            fill: new Fill({
                color: fillColor, // Цвет заливки
            }),
        }),
    });

    myMap.addLayer(vectorLayer);
}

// Добавляем границы Украины (темно-красные границы)
addGeoJSONLayer(
    '/data/ukraine-borders.geojson',
    '#8B0000', // Темно-красный цвет границ
    'rgba(255, 0, 0, 0.3)' // Полупрозрачная красная заливка
);

// Добавляем границы новых территорий РФ (темно-синие границы)
addGeoJSONLayer(
    '/data/new-territories.geojson',
    '#00008B', // Темно-синий цвет границ
    'rgba(0, 0, 255, 0.3)' // Полупрозрачная синяя заливка
);

// Функция для добавления маркеров на карту
function addMarkersToMap(markers) {
    const vectorSource = new VectorSource();

    markers.forEach(marker => {
        const iconFeature = new Feature({
            geometry: new Point(fromLonLat(marker.coords)),
            name: marker.name,
            link: marker.link,
        });

        const iconStyle = new Style({
            image: new Icon({
                anchor: [0.5, 0.5],
                src: 'images/marker-icon.png', // Путь к иконке маркера
                scale: 0.5, // Уменьшаем размер иконки
            }),
        });

        iconFeature.setStyle(iconStyle);
        vectorSource.addFeature(iconFeature);
    });

    const markerLayer = new VectorLayer({
        source: vectorSource,
    });

    myMap.addLayer(markerLayer);
}