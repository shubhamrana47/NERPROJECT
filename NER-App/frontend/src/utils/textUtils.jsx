import React from 'react';

export const ENTITY_TYPES = [
  'Agri_Method',
  'Agri_Pollution',
  'Agri_Process',
  'Agri_Waste',
  'Chemical',
  'Citation',
  'Crop',
  'Date_and_Time',
  'Disease',
  'Duration',
  'Event',
  'Field_Area',
  'Food_Item',
  'Fruit',
  'Humidity',
  'Location',
  'ML_Model',
  'Money',
  'Natural_Disaster',
  'Natural_Resource',
  'Nutrient',
  'Organism',
  'Organization',
  'Other',
  'Other_Quantity',
  'Person',
  'Policy',
  'Quantity',
  'Rainfall',
  'Season',
  'Soil',
  'Technology',
  'Temp',
  'Treatment',
  'Vegetable',
  'Weather',
];

export const statusStyle = {
  accepted: 'bg-green-100 border-green-400 text-green-950',
  approved: 'bg-green-200 border-green-600 text-green-950',
  edited: 'bg-blue-100 border-blue-400 text-blue-950',
  review: 'bg-amber-100 border-amber-400 text-amber-950',
};

/**
 * Returns Tailwind color classes based on entity threshold/confidence:
 * - Green if > 0.75
 * - Yellow if 0.50 to 0.75
 * - Red if < 0.50
 */
export function getConfidenceThresholdClass(confidence) {
  const conf = Number(confidence ?? 1.0);
  if (conf > 0.75) {
    return 'bg-green-100 text-green-950 border-green-400';
  }
  if (conf >= 0.50) {
    return 'bg-yellow-100 text-yellow-950 border-yellow-400';
  }
  return 'bg-red-100 text-red-950 border-red-400';
}

export function getConfidenceBadgeColor(confidence) {
  const conf = Number(confidence ?? 1.0);
  if (conf > 0.75) {
    return 'bg-green-500';
  }
  if (conf >= 0.50) {
    return 'bg-yellow-400';
  }
  return 'bg-red-500';
}

/**
 * Splits section text into sentences with exact character offsets.
 * Preserves decimal numbers (e.g. 1.5 litre, 0.5%) and abbreviations.
 */
export function splitSentencesWithOffsets(txt) {
  const sentences = [];
  let start = 0;
  for (let i = 0; i < txt.length; i++) {
    const ch = txt[i];
    const nextCh = txt[i + 1] || '';
    const prevCh = i > 0 ? txt[i - 1] : '';

    const isNewline = ch === '\n';
    const isPeriod =
      (ch === '.' || ch === '!' || ch === '?') &&
      !(/\d/.test(prevCh) && /\d/.test(nextCh)) && // avoid splitting 1.5 or 0.5%
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

/**
 * Renders highlighted text for a specific range [startOffset, endOffset]
 * Uses threshold-based coloring: green (>0.75), yellow (0.50-0.75), red (<0.50)
 */
export function renderHighlightedSpan(rawText, startOffset, endOffset, entities) {
  const relevant = entities
    .filter((e) => e.start >= startOffset && e.start < endOffset)
    .sort((a, b) => a.start - b.start);

  const parts = [];
  let pos = startOffset;

  relevant.forEach((e) => {
    if (e.start < pos) return;
    if (e.start > pos) {
      parts.push(rawText.slice(pos, e.start));
    }
    const chunkEnd = Math.min(e.end, endOffset);
    const colorClass = getConfidenceThresholdClass(e.confidence);
    parts.push(
      <mark
        key={e._id || `${e.start}-${e.end}`}
        className={`mx-0.5 rounded border px-1 py-0.5 font-medium ${colorClass}`}
        title={`${e.label} (${(Number(e.confidence ?? 1) * 100).toFixed(1)}%)`}
      >
        {rawText.slice(e.start, chunkEnd)}
        <sup className="ml-1 text-[10px] font-bold uppercase tracking-wider opacity-85">{e.label}</sup>
      </mark>
    );
    pos = chunkEnd;
  });

  if (pos < endOffset) {
    parts.push(rawText.slice(pos, endOffset));
  }
  return parts;
}
