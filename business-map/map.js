// ==========================================
// CB WEB & GIS - BUSINESS MAP DEMO
// ==========================================


// Create the map
const map = L.map("map").setView(
    [58.4108, 15.6214],
    13
);


// OpenStreetMap layer
L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        maxZoom: 19,
        attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }
).addTo(map);


// Demo business marker
const businessMarker = L.marker(
    [58.4108, 15.6214]
).addTo(map);


// Popup
businessMarker.bindPopup(`
    <div class="map-popup">

        <strong>CB Web & GIS Demo</strong>

        <p>
            Exempel på en lokal verksamhet i Linköping.
        </p>

        <span>
            Webb • GIS • Digitala lösningar
        </span>

    </div>
`);
