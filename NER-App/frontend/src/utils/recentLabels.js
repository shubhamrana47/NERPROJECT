/**
 * Recently used entity labels.
 *
 * Which labels an annotator reaches for depends on the document: a crop
 * advisory is mostly Crop, Disease, Chemical and Quantity, and almost never
 * Person. The quick block therefore follows what has actually been used,
 * while the number keys stay bound to the fixed nine — a key that labelled
 * Crop a minute ago must still label Crop now.
 */

export const RECENT_KEY = 'fieldnote.recent-labels';
export const RECENT_LIMIT = 9;

/** localStorage throws in private windows and is absent outside the browser. */
function getStore() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch (_) {
    return null;
  }
}

export function readRecentLabels(store = getStore()) {
  if (!store) return [];
  try {
    const parsed = JSON.parse(store.getItem(RECENT_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((l) => typeof l === 'string' && l).slice(0, RECENT_LIMIT);
  } catch (_) {
    return [];
  }
}

export function writeRecentLabels(labels, store = getStore()) {
  if (!store) return false;
  try {
    store.setItem(RECENT_KEY, JSON.stringify(labels.slice(0, RECENT_LIMIT)));
    return true;
  } catch (_) {
    return false;
  }
}

/** Most recent first, no repeats, capped. */
export function addRecentLabel(labels, label) {
  if (!label) return labels;
  return [label, ...labels.filter((l) => l !== label)].slice(0, RECENT_LIMIT);
}

/**
 * The quick block: what has been used, then the keyed defaults to fill the
 * grid, so it is never empty and never shows a label that is not real.
 */
export function mergeQuickLabels(recent = [], fallback = [], isValid = () => true) {
  const seen = new Set();
  const out = [];
  const push = (label) => {
    if (!label || seen.has(label) || !isValid(label)) return;
    seen.add(label);
    out.push(label);
  };
  recent.forEach(push);
  fallback.forEach(push);
  return out.slice(0, RECENT_LIMIT);
}
