// Импортируем необходимые модули из OpenLayers
import 'ol/ol.css';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { fromLonLat } from 'ol/proj';
import { Style, Icon } from 'ol/style';

// Инициализация карты
const myMap = new Map({
    target: 'map',
    layers: [
        new TileLayer({
            source: new OSM(),
        }),
    ],
    view: new View({
        center: fromLonLat([31.1656, 48.3794]), // Центр Украины
        zoom: 6,
    }),
});

// Источник для маркеров
const vectorSource = new VectorSource();
const markerLayer = new VectorLayer({
    source: vectorSource,
});
myMap.addLayer(markerLayer);

// Загрузка маркеров с сервера
fetch('/api/markers')
    .then(response => response.json())
    .then(markers => {
        markers.forEach(marker => {
            const iconFeature = new Feature({
                geometry: new Point(fromLonLat(marker.coords)),
                name: marker.name,
                link: marker.link,
            });

            // Стиль для маркера с пользовательской иконкой
            const iconStyle = new Style({
                image: new Icon({
                    anchor: [0.5, 1], // Центрирование иконки
                    src: 'images/marker-icon.png', // Путь к пользовательской иконке
                }),
            });

            iconFeature.setStyle(iconStyle);
            vectorSource.addFeature(iconFeature);
        });
    })
    .catch(error => console.error('Error loading markers:', error));