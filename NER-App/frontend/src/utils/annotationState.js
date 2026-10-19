/**
 * Pure helpers behind the passage view: keeping local totals in step with the
 * backend, and comparing span lists. Kept free of React so they can be tested
 * on their own.
 */

/** Mirrors computeStats in the backend's nerService, so local and saved totals agree. */
export function computeStatsLocal(segments) {
  let total = 0;
  let accepted = 0;
  let review = 0;
  let confidenceSum = 0;

  segments.forEach((seg) => {
    (seg.entities || []).forEach((e) => {
      if (e.status === 'deleted') return;
      total += 1;
      if (e.status === 'accepted') accepted += 1;
      else if (e.status === 'review') review += 1;
      confidenceSum += Number(e.confidence ?? 0);
    });
  });

  return {
    totalEntities: total,
    autoAccepted: accepted,
    needsReview: review,
    avgConfidence: total ? +(confidenceSum / total).toFixed(4) : 0,
  };
}

/** True when two span lists describe the same markup, ignoring ids. */
export function sameSpans(a = [], b = []) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].start !== b[i].start || a[i].end !== b[i].end || a[i].label !== b[i].label) {
      return false;
    }
  }
  return true;
}

/** Placeholder ids are client-side only; the API assigns the real ones. */
export const stripTempId = (e) => {
  if (e._id && String(e._id).startsWith('temp_')) {
    const { _id, ...rest } = e;
    return rest;
  }
  return e;
};
