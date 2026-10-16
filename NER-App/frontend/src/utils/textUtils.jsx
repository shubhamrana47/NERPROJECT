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

export const ENTITY_GROUPS = [
  {
    name: 'Crops & Botanical',
    icon: '🌾',
    types: ['Crop', 'Fruit', 'Vegetable', 'Food_Item'],
  },
  {
    name: 'Pests & Diseases',
    icon: '🐛',
    types: ['Disease', 'Organism', 'Agri_Pollution', 'Agri_Waste'],
  },
  {
    name: 'Chemicals & Nutrients',
    icon: '🧪',
    types: ['Chemical', 'Treatment', 'Nutrient'],
  },
  {
    name: 'Weather & Environment',
    icon: '⛅',
    types: ['Weather', 'Rainfall', 'Temp', 'Humidity', 'Season', 'Natural_Disaster', 'Natural_Resource', 'Soil'],
  },
  {
    name: 'Quantities & Time',
    icon: '📏',
    types: ['Quantity', 'Other_Quantity', 'Field_Area', 'Duration', 'Money', 'Date_and_Time', 'Event'],
  },
  {
    name: 'Actors & Policy',
    icon: '🏛️',
    types: ['Person', 'Organization', 'Location', 'Policy'],
  },
  {
    name: 'Methods & Technology',
    icon: '⚙️',
    types: ['Agri_Method', 'Agri_Process', 'Technology', 'ML_Model', 'Citation', 'Other'],
  },
];

export const CATEGORY_COLORS = {
  // Crops & Plants
  Crop: 'bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200',
  Fruit: 'bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200',
  Vegetable: 'bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200',
  Food_Item: 'bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200',

  // Diseases & Organisms
  Disease: 'bg-rose-100 text-rose-900 border-rose-300 hover:bg-rose-200',
  Organism: 'bg-rose-100 text-rose-900 border-rose-300 hover:bg-rose-200',
  Agri_Pollution: 'bg-rose-100 text-rose-900 border-rose-300 hover:bg-rose-200',
  Agri_Waste: 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200',

  // Chemicals & Treatments
  Chemical: 'bg-teal-100 text-teal-900 border-teal-300 hover:bg-teal-200',
  Treatment: 'bg-teal-100 text-teal-900 border-teal-300 hover:bg-teal-200',
  Nutrient: 'bg-cyan-100 text-cyan-900 border-cyan-300 hover:bg-cyan-200',

  // Weather & Environment
  Weather: 'bg-sky-100 text-sky-900 border-sky-300 hover:bg-sky-200',
  Rainfall: 'bg-sky-100 text-sky-900 border-sky-300 hover:bg-sky-200',
  Temp: 'bg-sky-100 text-sky-900 border-sky-300 hover:bg-sky-200',
  Humidity: 'bg-sky-100 text-sky-900 border-sky-300 hover:bg-sky-200',
  Season: 'bg-sky-100 text-sky-900 border-sky-300 hover:bg-sky-200',
  Natural_Disaster: 'bg-red-100 text-red-900 border-red-300 hover:bg-red-200',
  Natural_Resource: 'bg-lime-100 text-lime-900 border-lime-300 hover:bg-lime-200',
  Soil: 'bg-amber-100 text-amber-900 border-amber-400 hover:bg-amber-200',

  // Quantities & Time
  Quantity: 'bg-purple-100 text-purple-900 border-purple-300 hover:bg-purple-200',
  Other_Quantity: 'bg-purple-100 text-purple-900 border-purple-300 hover:bg-purple-200',
  Field_Area: 'bg-purple-100 text-purple-900 border-purple-300 hover:bg-purple-200',
  Duration: 'bg-purple-100 text-purple-900 border-purple-300 hover:bg-purple-200',
  Money: 'bg-emerald-100 text-emerald-900 border-emerald-400 hover:bg-emerald-200',
  Date_and_Time: 'bg-blue-100 text-blue-900 border-blue-300 hover:bg-blue-200',
  Event: 'bg-blue-100 text-blue-900 border-blue-300 hover:bg-blue-200',

  // Entity Actors
  Person: 'bg-indigo-100 text-indigo-900 border-indigo-300 hover:bg-indigo-200',
  Organization: 'bg-indigo-100 text-indigo-900 border-indigo-300 hover:bg-indigo-200',
  Location: 'bg-violet-100 text-violet-900 border-violet-300 hover:bg-violet-200',
  Policy: 'bg-slate-200 text-slate-900 border-slate-400 hover:bg-slate-300',

  // Tech & Methods
  Agri_Method: 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200',
  Agri_Process: 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200',
  Technology: 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200',
  ML_Model: 'bg-fuchsia-100 text-fuchsia-900 border-fuchsia-300 hover:bg-fuchsia-200',
  Citation: 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200',
  Other: 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200',
};

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
