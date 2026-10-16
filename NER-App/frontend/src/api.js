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
  try {
    const res = await fetch(url, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  } catch (err) {
    if (err.name === 'TypeError' || err.message.toLowerCase().includes('fetch')) {
      throw new Error(
        `Unable to connect to backend (${url}). If the service is deploying or waking up on Railway, please wait a minute and retry.`
      );
    }
    throw err;
  }
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

export const trainingDataUrl = (id, options = {}) => {
  const params = new URLSearchParams();
  if (options.download !== false) params.set('download', 'true');
  if (options.format) params.set('format', options.format);
  if (options.as) params.set('as', options.as);
  const qs = params.toString() ? `?${params.toString()}` : '';
  return id ? `${BASE}/${id}/training-data${qs}` : `${BASE}/training-data${qs}`;
};

export const labelStudioExportUrl = (id) => `${BASE}/${id}/label-studio`;

/**
 * Triggers a real browser file download for training data (.json or .jsonl).
 */
export const downloadTrainingDataFile = async (docId, format = 'json', docFilename = 'document') => {
  const url = trainingDataUrl(docId, {
    download: true,
    as: format,
    format: 'lines',
  });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Export download failed with status ${res.status}`);
  const blob = await res.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  const baseName = (docFilename || 'document').replace(/\.(json|jsonl)$/i, '');
  link.download = `${baseName}_training_data.${format === 'jsonl' ? 'jsonl' : 'json'}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
};

/**
 * Triggers a real browser file download for Label Studio tasks JSON.
 */
export const downloadLabelStudioFile = async (docId, docFilename = 'document') => {
  const url = labelStudioExportUrl(docId);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Export download failed with status ${res.status}`);
  const blob = await res.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  const baseName = (docFilename || 'document').replace(/\.(json|jsonl)$/i, '');
  link.download = `${baseName}_label_studio.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
};

