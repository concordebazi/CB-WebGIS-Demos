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

    let map, ordersLayer, heatLayer, zoneLayers = [], groupsLayer;
    let orders = [];
    let groups = [];
    const state = { heatmap: false, groups: true };

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
        generateOrders();
        buildGroups();
        renderOrders();
        renderGroupsLayer();
        applyLayerState();
        renderStats();
        renderGroupsList();
        resetAiPanel();
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

    // ---- Init ----
    document.addEventListener("DOMContentLoaded", () => {
        generateOrders();
        buildGroups();
        initMap();
        applyLayerState();
        renderStats();
        renderGroupsList();
    });
})();
