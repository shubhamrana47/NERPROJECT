import { summariseAnnotatedJsonl } from './utils/annotatedFile.js';

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

export const uploadDocumentWithoutNER = (file) => {
  const fd = new FormData();
  fd.append('file', file);
  return req(`${BASE}?skipNer=true`, { method: 'POST', body: fd });
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
  req(`${BASE}/${docId}/segments/${segIndex}/entities?lean=1`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entities }),
  });

/**
 * Asks the model to read a window of passages: the one on screen plus the next
 * few. Nothing is predicted at upload time, so annotation can start at once.
 */
export const predictSegments = (docId, window) =>
  req(`${BASE}/${docId}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(window),
  });

/**
 * The file is classified on upload, so the choice to annotate from scratch is
 * made after it arrives rather than as an upload parameter.
 */
export const skipInference = (docId) =>
  req(`${BASE}/${docId}/skip-inference`, { method: 'POST' });

/** Records that a person read a passage holding no entities. */
export const acknowledgeEmptyPassage = (docId, segIndex, acknowledged = true) =>
  req(`${BASE}/${docId}/segments/${segIndex}/nothing-to-validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ acknowledged }),
  });

// lean=1 asks the API to reply with counts and stats instead of echoing the
// whole document back, which on a large file is megabytes the client already
// has. The client applies its own update, so the echo is dead weight.
export const saveLineEntities = (docId, segIndex, body) =>
  req(`${BASE}/${docId}/segments/${segIndex}/line-entities?lean=1`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

export const resetLine = (docId, segIndex, body) =>
  req(`${BASE}/${docId}/segments/${segIndex}/reset-line?lean=1`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

export const resetSegment = (docId, segIndex) =>
  req(`${BASE}/${docId}/segments/${segIndex}/reset?lean=1`, {
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
 * Dataset exports for model training and for a gold benchmark. Sentences with
 * no entities are kept unless asked otherwise, since those negative examples
 * are a third of the corpus.
 */
export const datasetUrl = (id, options = {}) => {
  const params = new URLSearchParams();
  if (options.format) params.set('format', options.format);
  if (options.verified) params.set('verified', '1');
  if (options.lowConfidence) params.set('low_confidence', '1');
  if (options.includeEmpty === false) params.set('include_empty', '0');
  if (options.minConfidence) params.set('min_confidence', String(options.minConfidence));
  if (options.split) params.set('split', '1');
  if (options.download === false) params.set('download', 'false');
  const qs = params.toString() ? `?${params.toString()}` : '';
  return id ? `${BASE}/${id}/dataset${qs}` : `${BASE}/dataset${qs}`;
};

async function saveBlob(url, filename, { countLines = false } = {}) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Export failed with status ${res.status}`);

  // Read the body as text first when we want to describe it: the same text is
  // handed to the download, so nothing is fetched twice.
  const text = countLines ? await res.text() : null;
  const blob = countLines ? new Blob([text], { type: 'application/x-jsonlines' }) : await res.blob();

  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);

  if (!countLines) return { filename };

  // Counting the file beats trusting headers the browser may have hidden.
  const summary = summariseAnnotatedJsonl(text);
  return { ...summary, filename, bytes: blob.size };
}

/**
 * Downloads the annotated file: the uploaded records, each with its annotations
 * appended, and reports what the saved file actually contains.
 */
function getSmallTimestamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  const s = pad(date.getSeconds());
  return `${y}-${m}-${d}_${h}-${min}-${s}`;
}

export const downloadAnnotatedFile = async (docId, _docFilename = 'document', kind = 'annotate') => {
  // A validated file is a different thing from an annotated one, and the name
  // says which.
  const prefix = kind === 'validate' ? 'validated' : 'annotated';
  const filename = `${prefix}_${getSmallTimestamp()}.jsonl`;
  return saveBlob(datasetUrl(docId, {}), filename, { countLines: true });
};

/** Label Studio tasks, for review passes in Label Studio itself. */
export const downloadLabelStudioFile = async (docId, docFilename = 'document') => {
  const base = (docFilename || 'document').replace(/\.(json|jsonl)$/i, '');
  return saveBlob(labelStudioExportUrl(docId), `${base}_label_studio.json`);
};
