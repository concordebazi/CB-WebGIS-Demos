// ==========================================
// CB WEB & GIS - BUSINESS MAP DEMO
// ==========================================


// Create map
const map = L.map("map").setView(
    [58.4108, 15.6214],
    13
);
const defaultMapView = {
    center: [58.4108, 15.6214],
    zoom: 13
};

// ==========================================
// RESET MAP
// ==========================================

const resetMapButton =
    document.getElementById(
        "reset-map-btn"
    );


resetMapButton.addEventListener(
    "click",
    function () {

        map.setView(
            defaultMapView.center,
            defaultMapView.zoom
        );


        map.closePopup();


        businessSearch.value = "";

        searchResults.innerHTML = "";


        categoryFilters.forEach(
            function (checkbox) {

                checkbox.checked = true;

                const category =
                    checkbox.value;

                map.addLayer(
                    categoryLayers[category]
                );

            }
        );


        serviceAreaToggle.checked = true;

        serviceArea.addTo(map);
        serviceArea.bringToBack();


        updateVisibleCount();

    }
);

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
// GEOJSON BUSINESS DATA
// ==========================================

let businessFeatures = [];
let businessLayer = null;


// ==========================================
// CATEGORY LAYERS
// ==========================================

const categoryLayers = {

    salong: L.layerGroup().addTo(map),

    bilverkstad: L.layerGroup().addTo(map),

    stad: L.layerGroup().addTo(map)

};


// ==========================================
// LOAD GEOJSON
// ==========================================

fetch("data/businesses.geojson")

    .then(function (response) {

        if (!response.ok) {
            throw new Error(
                "Kunde inte läsa GeoJSON-filen."
            );
        }

        return response.json();

    })

    .then(function (geojson) {

        businessFeatures =
            geojson.features;

        // ==========================================
// HIGHLIGHT BUSINESS MARKER
// ==========================================

function highlightBusinessMarker(layer) {

    if (highlightedMarker) {

        highlightedMarker.setStyle({
            radius: 8,
            color: "#071a18",
            weight: 2,
            fillColor: "#20c7b7",
            fillOpacity: 0.95
        });

    }


    highlightedMarker = layer;


    highlightedMarker.setStyle({
        radius: 12,
        color: "#ffffff",
        weight: 3,
        fillColor: "#20c7b7",
        fillOpacity: 1
    });

}
        // ==========================================
// COUNT FEATURES BY ATTRIBUTE
// ==========================================

const categoryCounts = {

    salong: 0,
    bilverkstad: 0,
    stad: 0

};


businessFeatures.forEach(function (feature) {

    const category =
        feature.properties.category;


    if (
        categoryCounts[category] !== undefined
    ) {

        categoryCounts[category]++;

    }

});


document.getElementById(
    "count-salong"
).textContent =
    categoryCounts.salong;


document.getElementById(
    "count-bilverkstad"
).textContent =
    categoryCounts.bilverkstad;


document.getElementById(
    "count-stad"
).textContent =
    categoryCounts.stad;
// ==========================================
// MAP STATISTICS
// ==========================================

function updateMapStatistics() {

    const totalElement =
        document.getElementById("stats-total");

    const salongElement =
        document.getElementById("stats-salong");

    const bilverkstadElement =
        document.getElementById("stats-bilverkstad");

    const stadElement =
        document.getElementById("stats-stad");


    if (totalElement) {
        totalElement.textContent =
            businessFeatures.length;
    }

    if (salongElement) {
        salongElement.textContent =
            categoryCounts.salong;
    }

    if (bilverkstadElement) {
        bilverkstadElement.textContent =
            categoryCounts.bilverkstad;
    }

    if (stadElement) {
        stadElement.textContent =
            categoryCounts.stad;
    }

}


// Run statistics after GeoJSON has loaded
updateMapStatistics();

       businessLayer = L.geoJSON(

            geojson,

            {

               pointToLayer:
    function (
        feature,
        latlng
    ) {

        const marker =
            L.circleMarker(
                latlng,
                {
                    radius: 8,

                    color: "#071a18",

                    weight: 2,

                    fillColor: "#20c7b7",

                    fillOpacity: 0.95
                }
            );

        return marker;

    },


                onEachFeature:
                    function (
                        feature,
                        layer
                    ) {

                        const props =
                            feature.properties;


                        layer.bindPopup(`
                            <div class="map-popup">

                                <strong>
                                    ${props.name}
                                </strong>

                                <p>
                                    ${props.description}
                                </p>

                                <span>
                                    ${props.categoryLabel}
                                    •
                                    ${props.address}
                                </span>

                            </div>
                        `);


                        if (
                            categoryLayers[
                                props.category
                            ]
                        ) {

                            layer.addTo(
                                categoryLayers[
                                    props.category
                                ]
                            );

                        }

                    }

            }

        );


        updateVisibleCount();

    })

    .catch(function (error) {

        console.error(
            "GeoJSON-fel:",
            error
        );

    });

// ==========================================
// BUSINESS SEARCH
// ==========================================

const businessSearch =
    document.getElementById(
        "business-search"
    );

const searchResults =
    document.getElementById(
        "search-results"
    );


businessSearch.addEventListener(
    "input",
    function () {

        const query =
            this.value
                .trim()
                .toLowerCase();


        searchResults.innerHTML = "";


        if (query.length < 2) {
            return;
        }


        const matches =
            businessFeatures.filter(
                function (feature) {

                    const props =
                        feature.properties;


                    return (
                        props.name
                            .toLowerCase()
                            .includes(query)
                        ||
                        props.address
                            .toLowerCase()
                            .includes(query)
                    );

                }
            );


        matches.forEach(
            function (feature) {

                const props =
                    feature.properties;


                const button =
                    document.createElement(
                        "button"
                    );


                button.className =
                    "search-result-item";


                button.innerHTML = `
                    <strong>
                        ${props.name}
                    </strong>

                    <span>
                        ${props.categoryLabel}
                        •
                        ${props.address}
                    </span>
                `;


                button.addEventListener(
                    "click",
                    function () {

                        const coordinates =
                            feature.geometry.coordinates;


                        const latlng = [
                            coordinates[1],
                            coordinates[0]
                        ];


                        map.setView(
                            latlng,
                            17
                        );


                        businessLayer.eachLayer(
                            function (layer) {

                                if (
                                    layer.feature ===
                                    feature
                                ) {
highlightBusinessMarker(layer);
                                    layer.openPopup();

                                }

                            }
                        );


                        searchResults.innerHTML =
                            "";

                        businessSearch.value =
                            props.name;

                    }
                );


                searchResults.appendChild(
                    button
                );

            }
        );

    }
);
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
// DISTANCE & AREA MEASUREMENT TOOLS
// ==========================================

const drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);


// ==========================================
// DRAW CONTROL
// ==========================================

const drawControl = new L.Control.Draw({

    position: "topleft",

    draw: {

        polyline: {
            shapeOptions: {
                color: "#20c7b7",
                weight: 4
            }
        },

        polygon: {
            allowIntersection: false,

            showArea: true,

            shapeOptions: {
                color: "#146b5c",
                fillColor: "#20c7b7",
                fillOpacity: 0.15,
                weight: 3
            }
        },

        rectangle: false,
        circle: false,
        circlemarker: false,
        marker: false

    },

    edit: {
        featureGroup: drawnItems,
        remove: true
    }

});


map.addControl(drawControl);


// ==========================================
// MEASUREMENT RESULTS
// ==========================================

map.on(
    L.Draw.Event.CREATED,
    function (event) {

        const layer = event.layer;

        drawnItems.addLayer(layer);


        // ----------------------------------
        // DISTANCE
        // ----------------------------------

        if (event.layerType === "polyline") {

            const points =
                layer.getLatLngs();

            let totalDistance = 0;


            for (
                let i = 0;
                i < points.length - 1;
                i++
            ) {

                totalDistance +=
                    points[i].distanceTo(
                        points[i + 1]
                    );

            }


            let distanceText;


            if (totalDistance >= 1000) {

                distanceText =
                    (
                        totalDistance / 1000
                    ).toFixed(2)
                    + " km";

            } else {

                distanceText =
                    totalDistance.toFixed(0)
                    + " m";

            }


            layer.bindPopup(`
                <div class="map-popup">

                    <strong>
                        Avstånd
                    </strong>

                    <p>
                        ${distanceText}
                    </p>

                </div>
            `).openPopup();

        }


        // ----------------------------------
        // AREA
        // ----------------------------------

        if (event.layerType === "polygon") {

            const latLngs =
                layer.getLatLngs()[0];

            const area =
                L.GeometryUtil.geodesicArea(
                    latLngs
                );


            let areaText;


            if (area >= 10000) {

                areaText =
                    (
                        area / 10000
                    ).toFixed(2)
                    + " ha";

            } else {

                areaText =
                    area.toFixed(0)
                    + " m²";

            }


            layer.bindPopup(`
                <div class="map-popup">

                    <strong>
                        Area
                    </strong>

                    <p>
                        ${areaText}
                    </p>

                </div>
            `).openPopup();

        }

    }
);
// ==========================================
// PROXIMITY ANALYSIS
// ==========================================

const radiusSelect =
    document.getElementById("radius-select");

const radiusAnalysisButton =
    document.getElementById("radius-analysis-btn");

const radiusAnalysisInfo =
    document.getElementById("radius-analysis-info");


let radiusAnalysisActive = false;
let analysisCircle = null;
let analysisCenterMarker = null;


// ==========================================
// START PROXIMITY ANALYSIS
// ==========================================

if (
    radiusSelect &&
    radiusAnalysisButton &&
    radiusAnalysisInfo
) {

    radiusAnalysisButton.addEventListener(
        "click",
        function () {

            radiusAnalysisActive = true;

            radiusAnalysisButton.textContent =
                "📍 Klicka på kartan...";

            radiusAnalysisInfo.innerHTML = `
                <strong>Analysen är aktiv</strong>
                <span>
                    Klicka på en plats på kartan.
                </span>
            `;

        }
    );

}


// ==========================================
// MAP CLICK
// ==========================================

map.on("click", function (event) {

    if (!radiusAnalysisActive) {
        return;
    }


    radiusAnalysisActive = false;


    const selectedRadius =
        Number(radiusSelect.value);


    // Remove previous analysis
    if (analysisCircle) {

        map.removeLayer(
            analysisCircle
        );

        analysisCircle = null;

    }


    if (analysisCenterMarker) {

        map.removeLayer(
            analysisCenterMarker
        );

        analysisCenterMarker = null;

    }


    // ==========================================
    // ANALYSIS CENTRE
    // ==========================================

    analysisCenterMarker =
        L.circleMarker(
            event.latlng,
            {
                radius: 8,
                color: "#071a18",
                weight: 3,
                fillColor: "#20c7b7",
                fillOpacity: 1
            }
        )
        .addTo(map);


    // ==========================================
    // ANALYSIS RADIUS
    // ==========================================

    analysisCircle =
        L.circle(
            event.latlng,
            {
                radius: selectedRadius,

                color: "#20c7b7",

                weight: 3,

                fillColor: "#20c7b7",

                fillOpacity: 0.10,

                dashArray: "8 6"
            }
        )
        .addTo(map);


    // ==========================================
    // FIND BUSINESSES
    // ==========================================

    const matchingBusinesses = [];


    businessFeatures.forEach(
        function (feature) {

            if (
                !feature.geometry ||
                feature.geometry.type !== "Point"
            ) {
                return;
            }


            const coordinates =
                feature.geometry.coordinates;


            const businessPosition =
                L.latLng(
                    coordinates[1],
                    coordinates[0]
                );


            const distance =
                event.latlng.distanceTo(
                    businessPosition
                );


            if (distance <= selectedRadius) {

                matchingBusinesses.push({
                    feature: feature,
                    distance: distance
                });

            }

        }
    );


    // Nearest first
    matchingBusinesses.sort(
        function (a, b) {

            return a.distance - b.distance;

        }
    );


    // ==========================================
    // BUILD RESULTS
    // ==========================================

    let resultHTML = `
        <strong>
            ${matchingBusinesses.length}
            verksamheter hittades
        </strong>

        <span>
            inom ${selectedRadius / 1000} km
        </span>
    `;


    if (matchingBusinesses.length > 0) {

        resultHTML +=
            '<ul class="analysis-result-list">';


        matchingBusinesses.forEach(
            function (item) {

                const props =
                    item.feature.properties;


                let distanceText;


                if (item.distance >= 1000) {

                    distanceText =
                        (
                            item.distance / 1000
                        ).toFixed(2)
                        + " km";

                } else {

                    distanceText =
                        item.distance.toFixed(0)
                        + " m";

                }


                resultHTML += `
                    <li
                        class="analysis-result-item"
                        data-business-name="${props.name}">

                        <strong>
                            ${props.name}
                        </strong>

                        <span>
                            ${distanceText}
                        </span>

                    </li>
                `;

            }
        );


        resultHTML += "</ul>";

    }


    radiusAnalysisInfo.innerHTML =
        resultHTML;


    // ==========================================
    // CLICKABLE RESULTS
    // ==========================================

    const resultItems =
        radiusAnalysisInfo.querySelectorAll(
            ".analysis-result-item"
        );


    resultItems.forEach(
        function (item) {

            item.addEventListener(
                "click",
                function () {

                    const businessName =
                        this.dataset.businessName;


                    businessLayer.eachLayer(
                        function (layer) {

                            if (
                                layer.feature &&
                                layer.feature.properties.name ===
                                businessName
                            ) {

                                const latlng =
                                    layer.getLatLng();


                                map.setView(
                                    latlng,
                                    17
                                );


                                highlightBusinessMarker(
                                    layer
                                );


                                layer.openPopup();

                            }

                        }
                    );

                }
            );

        }
    );


    // Reset button label
    radiusAnalysisButton.textContent =
        "⭕ Starta närhetsanalys";


    // Zoom to radius
    map.fitBounds(
        analysisCircle.getBounds(),
        {
            padding: [25, 25]
        }
    );

});
