// ═══════════════════════════════════════════════════════════
// TrafficIQ — dashboard.js v4.0
// Features: dual map, turn-by-turn nav, future prediction,
//           save favorites, save history, prefill support
// ═══════════════════════════════════════════════════════════

// ── 1. Session ───────────────────────────────────────────────
document.getElementById("headerUser").textContent = localStorage.getItem("username") || "Guest";
const userId   = localStorage.getItem("user_id");
const username = localStorage.getItem("username") || "Guest";

// Pre-fill from History / Profile REUSE button
window.addEventListener('load', () => {
  const ps = localStorage.getItem('prefill_src');
  const pd = localStorage.getItem('prefill_dest');
  if (ps) { document.getElementById('source').value      = ps; localStorage.removeItem('prefill_src');  }
  if (pd) { document.getElementById('destination').value = pd; localStorage.removeItem('prefill_dest'); }
  // Set default future day to today
  document.getElementById('futureDay').value = new Date().getDay();
  document.getElementById('futureHour').value = new Date().getHours();
});

// ── 2. Map Setup ──────────────────────────────────────────────
var map = L.map('map').setView([19.0760, 72.8777], 12);

var streetLayer = L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
  { maxZoom: 19, attribution: 'Tiles © Esri' }
);

var satelliteLayer = L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  { maxZoom: 19, attribution: 'Tiles © Esri' }
);

streetLayer.addTo(map);
let currentMapMode = 'street';

function switchMap(mode) {
  if (mode === currentMapMode) return;
  if (mode === 'satellite') {
    map.removeLayer(streetLayer);
    satelliteLayer.addTo(map);
    document.getElementById('btnStreet').classList.remove('active');
    document.getElementById('btnSat').classList.add('active');
  } else {
    map.removeLayer(satelliteLayer);
    streetLayer.addTo(map);
    document.getElementById('btnSat').classList.remove('active');
    document.getElementById('btnStreet').classList.add('active');
  }
  currentMapMode = mode;
}

let routeLayer;
let currentRouteData = null;

// ── 3. Geocoding ──────────────────────────────────────────────
async function geocode(place) {
  const url  = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place)}`;
  const res  = await fetch(url);
  const data = await res.json();
  if (!data || data.length === 0) return null;
  return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
}

// ── 4. GPS Current Location ───────────────────────────────────
async function useCurrentLocation() {
  if (!navigator.geolocation) { alert("Geolocation not supported!"); return; }
  navigator.geolocation.getCurrentPosition(async (pos) => {
    const { latitude, longitude } = pos.coords;
    const url  = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
    const res  = await fetch(url);
    const data = await res.json();
    const address = data.display_name.split(',').slice(0, 2).join(', ');
    document.getElementById("source").value = address;
    L.circleMarker([latitude, longitude], {
      radius: 10, color: '#10b981', fillColor: '#10b981', fillOpacity: 1
    }).addTo(map).bindPopup("📍 You are here").openPopup();
    map.setView([latitude, longitude], 14);
  }, (err) => alert("Could not get location: " + err.message));
}

// ── 5. Turn-by-Turn Navigation Renderer ──────────────────────
function renderNavSteps(steps) {
  const container = document.getElementById('navSteps');
  if (!steps || steps.length === 0) {
    container.innerHTML = '<div class="nav-empty"><i class="fa-solid fa-map-signs"></i>No steps available</div>';
    return;
  }

  const maneuverIcon = (type) => {
    const icons = {
      'turn-left':        '↰', 'turn-right':       '↱',
      'slight left':      '↖', 'slight right':      '↗',
      'sharp left':       '⬅', 'sharp right':       '➡',
      'u-turn':           '↩', 'roundabout':        '⟳',
      'depart':           '🟢','arrive':             '🔴',
      'merge':            '⤵', 'fork':              '⑂',
      'straight':         '↑', 'continue':          '↑',
    };
    if (type === 'depart') return { icon: '🚀', cls: 'start' };
    if (type === 'arrive') return { icon: '🏁', cls: 'end'   };
    const key = Object.keys(icons).find(k => type && type.includes(k));
    return { icon: icons[key] || '↑', cls: 'turn' };
  };

  const html = steps.map((step, i) => {
    const name     = step.name || 'Continue';
    const dist     = step.distance >= 1000
      ? (step.distance / 1000).toFixed(1) + ' km'
      : Math.round(step.distance) + ' m';
    const mType    = step.maneuver?.type || (i === 0 ? 'depart' : 'straight');
    const mMod     = step.maneuver?.modifier || '';
    const typeKey  = i === steps.length - 1 ? 'arrive' : `${mType} ${mMod}`.trim();
    const { icon, cls } = maneuverIcon(typeKey);

    return `
      <div class="nav-step">
        <div class="step-icon ${cls}">${icon}</div>
        <div class="step-info">
          <div>${i === 0 ? 'Start at ' : i === steps.length - 1 ? 'Arrive at ' : ''}${name}</div>
          <div class="step-dist">${dist}</div>
        </div>
      </div>`;
  }).join('');

  container.innerHTML = html;
}

// ── 6. Save to History ────────────────────────────────────────
function saveToHistory(src, dest, congestion, eta, dist) {
  const history = JSON.parse(localStorage.getItem('trafficiq_history') || '[]');
  history.unshift({
    src:        src.split(',')[0].trim(),
    dest:       dest.split(',')[0].trim(),
    congestion: congestion,
    eta:        eta,
    dist:       dist,
    date:       new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    datetime:   new Date().toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  });
  if (history.length > 50) history.pop();
  localStorage.setItem('trafficiq_history', JSON.stringify(history));
}

// ── 7. Save Favorite ──────────────────────────────────────────
async function saveFavorite() {
  const src  = document.getElementById("source").value.trim();
  const dest = document.getElementById("destination").value.trim();
  if (!userId || userId === "null") { alert("Please login to save favorites!"); return; }
  if (!src || !dest) { alert("Please analyze a route first!"); return; }
  try {
    const res  = await fetch("http://127.0.0.1:5000/save_favorite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, source: src, destination: dest })
    });
    const data = await res.json();
    if (res.ok) {
      const favs = JSON.parse(localStorage.getItem('trafficiq_favorites') || '[]');
      favs.unshift({
        src:  src.split(',')[0].trim(),
        dest: dest.split(',')[0].trim(),
        date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      });
      if (favs.length > 20) favs.pop();
      localStorage.setItem('trafficiq_favorites', JSON.stringify(favs));
      alert("⭐ Route saved to favorites!");
    } else {
      alert(data.message || "Could not save route.");
    }
  } catch {
    alert("⚠ Backend offline — make sure app.py is running!");
  }
}

// ── 8. Main Route Analysis ────────────────────────────────────
async function drawRoute() {
  const source      = document.getElementById("source").value.trim();
  const destination = document.getElementById("destination").value.trim();
  if (!source || !destination) { alert("Please enter both source and destination"); return; }

  const btn = document.getElementById('analyzeBtn');
  btn.classList.add('loading');
  btn.innerHTML = '⏳ Analyzing...';

  try {
    const src  = await geocode(source);
    const dest = await geocode(destination);
    if (!src || !dest) {
      alert("Location not found. Try adding city name (e.g. 'Thane, Mumbai').");
      return;
    }

    // Fetch routes with step-by-step instructions
    const routeURL = `https://router.project-osrm.org/route/v1/driving/${src[1]},${src[0]};${dest[1]},${dest[0]}?overview=full&geometries=geojson&alternatives=true&steps=true`;
    const routeRes  = await fetch(routeURL);
    const routeData = await routeRes.json();
    currentRouteData = routeData;

    if (!routeData.routes || routeData.routes.length === 0) {
      alert("No route found between these locations.");
      return;
    }

    // Clear previous layers
    if (routeLayer) map.removeLayer(routeLayer);
    routeLayer = L.featureGroup().addTo(map);

    // Draw routes
    routeData.routes.forEach((route, index) => {
      const isFastest = (index === 0);
      L.geoJSON(route.geometry, {
        style: {
          color:   index === 0 ? "#10b981" : index === 1 ? "#f59e0b" : "#3b82f6",
          weight:  isFastest ? 7 : 4,
          opacity: isFastest ? 1  : 0.55
        }
      }).addTo(routeLayer);
    });

    map.fitBounds(routeLayer.getBounds(), { padding: [30, 30] });

    // Place markers
    L.marker(src).addTo(map).bindPopup(`🟢 <b>Start:</b> ${source}`);
    L.marker(dest).addTo(map).bindPopup(`🔴 <b>End:</b> ${destination}`).openPopup();

    // Update metrics
    const etaMin = Math.round(routeData.routes[0].duration / 60);
    const distKm = (routeData.routes[0].distance / 1000).toFixed(1);
    const now          = new Date();
    const vehicleCount = Math.floor(Math.random() * 150) + 30;
    const avgSpeed     = Math.floor(Math.random() * 40) + 10;

    document.getElementById("stat-vehicles").innerText = vehicleCount;
    document.getElementById("stat-speed").innerText    = avgSpeed + " km/h";
    document.getElementById("stat-eta").innerText      = etaMin + " mins";
    document.getElementById("stat-dist").innerText     = distKm + " km";

    // Render turn-by-turn navigation steps
    const steps = routeData.routes[0].legs[0]?.steps || [];
    renderNavSteps(steps);

    // ML Prediction
    const response = await fetch("http://127.0.0.1:5000/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hour:          now.getHours(),
        day:           now.getDay(),
        vehicle_count: vehicleCount,
        avg_speed:     avgSpeed
      })
    });

    const result     = await response.json();
    const congestion = result.congestion;

    document.getElementById("lastUpdated").innerText = "Last updated: " + now.toLocaleTimeString();

    // Update badge
    const resultDiv = document.getElementById("result");
    const icons = { High: "🔴", Medium: "🟡", Low: "🟢" };
    resultDiv.innerText  = `${icons[congestion] || ''} AI Status: ${congestion} Congestion`;
    resultDiv.className  = "prediction-badge " + (congestion || "").toLowerCase();

    // Save to history
    saveToHistory(source, destination, congestion, etaMin + " min", distKm + " km");

  } catch (error) {
    console.error("Error:", error);
    alert("⚠ Make sure your Python backend (app.py) is running on port 5000!");
  } finally {
    btn.classList.remove('loading');
    btn.innerHTML = 'Analyze Traffic <i class="fa-solid fa-magnifying-glass-chart"></i>';
  }
}

// ── 9. Future Traffic Prediction ─────────────────────────────
async function predictFuture() {
  const hour = parseInt(document.getElementById('futureHour').value);
  const day  = parseInt(document.getElementById('futureDay').value);

  if (isNaN(hour) || hour < 0 || hour > 23) {
    alert("Please enter a valid hour between 0 and 23.");
    return;
  }

  // Simulate realistic vehicle count and speed based on hour
  const isRush = (hour >= 7 && hour <= 10) || (hour >= 17 && hour <= 20);
  const isNight = hour >= 23 || hour <= 5;
  const vehicleCount = isRush ? 120 + Math.floor(Math.random()*40) :
                       isNight ? 10 + Math.floor(Math.random()*20) :
                       50 + Math.floor(Math.random()*50);
  const avgSpeed = isRush ? 10 + Math.floor(Math.random()*15) :
                   isNight ? 55 + Math.floor(Math.random()*20) :
                   30 + Math.floor(Math.random()*20);

  try {
    const res  = await fetch("http://127.0.0.1:5000/predict_future", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hour, day, vehicle_count: vehicleCount, avg_speed: avgSpeed })
    });
    const data = await res.json();

    const resultEl = document.getElementById('futureResult');
    const levelEl  = document.getElementById('futureLevel');
    const tipEl    = document.getElementById('futureTip');

    const icons = { High: "🔴", Medium: "🟡", Low: "🟢" };
    const days  = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

    levelEl.innerHTML = `${icons[data.congestion] || ''} <strong>${data.congestion} Congestion</strong>
      <br><small style="font-weight:400;opacity:0.75;">${days[day]} at ${hour}:00</small>`;
    tipEl.textContent  = data.tip || "";
    resultEl.className = `future-result show ${data.congestion}`;

  } catch {
    // Offline fallback — predict locally
    const isRushHour = (hour >= 7 && hour <= 10) || (hour >= 17 && hour <= 20);
    const isWeekend  = day === 0 || day === 6;
    let congestion   = isRushHour && !isWeekend ? "High" :
                       (hour >= 10 && hour <= 16) ? "Medium" : "Low";

    const resultEl = document.getElementById('futureResult');
    resultEl.className = `future-result show ${congestion}`;
    document.getElementById('futureLevel').innerHTML =
      `${congestion === 'High' ? '🔴' : congestion === 'Medium' ? '🟡' : '🟢'}
       <strong>${congestion} Congestion</strong><br>
       <small style="font-weight:400;opacity:0.75;">(Offline estimate)</small>`;
    document.getElementById('futureTip').textContent =
      congestion === 'High'   ? "Expect heavy congestion. Leave earlier or use an alternate route." :
      congestion === 'Medium' ? "Moderate traffic expected. Allow extra time." :
                                "Roads should be clear. Great time to travel!";
  }
}

// ── 10. Hourly Chart ──────────────────────────────────────────
function renderHourlyChart() {
  const ctx = document.getElementById('trafficChart').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['6am','7am','8am','9am','10am','12pm','2pm','4pm','5pm','6pm','7pm','8pm','10pm'],
      datasets: [{
        label: 'Congestion Index',
        data:  [35, 65, 95, 90, 60, 50, 45, 65, 90, 95, 70, 55, 25],
        backgroundColor: [
          '#10b981','#f59e0b','#ef4444','#ef4444','#f59e0b',
          '#10b981','#10b981','#f59e0b','#ef4444','#ef4444',
          '#f59e0b','#f59e0b','#10b981'
        ],
        borderRadius: 5
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, max: 100, grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 } } },
        x: { grid: { display: false }, ticks: { font: { size: 9 } } }
      }
    }
  });
}

renderHourlyChart();