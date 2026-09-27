const projects=[
  {name:'Dränering · Vreta',pos:[58.486,15.514],status:'new',icon:'◒'},
  {name:'Stensättning · Ljungsbro',pos:[58.506,15.501],status:'planned',icon:'◆'},
  {name:'Renovering · Linköping',pos:[58.410,15.621],status:'active',icon:'⌂'},
  {name:'Markarbete · Tannefors',pos:[58.402,15.671],status:'new',icon:'◒'},
  {name:'Trädgård · Vikingstad',pos:[58.382,15.430],status:'planned',icon:'✦'},
  {name:'Asfaltering · Mjölby',pos:[58.325,15.125],status:'active',icon:'═'},
  {name:'Husgrund · Sturefors',pos:[58.335,15.731],status:'new',icon:'⌂'},
  {name:'Snöröjning · Tallboda',pos:[58.425,15.682],status:'planned',icon:'✦'}
];
const crews=[
  {name:'Johan · Markteam',pos:[58.436,15.565],emoji:'🚜',color:'#5ce1e6'},
  {name:'Sara · Byggteam',pos:[58.398,15.596],emoji:'🚐',color:'#ff6b35'},
  {name:'Erik · Utemiljö',pos:[58.365,15.476],emoji:'🚚',color:'#b7f34a'}
];
const map=L.map('map',{zoomControl:true,attributionControl:true}).setView([58.407,15.56],10);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
const projectMarkers=[];
projects.forEach((p,i)=>{
  const icon=L.divIcon({className:'',html:`<div class="project-pin ${p.status}">${p.icon}</div>`,iconSize:[34,34],iconAnchor:[17,17]});
  const marker=L.marker(p.pos,{icon}).addTo(map).bindPopup(`<b>${p.name}</b><br><small>Projekt ${String(i+1).padStart(2,'0')}</small>`);
  marker.projectStatus=p.status;projectMarkers.push(marker);
});
const crewMarkers=crews.map(c=>L.marker(c.pos,{icon:L.divIcon({className:'',html:`<div class="crew-pin" style="border-color:${c.color}">${c.emoji}</div>`,iconSize:[40,40],iconAnchor:[20,20]})}).addTo(map).bindTooltip(c.name));
const routeLayer=L.layerGroup().addTo(map);

let slideIndex=0;const slides=[...document.querySelectorAll('.slide')];const dots=[...document.querySelectorAll('.slider-dots button')];
function showSlide(index){slideIndex=index;slides.forEach((s,i)=>s.classList.toggle('active',i===index));dots.forEach((d,i)=>d.classList.toggle('active',i===index));}
dots.forEach((d,i)=>d.addEventListener('click',()=>showSlide(i)));
setInterval(()=>showSlide((slideIndex+1)%slides.length),5000);

document.querySelectorAll('.status-chip').forEach(btn=>btn.addEventListener('click',()=>{
  document.querySelectorAll('.status-chip').forEach(x=>x.classList.remove('active'));btn.classList.add('active');
  const filter=btn.dataset.filter;projectMarkers.forEach(m=>filter==='all'||m.projectStatus===filter?m.addTo(map):m.remove());
}));

let planning=false,animationFrame;
const planBtn=document.getElementById('plan-btn');
function interpolate(a,b,t){return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]}
function animateCrew(marker,path,duration,delay){const start=performance.now()+delay;function frame(now){if(!planning)return;const t=Math.max(0,Math.min(1,(now-start)/duration));if(t>0){const seg=(path.length-1)*t;const i=Math.min(path.length-2,Math.floor(seg));marker.setLatLng(interpolate(path[i],path[i+1],seg-i));}if(t<1)animationFrame=requestAnimationFrame(frame)}animationFrame=requestAnimationFrame(frame)}
async function getRoadRoute(points){
  const coordinates=points.map(([lat,lng])=>`${lng},${lat}`).join(';');
  const url=`https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false`;
  const response=await fetch(url);
  if(!response.ok)throw new Error('Routing service unavailable');
  const data=await response.json();
  if(!data.routes?.[0]?.geometry?.coordinates)throw new Error('No road route found');
  return data.routes[0].geometry.coordinates.map(([lng,lat])=>[lat,lng]);
}
async function startPlanning(){if(planning)return;planning=true;planBtn.disabled=true;planBtn.innerHTML='<span>✦</span> Hämtar vägrutter…';routeLayer.clearLayers();
  const assignments=[[0,1,2],[2,3,6],[4,5,7]];let progress=8;
  document.getElementById('progress-bar').style.width=progress+'%';document.getElementById('progress-value').textContent=progress+'%';document.getElementById('plan-status').textContent='Hämtar riktiga vägar och gator…';
  const roadRoutes=await Promise.all(assignments.map(async(ids,ci)=>{
    const stops=[crews[ci].pos,...ids.map(id=>projects[id].pos)];
    try{return await getRoadRoute(stops)}catch(error){console.warn(error);return stops}
  }));
  if(!planning)return;
  roadRoutes.forEach((path,ci)=>{const route=L.polyline(path,{color:crews[ci].color,weight:5,opacity:.9,className:'route-line'}).addTo(routeLayer);route.bindTooltip(crews[ci].name);animateCrew(crewMarkers[ci],path,15000,700+ci*450)});
  const routeBounds=routeLayer.getBounds();if(routeBounds.isValid())map.fitBounds(routeBounds,{padding:[55,55]});
  planBtn.innerHTML='<span>▶</span> Teamen kör längs vägarna';progress=24;
  const timer=setInterval(()=>{progress=Math.min(100,progress+2);document.getElementById('progress-bar').style.width=progress+'%';document.getElementById('progress-value').textContent=progress+'%';document.getElementById('plan-status').textContent=progress<100?'Teamen följer optimerade vägrutter…':'Alla projekt är planerade';if(progress===100){clearInterval(timer);document.getElementById('progress-label').textContent='Planeringen är klar';document.getElementById('metric-saving').textContent='2 h 18 m';planBtn.innerHTML='<span>✓</span> Planeringen är klar';document.querySelectorAll('.state').forEach(s=>{s.textContent='Tilldelad';s.style.color='#b7f34a'})}},190)
}
function resetPlanning(){planning=false;cancelAnimationFrame(animationFrame);routeLayer.clearLayers();crewMarkers.forEach((m,i)=>m.setLatLng(crews[i].pos));document.getElementById('progress-bar').style.width='0';document.getElementById('progress-value').textContent='0%';document.getElementById('progress-label').textContent='AI-planering';document.getElementById('plan-status').textContent='8 projekt väntar på planering';document.getElementById('metric-saving').textContent='–';planBtn.disabled=false;planBtn.innerHTML='<span>▶</span> Starta smart planering';document.querySelectorAll('.state').forEach(s=>{s.textContent='Redo';s.style.color=''})}
planBtn.addEventListener('click',startPlanning);document.getElementById('reset-btn').addEventListener('click',resetPlanning);

const dialog=document.getElementById('project-dialog');document.getElementById('new-project-btn').addEventListener('click',()=>dialog.showModal());document.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());document.getElementById('project-form').addEventListener('submit',e=>{e.preventDefault();dialog.close();document.getElementById('metric-projects').textContent='9';document.getElementById('plan-status').textContent='9 projekt väntar på planering';});
window.addEventListener('resize',()=>map.invalidateSize());setTimeout(()=>map.invalidateSize(),250);
