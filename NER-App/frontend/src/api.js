function getApiBase() {
  // 1. Explicit build-time or env setting
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/$/, '');
  }
  // 2. Production fallback on Railway
  if (typeof window !== 'undefined' && window.location.hostname.includes('railway.app')) {
    return 'https://nerproject-production.up.railway.app';
  }
  // 3. Local dev fallback (Vite proxy forwards /api to http://127.0.0.1:5000)
  return '';
}

const API_BASE = getApiBase();
const BASE = `${API_BASE}/api/documents`;

async function req(url, opts) {
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const uploadDocument = (file) => {
  const fd = new FormData();
  fd.append('file', file);
  return req(BASE, { method: 'POST', body: fd });
};
export const listDocuments = () => req(BASE);
export const getDocument = (id) => req(`${BASE}/${id}`);
export const deleteDocument = (id) => req(`${BASE}/${id}`, { method: 'DELETE' });
export const reviewEntity = (docId, segIndex, entId, body) =>
  req(`${BASE}/${docId}/segments/${segIndex}/entities/${entId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

export const addEntity = (docId, segIndex, body) =>
  req(`${BASE}/${docId}/segments/${segIndex}/entities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

export const saveSegmentEntities = (docId, segIndex, entities) =>
  req(`${BASE}/${docId}/segments/${segIndex}/entities`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entities }),
  });

export const saveLineEntities = (docId, segIndex, body) =>
  req(`${BASE}/${docId}/segments/${segIndex}/line-entities`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

export const resetLine = (docId, segIndex, body) =>
  req(`${BASE}/${docId}/segments/${segIndex}/reset-line`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

export const resetSegment = (docId, segIndex) =>
  req(`${BASE}/${docId}/segments/${segIndex}/reset`, {
    method: 'POST',
  });

export const trainingDataUrl = (id) => (id ? `${BASE}/${id}/training-data` : `${BASE}/training-data`);
export const labelStudioExportUrl = (id) => `${BASE}/${id}/label-studio`;

