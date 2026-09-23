const restaurant = { name: "Demo Pizzeria", lat: 58.4109, lng: 15.6216 };

const orderSeed = [
  [58.4147,15.5849,"Ryd","evening",31],[58.4162,15.5908,"Ryd","evening",29],[58.4123,15.5775,"Ryd","lunch",34],
  [58.4181,15.5830,"Ryd","evening",33],[58.4094,15.5888,"Ryd","evening",30],[58.4020,15.5650,"Lambohov","evening",39],
  [58.3988,15.5731,"Lambohov","evening",37],[58.4052,15.5777,"Lambohov","lunch",35],[58.4006,15.5842,"Lambohov","evening",34],
  [58.3971,15.5598,"Lambohov","evening",41],[58.4218,15.6230,"Vasastaden","lunch",18],[58.4257,15.6205,"Vasastaden","evening",21],
  [58.4195,15.6321,"Vasastaden","evening",19],[58.4075,15.6412,"Tannefors","lunch",20],[58.4051,15.6488,"Tannefors","evening",23],
  [58.4112,15.6520,"Tannefors","evening",25],[58.4204,15.6532,"Hejdegården","lunch",24],[58.4260,15.6570,"Hejdegården","evening",27],
  [58.4316,15.6125,"Gottfridsberg","evening",24],[58.4330,15.6027,"Gottfridsberg","lunch",26],[58.4271,15.5984,"Gottfridsberg","evening",26],
  [58.4390,15.6250,"Skäggetorp","evening",32],[58.4427,15.6160,"Skäggetorp","evening",34],[58.4450,15.6310,"Skäggetorp","lunch",36],
  [58.4382,15.6404,"Skäggetorp","evening",31],[58.3920,15.6250,"Johannelund","evening",29],[58.3894,15.6370,"Johannelund","lunch",31],
  [58.3950,15.6450,"Johannelund","evening",28],[58.4140,15.6100,"Innerstaden","lunch",15],[58.4168,15.6150,"Innerstaden","evening",16],
  [58.4088,15.6288,"Innerstaden","lunch",14],[58.4122,15.6320,"Innerstaden","evening",16],[58.4046,15.6115,"Ekkällan","evening",19],
  [58.3995,15.6133,"Ekkällan","lunch",22],[58.4028,15.6020,"Ekkällan","evening",23],[58.4310,15.6740,"Tallboda","evening",38],
  [58.4260,15.6810,"Tallboda","lunch",40],[58.4344,15.6650,"Tallboda","evening",36],[58.3798,15.6350,"Berga","evening",35],
  [58.3835,15.6220,"Berga","lunch",33],[58.3860,15.6460,"Berga","evening",34],[58.4080,15.5940,"Valla","evening",27]
];

const orders = orderSeed.map((d, i) => ({ id: i + 1, lat: d[0], lng: d[1], area: d[2], period: d[3], minutes: d[4] }));
let currentPeriod = "all";
let currentView = "orders";

const map = L.map("map", { zoomControl: false }).setView([restaurant.lat, restaurant.lng], 13);
L.control.zoom({ position: "bottomright" }).addTo(map);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap"
}).addTo(map);

const zones = [
  L.circle([restaurant.lat,restaurant.lng], { radius: 3000, color: "#55bd87", fillColor: "#55bd87", fillOpacity: .055, weight: 1 }),
  L.circle([restaurant.lat,restaurant.lng], { radius: 6000, color: "#ffc75f", fillColor: "#ffc75f", fillOpacity: .035, weight: 1 }),
  L.circle([restaurant.lat,restaurant.lng], { radius: 9000, color: "#ff7a70", fillColor: "#ff7a70", fillOpacity: .025, weight: 1 })
];
zones.slice().reverse().forEach(zone => zone.addTo(map));

const restaurantIcon = L.divIcon({ className: "", html: '<div class="restaurant-marker"><span>🍕</span></div>', iconSize: [40,40], iconAnchor: [20,38] });
L.marker([restaurant.lat,restaurant.lng], { icon: restaurantIcon, zIndexOffset: 1000 }).addTo(map).bindPopup("<strong>Demo Pizzeria</strong><br>Utgångspunkt för leveranser");

const markerLayer = L.layerGroup().addTo(map);
let heatLayer = null;
let estimateMarker = null;

function filteredOrders() {
  return currentPeriod === "all" ? orders : orders.filter(order => order.period === currentPeriod);
}

function orderIcon() {
  return L.divIcon({ className: "", html: '<div class="order-marker"></div>', iconSize: [15,15], iconAnchor: [7,7] });
}

function renderMap() {
  markerLayer.clearLayers();
  if (heatLayer) { map.removeLayer(heatLayer); heatLayer = null; }
  const visible = filteredOrders();
  if (currentView === "orders") {
    visible.forEach(order => {
      L.marker([order.lat,order.lng], { icon: orderIcon() })
        .bindPopup(`<div class="delivery-popup"><strong>Beställning #${String(order.id).padStart(3,"0")}</strong><span>${order.area}<br>Beräknad leverans: <b>${order.minutes} min</b></span></div>`)
        .addTo(markerLayer);
    });
  } else {
    heatLayer = L.heatLayer(visible.map(o => [o.lat,o.lng,o.period === "evening" ? .9 : .65]), {
      radius: 30, blur: 24, maxZoom: 16,
      gradient: { .2: "#7c63dc", .5: "#ffca67", .8: "#ff6b61" }
    }).addTo(map);
  }
  updateKpis(visible);
}

function updateKpis(visible) {
  const counts = visible.reduce((acc,o) => ((acc[o.area] = (acc[o.area] || 0) + 1), acc), {});
  const topArea = Object.entries(counts).sort((a,b) => b[1] - a[1])[0]?.[0] || "–";
  const average = Math.round(visible.reduce((sum,o) => sum + o.minutes,0) / visible.length);
  const onTime = Math.round(visible.filter(o => o.minutes <= 35).length / visible.length * 100);
  document.getElementById("orders-kpi").textContent = visible.length;
  document.getElementById("time-kpi").textContent = `${average} min`;
  document.getElementById("area-kpi").textContent = topArea;
  document.getElementById("ontime-kpi").textContent = `${onTime} %`;
}

function distanceKm(aLat,aLng,bLat,bLng) {
  const rad = n => n * Math.PI / 180;
  const R = 6371;
  const dLat = rad(bLat-aLat), dLng = rad(bLng-aLng);
  const h = Math.sin(dLat/2)**2 + Math.cos(rad(aLat))*Math.cos(rad(bLat))*Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

map.on("click", e => {
  const km = distanceKm(restaurant.lat,restaurant.lng,e.latlng.lat,e.latlng.lng);
  const roadFactor = 1.25;
  const travel = Math.round(10 + km * roadFactor * 4.2 + (currentPeriod === "evening" ? 5 : 0));
  let zone = "Utanför leveransområdet";
  if (km <= 3) zone = "Snabbzon"; else if (km <= 6) zone = "Standardzon"; else if (km <= 9) zone = "Utökad zon";
  if (estimateMarker) map.removeLayer(estimateMarker);
  estimateMarker = L.marker(e.latlng).addTo(map).bindPopup(`<div class="delivery-popup"><strong>Leveransprognos</strong><span>${zone}<br>Fågelväg: ${km.toFixed(1)} km<br>Beräknad tid: <b>${travel} min</b></span></div>`).openPopup();
});

document.querySelectorAll("#period-filter button").forEach(button => button.addEventListener("click", () => {
  document.querySelectorAll("#period-filter button").forEach(b => b.classList.remove("active"));
  button.classList.add("active"); currentPeriod = button.dataset.period; renderMap();
}));

document.querySelectorAll("#view-filter button").forEach(button => button.addEventListener("click", () => {
  document.querySelectorAll("#view-filter button").forEach(b => b.classList.remove("active"));
  button.classList.add("active"); currentView = button.dataset.view; renderMap();
}));

document.getElementById("fit-map").addEventListener("click", () => map.fitBounds([[58.375,15.545],[58.451,15.69]], { padding: [20,20] }));

const analysisSets = {
  all: [
    ["Förbered extra kapacitet","Efterfrågan är högst på kvällen. Planera fler utkörningar mellan 18:00 och 20:00."],
    ["Gruppera västra leveranser","Ryd och Lambohov bildar tydliga kluster. Samordnade körningar kan minska restiden."],
    ["Aktivera snabbzonen","Erbjud en tidsbegränsad kampanj inom tre kilometer när efterfrågan är lägre."]
  ],
  lunch: [
    ["Stärk luncherbjudandet","Lunchvolymen är lägre än kvällsvolymen. Prova ett tydligt vardagspaket kl. 11–14."],
    ["Fokusera nära centrum","Innerstaden och Vasastaden har korta leveranstider och lämpar sig för snabba lunchleveranser."],
    ["Testa företagsbeställningar","Marknadsför samlade lunchleveranser till små arbetsplatser inom snabbzonen."]
  ],
  evening: [
    ["Kvällen kräver kapacitet","De flesta synliga beställningarna sker på kvällen. Förbered ingredienser och förare före kl. 18."],
    ["Prioritera Ryd och Lambohov","Västra Linköping visar kvällens tydligaste efterfrågekluster."],
    ["Bevaka leveranstiden","Längre beställningar kan passera 35 minuter. Visa realistiska prognoser innan kunden beställer."]
  ]
};

document.getElementById("run-analysis").addEventListener("click", function () {
  const button = this;
  button.classList.add("loading"); button.innerHTML = "<span>✦</span> Analyserar kartdata…";
  setTimeout(() => {
    document.getElementById("analysis-content").innerHTML = analysisSets[currentPeriod].map((item,i) => `<article><span class="insight-number">0${i+1}</span><div><strong>${item[0]}</strong><p>${item[1]}</p></div></article>`).join("");
    button.classList.remove("loading"); button.innerHTML = "<span>✓</span> Analysen är klar";
    setTimeout(() => button.innerHTML = "<span>✦</span> Analysera aktuell vy", 1700);
  }, 850);
});

renderMap();
