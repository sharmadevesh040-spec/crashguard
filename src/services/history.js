export function logIncident(data) {
  try {
    const history = JSON.parse(localStorage.getItem('crashguard_history')) || [];
    const newIncident = {
      id: Date.now().toString(),
      date: new Date().toLocaleString(),
      timestamp: Date.now(),
      lat: data.lat || null,
      lng: data.lng || null,
      status: data.status || 'Unknown Incident'
    };
    history.unshift(newIncident);
    localStorage.setItem('crashguard_history', JSON.stringify(history));
  } catch(e) {
    console.error("Failed to log incident", e);
  }
}

export function getIncidentHistory() {
  try {
    return JSON.parse(localStorage.getItem('crashguard_history')) || [];
  } catch(e) {
    return [];
  }
}

export function clearIncidentHistory() {
  localStorage.removeItem('crashguard_history');
}
