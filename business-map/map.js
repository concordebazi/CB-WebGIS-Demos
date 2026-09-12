// ==========================================
// CB WEB & GIS - BUSINESS MAP DEMO
// ==========================================


// Create map
const map = L.map("map").setView(
    [58.4108, 15.6214],
    13
);


// ==========================================
// BASE MAP
// ==========================================

// ==========================================
// BASE MAPS
// ==========================================

const streetMap = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        maxZoom: 19,
        attribution:
            '&copy; OpenStreetMap contributors'
    }
);


const topoMap = L.tileLayer(
    "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    {
        maxZoom: 17,
        attribution:
            '&copy; OpenStreetMap contributors | OpenTopoMap'
    }
);


const satelliteMap = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
        maxZoom: 19,
        attribution:
            "Tiles &copy; Esri"
    }
);


// Default basemap
streetMap.addTo(map);


// ==========================================
// BUSINESS DATA
// ==========================================

const businesses = [

    {
        name: "Salong Central",
        category: "salong",
        categoryLabel: "Salong",
        lat: 58.4104,
        lng: 15.6219,
        address: "Centrala Linköping",
        description: "Exempel på lokal frisörverksamhet."
    },

    {
        name: "City Barber",
        category: "salong",
        categoryLabel: "Salong",
        lat: 58.4167,
        lng: 15.6152,
        address: "Vasastaden",
        description: "Exempel på barbershop och hårvård."
    },

    {
        name: "Express Auto Service",
        category: "bilverkstad",
        categoryLabel: "Bilverkstad",
        lat: 58.3988,
        lng: 15.6387,
        address: "Tornbyområdet",
        description: "Bilservice, underhåll och reparation."
    },

    {
        name: "Linköping Motor",
        category: "bilverkstad",
        categoryLabel: "Bilverkstad",
        lat: 58.4272,
        lng: 15.6015,
        address: "Norra Linköping",
        description: "Exempel på lokal bilverkstad."
    },

    {
        name: "Grön Städ",
        category: "stad",
        categoryLabel: "Städtjänst",
        lat: 58.4052,
        lng: 15.6067,
        address: "Linköping",
        description: "Hemstädning och lokala städtjänster."
    },

    {
        name: "Rent & Fint",
        category: "stad",
        categoryLabel: "Städtjänst",
        lat: 58.4215,
        lng: 15.6325,
        address: "Linköping",
        description: "Exempel på lokal städverksamhet."
    }

];


// ==========================================
// CATEGORY LAYERS
// ==========================================

const categoryLayers = {

    salong: L.layerGroup().addTo(map),

    bilverkstad: L.layerGroup().addTo(map),

    stad: L.layerGroup().addTo(map)

};


// ==========================================
// CREATE MARKERS
// ==========================================

businesses.forEach(function (business) {

    const marker = L.marker(
        [business.lat, business.lng]
    );

    marker.bindPopup(`
        <div class="map-popup">

            <strong>
                ${business.name}
            </strong>

            <p>
                ${business.description}
            </p>

            <span>
                ${business.categoryLabel}
                •
                ${business.address}
            </span>

        </div>
    `);

    marker.addTo(
        categoryLayers[business.category]
    );

});


// ==========================================
// SERVICE AREA POLYGON
// ==========================================

const serviceArea = L.polygon(

    [
        [58.4350, 15.5750],
        [58.4400, 15.6500],
        [58.4100, 15.6800],
        [58.3800, 15.6500],
        [58.3800, 15.5900],
        [58.4050, 15.5650]
    ],

    {
        color: "#20c7b7",
        weight: 2,

        fillColor: "#20c7b7",
        fillOpacity: 0.08,

        dashArray: "7 7"
    }

).addTo(map);


serviceArea.bindPopup(`
    <strong>Demo serviceområde</strong>

    <p>
        Exempel på hur ett företags
        geografiska serviceområde kan visas.
    </p>
`);


// Send polygon behind markers
serviceArea.bringToBack();


// ==========================================
// CATEGORY FILTERS
// ==========================================

const categoryFilters =
    document.querySelectorAll(
        ".category-filter"
    );


categoryFilters.forEach(function (checkbox) {

    checkbox.addEventListener(
        "change",
        function () {

            const category = this.value;

            const layer =
                categoryLayers[category];


            if (this.checked) {

                map.addLayer(layer);

            } else {

                map.removeLayer(layer);

            }


            updateVisibleCount();

        }
    );

});


// ==========================================
// SERVICE AREA TOGGLE
// ==========================================

const serviceAreaToggle =
    document.getElementById(
        "service-area-toggle"
    );


if (serviceAreaToggle) {

    serviceAreaToggle.addEventListener(
        "change",
        function () {

            if (this.checked) {

                serviceArea.addTo(map);

                serviceArea.bringToBack();

            } else {

                map.removeLayer(
                    serviceArea
                );

            }

        }
    );

}


// ==========================================
// LIVE STATISTICS
// ==========================================

const visibleCount =
    document.getElementById(
        "visible-count"
    );


function updateVisibleCount() {

    let count = 0;


    Object.keys(
        categoryLayers
    ).forEach(function (category) {

        if (
            map.hasLayer(
                categoryLayers[category]
            )
        ) {

            count +=
                categoryLayers[
                    category
                ].getLayers().length;

        }

    });


    visibleCount.textContent =
        count;

}


// Initial count
updateVisibleCount();


// ==========================================
// SCALE CONTROL
// ==========================================

L.control.scale({
    metric: true,
    imperial: false
}).addTo(map);
// ==========================================
// LIVE MOUSE COORDINATES
// ==========================================

const mouseCoordinates =
    document.getElementById(
        "mouse-coordinates"
    );


map.on("mousemove", function (event) {

    const lat =
        event.latlng.lat.toFixed(5);

    const lng =
        event.latlng.lng.toFixed(5);


    mouseCoordinates.textContent =
        `Lat: ${lat} | Lon: ${lng}`;

});


// ==========================================
// USER GEOLOCATION
// ==========================================

const locateButton =
    document.getElementById(
        "locate-btn"
    );

let userLocationMarker = null;
let userAccuracyCircle = null;


locateButton.addEventListener(
    "click",
    function () {

        locateButton.textContent =
            "Söker position...";


        map.locate({
            setView: true,
            maxZoom: 16,
            enableHighAccuracy: true
        });

    }
);


map.on(
    "locationfound",
    function (event) {

        if (userLocationMarker) {

            map.removeLayer(
                userLocationMarker
            );

        }


        if (userAccuracyCircle) {

            map.removeLayer(
                userAccuracyCircle
            );

        }


        userLocationMarker =
            L.marker(
                event.latlng
            )
            .addTo(map)
            .bindPopup(
                "Din ungefärliga position"
            )
            .openPopup();


        userAccuracyCircle =
            L.circle(
                event.latlng,
                {
                    radius:
                        event.accuracy,

                    color:
                        "#20c7b7",

                    fillColor:
                        "#20c7b7",

                    fillOpacity:
                        0.08
                }
            )
            .addTo(map);


        locateButton.textContent =
            "📍 Visa min position";

    }
);


map.on(
    "locationerror",
    function () {

        locateButton.textContent =
            "📍 Visa min position";

        alert(
            "Kunde inte hämta din position."
        );

    }
);
// ==========================================
// BASEMAP SWITCHER
// ==========================================

const baseMaps = {

    "Gatukarta": streetMap,

    "Topografisk karta": topoMap,

    "Satellit": satelliteMap

};


L.control.layers(
    baseMaps,
    null,
    {
        position: "topright",
        collapsed: false
    }
).addTo(map);
// ==========================================
// DISTANCE & AREA MEASUREMENT
// ==========================================

const measureControl = new L.Control.Measure({

    position: "topleft",

    primaryLengthUnit: "meters",
    secondaryLengthUnit: "kilometers",

    primaryAreaUnit: "sqmeters",
    secondaryAreaUnit: "hectares",

    activeColor: "#20c7b7",
    completedColor: "#146b5c",

    localization: "sv"

});


measureControl.addTo(map);
