/**
 * Export and Normalization Utilities for NER Annotations
 */

const CANONICAL_TYPES = [
  'Agri_Method', 'Agri_Pollution', 'Agri_Process', 'Agri_Waste', 'Chemical', 'Citation',
  'Crop', 'Date_and_Time', 'Disease', 'Duration', 'Event', 'Field_Area',
  'Food_Item', 'Fruit', 'Humidity', 'Location', 'ML_Model', 'Money',
  'Natural_Disaster', 'Natural_Resource', 'Nutrient', 'Organism', 'Organization', 'Other',
  'Other_Quantity', 'Person', 'Policy', 'Quantity', 'Rainfall', 'Season',
  'Soil', 'Technology', 'Temp', 'Treatment', 'Vegetable', 'Weather'
];

const CANONICAL_MAP = Object.fromEntries(
  CANONICAL_TYPES.map((t) => [t.toLowerCase().replace(/[\s_-]+/g, ''), t])
);

function normalizeLabel(rawLabel) {
  if (!rawLabel) return 'Other';
  const clean = String(rawLabel).replace(/^[BI]-/i, '').trim();
  const key = clean.toLowerCase().replace(/[\s_-]+/g, '');
  return CANONICAL_MAP[key] || clean;
}

function normalizeAndDeduplicateEntities(entities, segmentText = '') {
  if (!Array.isArray(entities) || entities.length === 0) return [];

  const candidates = [];
  const statusPriority = { edited: 3, approved: 2, accepted: 1, review: 0 };

  for (const ent of entities) {
    if (!ent) continue;
    let text = String(ent.text || '').trim();
    if (!text) continue;

    // Normalize inner whitespace
    text = text.replace(/\s+/g, ' ');

    let label = normalizeLabel(ent.label);
    let start = Number(ent.start ?? 0);
    let end = Number(ent.end ?? (start + text.length));

    // Align with segment text if offsets need calibration
    if (segmentText) {
      if (segmentText.slice(start, end).trim() !== text) {
        const found = segmentText.indexOf(text, Math.max(0, start - 25));
        if (found !== -1 && Math.abs(found - start) <= 30) {
          start = found;
          end = found + text.length;
        }
      }
    }

    if (end <= start) continue;

    candidates.push({
      text,
      label,
      start,
      end,
      confidence: Number(ent.confidence ?? 1.0),
      status: ent.status || 'accepted',
    });
  }

  // Sort: start ascending, then wider span first, then higher status priority, then confidence
  candidates.sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    if (a.end !== b.end) return b.end - a.end;
    const prioDiff = (statusPriority[b.status] || 0) - (statusPriority[a.status] || 0);
    if (prioDiff !== 0) return prioDiff;
    return b.confidence - a.confidence;
  });

  const unique = [];
  const seenSpans = new Set();
  const seenEntities = new Set();

  for (const e of candidates) {
    const spanKey = `${e.start}:${e.end}`;
    const entityKey = `${e.label.toLowerCase()}:${e.start}:${e.end}`;

    // Deduplicate: same span or same entity at that position
    if (seenSpans.has(spanKey) || seenEntities.has(entityKey)) continue;

    seenSpans.add(spanKey);
    seenEntities.add(entityKey);

    unique.push({
      text: e.text,
      label: e.label,
      start: e.start,
      end: e.end,
    });
  }

  // Sort final entities by ascending start offset
  unique.sort((a, b) => a.start - b.start || a.end - b.end);
  return unique;
}

// Splits section text into sentences with exact character offsets
function splitSentencesWithOffsets(txt) {
  const sentences = [];
  let start = 0;
  for (let i = 0; i < txt.length; i++) {
    const ch = txt[i];
    const nextCh = txt[i + 1] || '';
    const prevCh = i > 0 ? txt[i - 1] : '';

    const isNewline = ch === '\n';
    const isPeriod =
      (ch === '.' || ch === '!' || ch === '?') &&
      !(/\d/.test(prevCh) && /\d/.test(nextCh)) &&
      !(txt.slice(Math.max(0, i - 3), i).toLowerCase() === 'e.g') &&
      !(txt.slice(Math.max(0, i - 3), i).toLowerCase() === 'i.e') &&
      !(txt.slice(Math.max(0, i - 3), i).toLowerCase() === 'etc');

    if (isNewline || (isPeriod && (/\s/.test(nextCh) || i === txt.length - 1))) {
      const sentenceText = txt.slice(start, i + 1).trim();
      if (sentenceText) {
        sentences.push({
          start,
          end: i + 1,
          text: sentenceText,
        });
      }
      while (
        i + 1 < txt.length &&
        (txt[i + 1] === ' ' || txt[i + 1] === '\t' || txt[i + 1] === '\r' || txt[i + 1] === '\n')
      ) {
        i++;
      }
      start = i + 1;
    }
  }
  if (start < txt.length) {
    const remaining = txt.slice(start).trim();
    if (remaining) {
      sentences.push({ start, end: txt.length, text: remaining });
    }
  }
  return sentences;
}

module.exports = {
  CANONICAL_TYPES,
  CANONICAL_MAP,
  normalizeLabel,
  normalizeAndDeduplicateEntities,
  splitSentencesWithOffsets,
};
