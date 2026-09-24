/* =========================================
   MOBILE MECHANIC — AI & GIS DEMO
========================================= */

const mapElement = document.getElementById("map");

const sidebar = document.getElementById("sidebar");
const menuToggle = document.getElementById("menu-toggle");

const bookingForm = document.getElementById("booking-form");
const customerNameInput = document.getElementById("customer-name");
const serviceTypeInput = document.getElementById("service-type");
const customerAreaInput = document.getElementById("customer-area");

const jobsList = document.getElementById("jobs-list");
const mechanicsList = document.getElementById("mechanics-list");
const jobsCount = document.getElementById("jobs-count");

const statJobs = document.getElementById("stat-jobs");
const statMechanics = document.getElementById("stat-mechanics");
const statEta = document.getElementById("stat-eta");
const statDistance = document.getElementById("stat-distance");

const startSimulationButton =
    document.getElementById("start-simulation-btn");

const resetSimulationButton =
    document.getElementById("reset-simulation-btn");

const simulationMessage =
    document.getElementById("simulation-message");

const simulationProgressBar =
    document.getElementById("simulation-progress-bar");

const analyzeButton =
    document.getElementById("analyze-btn");

const aiResult =
    document.getElementById("ai-result");


/* =========================================
   MAP
========================================= */

const workshopPosition = [58.4108, 15.6214];

const map = L.map(mapElement, {
    zoomControl: true
}).setView(workshopPosition, 12);

L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        maxZoom: 19,
        attribution:
            "&copy; OpenStreetMap contributors"
    }
).addTo(map);


/* =========================================
   MAP LAYERS
========================================= */

const bookingLayer = L.layerGroup().addTo(map);
const mechanicLayer = L.layerGroup().addTo(map);
const routeLayer = L.layerGroup().addTo(map);
const travelledRouteLayer =
    L.layerGroup().addTo(map);
/* =========================================
   MECHANIC MOVEMENT STATE
========================================= */

const mechanicRoutes = {};
const movingMechanicMarkers = {};
const mechanicTravelLines = {};

let movementAnimationId = null;
let movementIsRunning = false;
let movementIsPaused = false;


/* =========================================
   SERVICE INFORMATION
========================================= */

const serviceInformation = {
    battery: {
        name: "Batterihjälp",
        icon: "⚡",
        color: "#ef3340",
        duration: 25
    },

    diagnostics: {
        name: "Felsökning",
        icon: "⌕",
        color: "#3979f6",
        duration: 40
    },

    tyres: {
        name: "Däckservice",
        icon: "◉",
        color: "#8d62e8",
        duration: 35
    },

    repair: {
        name: "Mindre reparation",
        icon: "🔧",
        color: "#f4b942",
        duration: 50
    }
};


/* =========================================
   AREA POSITIONS
========================================= */

const areaPositions = {
    linkoping: {
        name: "Linköping",
        position: [58.4108, 15.6214]
    },

    mjolby: {
        name: "Mjölby",
        position: [58.3250, 15.1250]
    },

    motala: {
        name: "Motala",
        position: [58.5371, 15.0365]
    },

    norrkoping: {
        name: "Norrköping",
        position: [58.5877, 16.1924]
    }
};


/* =========================================
   MECHANICS
========================================= */

const mechanics = [
    {
        id: 1,
        name: "Johan Andersson",
        initials: "JA",
        vehicle: "Servicebil 01",
        specialty: "Batteri och diagnostik",
        position: [58.4118, 15.6214],
        color: "#3979f6",
        status: "Tillgänglig",
        assignedJobs: []
    },

    {
        id: 2,
        name: "Sara Lind",
        initials: "SL",
        vehicle: "Servicebil 02",
        specialty: "Däck och reparation",
        position: [58.3955, 15.6502],
        color: "#8d62e8",
        status: "Tillgänglig",
        assignedJobs: []
    },

    {
        id: 3,
        name: "Erik Nilsson",
        initials: "EN",
        vehicle: "Servicebil 03",
        specialty: "Felsökning och el",
        position: [58.4282, 15.5945],
        color: "#ef3340",
        status: "Tillgänglig",
        assignedJobs: []
    }
];
/* =========================================
   MECHANIC SKILLS
========================================= */

const mechanicSkills = {
    1: [
        "battery",
        "diagnostics"
    ],

    2: [
        "tyres",
        "repair"
    ],

    3: [
        "diagnostics",
        "battery",
        "repair"
    ]
};

/* =========================================
   INITIAL BOOKINGS
========================================= */

const initialJobs = [
    {
        id: 1,
        customer: "Anna Karlsson",
        service: "battery",
        area: "Linköping",
        position: [58.4185, 15.6068],
        status: "Väntar",
        assignedMechanic: null
    },

    {
        id: 2,
        customer: "Mohamed Said",
        service: "diagnostics",
        area: "Tannefors",
        position: [58.4074, 15.6518],
        status: "Väntar",
        assignedMechanic: null
    },

    {
        id: 3,
        customer: "Maria Svensson",
        service: "tyres",
        area: "Ryd",
        position: [58.4048, 15.5618],
        status: "Väntar",
        assignedMechanic: null
    },

    {
        id: 4,
        customer: "Daniel Eriksson",
        service: "repair",
        area: "Tallboda",
        position: [58.4268, 15.6842],
        status: "Väntar",
        assignedMechanic: null
    },

    {
        id: 5,
        customer: "Linnea Berg",
        service: "battery",
        area: "Berga",
        position: [58.3908, 15.6241],
        status: "Väntar",
        assignedMechanic: null
    },

    {
        id: 6,
        customer: "Peter Holm",
        service: "diagnostics",
        area: "Vimanshäll",
        position: [58.3925, 15.6474],
        status: "Väntar",
        assignedMechanic: null
    }
];

let jobs = cloneJobs(initialJobs);
let nextJobId = 7;


/* =========================================
   WORKSHOP MARKER
========================================= */

const workshopIcon = L.divIcon({
    className: "",
    html: `
        <div style="
            width:48px;
            height:48px;
            display:flex;
            align-items:center;
            justify-content:center;
            color:#ffffff;
            background:linear-gradient(135deg,#ef3340,#c91f37);
            border:4px solid #ffffff;
            border-radius:16px;
            box-shadow:0 10px 25px rgba(12,23,40,0.32);
            font-size:21px;
        ">
            🔧
        </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24]
});

L.marker(workshopPosition, {
    icon: workshopIcon,
    zIndexOffset: 1000
})
.addTo(map)
.bindPopup(`
    <strong>Mobil Bilservice</strong><br>
    Central servicepunkt i Linköping
`);


/* =========================================
   COPY INITIAL DATA
========================================= */

function cloneJobs(sourceJobs) {
    return sourceJobs.map(job => ({
        ...job
    }));
}


/* =========================================
   CALCULATE DISTANCE
========================================= */

function calculateDistance(positionOne, positionTwo) {

    const latitudeOne = positionOne[0];
    const longitudeOne = positionOne[1];

    const latitudeTwo = positionTwo[0];
    const longitudeTwo = positionTwo[1];

    const radius = 6371;

    const latitudeDifference =
        degreesToRadians(latitudeTwo - latitudeOne);

    const longitudeDifference =
        degreesToRadians(longitudeTwo - longitudeOne);

    const value =
        Math.sin(latitudeDifference / 2) *
        Math.sin(latitudeDifference / 2) +
        Math.cos(degreesToRadians(latitudeOne)) *
        Math.cos(degreesToRadians(latitudeTwo)) *
        Math.sin(longitudeDifference / 2) *
        Math.sin(longitudeDifference / 2);

    const angle =
        2 * Math.atan2(
            Math.sqrt(value),
            Math.sqrt(1 - value)
        );

    return radius * angle;
}


function degreesToRadians(value) {
    return value * Math.PI / 180;
}


/* =========================================
   BOOKING MARKER
========================================= */

function createBookingIcon(job) {

    const service =
        serviceInformation[job.service];

    const borderColor =
        job.status === "Tilldelad"
            ? "#ffffff"
            : service.color;

    return L.divIcon({
        className: "",

        html: `
            <div style="
                width:38px;
                height:38px;
                display:flex;
                align-items:center;
                justify-content:center;
                color:#ffffff;
                background:${service.color};
                border:3px solid ${borderColor};
                border-radius:12px;
                box-shadow:0 9px 20px rgba(15,31,52,0.28);
                font-size:16px;
                font-weight:800;
            ">
                ${service.icon}
            </div>
        `,

        iconSize: [38, 38],
        iconAnchor: [19, 19],
        popupAnchor: [0, -18]
    });
}


/* =========================================
   MECHANIC MARKER
========================================= */

function createMechanicIcon(mechanic) {

    return L.divIcon({
        className: "",

        html: `
            <div style="
                width:44px;
                height:44px;
                display:flex;
                align-items:center;
                justify-content:center;
                color:#ffffff;
                background:${mechanic.color};
                border:4px solid #ffffff;
                border-radius:50%;
                box-shadow:0 10px 24px rgba(15,31,52,0.3);
                font-size:11px;
                font-weight:800;
            ">
                ${mechanic.initials}
            </div>
        `,

        iconSize: [44, 44],
        iconAnchor: [22, 22],
        popupAnchor: [0, -20]
    });
}


/* =========================================
   RENDER MAP BOOKINGS
========================================= */

function renderBookingMarkers() {

    bookingLayer.clearLayers();

    jobs.forEach(job => {

        const service =
            serviceInformation[job.service];

        const marker = L.marker(
            job.position,
            {
                icon: createBookingIcon(job)
            }
        );

        marker.bindPopup(`
            <strong>${job.customer}</strong><br>
            ${service.name}<br>
            ${job.area}<br>
            Status: ${job.status}
        `);

        marker.addTo(bookingLayer);
    });
}


/* =========================================
   RENDER MECHANIC MARKERS
========================================= */

function renderMechanicMarkers() {

    mechanicLayer.clearLayers();

    mechanics.forEach(mechanic => {

        const marker = L.marker(
            mechanic.position,
            {
                icon: createMechanicIcon(mechanic),
                zIndexOffset: 500
            }
        );

        marker.bindPopup(`
            <strong>${mechanic.name}</strong><br>
            ${mechanic.vehicle}<br>
            ${mechanic.specialty}<br>
            Status: ${mechanic.status}
        `);

        marker.addTo(mechanicLayer);
    });
}


/* =========================================
   RENDER JOB LIST
========================================= */

function renderJobsList() {

    jobsList.innerHTML = "";

    jobs.forEach(job => {

        const service =
            serviceInformation[job.service];

        const article =
            document.createElement("article");

        article.className = "job-card";

        article.innerHTML = `
            <div
                class="job-icon"
                style="
                    background:
                    linear-gradient(
                        135deg,
                        ${service.color},
                        ${service.color}cc
                    );
                "
            >
                ${service.icon}
            </div>

            <div class="job-information">
                <strong>${job.customer}</strong>

                <span>
                    ${service.name} · ${job.area}
                </span>
            </div>

            <span class="job-status">
                ${job.status}
            </span>
        `;

        jobsList.appendChild(article);
    });

    jobsCount.textContent = jobs.length;
}


/* =========================================
   RENDER MECHANICS LIST
========================================= */

function renderMechanicsList() {

    mechanicsList.innerHTML = "";

    mechanics.forEach(mechanic => {

        const assignedText =
            mechanic.assignedJobs.length > 0
                ? `${mechanic.assignedJobs.length} uppdrag`
                : mechanic.specialty;

        const article =
            document.createElement("article");

        article.className = "mechanic-card";

        article.innerHTML = `
            <div
                class="mechanic-avatar"
                style="background:${mechanic.color};"
            >
                ${mechanic.initials}
            </div>

            <div class="mechanic-information">
                <strong>${mechanic.name}</strong>

                <span>
                    ${mechanic.vehicle} · ${assignedText}
                </span>
            </div>

            <span class="mechanic-status">
                ${mechanic.status}
            </span>
        `;

        mechanicsList.appendChild(article);
    });
}


/* =========================================
   UPDATE STATISTICS
========================================= */

function updateStatistics() {

    let totalDistance = 0;
    let totalMinutes = 0;

    jobs.forEach(job => {

        const distance =
            calculateDistance(
                workshopPosition,
                job.position
            );

        totalDistance += distance;

        totalMinutes +=
            serviceInformation[job.service].duration +
            Math.round(distance * 3);
    });

    const averageMinutes =
        jobs.length > 0
            ? Math.round(totalMinutes / jobs.length)
            : 0;

    statJobs.textContent = jobs.length;
    statMechanics.textContent = mechanics.length;

    statEta.textContent =
        jobs.length > 0
            ? `${averageMinutes} min`
            : "–";

    statDistance.textContent =
        jobs.length > 0
            ? `${totalDistance.toFixed(1)} km`
            : "–";
}
/* =========================================
   GET ROAD ROUTE
========================================= */

async function getRoadRoute(
    startPosition,
    endPosition
) {

    const startLongitude =
        startPosition[1];

    const startLatitude =
        startPosition[0];

    const endLongitude =
        endPosition[1];

    const endLatitude =
        endPosition[0];

    const routeUrl =
        "https://router.project-osrm.org/route/v1/driving/" +
        `${startLongitude},${startLatitude};` +
        `${endLongitude},${endLatitude}` +
        "?overview=full&geometries=geojson";

    try {

        const response =
            await fetch(routeUrl);

        if (!response.ok) {
            throw new Error("Routing service unavailable");
        }

        const data =
            await response.json();

        if (
            !data.routes ||
            data.routes.length === 0
        ) {
            throw new Error("No route found");
        }

        const coordinates =
            data.routes[0]
                .geometry
                .coordinates
                .map(coordinate => [
                    coordinate[1],
                    coordinate[0]
                ]);

        return {
            coordinates: coordinates,

            distance:
                data.routes[0].distance / 1000,

            duration:
                data.routes[0].duration / 60
        };

    } catch (error) {

        console.warn(
            "Road route could not be loaded:",
            error
        );

        return {
            coordinates: [
                startPosition,
                endPosition
            ],

            distance:
                calculateDistance(
                    startPosition,
                    endPosition
                ),

            duration: 0
        };
    }
}


/* =========================================
   DRAW ROAD ROUTE
========================================= */

async function drawRoadRoute(
    startPosition,
    endPosition,
    mechanic,
    job
) {

    const route =
        await getRoadRoute(
            startPosition,
            endPosition
        );
/* Save this route for mechanic movement */

if (!mechanicRoutes[mechanic.id]) {
    mechanicRoutes[mechanic.id] = [];
}

if (mechanicRoutes[mechanic.id].length === 0) {

    mechanicRoutes[mechanic.id].push(
        ...route.coordinates
    );

} else {

    /*
     * Skip the first coordinate because it is already
     * the final coordinate of the previous route.
     */
    mechanicRoutes[mechanic.id].push(
        ...route.coordinates.slice(1)
    );
}
    const routeLine =
        L.polyline(
            route.coordinates,
            {
                color: mechanic.color,
weight: 5,
opacity: 0.28,
                lineCap: "round",
                lineJoin: "round"
            }
        );

    routeLine.bindTooltip(`
        <strong>${mechanic.name}</strong><br>
        ${job.customer}<br>
        ${route.distance.toFixed(1)} km
    `);

    routeLine.addTo(routeLayer);

    return route;
}
/* =========================================
   SMOOTH MECHANIC MOVEMENT
========================================= */

function stopMechanicMovement() {

    if (movementAnimationId !== null) {
        cancelAnimationFrame(movementAnimationId);
        movementAnimationId = null;
    }

    movementIsRunning = false;
    movementIsPaused = false;
}


function startMechanicMovement() {

    stopMechanicMovement();

       mechanicLayer.clearLayers();
    travelledRouteLayer.clearLayers();

    Object.keys(movingMechanicMarkers).forEach(mechanicId => {
        delete movingMechanicMarkers[mechanicId];
    });

    Object.keys(mechanicTravelLines).forEach(mechanicId => {
        delete mechanicTravelLines[mechanicId];
    });

    mechanics.forEach(mechanic => {

        const route =
            mechanicRoutes[mechanic.id];

        if (!route || route.length < 2) {
            return;
        }

        const marker =
            L.marker(
                route[0],
                {
                    icon: createMechanicIcon(mechanic),
                    zIndexOffset: 1000
                }
            );

        marker.bindPopup(`
            <strong>${mechanic.name}</strong><br>
            ${mechanic.vehicle}<br>
            Status: På väg
        `);

        marker.addTo(mechanicLayer);

        movingMechanicMarkers[mechanic.id] =
            marker;
               const travelledLine =
            L.polyline(
                [route[0]],
                {
                    color: mechanic.color,
                    weight: 7,
                    opacity: 1,
                    lineCap: "round",
                    lineJoin: "round"
                }
            );

        travelledLine.addTo(
            travelledRouteLayer
        );

        mechanicTravelLines[mechanic.id] =
            travelledLine;
    });


    const animationDuration = 15000;
    const animationStart = performance.now();

    movementIsRunning = true;
    movementIsPaused = false;


    function animateMechanics(currentTime) {

        if (!movementIsRunning) {
            return;
        }

        const elapsedTime =
            currentTime - animationStart;

        const progress =
            Math.min(
                elapsedTime / animationDuration,
                1
            );


        mechanics.forEach(mechanic => {

            const route =
                mechanicRoutes[mechanic.id];

            const marker =
                movingMechanicMarkers[mechanic.id];

            if (!route || !marker || route.length < 2) {
                return;
            }


            const exactPosition =
                progress * (route.length - 1);

            const currentIndex =
                Math.floor(exactPosition);

            const nextIndex =
                Math.min(
                    currentIndex + 1,
                    route.length - 1
                );

            const sectionProgress =
                exactPosition - currentIndex;


            const currentCoordinate =
                route[currentIndex];

            const nextCoordinate =
                route[nextIndex];


            const latitude =
                currentCoordinate[0] +
                (
                    nextCoordinate[0] -
                    currentCoordinate[0]
                ) * sectionProgress;

            const longitude =
                currentCoordinate[1] +
                (
                    nextCoordinate[1] -
                    currentCoordinate[1]
                ) * sectionProgress;


            marker.setLatLng([
                latitude,
                longitude
            ]);
        });


        if (progress < 1) {

            movementAnimationId =
                requestAnimationFrame(
                    animateMechanics
                );

        } else {

            movementIsRunning = false;
            movementAnimationId = null;

            simulationMessage.textContent =
                "Alla mekaniker har nått sina planerade uppdrag.";
        }
    }


    movementAnimationId =
        requestAnimationFrame(
            animateMechanics
        );
}
/* =========================================
   FIND BEST MECHANIC
========================================= */

function findBestMechanic(job, mechanicPositions) {

    let bestMechanic = null;
    let bestScore = Infinity;

    mechanics.forEach(mechanic => {

        const currentPosition =
            mechanicPositions[mechanic.id];

        const distance =
            calculateDistance(
                currentPosition,
                job.position
            );

        const hasCorrectSkill =
            mechanicSkills[mechanic.id]
                .includes(job.service);

        const skillPenalty =
            hasCorrectSkill
                ? 0
                : 18;

        const workloadPenalty =
            mechanic.assignedJobs.length * 4;

        const score =
            distance +
            skillPenalty +
            workloadPenalty;

        if (score < bestScore) {
            bestScore = score;
            bestMechanic = mechanic;
        }
    });

    return bestMechanic;
}


/* =========================================
   ASSIGN JOBS
========================================= */

async function assignJobsToMechanics() {

    routeLayer.clearLayers();
       Object.keys(mechanicRoutes).forEach(mechanicId => {
        delete mechanicRoutes[mechanicId];
    });

    simulationMessage.textContent =
        "AI analyserar kompetens, avstånd och arbetsbelastning...";

    simulationProgressBar.style.width = "25%";

    startSimulationButton.disabled = true;

    mechanics.forEach(mechanic => {
        mechanic.assignedJobs = [];
        mechanic.status = "Analyserar";
    });

    renderMechanicsList();

    const mechanicPositions = {};

    mechanics.forEach(mechanic => {

        mechanicPositions[mechanic.id] = [
            mechanic.position[0],
            mechanic.position[1]
        ];
    });

    await new Promise(resolve => {
        setTimeout(resolve, 700);
    });

    simulationProgressBar.style.width = "55%";

    for (const job of jobs) {

        const mechanic =
            findBestMechanic(
                job,
                mechanicPositions
            );

        job.assignedMechanic =
            mechanic.id;

        job.status =
            "Tilldelad";

        mechanic.assignedJobs.push(
            job.id
        );

        const routeStart =
            mechanicPositions[mechanic.id];

        await drawRoadRoute(
            routeStart,
            job.position,
            mechanic,
            job
        );

        mechanicPositions[mechanic.id] = [
            job.position[0],
            job.position[1]
        ];
    }

    mechanics.forEach(mechanic => {

        mechanic.status =
            mechanic.assignedJobs.length > 0
                ? "Planerad"
                : "Tillgänglig";
    });

    renderAll();

    simulationProgressBar.style.width = "100%";

    simulationMessage.textContent =
        "Planeringen är klar. Uppdragen har fördelats efter kompetens, avstånd och arbetsbelastning.";

    startSimulationButton.textContent =
        "✓ Planeringen är klar";
       startMechanicMovement();
}

/* =========================================
   RESET SIMULATION
========================================= */

function resetSimulation() {

    jobs = cloneJobs(initialJobs);
    nextJobId = 7;

    routeLayer.clearLayers();
       Object.keys(mechanicRoutes).forEach(mechanicId => {
        delete mechanicRoutes[mechanicId];
    });

    mechanics.forEach(mechanic => {
        mechanic.assignedJobs = [];
        mechanic.status = "Tillgänglig";
    });

    simulationMessage.textContent =
        "Bokningarna väntar på att tilldelas till rätt mekaniker.";

    simulationProgressBar.style.width = "0";

    startSimulationButton.textContent =
        "▶ Starta planering";

    startSimulationButton.disabled = false;

    aiResult.classList.remove("active");
    aiResult.innerHTML = "";

    renderAll();

    map.setView(workshopPosition, 12);
}


/* =========================================
   CREATE A NEW BOOKING
========================================= */

function createBooking(event) {

    event.preventDefault();

    const customerName =
        customerNameInput.value.trim();

    const serviceType =
        serviceTypeInput.value;

    const areaKey =
        customerAreaInput.value;

    const selectedArea =
        areaPositions[areaKey];

    if (!customerName) {
        return;
    }

    const randomLatitude =
        (Math.random() - 0.5) * 0.035;

    const randomLongitude =
        (Math.random() - 0.5) * 0.05;

    const newJob = {
        id: nextJobId,
        customer: customerName,
        service: serviceType,
        area: selectedArea.name,

        position: [
            selectedArea.position[0] + randomLatitude,
            selectedArea.position[1] + randomLongitude
        ],

        status: "Väntar",
        assignedMechanic: null
    };

    jobs.push(newJob);
    nextJobId += 1;

    bookingForm.reset();

    routeLayer.clearLayers();

    mechanics.forEach(mechanic => {
        mechanic.assignedJobs = [];
        mechanic.status = "Tillgänglig";
    });

    jobs.forEach(job => {
        job.status = "Väntar";
        job.assignedMechanic = null;
    });

    startSimulationButton.textContent =
        "▶ Starta planering";

    startSimulationButton.disabled = false;

    simulationProgressBar.style.width = "0";

    simulationMessage.textContent =
        `${customerName}s bokning har lagts till och väntar på planering.`;

    renderAll();

    map.flyTo(newJob.position, 13, {
        duration: 1.2
    });

    if (window.innerWidth <= 820) {
        sidebar.classList.remove("active");
    }
}


/* =========================================
   AI ANALYSIS
========================================= */

function showAIAnalysis() {

    const waitingJobs =
        jobs.filter(job =>
            job.status === "Väntar"
        ).length;

    const assignedJobs =
        jobs.filter(job =>
            job.status === "Tilldelad"
        ).length;

    aiResult.classList.add("active");

    if (assignedJobs === 0) {

        aiResult.innerHTML = `
            <strong>Rekommendation:</strong><br>
            ${waitingJobs} bokningar väntar.
            Starta den automatiska planeringen för att
            fördela uppdragen efter avstånd och kompetens.
        `;

        return;
    }

    aiResult.innerHTML = `
        <strong>AI-analys klar:</strong><br>
        ${assignedJobs} uppdrag har fördelats mellan
        ${mechanics.length} mekaniker.

        Rutterna visas på kartan och uppdragen har
        grupperats för att minska onödig körning.
    `;
}


/* =========================================
   RENDER EVERYTHING
========================================= */

function renderAll() {

    renderBookingMarkers();
    renderMechanicMarkers();
    renderJobsList();
    renderMechanicsList();
    updateStatistics();
}


/* =========================================
   EVENTS
========================================= */

bookingForm.addEventListener(
    "submit",
    createBooking
);

startSimulationButton.addEventListener(
    "click",
    assignJobsToMechanics
);

resetSimulationButton.addEventListener(
    "click",
    resetSimulation
);

analyzeButton.addEventListener(
    "click",
    showAIAnalysis
);

menuToggle.addEventListener(
    "click",
    function () {
        sidebar.classList.toggle("active");

        setTimeout(() => {
            map.invalidateSize();
        }, 320);
    }
);


/* =========================================
   WINDOW RESIZE
========================================= */

window.addEventListener(
    "resize",
    function () {

        map.invalidateSize();

        if (window.innerWidth > 820) {
            sidebar.classList.remove("active");
        }
    }
);


/* =========================================
   START APPLICATION
========================================= */

renderAll();

setTimeout(() => {
    map.invalidateSize();
}, 250);
