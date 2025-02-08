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
    style: new ol.style.Style({
        image: new ol.style.Circle({
            radius: 8,
            fill: new ol.style.Fill({ color: 'blue' }),
            stroke: new ol.style.Stroke({ color: '#00008B', width: 3 }),
        }),
    }),
});
map.addLayer(markerLayer);

// Загрузка маркеров с сервера
fetch('/api/markers')
    .then(response => response.json())
    .then(markers => {
        markers.forEach(marker => {
            const feature = new ol.Feature({
                geometry: new ol.geom.Point(ol.proj.fromLonLat(marker.coords)),
                name: marker.name,
                link: marker.link,
            });
            vectorSource.addFeature(feature);
        });
    })
    .catch(error => console.error('Error loading markers:', error));