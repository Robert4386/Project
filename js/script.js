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

// Добавляем обработчик событий для изменения курсора
myMap.on('pointermove', function (event) {
    const pixel = myMap.getEventPixel(event.originalEvent);
    const feature = myMap.forEachFeatureAtPixel(pixel, function (feature) {
        return feature;
    });

    if (feature && feature.get('type') === 'marker') {
        // Меняем курсор на "рука с пальцем" при наведении на маркер
        myMap.getTargetElement().style.cursor = 'pointer';
    } else {
        // Восстанавливаем обычный курсор, если не над маркером
        myMap.getTargetElement().style.cursor = '';
    }
});

// Добавляем обработчик клика на карту
myMap.on('click', function (event) {
    let clickedMarker = null;

    myMap.forEachFeatureAtPixel(event.pixel, function (feature) {
        if (feature && feature.get('type') === 'marker') { // Проверяем, что это маркер
            clickedMarker = feature;
        }
    });

    if (clickedMarker) {
        // Получаем свойства маркера
        const markerProperties = clickedMarker.getProperties();
        console.log('Marker properties:', markerProperties);

        // Пробуем извлечь ссылку напрямую
        const featureLink = clickedMarker.get('link');
        console.log('Clicked marker link:', featureLink);

        if (featureLink) {
            console.log('Opening link:', featureLink);
            window.open(featureLink, '_blank');
        } else {
            console.log('No link found for this marker.');
        }
    } else {
        console.log('Clicked area is not a marker.');
    }
});

// Функция для добавления маркера на карту
const markerSource = new VectorSource(); // Общий источник маркеров
const markerLayer = new VectorLayer({
    source: markerSource,
    zIndex: 1000,
});
myMap.addLayer(markerLayer); // Добавляем один раз

// Функция для добавления маркера на карту
function addMarkerToMap(markerData) {
    const { coords, name, link } = markerData;

    if (!coords || coords.length !== 2 || isNaN(coords[0]) || isNaN(coords[1])) {
        console.error('Invalid coordinates for marker:', coords);
        return;
    }

    console.log('Adding marker:', markerData);

    const markerFeature = new Feature({
        geometry: new Point(fromLonLat(coords)),
        name: name,
    });

    // Привязываем ссылку к маркеру через set()
    markerFeature.set('link', link);
    
    // Устанавливаем уникальный тег для маркера
    markerFeature.set('type', 'marker');

    // Проверяем, что ссылка привязалась
    console.log('Marker link after set:', markerFeature.get('link'));

    const markerStyle = new Style({
        image: new Icon({
            anchor: [0.5, 0.5],
            src: '/images/marker-icon.png',
            scale: 0.15,
        }),
    });

    markerFeature.setStyle(markerStyle);
    markerSource.addFeature(markerFeature);
}

// *****************************************************************************************************************

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

// Загрузка границ приднестровья
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

// Подключение к WebSocket для получения данных о маркерах
const socket = new WebSocket('ws://localhost:8080');

socket.onopen = () => {
    console.log('WebSocket connection established');
};

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.action === 'update_map') {
        updateMap(data.markers);
    } else if (data.action === 'remove_marker') {
        removeMarkerFromMap(data.coordinates);
    } else {
        // Добавляем маркер на карту, если получены данные маркера
        console.log('Received marker data:', data);
        addMarkerToMap(data);
    }
};

socket.onerror = (error) => {
    console.error('WebSocket error:', error);
};

// Функция для обновления карты с новыми маркерами
function updateMap(markers) {
    // Очищаем все маркеры на карте
    markerSource.clear();

    // Добавляем новые маркеры
    markers.forEach(marker => {
        const markerFeature = new Feature({
            geometry: new Point(fromLonLat(marker.coords)),
            name: marker.name,
        });

        markerFeature.set('link', marker.link);  // Привязываем ссылку к маркеру
        markerFeature.set('type', 'marker');  // Устанавливаем тип

        const markerStyle = new Style({
            image: new Icon({
                anchor: [0.5, 0.5],
                src: '/images/marker-icon.png',
                scale: 0.15,
            }),
        });

        markerFeature.setStyle(markerStyle);
        markerSource.addFeature(markerFeature);
    });
}

// Функция для удаления маркера с карты
function removeMarkerFromMap(coordinates) {
    const featureToRemove = markerSource.getFeatures().find(feature => {
        const coords = feature.getGeometry().getCoordinates();
        return coords[0] === fromLonLat(coordinates)[0] && coords[1] === fromLonLat(coordinates)[1];
    });

    if (featureToRemove) {
        markerSource.removeFeature(featureToRemove);  // Удаляем маркер
    }
}
