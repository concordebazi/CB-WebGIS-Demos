/* ==========================================
   PIZZERIA DELIVERY INTELLIGENCE — CB WEB & GIS
   All customer/order data below is randomly
   generated in the browser. Nothing here is
   real, stored, or sent anywhere.
========================================== */

(function () {
    "use strict";

    // ---- Mobile menu (same behaviour as main site) ----
    const menuToggle = document.getElementById("menu-toggle");
    const navLinks = document.getElementById("nav-links");
    if (menuToggle && navLinks) {
        menuToggle.addEventListener("click", function () {
            navLinks.classList.toggle("active");
            const isOpen = navLinks.classList.contains("active");
            menuToggle.textContent = isOpen ? "✕" : "☰";
            menuToggle.setAttribute("aria-expanded", isOpen);
        });
        navLinks.querySelectorAll("a").forEach((link) => {
            link.addEventListener("click", () => {
                navLinks.classList.remove("active");
                menuToggle.textContent = "☰";
                menuToggle.setAttribute("aria-expanded", "false");
            });
        });
    }

    // ---- Config ----
    const PIZZERIA = { lat: 58.4108, lng: 15.6214, name: "Pizzeria Bella Vista" };
    const ZONES = [
        { key: "fast", label: "Snabb zon", radiusKm: 2, color: "#20c7b7", baseMinutes: 18 },
        { key: "standard", label: "Standard zon", radiusKm: 4, color: "#59c3ff", baseMinutes: 30 },
        { key: "extended", label: "Utökad zon", radiusKm: 6, color: "#ffb06f", baseMinutes: 45 }
    ];
    const ORDER_COUNT = 55;
    const STREETS = ["Storgatan", "Drottninggatan", "Hamngatan", "Ågatan", "Klostergatan", "Nygatan", "Tanneforsvägen", "Malmslättsvägen", "Vasavägen", "Repslagaregatan"];

    let map, ordersLayer, heatLayer, zoneLayers = [], groupsLayer;
    let orders = [];
    let groups = [];
    const state = { orders: true, heatmap: false, zones: true, groups: false };

    // ---- Helpers ----
    function rand(min, max) { return Math.random() * (max - min) + min; }
    function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
    function pick(arr) { return arr[randInt(0, arr.length - 1)]; }

    // Random point within a radius (km), biased toward the center like real demand
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
        const traffic = rand(0.9, 1.35); // random traffic / prep-time variance
        return Math.round(zone.baseMinutes * traffic * (0.6 + order.distanceKm / (zone.radiusKm * 2)));
    }

    function formatSEK(n) { return n.toLocaleString("sv-SE") + " kr"; }

    // ---- Generate simulated orders ----
    function generateOrders() {
        orders = [];
        const now = Date.now();
        for (let i = 0; i < ORDER_COUNT; i++) {
            const p = randomPointNear(PIZZERIA.lat, PIZZERIA.lng, 6);
            const zone = zoneForDistance(p.distanceKm);
            const hoursAgo = rand(0, 24 * 7);
            const order = {
                id: "ORD-" + (1000 + i),
                lat: p.lat,
                lng: p.lng,
                distanceKm: p.distanceKm,
                zone: zone.key,
                street: pick(STREETS) + " " + randInt(1, 90),
                value: randInt(129, 429),
                timestamp: new Date(now - hoursAgo * 3600 * 1000),
                hourOfDay: 0
            };
            order.hourOfDay = order.timestamp.getHours();
            order.etaMinutes = estimateMinutes(order);
            orders.push(order);
        }
    }

    // ---- Grouping: simple grid-based clustering of nearby orders ----
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
            .filter((g) => g.length >= 3)
            .map((g, idx) => {
                const avgLat = g.reduce((s, o) => s + o.lat, 0) / g.length;
                const avgLng = g.reduce((s, o) => s + o.lng, 0) / g.length;
                const distKm = Math.sqrt((avgLat - PIZZERIA.lat) ** 2 + (avgLng - PIZZERIA.lng) ** 2) * 111;
                const zone = zoneForDistance(distKm);
                return {
                    id: "Grupp " + (idx + 1),
                    orders: g,
                    zone: zone.key,
                    zoneLabel: zone.label,
                    street: g[0].street.split(" ")[0],
                    estRouteMinutes: Math.round(zone.baseMinutes * 0.8 + g.length * 4)
                };
            })
            .sort((a, b) => b.orders.length - a.orders.length)
            .slice(0, 6);
    }

    // ---- Map setup ----
    function initMap() {
        map = L.map("map", { scrollWheelZoom: false }).setView([PIZZERIA.lat, PIZZERIA.lng], 13);

        L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
            attribution: '&copy; OpenStreetMap &copy; CARTO',
            maxZoom: 19
        }).addTo(map);

        // Pizzeria marker
        const pizzeriaIcon = L.divIcon({
            className: "",
            html: '<div style="width:22px;height:22px;background:#ff5a5a;border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 6px rgba(255,90,90,0.25);"></div>',
            iconSize: [22, 22],
            iconAnchor: [11, 11]
        });
        L.marker([PIZZERIA.lat, PIZZERIA.lng], { icon: pizzeriaIcon })
            .addTo(map)
            .bindPopup("<b>" + PIZZERIA.name + "</b><br>Utgångspunkt för alla leveranser (simulerad plats).");

        // Zone circles
        ZONES.slice().reverse().forEach((zone) => {
            const circle = L.circle([PIZZERIA.lat, PIZZERIA.lng], {
                radius: zone.radiusKm * 1000,
                color: zone.color,
                weight: 1.5,
                fillColor: zone.color,
                fillOpacity: 0.06,
                opacity: 0.55
            });
            zoneLayers.push(circle);
        });

        renderOrders();
        renderGroupsLayer();
        map.on("click", () => {}); // reserved
    }

    function orderIcon(zone) {
        const color = ZONES.find((z) => z.key === zone).color;
        return L.divIcon({
            className: "",
            html: '<div style="width:11px;height:11px;background:' + color + ';border:2px solid rgba(7,17,31,0.9);border-radius:50%;"></div>',
            iconSize: [11, 11],
            iconAnchor: [5, 5]
        });
    }

    function renderOrders() {
        if (ordersLayer) map.removeLayer(ordersLayer);
        ordersLayer = L.layerGroup();
        orders.forEach((o) => {
            const marker = L.marker([o.lat, o.lng], { icon: orderIcon(o.zone) });
            const zoneLabel = ZONES.find((z) => z.key === o.zone).label;
            marker.bindPopup(
                "<b>" + o.id + "</b>, " + o.street + "<br>" +
                "Zon: " + zoneLabel + " (" + o.distanceKm.toFixed(1) + " km)<br>" +
                "Uppskattad leveranstid: <b>" + o.etaMinutes + " min</b><br>" +
                "Ordervärde: " + formatSEK(o.value)
            );
            ordersLayer.addLayer(marker);
        });
    }

    function renderGroupsLayer() {
        if (groupsLayer) map.removeLayer(groupsLayer);
        groupsLayer = L.layerGroup();
        groups.forEach((g) => {
            const avgLat = g.orders.reduce((s, o) => s + o.lat, 0) / g.orders.length;
            const avgLng = g.orders.reduce((s, o) => s + o.lng, 0) / g.orders.length;
            const circle = L.circle([avgLat, avgLng], {
                radius: 320,
                color: "#7ee2a8",
                weight: 1.5,
                dashArray: "4 4",
                fillColor: "#7ee2a8",
                fillOpacity: 0.08
            }).bindPopup("<b>" + g.id + "</b><br>" + g.orders.length + " ordrar nära " + g.street + "<br>Uppskattad rundtur: " + g.estRouteMinutes + " min");
            groupsLayer.addLayer(circle);
        });
    }

    function rebuildHeatLayer() {
        if (heatLayer) map.removeLayer(heatLayer);
        const points = orders.map((o) => [o.lat, o.lng, 0.5 + o.value / 500]);
        heatLayer = L.heatLayer(points, { radius: 32, blur: 26, maxZoom: 15 });
    }

    function applyLayerState() {
        zoneLayers.forEach((c) => { if (state.zones) c.addTo(map); else map.removeLayer(c); });
        if (state.orders) ordersLayer.addTo(map); else map.removeLayer(ordersLayer);
        if (state.groups) groupsLayer.addTo(map); else map.removeLayer(groupsLayer);
        if (state.heatmap) { rebuildHeatLayer(); heatLayer.addTo(map); }
        else if (heatLayer) map.removeLayer(heatLayer);
    }

    // ---- Toolbar wiring ----
    document.querySelectorAll(".chip[data-toggle]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const key = btn.dataset.toggle;
            state[key] = !state[key];
            btn.classList.toggle("active", state[key]);
            applyLayerState();
        });
    });

    document.getElementById("regenerate-btn").addEventListener("click", () => {
        generateOrders();
        buildGroups();
        renderOrders();
        renderGroupsLayer();
        applyLayerState();
        renderStats();
        renderGroups();
        resetAiPanel();
    });

    // ---- Stats dashboard ----
    function renderStats() {
        const total = orders.length;
        const revenue = orders.reduce((s, o) => s + o.value, 0);
        const avgEta = Math.round(orders.reduce((s, o) => s + o.etaMinutes, 0) / total);

        const zoneCounts = { fast: 0, standard: 0, extended: 0 };
        orders.forEach((o) => zoneCounts[o.zone]++);
        const busiestZoneKey = Object.keys(zoneCounts).reduce((a, b) => (zoneCounts[a] > zoneCounts[b] ? a : b));
        const busiestZone = ZONES.find((z) => z.key === busiestZoneKey);
        const busiestZonePct = Math.round((zoneCounts[busiestZoneKey] / total) * 100);

        const hourCounts = {};
        orders.forEach((o) => { hourCounts[o.hourOfDay] = (hourCounts[o.hourOfDay] || 0) + 1; });
        const busiestHour = Object.keys(hourCounts).reduce((a, b) => (hourCounts[a] > hourCounts[b] ? a : b));

        const stats = [
            { value: total, label: "Simulerade ordrar (7 dagar)", accent: "accent-blue" },
            { value: formatSEK(revenue), label: "Simulerad omsättning", accent: "accent-teal" },
            { value: avgEta + " min", label: "Genomsnittlig leveranstid", accent: "accent-amber" },
            { value: busiestZone.label, label: "Mest aktiva zon (" + busiestZonePct + "% av ordrarna)", accent: "accent-blue" },
            { value: groups.length, label: "Föreslagna leveransgrupper", accent: "accent-teal" },
            { value: busiestHour + ":00", label: "Mest aktiva timmen på dygnet", accent: "accent-amber" }
        ];

        const grid = document.getElementById("stats-grid");
        grid.innerHTML = stats.map((s) =>
            '<div class="stat-card ' + s.accent + '"><div class="stat-value">' + s.value + '</div><div class="stat-label">' + s.label + '</div></div>'
        ).join("");
    }

    // ---- Groups list ----
    function renderGroups() {
        const grid = document.getElementById("groups-grid");
        if (!groups.length) {
            grid.innerHTML = '<p style="color:#7f96aa;">Inga tydliga grupper just nu &mdash; klicka på "Nya ordrar" för att simulera om.</p>';
            return;
        }
        grid.innerHTML = groups.map((g) =>
            '<div class="group-card"><h4>' + g.id + '</h4>' +
            '<p>Område kring ' + g.street + '</p>' +
            '<p>Zon: ' + g.zoneLabel + '</p>' +
            '<p>Uppskattad rundtur: ' + g.estRouteMinutes + ' min</p>' +
            '<span class="group-count">' + g.orders.length + ' ordrar</span></div>'
        ).join("");
    }

    // ---- AI analysis (rule-based recommendation engine, runs locally) ----
    function resetAiPanel() {
        document.getElementById("ai-result").innerHTML = '<p class="ai-placeholder">Rekommendationerna visas här efter analys.</p>';
    }

    function buildRecommendations() {
        const zoneCounts = { fast: 0, standard: 0, extended: 0 };
        const zoneEta = { fast: [], standard: [], extended: [] };
        orders.forEach((o) => { zoneCounts[o.zone]++; zoneEta[o.zone].push(o.etaMinutes); });
        const avg = (arr) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0);

        const hourCounts = {};
        orders.forEach((o) => { hourCounts[o.hourOfDay] = (hourCounts[o.hourOfDay] || 0) + 1; });
        const peakHour = Object.keys(hourCounts).reduce((a, b) => (hourCounts[a] > hourCounts[b] ? a : b));

        const recs = [];

        const extendedShare = zoneCounts.extended / orders.length;
        if (extendedShare > 0.28) {
            recs.push({
                icon: "🛵",
                text: "Den utökade zonen står för " + Math.round(extendedShare * 100) + "% av ordrarna med en snittleverans på " + avg(zoneEta.extended) + " min. Överväg en andra förare under kvällar för att korta ner väntetiderna där."
            });
        } else {
            recs.push({
                icon: "✅",
                text: "Leveranstiderna i den utökade zonen (snitt " + avg(zoneEta.extended) + " min) ligger inom rimliga gränser &mdash; ingen extra bemanning behövs där just nu."
            });
        }

        recs.push({
            icon: "⏱️",
            text: "Flest ordrar kommer in runt kl " + peakHour + ":00. Planera personalstyrkan i köket kring den timmen för att undvika flaskhalsar i tillagningen."
        });

        if (groups.length >= 3) {
            const biggest = groups[0];
            recs.push({
                icon: "🧭",
                text: groups.length + " leveransgrupper har identifierats. Den största (" + biggest.id + ", " + biggest.orders.length + " ordrar nära " + biggest.street + ") kan köras som en samlad rundtur på ca " + biggest.estRouteMinutes + " min istället för separata turer."
            });
        } else {
            recs.push({
                icon: "🧭",
                text: "Ordrarna är relativt utspridda just nu &mdash; få tydliga grupperingar att samköra. Enskilda leveranser är sannolikt mest effektivt."
            });
        }

        const fastShare = zoneCounts.fast / orders.length;
        if (fastShare > 0.45) {
            recs.push({
                icon: "📍",
                text: "Nästan hälften av efterfrågan finns i den snabba zonen närmast pizzerian. En cykelbud kan täcka den zonen billigare än bil under lugnare timmar."
            });
        }

        const avgValue = Math.round(orders.reduce((s, o) => s + o.value, 0) / orders.length);
        recs.push({
            icon: "💰",
            text: "Snittordervärdet är " + avgValue + " kr. Ett riktat erbjudande i standardzonen (" + zoneCounts.standard + " ordrar) skulle kunna höja snittet ytterligare där konkurrensen om leveranstiden är mindre pressande."
        });

        return recs;
    }

    document.getElementById("analyze-btn").addEventListener("click", () => {
        const resultBox = document.getElementById("ai-result");
        resultBox.innerHTML = '<div class="ai-loading"><span class="spinner"></span> Analyserar leveransdata …</div>';

        setTimeout(() => {
            const recs = buildRecommendations();
            resultBox.innerHTML =
                '<ul class="ai-recs">' +
                recs.map((r) => '<li><span class="rec-icon">' + r.icon + '</span><span>' + r.text + '</span></li>').join("") +
                '</ul>' +
                '<p class="ai-disclaimer">Analysen genereras av regelbaserad logik i webbläsaren utifrån den simulerade datan ovan &mdash; en illustration av vad en AI-driven analys kan se ut som, inte en anslutning till en extern AI-tjänst.</p>';
        }, 1100);
    });

    // ---- Init ----
    document.addEventListener("DOMContentLoaded", () => {
        generateOrders();
        buildGroups();
        initMap();
        applyLayerState();
        renderStats();
        renderGroups();
    });
})();
