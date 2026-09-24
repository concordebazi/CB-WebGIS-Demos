/* ==========================================
   PIZZERIA DELIVERY INTELLIGENCE — CB WEB & GIS
   All customer/order data below is randomly
   generated in the browser. Nothing here is
   real, stored, or sent anywhere.
========================================== */

(function () {
    "use strict";

    // ---- Mobile sidebar toggle ----
    const menuToggle = document.getElementById("menu-toggle");
    const sidebar = document.getElementById("sidebar");
    if (menuToggle && sidebar) {
        menuToggle.addEventListener("click", () => sidebar.classList.toggle("open"));
    }

    // ---- Config ----
    const PIZZERIA = { lat: 58.4108, lng: 15.6214, name: "Pizzeria Vesuvio" };
    const ZONES = [
        { key: "fast", label: "Snabb zon", radiusKm: 1.5, color: "#5fc86f", baseMinutes: 16 },
        { key: "standard", label: "Standard zon", radiusKm: 3, color: "#eab13a", baseMinutes: 27 },
        { key: "extended", label: "Utökad zon", radiusKm: 5, color: "#c15a48", baseMinutes: 40 }
    ];
    const ORDER_COUNT = 32;
    const STREETS = ["Storgatan", "Drottninggatan", "Hamngatan", "Ågatan", "Klostergatan", "Nygatan", "Tanneforsvägen", "Malmslättsvägen", "Vasavägen", "Repslagaregatan"];

  let map;
let ordersLayer;
let heatLayer;
let groupsLayer;
let driverRoutesLayer;
   let selectedDriverId = null;
let zoneLayers = [];
    let orders = [];
    let groups = [];
   /* Live delivery simulation state */
let simulationTimer = null;
let simulationRunning = false;
let simulationPaused = false;
let completedOrderCount = 0;
let simulationQueue = [];
let activeDriverMarkers = [];
    const state = { heatmap: false, groups: true };
/* Update the live-delivery control panel */
function updateSimulationInterface(statusText) {
    const simulationPanel =
        document.getElementById(
            "delivery-simulation"
        );

    const statusElement =
        document.getElementById(
            "simulation-status"
        );

    const completedElement =
        document.getElementById(
            "completed-orders"
        );

    const totalElement =
        document.getElementById(
            "simulation-total"
        );

    const progressBar =
        document.getElementById(
            "simulation-progress-bar"
        );

    const startButton =
        document.getElementById(
            "simulation-start-btn"
        );

    const resetButton =
        document.getElementById(
            "simulation-reset-btn"
        );

    const totalOrders = orders.length;

    const progress =
        totalOrders > 0
            ? Math.min(
                100,
                (completedOrderCount /
                    totalOrders) * 100
            )
            : 0;

    if (statusElement && statusText) {
        statusElement.textContent =
            statusText;
    }

    if (completedElement) {
        completedElement.textContent =
            completedOrderCount;
    }

    if (totalElement) {
        totalElement.textContent =
            totalOrders;
    }

    if (progressBar) {
        progressBar.style.width =
            progress + "%";
    }

    if (simulationPanel) {
        simulationPanel.classList.toggle(
            "is-running",
            simulationRunning &&
            !simulationPaused
        );
    }

    if (startButton) {
        if (
            simulationRunning &&
            !simulationPaused
        ) {
            startButton.textContent =
                "⏸ Pausa";
        } else if (
            simulationRunning &&
            simulationPaused
        ) {
            startButton.textContent =
                "▶ Fortsätt";
        } else {
            startButton.textContent =
                "▶ Starta leveranser";
        }
    }

    if (resetButton) {
        resetButton.disabled =
            !simulationRunning &&
            completedOrderCount === 0;
    }
}
  /* Build a delivery queue containing every active order */
function buildSimulationQueue() {
    const driverStops =
        deliveryDrivers.map((driver) => {
            const assignedOrders =
    getAllDriverStops(driver);

            return {
                driver: driver,
                stops: assignedOrders
            };
        });

    const queue = [];
    let stopIndex = 0;
    let stopsRemaining = true;

    /*
       Add one order per driver during each cycle.
       This makes the three drivers appear to work
       at approximately the same time.
    */
    while (stopsRemaining) {
        stopsRemaining = false;

        driverStops.forEach((item) => {
            const order =
                item.stops[stopIndex];

            if (order) {
                queue.push({
                    driver: item.driver,
                    order: order,
                    stopNumber:
                        stopIndex + 1
                });

                stopsRemaining = true;
            }
        });

        stopIndex++;
    }

    return queue;
}

/* Complete the next simulated delivery */
function processNextDelivery() {
    if (
        !simulationRunning ||
        simulationPaused
    ) {
        return;
    }

    if (simulationQueue.length === 0) {
        simulationRunning = false;
        simulationPaused = false;
        simulationTimer = null;

        updateSimulationInterface(
            "Alla leveranser är klara ✓"
        );

        return;
    }

    const delivery =
        simulationQueue.shift();
moveActiveDriverMarker(delivery);
    completedOrderCount++;

    updateSimulationInterface(
        delivery.driver.name +
        " levererade " +
        delivery.order.id
    );

    simulationTimer = window.setTimeout(
        processNextDelivery,
        1100
    );
}


/* Start, pause or continue the simulation */
function toggleDeliverySimulation() {
    if (!simulationRunning) {
        completedOrderCount = 0;
        simulationQueue =
            buildSimulationQueue();

        simulationRunning = true;
       createActiveDriverMarkers();
        simulationPaused = false;

        updateSimulationInterface(
            "Leveranser pågår"
        );

        processNextDelivery();
        return;
    }

    if (simulationPaused) {
        simulationPaused = false;

        updateSimulationInterface(
            "Leveranser fortsätter"
        );

        processNextDelivery();
    } else {
        simulationPaused = true;

        window.clearTimeout(
            simulationTimer
        );

        simulationTimer = null;

        updateSimulationInterface(
            "Leveranser pausade"
        );
    }
}


/* Return the simulation and map to their initial state */
function resetDeliverySimulation() {
    window.clearTimeout(simulationTimer);

    simulationTimer = null;
    simulationRunning = false;
    simulationPaused = false;
    completedOrderCount = 0;
    simulationQueue = [];

    clearActiveDriverMarkers();

    /*
       Remove the complete numbered driver routes,
       leaving the ordinary destination dots visible.
    */
    if (driverRoutesLayer && map) {
        map.removeLayer(driverRoutesLayer);
        driverRoutesLayer = null;
    }

    selectedDriverId = null;

    document
        .querySelectorAll(".driver-card")
        .forEach((card) => {
            card.classList.remove(
                "driver-card--selected"
            );
        });

    updateSimulationInterface(
        "Redo att starta"
    );

    if (map) {
        map.setView(
            [PIZZERIA.lat, PIZZERIA.lng],
            13
        );
    }
}

/* Connect the simulation buttons */
function setupDeliverySimulation() {
    const startButton =
        document.getElementById(
            "simulation-start-btn"
        );

    const resetButton =
        document.getElementById(
            "simulation-reset-btn"
        );

    if (startButton) {
        startButton.addEventListener(
            "click",
            toggleDeliverySimulation
        );
    }

    if (resetButton) {
        resetButton.addEventListener(
            "click",
            resetDeliverySimulation
        );
    }
}
    // ---- Helpers ----
    function rand(min, max) { return Math.random() * (max - min) + min; }
    function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
    function pick(arr) { return arr[randInt(0, arr.length - 1)]; }

    function randomPointNear(lat, lng, maxKm) {
        const r = maxKm * Math.sqrt(Math.random() * Math.random()); // bias toward center
        const angle = rand(0, Math.PI * 2);
        const dLat = (r / 111) * Math.cos(angle);
        const dLng = (r / (111 * Math.cos(lat * Math.PI / 180))) * Math.sin(angle);
        return { lat: lat + dLat, lng: lng + dLng, distanceKm: r };
    }

    function zoneForDistance(km) {
        if (km <= ZONES[0].radiusKm) return ZONES[0];
        if (km <= ZONES[1].radiusKm) return ZONES[1];
        return ZONES[2];
    }

    function estimateMinutes(order) {
        const zone = zoneForDistance(order.distanceKm);
        const traffic = rand(0.9, 1.3);
        return Math.round(zone.baseMinutes * traffic * (0.6 + order.distanceKm / (zone.radiusKm * 2)));
    }

    // ---- Generate simulated orders ----
    function generateOrders() {
        orders = [];
        for (let i = 0; i < ORDER_COUNT; i++) {
            const p = randomPointNear(PIZZERIA.lat, PIZZERIA.lng, 5);
            const zone = zoneForDistance(p.distanceKm);
            const order = {
                id: "ORD-" + (1000 + i),
                lat: p.lat,
                lng: p.lng,
                distanceKm: p.distanceKm,
                zone: zone.key,
                street: pick(STREETS) + " " + randInt(1, 90),
                value: randInt(129, 429)
            };
            order.etaMinutes = estimateMinutes(order);
            orders.push(order);
        }
    }

    // ---- Grouping: grid-based clustering of nearby orders ----
    function buildGroups() {
        const cellSizeKm = 0.55;
        const cells = {};
        orders.forEach((o) => {
            const cellLat = Math.round((o.lat - PIZZERIA.lat) * 111 / cellSizeKm);
            const cellLng = Math.round((o.lng - PIZZERIA.lng) * 111 * Math.cos(PIZZERIA.lat * Math.PI / 180) / cellSizeKm);
            const key = cellLat + "_" + cellLng;
            if (!cells[key]) cells[key] = [];
            cells[key].push(o);
        });

        groups = Object.values(cells)
            .filter((g) => g.length >= 2)
            .map((g, idx) => {
                const avgLat = g.reduce((s, o) => s + o.lat, 0) / g.length;
                const avgLng = g.reduce((s, o) => s + o.lng, 0) / g.length;
                const distKm = Math.sqrt((avgLat - PIZZERIA.lat) ** 2 + (avgLng - PIZZERIA.lng) ** 2) * 111;
                const zone = zoneForDistance(distKm);
                return {
                    id: idx + 1,
                    orders: g,
                    avgLat, avgLng,
                    zone: zone.key,
                    zoneLabel: zone.label,
                    savingsMinutes: (g.length - 1) * 4
                };
            })
            .sort((a, b) => b.orders.length - a.orders.length)
            .slice(0, 6);
        groups.forEach((g, i) => (g.id = i + 1));
    }
  
// ---- Delivery drivers ----


const deliveryDrivers = [
    {
        id: 1,
        name: "Anna Karlsson",
        vehicle: "Cykelbud",
        preferredZone: "fast",
        color: "#3678e5",
        groups: []
    },
    {
        id: 2,
        name: "Mohamed Said",
        vehicle: "Bil",
        preferredZone: "standard",
        color: "#8b5bd7",
        groups: []
    },
    {
        id: 3,
        name: "Erik Lind",
        vehicle: "Bil",
        preferredZone: "extended",
        color: "#e38a32",
        groups: []
    }
];

/*
   Assign each delivery group to the driver
   responsible for that delivery zone.
*/
function assignGroupsToDrivers() {
    deliveryDrivers.forEach((driver) => {
        driver.groups = [];
    });

    groups.forEach((group) => {
        let driver = deliveryDrivers.find(
            (item) => item.preferredZone === group.zone
        );

        /*
           Fallback: if a group has no matching driver,
           assign it to the driver with the fewest orders.
        */
        if (!driver) {
            driver = deliveryDrivers
                .slice()
                .sort((a, b) =>
                    getDriverOrderCount(a) -
                    getDriverOrderCount(b)
                )[0];
        }

        driver.groups.push(group);
    });

    renderDrivers();
}


/* Count all orders assigned to one driver */
function getDriverOrderCount(driver) {
    return driver.groups.reduce(
        (total, group) => total + group.orders.length,
        0
    );
}


/* Calculate an estimated completion time */
function getDriverEstimatedTime(driver) {
    if (!driver.groups.length) {
        return 0;
    }

    return driver.groups.reduce((total, group) => {
        const longestOrderTime = Math.max(
            ...group.orders.map((order) => order.etaMinutes)
        );

        const additionalStops =
            Math.max(0, group.orders.length - 1) * 4;

        return total + longestOrderTime + additionalStops;
    }, 0);
}
/* Calculate the driver's approximate complete route distance */
function getDriverRouteDistance(driver) {
    const stops = optimiseDriverStops(driver);

    if (!stops.length) {
        return 0;
    }

    let totalDistance = 0;
    let previousPoint = PIZZERIA;

    stops.forEach((stop) => {
        totalDistance += coordinateDistance(
            previousPoint,
            stop
        );

        previousPoint = stop;
    });

    totalDistance += coordinateDistance(
        previousPoint,
        PIZZERIA
    );

    return totalDistance;
}

/* Update the driver cards in the HTML */
function renderDrivers() {
    deliveryDrivers.forEach((driver) => {
        const card = document.querySelector(
            `[data-driver-id="${driver.id}"]`
        );

        if (!card) {
            return;
        }

        const information =
            card.querySelector(".driver-information span");

        const status =
            card.querySelector(".driver-status");

        const orderCount =
            getDriverOrderCount(driver);

        const estimatedTime =
            getDriverEstimatedTime(driver);
       const routeDistance =
    getDriverRouteDistance(driver);

        if (orderCount > 0) {
           information.textContent =
    `${driver.vehicle} · ${orderCount} ordrar · ` +
    `${routeDistance.toFixed(1)} km · ~${estimatedTime} min`;

            status.textContent = "Levererar";

            status.classList.remove(
                "driver-status--available"
            );

            status.classList.add(
                "driver-status--delivering"
            );

            card.classList.add("driver-card--busy");
        } else {
            information.textContent =
                `${driver.vehicle} · Ingen tilldelad grupp`;

            status.textContent = "Tillgänglig";

            status.classList.remove(
                "driver-status--delivering"
            );

            status.classList.add(
                "driver-status--available"
            );

            card.classList.remove("driver-card--busy");
        }
    });
}
 // ---- Driver route visualisation ----

/*
   Approximate distance between two coordinates.
   This is sufficient for sorting simulated stops.
*/
function coordinateDistance(pointA, pointB) {
    const latitudeDistance =
        (pointB.lat - pointA.lat) * 111;

    const longitudeDistance =
        (pointB.lng - pointA.lng) *
        111 *
        Math.cos(PIZZERIA.lat * Math.PI / 180);

    return Math.sqrt(
        latitudeDistance ** 2 +
        longitudeDistance ** 2
    );
}


/*
   Simple nearest-neighbour route:
   starting at the pizzeria, repeatedly select
   the closest remaining delivery stop.
*/
function optimiseDriverStops(driver) {
    const remainingStops = driver.groups
        .flatMap((group) => group.orders)
        .slice();

    const orderedStops = [];

    let currentPoint = {
        lat: PIZZERIA.lat,
        lng: PIZZERIA.lng
    };

    while (remainingStops.length > 0) {
        let closestIndex = 0;
        let closestDistance = Infinity;

        remainingStops.forEach((stop, index) => {
            const distance =
                coordinateDistance(currentPoint, stop);

            if (distance < closestDistance) {
                closestDistance = distance;
                closestIndex = index;
            }
        });

        const closestStop =
            remainingStops.splice(closestIndex, 1)[0];

        orderedStops.push(closestStop);
        currentPoint = closestStop;
    }

    return orderedStops;
}
/* Return all orders assigned to a driver's delivery zone */
function getAllDriverStops(driver) {
    const zoneOrders = orders.filter(
        (order) =>
            order.zone ===
            driver.preferredZone
    );

    /*
       Reuse the existing nearest-neighbour
       optimisation with a temporary group.
    */
    return optimiseDriverStops({
        groups: [
            {
                orders: zoneOrders
            }
        ]
    });
}

/* Create a numbered map marker for one stop */
function createDriverStopIcon(number, color) {
    return L.divIcon({
        className: "",
        html:
            '<div style="' +
                'width:24px;' +
                'height:24px;' +
                'display:flex;' +
                'align-items:center;' +
                'justify-content:center;' +
                'border-radius:50%;' +
                'background:' + color + ';' +
                'color:#ffffff;' +
                'border:3px solid #ffffff;' +
                'box-shadow:0 4px 12px rgba(0,0,0,0.28);' +
                'font-family:Manrope,sans-serif;' +
                'font-size:10px;' +
                'font-weight:800;' +
            '">' +
                number +
            '</div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });
}
/* Create a live map icon for a delivery driver */
function createLiveDriverIcon(driver) {
    const initials = driver.name
        .split(" ")
        .map((namePart) => namePart[0])
        .join("")
        .slice(0, 2);

    return L.divIcon({
        className: "",
        html:
            '<div style="' +
                'width:34px;' +
                'height:34px;' +
                'display:flex;' +
                'align-items:center;' +
                'justify-content:center;' +
                'border-radius:50%;' +
                'background:' + driver.color + ';' +
                'color:#ffffff;' +
                'border:4px solid #ffffff;' +
                'box-shadow:0 5px 18px rgba(0,0,0,0.35);' +
                'font-family:Manrope,sans-serif;' +
                'font-size:10px;' +
                'font-weight:800;' +
            '">' +
                initials +
            '</div>',
        iconSize: [34, 34],
        iconAnchor: [17, 17]
    });
}


/* Add one live marker and one empty route for each driver */
function createActiveDriverMarkers() {
    clearActiveDriverMarkers();

    activeDriverMarkers =
        deliveryDrivers.map((driver) => {
            const startingPoint = [
                PIZZERIA.lat,
                PIZZERIA.lng
            ];

            /*
               This line starts at the pizzeria.
               It will grow while the driver moves.
            */
            const routeLine = L.polyline(
                [startingPoint],
                {
                    color: driver.color,
                    weight: 5,
                    opacity: 0.9,
                    lineCap: "round",
                    lineJoin: "round"
                }
            ).addTo(map);

            const marker = L.marker(
                startingPoint,
                {
                    icon: createLiveDriverIcon(driver),
                    zIndexOffset: 1200
                }
            );

            marker
                .addTo(map)
                .bindTooltip(
                    driver.name,
                    {
                        direction: "top",
                        offset: [0, -18]
                    }
                );

            return {
                driverId: driver.id,
                marker: marker,
                routeLine: routeLine,
                routeCoordinates: [
                    startingPoint
                ]
            };
        });
}
/* Smoothly move a driver marker to the next stop */
function moveActiveDriverMarker(delivery) {
    const activeMarker =
        activeDriverMarkers.find(
            (item) =>
                item.driverId ===
                delivery.driver.id
        );

    if (!activeMarker) {
        return;
    }

    const marker = activeMarker.marker;
    const startPosition = marker.getLatLng();

    const destination = L.latLng(
        delivery.order.lat,
        delivery.order.lng
    );

    const animationDuration = 850;
    const animationStart =
        performance.now();

    marker.setTooltipContent(
        delivery.driver.name +
        " · På väg till " +
        delivery.order.id
    );

    function animateMarker(currentTime) {
        if (!simulationRunning) {
            return;
        }

        const elapsedTime =
            currentTime - animationStart;

        const progress = Math.min(
            elapsedTime / animationDuration,
            1
        );

        /*
           Ease-out movement:
           the marker moves quickly at first and
           slows slightly near the destination.
        */
        const easedProgress =
            1 - Math.pow(1 - progress, 3);

        const currentLatitude =
            startPosition.lat +
            (
                destination.lat -
                startPosition.lat
            ) * easedProgress;

        const currentLongitude =
            startPosition.lng +
            (
                destination.lng -
                startPosition.lng
            ) * easedProgress;

        marker.setLatLng([
            currentLatitude,
            currentLongitude
        ]);
       /*
   Extend the coloured route to the driver's
   current position during every animation frame.
*/
const currentRoutePoint = [
    currentLatitude,
    currentLongitude
];

activeMarker.routeCoordinates.push(
    currentRoutePoint
);

activeMarker.routeLine.setLatLngs(
    activeMarker.routeCoordinates
);

        if (progress < 1) {
            window.requestAnimationFrame(
                animateMarker
            );
        } else {
            marker.setLatLng(destination);

            marker.setTooltipContent(
                delivery.driver.name +
                " · Levererat " +
                delivery.order.id
            );
        }
    }

    window.requestAnimationFrame(
        animateMarker
    );
}

/* Remove all live driver markers and their drawn routes */
function clearActiveDriverMarkers() {
    activeDriverMarkers.forEach(
        (driverMarker) => {
            if (!map) {
                return;
            }

            if (driverMarker.marker) {
                map.removeLayer(
                    driverMarker.marker
                );
            }

            if (driverMarker.routeLine) {
                map.removeLayer(
                    driverMarker.routeLine
                );
            }
        }
    );

    activeDriverMarkers = [];
}

/* Draw all assigned driver routes on the map */
function renderDriverRoutes() {
    if (!map) {
        return;
    }

    if (driverRoutesLayer) {
        map.removeLayer(driverRoutesLayer);
    }

    driverRoutesLayer = L.layerGroup().addTo(map);

   
       deliveryDrivers.forEach((driver) => {
    if (
        selectedDriverId !== null &&
        driver.id !== selectedDriverId
    ) {
        return;
    }

 
      const stops = getAllDriverStops(driver);

        if (!stops.length) {
            return;
        }

        const routeCoordinates = [
            [PIZZERIA.lat, PIZZERIA.lng],
            ...stops.map((stop) => [
                stop.lat,
                stop.lng
            ]),
            [PIZZERIA.lat, PIZZERIA.lng]
        ];

        const routeLine = L.polyline(
            routeCoordinates,
            {
                color: driver.color,
                weight: 4,
                opacity: 0.82,
                dashArray: "10 7",
                lineCap: "round",
                lineJoin: "round"
            }
        );

        routeLine.bindPopup(
    "<b>" + driver.name + "</b><br>" +
    driver.vehicle + "<br>" +
    stops.length + " tilldelade leveranser<br>" +
    "Beräknad rutt: " +
    getDriverRouteDistance(driver).toFixed(1) +
    " km<br>" +
    "Beräknad tid: ~" +
    getDriverEstimatedTime(driver) +
    " min"
);

        driverRoutesLayer.addLayer(routeLine);

        stops.forEach((stop, index) => {
            const marker = L.marker(
                [stop.lat, stop.lng],
                {
                    icon: createDriverStopIcon(
                        index + 1,
                        driver.color
                    ),
                    zIndexOffset: 500
                }
            );

            marker.bindPopup(
                "<b>" + driver.name + "</b><br>" +
                "Stopp " + (index + 1) +
                " av " + stops.length + "<br>" +
                stop.id + " · " + stop.street + "<br>" +
                "Beräknad leveranstid: " +
                stop.etaMinutes + " min"
            );

            driverRoutesLayer.addLayer(marker);
        });
    });
}  
   /* Select a driver and display only that driver's route */
function setupDriverCardInteractions() {
    const driverCards =
        document.querySelectorAll(".driver-card");

    driverCards.forEach((card) => {
        card.addEventListener("click", function () {
            const driverId =
                Number(card.dataset.driverId);

            if (selectedDriverId === driverId) {
                selectedDriverId = null;
            } else {
                selectedDriverId = driverId;
            }

            driverCards.forEach((item) => {
                const itemDriverId =
                    Number(item.dataset.driverId);

                item.classList.toggle(
                    "driver-card--selected",
                    itemDriverId === selectedDriverId
                );
            });

            renderDriverRoutes();
           if (selectedDriverId !== null) {
    const selectedDriver = deliveryDrivers.find(
        (driver) => driver.id === selectedDriverId
    );

    const selectedStops =
        optimiseDriverStops(selectedDriver);

    if (selectedStops.length > 0) {
        const routeBounds = L.latLngBounds([
            [PIZZERIA.lat, PIZZERIA.lng],
            ...selectedStops.map((stop) => [
                stop.lat,
                stop.lng
            ])
        ]);

        map.fitBounds(routeBounds, {
            padding: [60, 60],
            maxZoom: 14
        });
    }
} else {
    map.setView(
        [PIZZERIA.lat, PIZZERIA.lng],
        13
    );
}
        });
    });
}
    // ---- Map setup ----
    function initMap() {
        map = L.map("map", { scrollWheelZoom: true }).setView([PIZZERIA.lat, PIZZERIA.lng], 13);

       L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
}).addTo(map);

        const pizzeriaIcon = L.divIcon({
            className: "",
            html: '<div style="width:20px;height:20px;background:#e8792b;border:3px solid #17120d;border-radius:50%;box-shadow:0 0 0 6px rgba(232,121,43,0.22);"></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });
        L.marker([PIZZERIA.lat, PIZZERIA.lng], { icon: pizzeriaIcon })
            .addTo(map)
            .bindTooltip(PIZZERIA.name, { permanent: true, direction: "top", offset: [0, -10], className: "pizzeria-label" })
            .bindPopup("<b>" + PIZZERIA.name + "</b><br>Utgångspunkt för alla leveranser (simulerad plats).");

        ZONES.slice().reverse().forEach((zone) => {
            const circle = L.circle([PIZZERIA.lat, PIZZERIA.lng], {
                radius: zone.radiusKm * 1000,
                color: zone.color,
                weight: 1.5,
                dashArray: "5 6",
                fillColor: zone.color,
                fillOpacity: 0.05,
                opacity: 0.75
            });
            zoneLayers.push(circle);
        });

        renderOrders();
renderGroupsLayer();

    }

    function orderIcon(zone) {
        const color = ZONES.find((z) => z.key === zone).color;
        return L.divIcon({
            className: "",
            html: '<div style="width:10px;height:10px;background:' + color + ';border:2px solid rgba(21,16,12,0.9);border-radius:50%;"></div>',
            iconSize: [10, 10],
            iconAnchor: [5, 5]
        });
    }

    function renderOrders() {
        if (ordersLayer) map.removeLayer(ordersLayer);
        ordersLayer = L.layerGroup().addTo(map);
        orders.forEach((o) => {
            const marker = L.marker([o.lat, o.lng], { icon: orderIcon(o.zone) });
            const zoneLabel = ZONES.find((z) => z.key === o.zone).label;
            marker.bindPopup(
                "<b>" + o.id + "</b>, " + o.street + "<br>" +
                "Zon: " + zoneLabel + " (" + o.distanceKm.toFixed(1) + " km)<br>" +
                "Uppskattad leveranstid: <b>" + o.etaMinutes + " min</b>"
            );
            ordersLayer.addLayer(marker);
        });
    }

    function renderGroupsLayer() {
        if (groupsLayer) map.removeLayer(groupsLayer);
        groupsLayer = L.layerGroup();
        groups.forEach((g) => {
            const radiusM = 90 + g.orders.length * 35;
            const circle = L.circle([g.avgLat, g.avgLng], {
                radius: radiusM,
                color: "#f2ece2",
                weight: 1,
                dashArray: "3 5",
                fillOpacity: 0,
                opacity: 0.55
            }).bindPopup("<b>Grupp " + g.id + "</b><br>" + g.orders.length + " ordrar &middot; " + g.zoneLabel + "<br>Sparar ca " + g.savingsMinutes + " min jämfört med separata turer");
            groupsLayer.addLayer(circle);

            // thin connecting line between orders in the group (visual "route")
            const latlngs = g.orders.map((o) => [o.lat, o.lng]);
            const line = L.polyline(latlngs, { color: "#f2ece2", weight: 1, opacity: 0.5 });
            groupsLayer.addLayer(line);
        });
    }

    function rebuildHeatLayer() {
        if (heatLayer) map.removeLayer(heatLayer);
        const points = orders.map((o) => [o.lat, o.lng, 0.5 + o.value / 500]);
        heatLayer = L.heatLayer(points, { radius: 32, blur: 26, maxZoom: 15 });
    }

    function applyLayerState() {
        zoneLayers.forEach((c) => c.addTo(map));
        if (state.groups) groupsLayer.addTo(map); else map.removeLayer(groupsLayer);
        if (state.heatmap) { rebuildHeatLayer(); heatLayer.addTo(map); }
        else if (heatLayer) map.removeLayer(heatLayer);
    }

    // ---- Sidebar controls ----
    document.getElementById("toggle-heatmap").addEventListener("change", (e) => {
        state.heatmap = e.target.checked;
        applyLayerState();
    });
    document.getElementById("toggle-groups").addEventListener("change", (e) => {
        state.groups = e.target.checked;
        applyLayerState();
    });

    document.getElementById("regenerate-btn").addEventListener("click", () => {
    selectedDriverId = null;

    document
        .querySelectorAll(".driver-card")
        .forEach((card) => {
            card.classList.remove(
                "driver-card--selected"
            );
        });

    generateOrders();
    buildGroups();
    assignGroupsToDrivers();
    renderOrders();
    renderGroupsLayer();
    renderDriverRoutes();
    applyLayerState();
    renderStats();
    renderGroupsList();
   resetAiPanel();

    map.setView(
        [PIZZERIA.lat, PIZZERIA.lng],
        13
    );
});
    // ---- Stats ----
    function renderStats() {
        const total = orders.length;
        const avgEta = Math.round(orders.reduce((s, o) => s + o.etaMinutes, 0) / total);
        const totalSavings = groups.reduce((s, g) => s + g.savingsMinutes, 0);

        document.getElementById("stat-total").textContent = total;
        document.getElementById("stat-eta").textContent = avgEta + " min";
        document.getElementById("stat-groups").textContent = groups.length;
        document.getElementById("stat-savings").textContent = "~" + totalSavings + " min";

        const counts = { fast: 0, standard: 0, extended: 0 };
        orders.forEach((o) => counts[o.zone]++);
        const bar = document.getElementById("zone-bar");
        bar.querySelector(".seg-fast").style.flex = counts.fast;
        bar.querySelector(".seg-standard").style.flex = counts.standard;
        bar.querySelector(".seg-extended").style.flex = counts.extended;
    }

    // ---- Groups list ----
    function renderGroupsList() {
        const wrap = document.getElementById("groups-list");
        if (!groups.length) {
            wrap.innerHTML = '<p class="groups-empty">Inga tydliga grupper just nu &mdash; simulera om för att se fler kluster.</p>';
            return;
        }
        wrap.innerHTML = groups.map((g) =>
            '<div class="group-item"><b>Grupp ' + g.id + '</b>' +
            '<span class="sep">&middot;</span>' + g.orders.length + ' ordrar' +
            '<span class="sep">&middot;</span>' + g.zoneLabel +
            '<span class="sep">&middot;</span>sparar ~' + g.savingsMinutes + ' min</div>'
        ).join("");
    }

    // ---- AI analysis (rule-based, runs locally) ----
    function resetAiPanel() {
        document.getElementById("ai-result").innerHTML = "";
    }

    function buildRecommendations() {
        const zoneCounts = { fast: 0, standard: 0, extended: 0 };
        const zoneEta = { fast: [], standard: [], extended: [] };
        orders.forEach((o) => { zoneCounts[o.zone]++; zoneEta[o.zone].push(o.etaMinutes); });
        const avg = (arr) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0);

        const recs = [];
        const extendedShare = zoneCounts.extended / orders.length;

        if (extendedShare > 0.28) {
            recs.push({ icon: "🛵", text: "Utökad zon står för " + Math.round(extendedShare * 100) + "% av ordrarna med snitt " + avg(zoneEta.extended) + " min leveranstid. Överväg en extra förare under kvällar." });
        } else {
            recs.push({ icon: "✅", text: "Leveranstiderna i utökad zon (snitt " + avg(zoneEta.extended) + " min) är rimliga &mdash; ingen extra bemanning behövs där just nu." });
        }

        if (groups.length) {
            const totalSavings = groups.reduce((s, g) => s + g.savingsMinutes, 0);
            const biggest = groups[0];
            recs.push({ icon: "🧭", text: groups.length + " leveransgrupper hittades, vilket kan spara ca " + totalSavings + " min totalt. Störst är Grupp " + biggest.id + " med " + biggest.orders.length + " ordrar i " + biggest.zoneLabel.toLowerCase() + "." });
        } else {
            recs.push({ icon: "🧭", text: "Ordrarna är utspridda just nu &mdash; få tydliga grupperingar att samköra." });
        }

        const fastShare = zoneCounts.fast / orders.length;
        if (fastShare > 0.4) {
            recs.push({ icon: "📍", text: Math.round(fastShare * 100) + "% av efterfrågan finns i snabba zonen. Ett cykelbud kan täcka den zonen billigare än bil under lugna timmar." });
        }

        const avgValue = Math.round(orders.reduce((s, o) => s + o.value, 0) / orders.length);
        recs.push({ icon: "💰", text: "Snittordervärdet är " + avgValue + " kr. Ett riktat erbjudande i standardzonen (" + zoneCounts.standard + " ordrar) kan höja snittet ytterligare." });

        return recs;
    }

    document.getElementById("analyze-btn").addEventListener("click", () => {
        const box = document.getElementById("ai-result");
        box.innerHTML = '<div class="ai-loading"><span class="spinner"></span> Analyserar leveransdata …</div>';

        setTimeout(() => {
            const recs = buildRecommendations();
                        box.innerHTML =
                '<ul class="ai-recs">' +
                recs.map((r) => '<li><span class="rec-icon">' + r.icon + '</span><span>' + r.text + '</span></li>').join("") +
                '</ul>' +
                '<p class="ai-disclaimer">Genereras av en regelbaserad analysmotor i webbläsaren utifrån simulerad data &mdash; ingen extern AI-tjänst anropas i denna demo.</p>';
        }, 1000);
    });


   
/* ==========================================
   INTERACTIVE DEMO GUIDE
========================================== */

const tourStartButton = document.getElementById("tour-start-btn");

let tourStepIndex = 0;
let tourTimer = null;
let tourPopover = null;
let tourActive = false;

const tourSteps = [
    {
        target: "#tour-pizzeria",
        title: "Pizzeria Vesuvio",
        text: "Detta är en simulerad pizzeria i Linköping. Demonstrationen visar hur AI och GIS kan hjälpa ett lokalt företag att planera sina leveranser."
    },
    {
        target: "#tour-controls",
        title: "Utforska efterfrågan",
        text: "Värmekartan visar var dagens beställningar är koncentrerade. Guiden aktiverar värmekartan automatiskt.",
        action: function () {
            const heatmapToggle =
                document.getElementById("toggle-heatmap");

            if (heatmapToggle && !heatmapToggle.checked) {
                heatmapToggle.checked = true;
                heatmapToggle.dispatchEvent(
                    new Event("change", { bubbles: true })
                );
            }
        }
    },
    {
        target: "#tour-statistics",
        title: "Dagens leveransstatistik",
        text: "Här visas antal aktiva beställningar, genomsnittlig leveranstid, föreslagna grupper och uppskattad tidsbesparing."
    },
   
{
    target: "#driver-panel",
    title: "Förare och optimerade rutter",
    text: "Beställningarna fördelas automatiskt mellan tillgängliga förare. Klicka på ett förarkort för att visa förarens rutt, stopp, körsträcka och beräknade leveranstid.",
    action: function () {
        const firstDriver =
            document.querySelector(
                '.driver-card[data-driver-id="1"]'
            );

        if (
            firstDriver &&
            selectedDriverId !== 1
        ) {
            firstDriver.click();
        }
    }
},

    {
        target: "#tour-ai",
        title: "AI-baserade rekommendationer",
        text: "AI-analysen granskar den simulerade orderdatan och föreslår praktiska åtgärder för effektivare leveranser.",
        action: function () {
            const analyzeButton =
                document.getElementById("analyze-btn");

            if (analyzeButton) {
                analyzeButton.click();
            }
        }
    },
    {
        target: "#tour-contact",
        title: "En lösning för lokala företag",
        text: "CB Web & GIS kan anpassa en liknande kart- och analyslösning för en riktig pizzeria eller annan lokal verksamhet."
    }
];


/* Create the floating guide box */
function createTourPopover() {
    if (tourPopover) {
        return;
    }

    tourPopover = document.createElement("div");
    tourPopover.className = "tour-popover";
    tourPopover.setAttribute("role", "dialog");
    tourPopover.setAttribute("aria-live", "polite");
    tourPopover.setAttribute("aria-label", "Interaktiv guide");

    tourPopover.innerHTML = `
        <span class="tour-progress"></span>
        <h2 class="tour-title"></h2>
        <p class="tour-text"></p>

        <div class="tour-actions">
            <button class="tour-close" type="button">
                Avsluta
            </button>

            <button class="tour-next" type="button">
                Nästa →
            </button>
        </div>
    `;

    document.body.appendChild(tourPopover);

    tourPopover
        .querySelector(".tour-close")
        .addEventListener("click", stopTour);

    tourPopover
        .querySelector(".tour-next")
        .addEventListener("click", function () {
            showTourStep(tourStepIndex + 1);
        });
}


/* Remove the highlight from the previous section */
function removeTourHighlight() {
    document
        .querySelectorAll(".tour-highlight")
        .forEach(function (element) {
            element.classList.remove("tour-highlight");
        });
}


/* Display one guide step */
function showTourStep(index) {
    clearTimeout(tourTimer);
    removeTourHighlight();

    if (index >= tourSteps.length) {
        stopTour();
        return;
    }

    tourStepIndex = index;

    const step = tourSteps[tourStepIndex];
    const target = document.querySelector(step.target);

    if (!target) {
        showTourStep(tourStepIndex + 1);
        return;
    }

    /*
       On mobile, open the sidebar when the current
       guide element is located inside the sidebar.
    */
    const sidebar = document.getElementById("sidebar");

    if (
        window.innerWidth <= 860 &&
        sidebar &&
        target.closest("#sidebar")
    ) {
        sidebar.classList.add("open");
    }

    target.classList.add("tour-highlight");

    target.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest"
    });

    const progress =
        tourPopover.querySelector(".tour-progress");

    const title =
        tourPopover.querySelector(".tour-title");

    const text =
        tourPopover.querySelector(".tour-text");

    const nextButton =
        tourPopover.querySelector(".tour-next");

    progress.textContent =
        `Steg ${tourStepIndex + 1} av ${tourSteps.length}`;

    title.textContent = step.title;
    text.textContent = step.text;

    nextButton.textContent =
        tourStepIndex === tourSteps.length - 1
            ? "Slutför ✓"
            : "Nästa →";

    if (typeof step.action === "function") {
        window.setTimeout(step.action, 550);
    }

    /*
       Automatically continue after 6.5 seconds.
       The visitor can also use the Next button.
    */
    tourTimer = window.setTimeout(function () {
        showTourStep(tourStepIndex + 1);
    }, 6500);
}


/* Start the guide */
function startTour() {
    clearTimeout(tourTimer);

    tourActive = true;
    tourStepIndex = 0;

    createTourPopover();

    tourPopover.hidden = false;
    document.body.classList.add("tour-running");

    showTourStep(0);
}


/* End the guide and clean up */
function stopTour() {
    clearTimeout(tourTimer);
    removeTourHighlight();
       selectedDriverId = null;

    document
        .querySelectorAll(".driver-card")
        .forEach((card) => {
            card.classList.remove(
                "driver-card--selected"
            );
        });

    if (map) {
        renderDriverRoutes();

        map.setView(
            [PIZZERIA.lat, PIZZERIA.lng],
            13
        );
    }

    tourActive = false;
    document.body.classList.remove("tour-running");

    if (tourPopover) {
        tourPopover.hidden = true;
    }

    if (tourStartButton) {
        tourStartButton.focus();
    }
}


/* Start button */
if (tourStartButton) {
    tourStartButton.addEventListener("click", function () {
        if (tourActive) {
            stopTour();
        } else {
            startTour();
        }
    });
}


/* Allow the visitor to close the guide with Escape */
document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && tourActive) {
        stopTour();
    }
});
    // ---- Init ----
    document.addEventListener("DOMContentLoaded", () => {
        generateOrders();
        buildGroups();
        assignGroupsToDrivers();
        initMap();
       setupDriverCardInteractions();
        applyLayerState();
        renderStats();
        renderGroupsList();
       setupDeliverySimulation();
        updateSimulationInterface("Redo att starta");
    });
})();
