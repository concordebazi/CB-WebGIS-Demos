
/* ==========================================
   GEORISK AI — INTERACTIVE GIS MAP
   CB Web & GIS
========================================== */

// Initialize map centered on Linköping
const map = L.map("map", {
    center: [58.4100, 15.6200],
    zoom: 15,
    zoomControl: true
});
// ==========================================
// STÅNGÅN — PRELIMINARY RIVER CENTRELINE
// ==========================================

const stanganRiverLayer = L.geoJSON(null, {
    style: {
        color: "#00e5ff",
        weight: 5,
        opacity: 0.95,
        dashArray: "8, 6"
    },

    onEachFeature: function (feature, layer) {
        layer.bindPopup(
            "<strong>Stångån</strong>" +
            "<br>Preliminär mittlinje" +
            "<br>Illustrativ geometri"
        );
    }
});

fetch("backend/stangan_river.geojson")
    .then(response => {
        if (!response.ok) {
            throw new Error("Could not load Stångån GeoJSON");
        }
        return response.json();
    })
    .then(data => {
        stanganRiverLayer.addData(data);
        

        console.log("Stångån river centreline loaded");
    })
    .catch(error => {
        console.error("Stångån GeoJSON error:", error);
    });
// OpenStreetMap base layer
const streets = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19
    }
);

// Satellite base layer
const satellite = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/" +
    "World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
        attribution: "Imagery &copy; Esri",
        maxZoom: 19
    }
);

// Display satellite imagery by default
satellite.addTo(map);

// ==========================================
// EXPANDED TERRAIN BOUNDS — LINKÖPING / STÅNGÅN
// ==========================================

const terrainBounds = [
    [58.40487152, 15.61499142], // Southwest
    [58.41812297, 15.64000533]  // Northeast
];

// Real Lantmäteriet terrain elevation overlay
const terrainOverlay = L.imageOverlay(
    "images/linkoping_overlay.png",
    terrainBounds,
    {
        opacity: 0.65,
        interactive: false,
        attribution: "Elevation data: Lantmäteriet"
    }
).addTo(map);
// ==========================================
// REAL TERRAIN SLOPE OVERLAY
// Lantmäteriet elevation data
// ==========================================

const slopeOverlay = L.imageOverlay(
    "images/linkoping_slope_overlay.png",
    terrainBounds,
    {
        opacity: 0.65,
        interactive: false,
        attribution: "Slope derived from Lantmäteriet elevation data"
    }
);
// ==========================================
// TERRAIN DEPRESSIONS — INDICATIVE LAYER
// Derived from Lantmäteriet elevation data
// ==========================================

const depressionOverlay = L.imageOverlay(
    "images/linkoping_depressions_overlay.png",
    terrainBounds,
    {
        opacity: 0.85,
        interactive: false,
        attribution: "Terrain conditioning: Lantmäteriet elevation data"
    }
);
// ==========================================
// STÅNGÅN — ILLUSTRATIVE +1.0 M SCENARIO
// ==========================================

const stanganScenarioLayer = L.imageOverlay(
    "images/stangan_scenario_1m.png",
    terrainBounds,
    {
        opacity: 0.75,
        interactive: false,
        attribution: "Illustrative terrain connectivity — CB Web & GIS"
    }
);
// ==========================================
// GEORISK AI — REAL LOCAL LOW POINTS
// ==========================================

const lowPointsLayer = L.geoJSON(null, {
    pointToLayer: function (feature, latlng) {
        return L.circleMarker(latlng, {
            radius: 3,
            color: "#ffffff",
            weight: 1,
            fillColor: "#00bfff",
            fillOpacity: 0.9
        });
    },

    onEachFeature: function (feature, layer) {
        layer.bindPopup(`
            <strong>Lokalt lågpunktspixel</strong><br>
            Markhöjd: ${feature.properties.elevation_m} m<br>
            Källa: Lantmäteriet<br>
            <small>Inte en verifierad översvämningsrisk.</small>
        `);
    }
});

// Load the real GIS points
fetch("low_points.geojson")
    .then(response => {
        if (!response.ok) {
            throw new Error("Could not load low_points.geojson");
        }
        return response.json();
    })
    .then(data => {
        lowPointsLayer.addData(data);
        console.log("Low-point pixels loaded:", data.features.length);
    })
    .catch(error => console.error(error));

// Layer selector
// ==========================================

/* ==========================================
   SIDEBAR — STÅNGÅN FLOOD SCENARIO
========================================== */

const floodCheckbox =
    document.getElementById("layer-flood");

if (floodCheckbox) {

    // Match checkbox to actual map visibility
    floodCheckbox.checked =
        map.hasLayer(stanganScenarioLayer);

    floodCheckbox.addEventListener("change", function () {

        if (this.checked) {
            map.addLayer(stanganScenarioLayer);
        } else {
            map.removeLayer(stanganScenarioLayer);
        }

        updateMapLegend();
    });

    // Keep checkbox synchronized with Leaflet layer control
    map.on("overlayadd overlayremove", function () {

        floodCheckbox.checked =
            map.hasLayer(stanganScenarioLayer);

    });

}

// SIDEBAR — TERRAIN DEPRESSIONS
// ==========================================

const depressionCheckbox =
    document.getElementById("layer-depressions");

if (depressionCheckbox) {

    depressionCheckbox.addEventListener("change", function () {

        if (this.checked) {
            map.addLayer(depressionOverlay);
        } else {
            map.removeLayer(depressionOverlay);
        }

    });

    map.on("overlayadd overlayremove", function () {
        depressionCheckbox.checked =
            map.hasLayer(depressionOverlay);
    });

}
// ==========================================
// SIDEBAR — LOCAL TERRAIN LOW POINTS
// ==========================================

const lowPointsCheckbox =
    document.getElementById("layer-lowpoints");

if (lowPointsCheckbox) {

    lowPointsCheckbox.addEventListener("change", function () {

        if (this.checked) {
            map.addLayer(lowPointsLayer);
        } else {
            map.removeLayer(lowPointsLayer);
        }

    });

    map.on("overlayadd overlayremove", function () {
        lowPointsCheckbox.checked =
            map.hasLayer(lowPointsLayer);
    });

}
L.control.layers(
    {
        "Satellite": satellite,
        "Street Map": streets
    },
    {
        "Terrain Elevation": terrainOverlay,
        "Terrain Slope": slopeOverlay,
        "Terrängsänkor (indikativa)": depressionOverlay,
        "Stångån – Vattennivå +1.0 m (demo)": stanganScenarioLayer
    },
    {
        collapsed: false
    }
).addTo(map);

// ==========================================
// DYNAMIC TERRAIN MAP LEGEND
// ==========================================

const mapLegend = document.getElementById("map-legend");

function updateMapLegend() {

    if (!mapLegend) return;
    if (map.hasLayer(stanganScenarioLayer)) {

    const level = Number(
    document.getElementById("water-level")?.value ?? 1
);

const scenarioElevation = 36.60 + level;

const color = {
    0: "#00cfff",
    0.5: "#1688ff",
    1: "#00b5a8",
    1.5: "#e9c44a",
    2: "#ff982e",
    2.5: "#f05b36",
    3: "#e5364e"
}[level] || "#00b5a8";

mapLegend.innerHTML = `
    <h3>Stångån – Vattennivå +${level.toFixed(1)} m</h3>

    <div>
        <span style="
            display:inline-block;
            width:13px;
            height:13px;
            background:${color};
            border-radius:3px;
            margin-right:7px;
        "></span>
        Terräng med beräknad anslutning till Stångån
    </div>

    <small>
        Illustrativt scenario baserat på höjddata.
        Scenarionivå:
        ${scenarioElevation.toFixed(2).replace(".", ",")} m
        (RH 2000).
        DEM-baserad referens, inte uppmätt vattennivå.
        Inte en verifierad översvämningskartering.
    </small>
`;
    return;
}

    if (map.hasLayer(depressionOverlay)) {

        mapLegend.innerHTML = `
            <h3>Terrängsänkor</h3>
            <div><i class="legend-dot low"></i> Liten höjdjustering</div>
            <div><i class="legend-dot medium"></i> Måttlig höjdjustering</div>
            <div><i class="legend-dot high"></i> Större höjdjustering</div>
            <small>
                Gul → orange → röd (0,01–4 m).
                Terrängkonditionering, inte översvämningsdjup.
            </small>
        `;

    } else if (map.hasLayer(slopeOverlay)) {

        mapLegend.innerHTML = `
            <h3>Marklutning</h3>
            <div><i class="legend-dot low"></i> Flack terräng</div>
            <div><i class="legend-dot medium"></i> Måttlig lutning</div>
            <div><i class="legend-dot high"></i> Brant terräng</div>
            <small>Grön → gul → röd (0–30°+)</small>
        `;

    } else if (map.hasLayer(terrainOverlay)) {

        mapLegend.innerHTML = `
            <h3>Markhöjd</h3>
            <div>Färgskala för höjd över RH 2000</div>
            <small>Färgerna visar relativa höjdskillnader.</small>
        `;

    } else if (map.hasLayer(lowPointsLayer)) {

        mapLegend.innerHTML = `
            <h3>Lokala lågpunkter</h3>
            <div>🔵 Lokalt höjdminimum</div>
            <small>
                Terrängbaserade kandidatpunkter.
                Inte verifierade översvämningsområden.
            </small>
        `;

    } else {

        mapLegend.innerHTML = `
            <h3>Kartlager</h3>
            <div>Välj ett terränglager för att visa förklaringen.</div>
        `;

    }
}
// Update when layers are switched
map.on("overlayadd overlayremove", updateMapLegend);
// ==========================================
// SHOW ONLY ONE TERRAIN OVERLAY AT A TIME
// ==========================================

const terrainLayers = [
    terrainOverlay,
    slopeOverlay,
    depressionOverlay
];

map.on("overlayadd", function (event) {

    if (!terrainLayers.includes(event.layer)) {
        return;
    }

    terrainLayers.forEach(function (layer) {

        if (layer !== event.layer && map.hasLayer(layer)) {
            map.removeLayer(layer);
        }

    });

});
// Set the correct legend when the map loads
updateMapLegend();
// Fit map to our study area
map.fitBounds(terrainBounds);

// Refresh map dimensions after layout loads
setTimeout(() => {
    map.invalidateSize();
}, 300);
/* ==========================================
   GEORISK AI — REAL ELEVATION ON MAP CLICK
========================================== */

// Marker showing the selected location
let elevationMarker = null;

// Listen for clicks on the map
map.on("click", async function (event) {

    const lat = event.latlng.lat;
    const lon = event.latlng.lng;
        // Show clicked coordinates for GIS verification
    console.log(
        "Selected map coordinates:",
        lat.toFixed(6),
        lon.toFixed(6)
    );

    // Remove previous marker
    if (elevationMarker) {
        map.removeLayer(elevationMarker);
    }

    // Add marker at clicked location
    elevationMarker = L.marker([lat, lon]).addTo(map);

    elevationMarker
        .bindPopup("Reading real elevation data...")
        .openPopup();

    try {

        const selectedWaterLevel = Number(
    document.getElementById("water-level")?.value ?? 1
);

const url =
    `http://127.0.0.1:8000/elevation?lat=${lat}&lon=${lon}&water_level=${selectedWaterLevel}`;

        const response = await fetch(url);

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.detail || "Elevation data unavailable"
            );
        }
// ==========================================
// UPDATE RIGHT-HAND GIS ANALYSIS PANEL
// ==========================================

// Display real elevation
const terrainScore = document.getElementById("terrain-score");

if (terrainScore) {
    terrainScore.textContent =
        `${Number(data.elevation_m).toFixed(2)} m`;
}

// Display real terrain slope
const slopeScore = document.getElementById("slope-score");

if (slopeScore) {
    slopeScore.textContent =
        data.slope_degrees != null
            ? `${Number(data.slope_degrees).toFixed(2)}°`
            : "Ej tillgänglig";
}
// Update GIS recommendations for the clicked location
updateMapClickAnalysis(data);
        // Display elevation and slope in the map popup
        elevationMarker.setPopupContent(`
            <div style="min-width:190px">
                <strong>GeoRisk AI</strong>
                <hr>
                <strong>Markhöjd:</strong>
                ${Number(data.elevation_m).toFixed(2)} m
                <br>
                <strong>Marklutning:</strong>
                ${data.slope_degrees != null
                    ? Number(data.slope_degrees).toFixed(2) + "°"
                    : "Ej tillgänglig"}
                <br>
                <strong>Höjdsystem:</strong>
                ${data.vertical_reference}
                <br>
                <strong>Källa:</strong>
                ${data.source}
            </div>
        `);

    } catch (error) {

    console.error("GeoRisk AI map analysis error:", error);

    elevationMarker.setPopupContent(`
        <strong>GeoRisk AI</strong><br>
        Kunde inte läsa GIS-data.<br>
        ${String(error.message || error)}
    `);

}

});

function distanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const toRadians = degrees => degrees * Math.PI / 180;

    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) ** 2;

    return 2 * R * Math.asin(Math.sqrt(a));
}

function distanceToStangan(lat, lon) {

    let shortestDistance = Infinity;

    // Calculate distance to every river line segment
    stanganRiverLayer.eachLayer(function (layer) {

        if (!(layer instanceof L.Polyline)) return;

        const latlngs = layer.getLatLngs();

        function checkLine(points) {

            if (!points.length) return;

            // Handle nested line arrays
            if (Array.isArray(points[0])) {
                points.forEach(checkLine);
                return;
            }

            // Approximate local metres using equirectangular projection
            const latRadians = lat * Math.PI / 180;
            const metresPerDegree = Math.PI * 6371000 / 180;

            const project = point => ({
                x: (point.lng - lon) * metresPerDegree *
                   Math.cos(latRadians),
                y: (point.lat - lat) * metresPerDegree
            });

            for (let i = 0; i < points.length - 1; i++) {

                const a = project(points[i]);
                const b = project(points[i + 1]);

                const dx = b.x - a.x;
                const dy = b.y - a.y;

                const lengthSquared = dx * dx + dy * dy;

                const t = lengthSquared === 0
                    ? 0
                    : Math.max(0, Math.min(1,
                        -(a.x * dx + a.y * dy) / lengthSquared
                    ));

                const nearestX = a.x + t * dx;
                const nearestY = a.y + t * dy;

                const distance = Math.hypot(nearestX, nearestY);

                shortestDistance = Math.min(
                    shortestDistance,
                    distance
                );
            }
        }

        checkLine(latlngs);
    });

    return Number.isFinite(shortestDistance)
        ? shortestDistance
        : null;
}

// ==========================================
// GEORISK AI — TERRAIN CLASSIFICATION
// ==========================================

function classifyTerrain(slope) {

    if (slope == null || !Number.isFinite(Number(slope))) {
        return "Ej tillgänglig";
    }

    slope = Number(slope);

    if (slope < 5) {
        return "Flack terräng";
    }

    if (slope < 15) {
        return "Måttlig lutning";
    }

    return "Brant terräng";
}
// ==========================================
// GEORISK AI — UPDATE MAP CLICK ANALYSIS
// ==========================================

function updateMapClickAnalysis(data) {
    
    // ==========================================
    // GEORISK AI — STORE LATEST ANALYSIS
    // ==========================================

    window.latestGeoRiskAnalysis = data;

    const reportButton =
        document.getElementById("report-btn");

    if (reportButton) {
        reportButton.disabled = false;
    }

    // ==========================================
// STÅNGÅN — GIS SCENARIO INTERSECTION
// ==========================================

const floodScore = document.getElementById("flood-score");
const scenario = data.stangan_scenario;

    // ==========================================
    // VATTENDRAG — DISTANCE TO STÅNGÅN
    // ==========================================

    const waterDistance =
        document.getElementById("water-distance");

    if (waterDistance) {

        const lat = Number(data.latitude);
        const lon = Number(data.longitude);

        if (Number.isFinite(lat) && Number.isFinite(lon)) {

            const distance = distanceToStangan(lat, lon);

            waterDistance.textContent = distance !== null
                ? `${Math.round(distance)} m`
                : "Ej tillgänglig";

        } else {
            waterDistance.textContent = "Ej tillgänglig";
        }
    }

if (floodScore) {

    if (scenario?.within_scenario === true) {
        floodScore.textContent = "Inom scenarioområdet";

    } else if (scenario?.within_scenario === false) {
        floodScore.textContent = "Utanför scenarioområdet";

    } else {
        floodScore.textContent = "Ej analyserat";
    }
}
    const depressionScore =
        document.getElementById("depression-score");

    if (depressionScore) {
        depressionScore.textContent =
            data.depression_depth_m != null
                ? `${Number(data.depression_depth_m).toFixed(2)} m`
                : "Ej tillgänglig";
    }

    const terrainClass =
        classifyTerrain(data.slope_degrees);

    const terrainRecommendation =
        getTerrainRecommendation(data.slope_degrees);

    const depressionRecommendation =
        getDepressionRecommendation(data.depression_depth_m);

    const elevationText =
        Number(data.elevation_m).toFixed(2);

    const slopeText =
        data.slope_degrees != null
            ? `${Number(data.slope_degrees).toFixed(2)}°`
            : "Ej tillgänglig";

    const depressionText =
        data.depression_depth_m != null
            ? `${Number(data.depression_depth_m).toFixed(2)} m`
            : "Ej tillgänglig";

    document.getElementById("ai-insight").innerHTML = `
        <div class="analysis-location">
            <span>Vald kartpunkt</span>
            <strong>${terrainClass}</strong>
        </div>

        <div class="analysis-metrics">
            <div class="analysis-metric">
                <span>Markhöjd</span>
                <strong>${elevationText} m</strong>
            </div>

            <div class="analysis-metric">
                <span>Marklutning</span>
                <strong>${slopeText}</strong>
            </div>
        </div>

        <div class="analysis-recommendation">
            <div class="recommendation-title">
                <span>✦</span>
                <strong>GIS-analys & rekommendationer</strong>
            </div>

            <p><strong>Marklutning</strong></p>
            <p>${terrainRecommendation}</p>

            <p><strong>Terrängsänkning: ${depressionText}</strong></p>
            <p>${depressionRecommendation}</p>
        </div>

        <p class="analysis-disclaimer">
            Baserat på Lantmäteriets höjddata.
            Illustrativ terränganalys.
            Översvämningsrisk har ännu inte bedömts.
        </p>
    `;

    
    // ==========================================
    // SAMlad RISKINDIKATOR — GIS DEMO
    // ==========================================

    const indicators = [];

    // Terrain slope: illustrative steep-terrain indicator
    if (
        data.slope_degrees !== null &&
        data.slope_degrees !== undefined &&
        Number.isFinite(Number(data.slope_degrees))
    ) {
        indicators.push({
            name: "Brant terräng",
            triggered: Number(data.slope_degrees) >= 15
        });
    }

    // Terrain depression: illustrative local depression indicator
    if (
        data.depression_depth_m !== null &&
        data.depression_depth_m !== undefined &&
        Number.isFinite(Number(data.depression_depth_m))
    ) {
        indicators.push({
            name: "Terrängsänka",
            triggered: Number(data.depression_depth_m) >= 0.20
        });
    }

    // Stångån: illustrative terrain connectivity only
    const scenarioResult = data.stangan_scenario;

    if (typeof scenarioResult?.within_scenario === "boolean") {
        indicators.push({
            name: "Inom Stångån-scenario",
            triggered: scenarioResult.within_scenario
        });
    }

    const triggered = indicators.filter(
        item => item.triggered
    );

    const scoreElement = document.getElementById("risk-score");
    const labelElement = document.getElementById("risk-label");
    const explanationElement =
        document.getElementById("risk-explanation");

    if (scoreElement) {
        scoreElement.textContent = indicators.length
            ? `${triggered.length} / ${indicators.length}`
            : "--";
    }

    if (labelElement) {
        labelElement.textContent = indicators.length
            ? `${triggered.length} av ${indicators.length} GIS-screeningindikatorer uppfyllda`
            : "Otillräckliga analysdata";
    }

    if (explanationElement) {
        const details = indicators.map(item =>
            `${item.name}: ${item.triggered ? "Ja" : "Nej"}`
        );

        explanationElement.innerHTML =
    (details.length
        ? details.join(" · ")
        : "Inga indikatorer kunde beräknas.") +
    `<br><br>
    <strong>Datagrund:</strong> Terränghöjd och marklutning
    beräknas från Lantmäteriets höjddata.
    <br><br>
    <strong>Scenario:</strong> Stångåns vattennivåscenario
    bygger på illustrativ terränganslutning.
    <br><br>
    <strong>Observera:</strong> Indikatorerna är en
    GIS-screening, inte en verifierad
    översvämningsriskbedömning.`;
    }
}

// ==========================================
// GEORISK AI — TERRAIN RECOMMENDATIONS
// ==========================================

function getTerrainRecommendation(slope) {

    if (slope == null || !Number.isFinite(Number(slope))) {
        return "Ingen rekommendation kan ges utan giltiga lutningsdata.";
    }

    slope = Number(slope);

    if (slope < 5) {
        return "Terrängen är relativt flack. " +
               "Undersök lokal dagvattenavrinning och " +
               "eventuella lågpunkter där vatten kan samlas.";
    }

    if (slope < 15) {
        return "Terrängen har måttlig lutning. " +
               "Undersök avrinningsriktning och " +
               "eventuell risk för markerosion.";
    }

    return "Terrängen har kraftig lutning. " +
           "En mer detaljerad bedömning av " +
           "släntstabilitet och erosion kan vara lämplig.";
}
// ==========================================
// GEORISK AI — TERRAIN DEPRESSION INSIGHTS
// ==========================================

function getDepressionRecommendation(depth) {

    if (depth == null || !Number.isFinite(Number(depth))) {
        return "Ingen information om terrängsänkning finns tillgänglig.";
    }

    depth = Number(depth);

    if (depth < 0.01) {
        return "Ingen lokal terrängsänka identifierades vid den valda punkten. " +
               "Undersök även närliggande lågpunkter och dagvattenavrinning.";
    }

    if (depth < 0.20) {
        return "En mindre terrängsänka har identifierats. " +
               "Kontrollera om ytvatten kan samlas i området.";
    }

    if (depth < 1.0) {
        return "En tydlig terrängsänka har identifierats. " +
               "En mer detaljerad analys av avrinning och närliggande lågpunkter rekommenderas.";
    }

    return "En större terrängsänka har identifierats. " +
           "Undersök avrinningsvägar, dagvattenhantering och behovet av en detaljerad hydrologisk analys.";
}
// ==========================================
// GEORISK AI — ANALYSIS LOCATIONS
// ==========================================

// Demonstration locations inside our real
// Lantmäteriet elevation study area.
// These are sample points, not property boundaries.

const analysisLocations = {
    central: {
        name: "Linköping Centrum",
        lat: 58.4100,
        lon: 15.6200
    },
    river: {
        name: "Stångån – Nära vattendrag",
        lat: 58.4110,
        lon: 15.6220
    },
    south: {
        name: "Linköping Södra",
        lat: 58.4080,
        lon: 15.6190
    }
};

/* ==========================================
   GEORISK AI — DEMO ANALYSIS AREAS
========================================== */

const propertyAreasLayer = L.layerGroup();

Object.values(analysisLocations).forEach(function (location) {

    const area = L.circle(
        [location.lat, location.lon],
        {
            radius: 120,
            color: "#66ff88",
            weight: 2,
            fillColor: "#31c977",
            fillOpacity: 0.12,
            dashArray: "6, 5"
        }
    );

    area.bindPopup(`
        <strong>${location.name}</strong><br>
        Illustrativt analysområde<br>
        Radie: 120 meter<br>
        <small>Inte en fastighetsgräns.</small>
    `);

    propertyAreasLayer.addLayer(area);
});

// Connect the sidebar checkbox
const propertiesCheckbox =
    document.getElementById("layer-properties");

if (propertiesCheckbox) {

    if (propertiesCheckbox.checked) {
        propertyAreasLayer.addTo(map);
    }

    propertiesCheckbox.addEventListener("change", function () {

        if (this.checked) {
            map.addLayer(propertyAreasLayer);
        } else {
            map.removeLayer(propertyAreasLayer);
        }

    });

}

/* ==========================================
   GEORISK AI — ILLUSTRATIVE SCREENING ZONES
========================================== */

const riskZonesLayer = L.layerGroup();




const demoRiskZones = [
    {
        location: {
            lat: 58.4165,
            lon: 15.6180
        },
        label: "Linköping – Norra"
    },
    {
        location: {
            lat: 58.4135,
            lon: 15.6350
        },
        label: "Stångån – Östra"
    },
    {
        location: {
            lat: 58.4080,
            lon: 15.6190
        },
        label: "Linköping – Södra"
    },
    {
        location: {
            lat: 58.4100,
            lon: 15.6280
        },
        label: "Stångån – Centrala"
    },
    {
        location: {
            lat: 58.4060,
            lon: 15.6360
        },
        label: "Linköping – Sydöstra"
    }
];





/* ==========================================
   DATA-DRIVEN GIS SCREENING ZONES
========================================== */
window.geoRiskScreeningRequestId = 0;
async function updateRiskZones() {

    // Count screening results from the five analysis locations
    const screeningCounts = {
        green: 0,
        yellow: 0,
        red: 0,
        gray: 0
    };

    // Prevent older requests from overwriting newer results
    const requestId = ++window.geoRiskScreeningRequestId;

    const updateScreeningSummary = () => {
        const countIds = {
            green: "screening-green-count",
            yellow: "screening-yellow-count",
            red: "screening-red-count",
            gray: "screening-gray-count"
        };

        Object.entries(countIds).forEach(([category, id]) => {
            const element = document.getElementById(id);

            if (element) {
                element.textContent = screeningCounts[category];
            }
        });
    };

    riskZonesLayer.clearLayers();

    const selectedLevel = Number(
        document.getElementById("water-level")?.value ?? 1
    );

    for (const zone of demoRiskZones) {

        const { lat, lon } = zone.location;

        try {

            const url =
                `http://127.0.0.1:8000/elevation?lat=${lat}&lon=${lon}&water_level=${selectedLevel}`;

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error("GIS-data kunde inte hämtas");
            }

            const data = await response.json();

            const indicators = [];

            if (
                data.slope_degrees != null &&
                Number.isFinite(Number(data.slope_degrees))
            ) {
                indicators.push({
                    name: "Brant terräng",
                    triggered: Number(data.slope_degrees) >= 15
                });
            }

            if (
                data.depression_depth_m != null &&
                Number.isFinite(Number(data.depression_depth_m))
            ) {
                indicators.push({
                    name: "Terrängsänka",
                    triggered: Number(data.depression_depth_m) >= 0.20
                });
            }

            if (
                typeof data.stangan_scenario?.within_scenario === "boolean"
            ) {
                indicators.push({
                    name: "Stångån-scenario",
                    triggered: data.stangan_scenario.within_scenario
                });
            }

            const triggered = indicators.filter(
                item => item.triggered
            ).length;

            const total = indicators.length;

            const color = total === 0
                ? "#94a3b8"
                : triggered >= 2
                    ? "#ef4444"
                    : triggered === 1
                        ? "#f59e0b"
                        : "#22c55e";

            const category = total === 0
                ? "Otillräckliga data"
                : triggered >= 2
                    ? "Flera screeningindikatorer"
                    : triggered === 1
                        ? "En screeningindikator"
                        : "Inga indikatorer uppfyllda";



            if (requestId !== window.geoRiskScreeningRequestId) {
                return;
            }

            if (total === 0) {
                screeningCounts.gray++;
            } else if (triggered >= 2) {
                screeningCounts.red++;
            } else if (triggered === 1) {
                screeningCounts.yellow++;
            } else {
                screeningCounts.green++;
            }
            updateScreeningSummary();
            
const formatIndicator = (name, value) => {
    if (value === null) {
        return `${name}: Data saknas`;
    }

    return `${name}: ${value ? "Ja" : "Nej"}`;
};

const slopeValue =
    data.slope_degrees != null &&
    Number.isFinite(Number(data.slope_degrees))
        ? Number(data.slope_degrees) >= 15
        : null;

const depressionValue =
    data.depression_depth_m != null &&
    Number.isFinite(Number(data.depression_depth_m))
        ? Number(data.depression_depth_m) >= 0.20
        : null;

const scenarioValue =
    typeof data.stangan_scenario?.within_scenario === "boolean"
        ? data.stangan_scenario.within_scenario
        : null;

const details = [
    formatIndicator("Brant terräng", slopeValue),
    formatIndicator("Terrängsänkning", depressionValue),
    formatIndicator("Stångån-scenario", scenarioValue)
].join("<br>");


            const circle = L.circle([lat, lon], {
                radius: 85,
                color: color,
                weight: 3,
                fillColor: color,
                fillOpacity: 0.18,
                dashArray: "5, 5"
            });

            circle.bindPopup(`
                <strong>${zone.label}</strong><br>
                <strong>${category}</strong><br><br>
                Uppfyllda indikatorer: ${triggered} / ${total}<br>
                Markhöjd: ${Number(data.elevation_m).toFixed(2)} m<br>
                ${details}<br><br>
                <small>
                    Illustrativ GIS-screening vid en punkt.
                    Cirkeln visar inte en beräknad riskutbredning.
                </small>
            `);

            riskZonesLayer.addLayer(circle);

        } catch (error) {

            console.error(
                "Screening zone analysis failed:",
                zone.label,
                error
            );
            if (requestId !== window.geoRiskScreeningRequestId) {
                return;
            }

            screeningCounts.gray++;
            updateScreeningSummary();
            // Show unavailable data without inventing a risk result
            const circle = L.circle([lat, lon], {
                radius: 85,
                color: "#94a3b8",
                weight: 3,
                fillOpacity: 0.08,
                dashArray: "5, 5"
            });

            circle.bindPopup(`
                <strong>${zone.label}</strong><br>
                GIS-data kunde inte hämtas.<br>
                <small>Ingen screeningklass har tilldelats.</small>
            `);

                       riskZonesLayer.addLayer(circle);
        }
    }

    // Update the four GIS screening summary cards
    if (requestId === window.geoRiskScreeningRequestId) {
    console.log("GIS screening completed:", screeningCounts);
    updateScreeningSummary();
}
}

// Sidebar checkbox

// Sidebar checkbox
const riskCheckbox =
    document.getElementById("layer-risk");
const screeningLegend =
    document.getElementById("screening-legend");
if (riskCheckbox) {

    riskCheckbox.checked = false;
if (screeningLegend) {
    screeningLegend.hidden = !riskCheckbox.checked;
}
    riskCheckbox.addEventListener("change", function () {

        if (this.checked) {
    map.addLayer(riskZonesLayer);
    updateRiskZones();
} else {
    map.removeLayer(riskZonesLayer);
}
if (screeningLegend) {
    screeningLegend.hidden = !this.checked;
}
    });

}

const propertySelect = document.getElementById("property-select");
const analyzeButton = document.getElementById("analyze-btn");
// ==========================================
// GEORISK AI — RUN REAL GIS ANALYSIS
// ==========================================

analyzeButton.addEventListener("click", async function () {

    const selected = propertySelect.value;
    const location = analysisLocations[selected];

    if (!location) {
        alert("Välj först ett analysområde.");
        return;
    }

    analyzeButton.disabled = true;
    analyzeButton.querySelector("span").textContent = "Analyserar...";

    try {
        const selectedWaterLevel = Number(
    document.getElementById("water-level")?.value ?? 1
);

const url =
    `http://127.0.0.1:8000/elevation?lat=${location.lat}&lon=${location.lon}&water_level=${selectedWaterLevel}`;

        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "GIS-analysen misslyckades.");
        }

        // Display real elevation
        document.getElementById("terrain-score").textContent =
            `${Number(data.elevation_m).toFixed(2)} m`;

        // Display real slope
        document.getElementById("slope-score").textContent =
            data.slope_degrees != null
                ? `${Number(data.slope_degrees).toFixed(2)}°`
                : "Ej tillgänglig";

    // ==========================================
    // EXPONERING — ILLUSTRATIVE STÅNGÅN SCENARIO
    // ==========================================
const scenario = data.stangan_scenario;
    const exposureScore =
        document.getElementById("exposure-score");

    if (exposureScore) {

        if (scenario?.within_scenario === true) {
            exposureScore.textContent = "Inom scenarioområdet";

        } else if (scenario?.within_scenario === false) {
            exposureScore.textContent = "Utanför scenarioområdet";

        } else {
            exposureScore.textContent = "Ej tillgänglig";
        }
    }

                // ==========================================
// REAL TERRAIN DEPRESSION MEASUREMENT
// ==========================================

const depressionScore = document.getElementById("depression-score");

if (depressionScore) {
    depressionScore.textContent =
        data.depression_depth_m != null
            ? `${Number(data.depression_depth_m).toFixed(2)} m`
            : "Ej tillgänglig";
}
        // Show selected location on map
        map.setView([location.lat, location.lon], 17);

        if (elevationMarker) {
            map.removeLayer(elevationMarker);
        }

        elevationMarker = L.marker([
            location.lat,
            location.lon
        ]).addTo(map);

        
elevationMarker.bindPopup(`
    <strong>${location.name}</strong>
    <hr>
    Markhöjd: ${Number(data.elevation_m).toFixed(2)} m<br>
    Marklutning: ${
        data.slope_degrees != null
            ? Number(data.slope_degrees).toFixed(2) + "°"
            : "Ej tillgänglig"
    }<br>
    Terrängsänkning: ${
        data.depression_depth_m != null
            ? Number(data.depression_depth_m).toFixed(2) + " m"
            : "Ej tillgänglig"
    }<br>
    Källa: Lantmäteriet
`).openPopup();


                // Update Risköversikt using the existing GIS analysis function
        updateMapClickAnalysis(data);

    } catch (error) {

        console.error("GeoRisk AI analysis error:", error);

        alert(
            "Kunde inte genomföra analysen: " +
            error.message
        );

    } finally {

        analyzeButton.disabled = false;

        analyzeButton.querySelector("span").textContent =
            "Starta GIS-analys";
    }

});
// ==========================================
// GEORISK AI — SCENARIO SLIDER
// ==========================================

const waterLevelSlider =
    document.getElementById("water-level");

const waterLevelValue =
    document.getElementById("water-level-value");

if (waterLevelSlider && waterLevelValue) {

    function updateWaterLevelDisplay() {

    const level = Number(waterLevelSlider.value);

    // Update displayed water level
    waterLevelValue.textContent =
        `+${level.toFixed(1)} m`;

    // Match the generated scenario filenames
    const levelName = String(level).replace(".", "_");

    const imagePath =
        `images/stangan_scenario_${levelName}m.png`;

    // Update the existing Leaflet image overlay
stanganScenarioLayer.setUrl(imagePath);

// Update the map legend when slider moves
updateMapLegend();
    // ==========================================
// ==========================================
// STÅNGÅN — MATCH MAP AND LEGEND COLORS
// ==========================================

// ==========================================
// STÅNGÅN — ORIGINAL SCENARIO IMAGE COLORS
// ==========================================

const overlayImage = stanganScenarioLayer.getElement();

if (overlayImage) {
    // Use exact colors generated by Python
    overlayImage.style.filter = "none";
}
// ==========================================
// UPDATE STÅNGÅN SCENARIO LEGEND
// ==========================================

const scenarioLegendColors = {
    0:   "#00cfff",
    0.5: "#1688ff",
    1:   "#00b5a8",
    1.5: "#e9c44a",
    2:   "#ff982e",
    2.5: "#f05b36",
    3:   "#e5364e"
};

const scenarioLevelLabel =
    document.getElementById("scenario-level-label");

const scenarioColorIndicator =
    document.getElementById("scenario-color-indicator");

if (scenarioLevelLabel) {
    scenarioLevelLabel.textContent =
        `+${level.toFixed(1)} m`;
}

if (scenarioColorIndicator) {
    scenarioColorIndicator.style.backgroundColor =
        scenarioLegendColors[level] || "#00cfff";
}
}

    waterLevelSlider.addEventListener("input", () => {

    // Update the map, colors and scenario labels
    updateWaterLevelDisplay();

});

waterLevelSlider.addEventListener("change", () => {

    // Recalculate the selected location when the slider is released
    const selectedLocation = propertySelect?.value;

    if (selectedLocation && analysisLocations[selectedLocation]) {
        analyzeButton.click();
    }

    // Refresh GIS screening zones for the selected water level
    if (
        typeof riskZonesLayer !== "undefined" &&
        map.hasLayer(riskZonesLayer)
    ) {
        updateRiskZones();
    }

});

    updateWaterLevelDisplay();
}

/* ==========================================
   GEORISK AI — REPORT GIS OVERLAYS
========================================== */

async function addReportGISOverlays(canvas) {

    const ctx = canvas.getContext("2d");

    async function drawOverlay(layer) {

        // Include only layers currently visible on the map
        if (!map.hasLayer(layer)) return;

        const image = layer.getElement();

        if (!image) return;

        // Wait until the overlay image is loaded
        if (!image.complete || image.naturalWidth === 0) {
            await new Promise((resolve, reject) => {
                image.addEventListener("load", resolve, { once: true });
                image.addEventListener("error", reject, { once: true });
            });
        }

        const bounds = layer.getBounds();

        const northWest = map.latLngToContainerPoint(
            bounds.getNorthWest()
        );

        const southEast = map.latLngToContainerPoint(
            bounds.getSouthEast()
        );

        const width = southEast.x - northWest.x;
        const height = southEast.y - northWest.y;

        ctx.save();

        ctx.globalAlpha = layer.options.opacity ?? 1;

        ctx.drawImage(
            image,
            northWest.x,
            northWest.y,
            width,
            height
        );

        ctx.restore();
    }

    // Terrain elevation
    await drawOverlay(terrainOverlay);

    // Selected Stångån scenario
    await drawOverlay(stanganScenarioLayer);

    return canvas;
}

/* ==========================================
   GEORISK AI — GIS REPORT GENERATOR
========================================== */

document.getElementById("report-btn")?.addEventListener("click", function () {
    // Capture the current Leaflet map for the report
    const reportMap = map;

    if (typeof leafletImage !== "function") {
        alert("Kartbiblioteket för skärmbilder kunde inte laddas.");
        return;
    }

    leafletImage(reportMap, async function (error, canvas) {

        if (error || !canvas) {
            console.error("Map snapshot error:", error);
            alert("Kunde inte skapa kartbilden. Kontrollera kartlagren.");
            return;
        }

try {
    await addReportGISOverlays(canvas);
    console.log("GeoRisk AI report overlays added");
} catch (overlayError) {
    console.error("GIS overlay capture error:", overlayError);
    alert("Kunde inte lägga till GIS-lagren i rapportkartan.");
    return;
}

        
const mapSnapshot = canvas.toDataURL("image/png");

console.log("GeoRisk AI map snapshot created", mapSnapshot.length);
window.geoRiskMapSnapshot = mapSnapshot;

    
    const data = window.latestGeoRiskAnalysis;

    if (!data) {
        alert("Genomför först en GIS-analys.");
        return;
    }

    const formatNumber = (value, decimals = 2) =>
        value != null && Number.isFinite(Number(value))
            ? Number(value).toFixed(decimals)
            : "Ej tillgänglig";

    const scenario = data.stangan_scenario;

    const scenarioText =
        scenario?.within_scenario === true
            ? "Inom scenarioområdet"
            : scenario?.within_scenario === false
                ? "Utanför scenarioområdet"
                : "Ej analyserat";

    const waterDistance = distanceToStangan(
        Number(data.latitude),
        Number(data.longitude)
    );

    const indicators = [
        data.slope_degrees != null
            ? Number(data.slope_degrees) >= 15
            : null,

        data.depression_depth_m != null
            ? Number(data.depression_depth_m) >= 0.20
            : null,

        typeof scenario?.within_scenario === "boolean"
            ? scenario.within_scenario
            : null
    ].filter(value => value !== null);

    const triggered = indicators.filter(Boolean).length;

    const reportWindow = window.open("", "_blank");

    if (!reportWindow) {
        alert("Tillåt popup-fönster för att generera rapporten.");
        return;
    }

    reportWindow.document.write(`
        <!DOCTYPE html>
        <html lang="sv">
        <head>
            <meta charset="UTF-8">
            <title>GeoRisk AI – GIS-analysrapport</title>

            <style>
                body {
                    font-family: Arial, sans-serif;
                    max-width: 800px;
                    margin: 40px auto;
                    padding: 20px;
                    color: #17251e;
                    line-height: 1.6;
                }

                h1 { color: #176a45; }
                h2 {
                    border-bottom: 2px solid #43b977;
                    padding-bottom: 8px;
                    margin-top: 30px;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                }

                td {
                    padding: 12px;
                    border-bottom: 1px solid #ddd;
                }

                td:first-child { font-weight: bold; }

                .notice {
                    background: #f0f5f1;
                    padding: 15px;
                    border-left: 4px solid #43b977;
                    margin-top: 25px;
                }

                .print-button {
                    background: #176a45;
                    color: white;
                    border: none;
                    padding: 12px 22px;
                    cursor: pointer;
                    border-radius: 6px;
                }

                @media print {
                    .print-button { display: none; }
                    body { margin: 0; }
                }
            
.report-header {
    background: linear-gradient(
        135deg,
        #061e17 0%,
        #0b3d2b 100%
    );
    color: white;
    border-radius: 14px;
    padding: 32px;
    margin-bottom: 32px;
}

.report-brand {
    display: flex;
    align-items: center;
    gap: 12px;
}

.report-brand-icon {
    background: #6bff65;
    color: #062016;
    width: 46px;
    height: 46px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 26px;
    font-weight: 800;
}

.report-brand-name {
    font-size: 23px;
    font-weight: 800;
}

.report-brand-name span {
    color: #6bff65;
}

.report-brand-caption {
    font-size: 10px;
    letter-spacing: 2px;
    color: #b7d5c5;
}

.report-header-content {
    margin-top: 35px;
}

.report-eyebrow {
    color: #6bff65;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 2px;
}

.report-header-content h1 {
    color: white;
    font-size: 35px;
    margin: 12px 0;
}

.report-header-content p {
    color: #d2e7da;
    margin: 0;
}

.report-header-footer {
    display: flex;
    justify-content: space-between;
    border-top: 1px solid #37604b;
    padding-top: 16px;
    margin-top: 30px;
    font-size: 12px;
    color: #c8e1d2;
}

@media print {
    .report-header {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
        break-inside: avoid;
    }
}

/* Professional GIS report table */

.report-metrics-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 18px;
    margin-bottom: 26px;
    font-size: 13px;
}

.report-metrics-table th {
    background: #e8f4ed;
    color: #124c35;
    padding: 14px 12px;
    text-align: left;
    font-weight: 700;
}

.report-metrics-table td {
    padding: 14px 12px;
    border-bottom: 1px solid #dce8df;
    vertical-align: middle;
}

.report-metrics-table tbody tr:nth-child(even) {
    background: #f7faf8;
}

.report-metrics-table td:nth-child(2) {
    color: #11643d;
    font-size: 15px;
}

@media print {
    .report-metrics-table thead {
        display: table-header-group;
    }

    .report-metrics-table tr {
        break-inside: avoid;
    }
}

/* GIS screening summary */

.screening-card {
    display: flex;
    align-items: center;
    gap: 24px;
    background: #eef7f1;
    border: 1px solid #cce8d5;
    border-radius: 12px;
    padding: 24px;
    margin: 20px 0;
}

.screening-number {
    flex-shrink: 0;
    background: #0d5137;
    color: white;
    padding: 20px;
    border-radius: 12px;
    font-size: 30px;
    font-weight: 800;
    white-space: nowrap;
}

.screening-content strong {
    color: #104b35;
    font-size: 17px;
}

.screening-content p {
    margin: 8px 0;
}

.screening-content small {
    color: #536a5c;
    line-height: 1.6;
}

@media print {
    .screening-card {
        break-inside: avoid;
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
    }
}

/* Professional recommendation cards */

.recommendation-card {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    padding: 18px 20px;
    margin: 12px 0;
    border: 1px solid #dce9e0;
    border-radius: 10px;
    background: #f7faf8;
}

.recommendation-icon {
    flex-shrink: 0;
    width: 38px;
    height: 38px;
    border-radius: 10px;
    background: #176a45;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 800;
}

.recommendation-card strong {
    display: block;
    color: #124c35;
    margin-bottom: 6px;
}

.recommendation-card p {
    margin: 0;
    font-size: 13px;
    line-height: 1.6;
    color: #344c3d;
}

@media print {
    .recommendation-card {
        break-inside: avoid;
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
    }
}

/* ==========================================
   GEORISK AI — A4 REPORT LAYOUT
========================================== */

@page {
    size: A4 portrait;
    margin: 16mm 15mm 20mm 15mm;
}

@media print {

    html, body {
        width: auto;
        max-width: none;
        margin: 0;
        padding: 0;
        background: white;
        font-size: 11pt;
        line-height: 1.45;
    }

    h1, h2, h3 {
        break-after: avoid;
        page-break-after: avoid;
    }

    .report-header,
    .screening-card,
    .recommendation-card,
    .notice {
        break-inside: avoid;
        page-break-inside: avoid;
    }

    .report-metrics-table tr {
        break-inside: avoid;
        page-break-inside: avoid;
    }

    .report-map {
        break-inside: avoid;
        page-break-inside: avoid;
    }

    .report-map img {
        display: block;
        width: 100%;
        max-height: 115mm;
        object-fit: contain;
    }

    .print-button {
        display: none;
    }

    .report-header,
    .screening-number,
    .recommendation-icon,
    .report-metrics-table th {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
}

/* Report footer */

.report-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
    border-top: 2px solid #176a45;
    margin-top: 36px;
    padding-top: 16px;
    font-size: 11px;
    color: #536a5c;
}

.report-footer strong,
.report-footer span {
    display: block;
}

.report-footer strong {
    color: #124c35;
    font-size: 13px;
}

.report-footer-right {
    text-align: right;
}

@media print {
    .report-footer {
        break-inside: avoid;
    }
}

/* ==========================================
   GEORISK AI — COMPACT MAP ON PAGE 1
========================================== */

@media print {

    /* Reduce the map footprint */
    .report-map {
        width: 100%;
        margin: 8px 0;
        break-inside: avoid;
        page-break-inside: avoid;
    }

    .report-map img {
        display: block;
        width: 100%;
        height: 90mm;
        max-height: 90mm;
        object-fit: contain;
        margin: 0 auto;
    }

    /* Reduce spacing around report headings */
    h2 {
        margin-top: 16px;
        margin-bottom: 10px;
    }

    /* Keep the map heading together with the image */
    .report-map {
        break-before: avoid;
        page-break-before: avoid;
    }
}

/* ==========================================
   GEORISK AI — REPORT MAP LEGEND
========================================== */

.report-map-legend {
    display: flex;
    gap: 22px;
    margin: 12px 0 18px;
    padding: 12px 15px;
    border: 1px solid #dce8df;
    border-radius: 9px;
    background: #f7faf8;
    font-size: 11px;
    color: #344c3d;
}

.legend-section {
    flex: 1;
    min-width: 0;
}

.legend-section > strong {
    display: block;
    margin-bottom: 8px;
    color: #124c35;
    font-size: 12px;
}

.elevation-gradient {
    height: 10px;
    border-radius: 5px;
    background: linear-gradient(
        to right,
        #2463c5,
        #21a5b5,
        #43bf73,
        #e5d65c,
        #d58a50
    );
}

.legend-scale {
    display: flex;
    justify-content: space-between;
    margin-top: 4px;
    font-size: 10px;
    color: #607468;
}

.scenario-legend-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 5px;
}

.scenario-legend-dot {
    width: 12px;
    height: 12px;
    border-radius: 3px;
    background: #00b5a8;
    flex-shrink: 0;
}

.legend-section small {
    font-size: 10px;
    color: #66786d;
}

@media print {
    .report-map-legend {
        break-inside: avoid;
        page-break-inside: avoid;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
}
        
            </style>
        </head>

        <body>
            <button class="print-button" onclick="window.print()">
                Skriv ut / Spara som PDF
            </button>

            
<div class="report-header">
    <div class="report-brand">
        <div class="report-brand-icon">G</div>

        <div>
            <div class="report-brand-name">
                GeoRisk <span>AI</span>
            </div>
            <div class="report-brand-caption">
                BY CB WEB & GIS
            </div>
        </div>
    </div>

    <div class="report-header-content">
        <span class="report-eyebrow">
            GEOSPATIAL INTELLIGENCE REPORT
        </span>

        <h1>GIS-analysrapport</h1>

        <p>
            Terränganalys · Stångån-scenario · GIS-screening
        </p>
    </div>

    <div class="report-header-footer">
        <span>Linköping, Sverige</span>
        <span>
            ${new Date().toLocaleDateString("sv-SE")}
        </span>
    </div>
</div>


            <h2>1. Analysområde</h2>
            <p>Linköping, Sverige</p>
            <p>
                Latitud: ${formatNumber(data.latitude, 6)}<br>
                Longitud: ${formatNumber(data.longitude, 6)}
            </p>
<h2>Karta över analysområdet</h2>

<div class="report-map">
    <img
        src="${mapSnapshot}"
        alt="GeoRisk AI – GIS-karta över analysområdet"
        style="
            display:block;
            width:100%;
            height:auto;
            border:1px solid #d7e5dd;
            border-radius:10px;
        "
    >

<!-- GIS MAP LEGEND -->
<div class="report-map-legend">

    <div class="legend-section">
        <strong>Markhöjd · RH 2000</strong>

        <div class="elevation-gradient"></div>

        <div class="legend-scale">
            <span>Lägre terräng</span>
            <span>Högre terräng</span>
        </div>
    </div>

    <div class="legend-section">
        <strong>Stångån · Illustrativt scenario</strong>

        <div class="scenario-legend-row">
            <span class="scenario-legend-dot"></span>
            <span>
                Vattennivåökning:
                <strong>+${formatNumber(scenario?.water_level_increase_m, 1)} m</strong>
            </span>
        </div>

        <small>
            DEM-baserad terränganslutning.
            Inte verifierad översvämningskartering.
        </small>
    </div>

</div>

</div>

<p style="font-size:12px;color:#64756b;">
    Kartbild från GeoRisk AI vid rapportgenerering.
    Visade kartlager motsvarar den aktuella kartvyn.
    Illustrativ GIS-analys, inte officiell översvämningskartering.
</p>
            <h2>2. Terränganalys</h2>
            
<table class="report-metrics-table">
    <thead>
        <tr>
            <th>GIS-parameter</th>
            <th>Beräknat värde</th>
            <th>Datagrund</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>Markhöjd (RH 2000)</td>
            <td><strong>${formatNumber(data.elevation_m)} m</strong></td>
            <td>Lantmäteriets höjdmodell</td>
        </tr>
        <tr>
            <td>Marklutning</td>
            <td><strong>${formatNumber(data.slope_degrees)}°</strong></td>
            <td>Beräknad från höjdmodellen</td>
        </tr>
        <tr>
            <td>Terrängsänkning</td>
            <td><strong>${data.depression_depth_m != null
                ? formatNumber(data.depression_depth_m) + " m"
                : "Ej tillgänglig"}</strong></td>
            <td>Indikativ terränganalys</td>
        </tr>
        <tr>
            <td>Avstånd till Stångån</td>
            <td><strong>${waterDistance != null
                ? Math.round(waterDistance) + " m"
                : "Ej tillgänglig"}</strong></td>
            <td>Preliminär mittlinje</td>
        </tr>
    </tbody>
</table>


            <h2>3. Illustrativt Stångån-scenario</h2>
            <p>Vald nivåökning: +${formatNumber(scenario?.water_level_increase_m, 1)} m</p>
            <p>Scenarioresultat: <strong>${scenarioText}</strong></p>

            
<h2>4. GIS-screeningindikator</h2>

<div class="screening-card">
    <div class="screening-number">
        ${triggered} / ${indicators.length}
    </div>

    <div class="screening-content">
        <strong>Samlad GIS-screening</strong>

        <p>
            ${triggered} av ${indicators.length}
            tillgängliga indikatorer uppfyllda.
        </p>

        <small>
            Screeningresultat baserat på tillgängliga
            terrängdata och illustrativt Stångån-scenario.
            Inte en verifierad riskklassning.
        </small>
    </div>
</div>

<table class="report-metrics-table">
    <thead>
        <tr>
            <th>Indikator</th>
            <th>Resultat</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>Brant terräng (≥ 15°)</td>
            <td>
                ${data.slope_degrees == null
                    ? "Ej tillgänglig"
                    : Number(data.slope_degrees) >= 15
                        ? "Uppfylld"
                        : "Ej uppfylld"}
            </td>
        </tr>
        <tr>
            <td>Terrängsänkning (≥ 0,20 m)</td>
            <td>
                ${data.depression_depth_m == null
                    ? "Ej tillgänglig"
                    : Number(data.depression_depth_m) >= 0.20
                        ? "Uppfylld"
                        : "Ej uppfylld"}
            </td>
        </tr>
        <tr>
            <td>Inom Stångån-scenario</td>
            <td>
                ${typeof scenario?.within_scenario !== "boolean"
                    ? "Ej tillgänglig"
                    : scenario.within_scenario
                        ? "Uppfylld"
                        : "Ej uppfylld"}
            </td>
        </tr>
    </tbody>
</table>


            
<h2>5. GIS-baserade rekommendationer</h2>

<div class="recommendation-card">
    <div class="recommendation-icon">01</div>
    <div>
        <strong>Terrängförhållanden</strong>
        <p>${getTerrainRecommendation(data.slope_degrees)}</p>
    </div>
</div>

<div class="recommendation-card">
    <div class="recommendation-icon">02</div>
    <div>
        <strong>Terrängsänkningar</strong>
        <p>${getDepressionRecommendation(data.depression_depth_m)}</p>
    </div>
</div>

<div class="recommendation-card">
    <div class="recommendation-icon">03</div>
    <div>
        <strong>Stångån – Illustrativt scenario</strong>
        <p>
            ${scenario?.within_scenario === true
                ? "Den valda punkten ligger inom det illustrativa scenarioområdet. För en faktisk bedömning krävs verifierade hydrologiska och hydrauliska underlag."
                : scenario?.within_scenario === false
                    ? "Den valda punkten ligger utanför det illustrativa scenarioområdet vid den valda nivåökningen. Detta utesluter inte översvämningsrisk."
                    : "Scenarioresultat saknas. Ingen slutsats om exponering kan dras."}
        </p>
    </div>
</div>


            <h2>6. Datakällor och begränsningar</h2>
            
<p>
    Terränganalysen bygger på höjddata från Lantmäteriet.
    Avståndet till Stångån är beräknat till en preliminär mittlinje.
</p>

<p>
    <strong>Datakälla och licens:</strong><br>
    Markhöjdmodell Nedladdning, © Lantmäteriet.<br>
    Licens:
    <a href="https://creativecommons.org/licenses/by/4.0/deed.sv"
       target="_blank" rel="noopener noreferrer">
        Creative Commons CC BY 4.0
    </a>.<br>
    Höjddata har bearbetats av CB Web &amp; GIS
    för terränganalys och visualisering.
</p>


            <div class="notice">
                <strong>Viktig information</strong>
                <p>
                    Detta är en demonstrationsrapport. Stångån-scenariot
                    bygger på DEM-baserad terränganslutning med en
                    illustrativ referensnivå, inte en uppmätt vattennivå.
                    Rapporten är inte en verifierad översvämningskartering
                    eller en officiell riskbedömning och får inte användas
                    som beslutsunderlag.
                </p>
            </div>

            
<footer class="report-footer">
    <div>
        <strong>GeoRisk AI</strong>
        <span>GIS-analysrapport · Demonstration</span>
    </div>

    <div class="report-footer-right">
        <strong>CB Web & GIS</strong>
        <span>www.cbwebgis.se</span>
    </div>
</footer>

        </body>
        </html>
    `);

    reportWindow.document.close();

    }); // End leafletImage callback

}); // End report button click handler