const API_BASE = import.meta.env.VITE_API_URL || '';
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
export const trainingDataUrl = (id) => (id ? `${BASE}/${id}/training-data` : `${BASE}/training-data`);
