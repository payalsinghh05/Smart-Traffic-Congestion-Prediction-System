// ── PASTE THIS FUNCTION into dashboard.js ──────────────────
// Call saveToHistory() right after you get the prediction result

function saveToHistory(src, dest, congestion, eta, dist) {
  const history = JSON.parse(localStorage.getItem('trafficiq_history') || '[]');
  const entry = {
    src: src.split(',')[0],
    dest: dest.split(',')[0],
    congestion: congestion,
    eta: eta,
    dist: dist,
    date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    datetime: new Date().toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  };
  history.unshift(entry);
  if (history.length > 50) history.pop(); // keep last 50
  localStorage.setItem('trafficiq_history', JSON.stringify(history));
}

// ── WHERE TO CALL IT in dashboard.js ───────────────────────
// After you get the result from /predict, add this line:
//
//   saveToHistory(source, destination, result.congestion,
//     Math.round(routeData.routes[0].duration / 60) + " min",
//     (routeData.routes[0].distance / 1000).toFixed(1) + " km"
//   );
