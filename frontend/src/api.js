const API_URL = "http://127.0.0.1:8000/api";

export async function getExperts() {
  const res = await fetch(`${API_URL}/experts/`);
  return res.json();
}

export async function createExpert(name) {
  const res = await fetch(`${API_URL}/experts/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  return res.json();
}

export async function getObjects() {
  const res = await fetch(`${API_URL}/objects/`);
  return res.json();
}

export async function createObject(data) {
  const res = await fetch(`${API_URL}/objects/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

// --- ДОДАНО ФУНКЦІЮ ---
export async function clearObjects() {
  const res = await fetch(`${API_URL}/clear-objects/`, {
    method: "POST",
  });
  return res.json();
}
// ----------------------

export async function uploadCSV(file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_URL}/upload-csv/`, {
    method: "POST",
    body: formData,
  });
  return res.json();
}

export async function loadSampleObjects() {
  const res = await fetch(`${API_URL}/load-samples/`, {
    method: "POST",
  });
  return res.json();
}

export async function saveRanking(order, expertId) {
  const res = await fetch(`${API_URL}/save-ranking/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order, expertId }),
  });
  return res.json();
}

export async function getLogs() {
  const res = await fetch(`${API_URL}/logs/`);
  return res.json();
}

export async function getMatrices() {
  const res = await fetch(`${API_URL}/latest-matrix/`);
  return res.json();
}

export function getCollectiveCSVUrl() {
  return `${API_URL}/collective-csv/`;
}

export async function getExpertRanking(expertId) {
  const res = await fetch(`${API_URL}/experts/${expertId}/ranking/`);
  return res.json();
}

export async function getConsensus(weights = {}) {
  const res = await fetch(`${API_URL}/calculate-consensus/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ weights }),
  });
  return res.json();
}

export async function runShowerInference(facts) {
  const res = await fetch(`${API_URL}/shower-inference/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ facts }),
  });
  return res.json();
}
