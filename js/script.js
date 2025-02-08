// Инициализация карты
const map = new ol.Map({
    target: 'map',
    layers: [
        new ol.layer.Tile({
            source: new ol.source.OSM(),
        }),
    ],
    view: new ol.View({
        center: ol.proj.fromLonLat([31.1656, 48.3794]),
        zoom: 6,
    }),
});

// Источник для маркеров
const vectorSource = new ol.source.Vector();
const markerLayer = new ol.layer.Vector({
    source: vectorSource,
});
map.addLayer(markerLayer);

// Функция для загрузки и отрисовки границ
function loadGeoJSON(url, color) {
    fetch(url)
        .then(response => response.json())
        .then(geojson => {
            const format = new ol.format.GeoJSON();
            const features = format.readFeatures(geojson, {
                dataProjection: 'EPSG:4326',
                featureProjection: 'EPSG:3857',
            });

            const boundaryLayer = new ol.layer.Vector({
                source: new ol.source.Vector({
                    features: features,
                }),
                style: new ol.style.Style({
                    stroke: new ol.style.Stroke({
                        color: color,
                        width: 2,
                    }),
                    fill: new ol.style.Fill({
                        color: 'rgba(172, 58, 58, 0.43)', // Прозрачная заливка
                    }),
                }),
            });
            map.addLayer(boundaryLayer);
        })
        .catch(error => console.error('Error loading GeoJSON:', error));
}

// Загрузка границ Украины
loadGeoJSON('/api/borders/ukraine', 'blue');

// Загрузка границ новых территорий
loadGeoJSON('/api/borders/new-territories', 'red');

// Загрузка маркеров с сервера
fetch('/api/markers')
    .then(response => response.json())
    .then(markers => {
        markers.forEach(marker => {
            const iconFeature = new ol.Feature({
                geometry: new ol.geom.Point(ol.proj.fromLonLat(marker.coords)),
                name: marker.name,
                link: marker.link,
            });

            // Стиль для маркера с пользовательской иконкой
            const iconStyle = new ol.style.Style({
                image: new ol.style.Icon({
                    anchor: [0.5, 1], // Центрирование иконки
                    src: 'images/marker-icon.png', // Путь к пользовательской иконке
                }),
            });

            iconFeature.setStyle(iconStyle);
            vectorSource.addFeature(iconFeature);
        });
    })
    .catch(error => console.error('Error loading markers:', error));