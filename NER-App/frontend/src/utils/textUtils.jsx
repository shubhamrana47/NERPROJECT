import React from 'react';

export const ENTITY_TYPES = [
  'Agri_Equipment',
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

/**
 * Each of the 36 entity types has a distinct, beautiful, accessible color palette.
 * - bg: soft, subtle pastel background
 * - text: deep, readable high-contrast entity-specific text color
 * - border: signature accent color for underline / border
 * - dot: vibrant indicator dot for the palette sidebar
 */
export const ENTITY_COLOR_MAP = {
  Person:            { bg: '#F5ECFD', text: '#5B1C84', border: '#8A3CBF', dot: '#9333EA' },
  Organization:      { bg: '#EBF2FE', text: '#1E3A8A', border: '#3B82F6', dot: '#3B82F6' },
  Location:          { bg: '#E6F8F5', text: '#115E59', border: '#0D9488', dot: '#0D9488' },
  Crop:              { bg: '#FEF6E9', text: '#8D5210', border: '#D97706', dot: '#D97706' },
  Date_and_Time:     { bg: '#FEECEE', text: '#9F1239', border: '#E11D48', dot: '#E11D48' },
  Chemical:          { bg: '#E0F8F6', text: '#0F766E', border: '#14B8A6', dot: '#14B8A6' },
  Disease:           { bg: '#FFE4E6', text: '#881337', border: '#F43F5E', dot: '#F43F5E' },
  Soil:              { bg: '#F5EFEB', text: '#574127', border: '#92791A', dot: '#92791A' },
  Weather:           { bg: '#E0F2FE', text: '#0369A1', border: '#0284C7', dot: '#0284C7' },
  Agri_Equipment:    { bg: '#F0E6DA', text: '#5C3B17', border: '#8A5A2B', dot: '#9A6B34' },
  Agri_Method:       { bg: '#FEF3C7', text: '#854D0E', border: '#D97706', dot: '#F59E0B' },
  Agri_Pollution:    { bg: '#FEE2E2', text: '#991B1B', border: '#EF4444', dot: '#EF4444' },
  Agri_Process:      { bg: '#FDF6B2', text: '#723B13', border: '#B45309', dot: '#D97706' },
  Agri_Waste:        { bg: '#FFEDD5', text: '#9A3412', border: '#EA580C', dot: '#EA580C' },
  Citation:          { bg: '#F1F5F9', text: '#334155', border: '#64748B', dot: '#64748B' },
  Duration:          { bg: '#EEF2FF', text: '#3730A3', border: '#6366F1', dot: '#6366F1' },
  Event:             { bg: '#FCE7F3', text: '#831843', border: '#DB2777', dot: '#EC4899' },
  Field_Area:        { bg: '#F3E8FF', text: '#581C87', border: '#7E22CE', dot: '#8B5CF6' },
  Food_Item:         { bg: '#FEF9C3', text: '#854D0E', border: '#CA8A04', dot: '#EAB308' },
  Fruit:             { bg: '#DCFCE7', text: '#15803D', border: '#16A34A', dot: '#22C55E' },
  Humidity:          { bg: '#E0F2FE', text: '#075985', border: '#0284C7', dot: '#0EA5E9' },
  ML_Model:          { bg: '#FAE8FF', text: '#86198F', border: '#C026D3', dot: '#D946EF' },
  Money:             { bg: '#DCFCE7', text: '#166534', border: '#15803D', dot: '#16A34A' },
  Natural_Disaster:  { bg: '#FEE2E2', text: '#991B1B', border: '#DC2626', dot: '#DC2626' },
  Natural_Resource:  { bg: '#ECFCCB', text: '#3F6212', border: '#65A30D', dot: '#84CC16' },
  Nutrient:          { bg: '#CFFAFE', text: '#155E75', border: '#0891B2', dot: '#06B6D4' },
  Organism:          { bg: '#FFEDD5', text: '#9A3412', border: '#F97316', dot: '#F97316' },
  Other:             { bg: '#F1F5F9', text: '#334155', border: '#64748B', dot: '#64748B' },
  Other_Quantity:    { bg: '#EDE9FE', text: '#4C1D95', border: '#6D28D9', dot: '#7C3AED' },
  Policy:            { bg: '#E2E8F0', text: '#1E293B', border: '#475569', dot: '#475569' },
  Quantity:          { bg: '#F3E8FF', text: '#6B21A8', border: '#9333EA', dot: '#A855F7' },
  Rainfall:          { bg: '#BAE6FD', text: '#0369A1', border: '#0284C7', dot: '#0284C7' },
  Season:            { bg: '#D1FAE5', text: '#065F46', border: '#059669', dot: '#059669' },
  Technology:        { bg: '#F5D0FE', text: '#701A75', border: '#A21CAF', dot: '#C026D3' },
  Temp:              { bg: '#FFE4E6', text: '#9F1239', border: '#E11D48', dot: '#EF4444' },
  Treatment:         { bg: '#CCFBF1', text: '#115E59', border: '#0D9488', dot: '#0D9488' },
  Vegetable:         { bg: '#DCFCE7', text: '#166534', border: '#15803D', dot: '#22C55E' },
};

/**
 * Priority list of top 9 entities assigned to keyboard shortcut keys 1 to 9.
 */
export const ENTITY_SHORTCUTS = [
  { key: '1', label: 'Person' },
  { key: '2', label: 'Organization' },
  { key: '3', label: 'Location' },
  { key: '4', label: 'Crop' },
  { key: '5', label: 'Date_and_Time' },
  { key: '6', label: 'Chemical' },
  { key: '7', label: 'Disease' },
  { key: '8', label: 'Soil' },
  { key: '9', label: 'Weather' },
];

/**
 * Returns clean readable label string (e.g. 'Date_and_Time' -> 'Date & time').
 */
export function formatEntityLabel(label) {
  if (!label) return '';
  if (label === 'Date_and_Time') return 'Date & time';
  return label.replace(/_/g, ' ');
}

/**
 * Formats a subcategory name for display, keeping `/` as the clear OR separator
 * (e.g. "Sowing / Planting / Transplanting") since parent and subtype are already
 * visually separated onto two stacked lines.
 */
export function formatSubtypeLabel(subtype) {
  if (!subtype) return '';
  return String(subtype).replace(/\s*\/\s*/g, ' / ');
}

/**
 * Returns styling object for an entity based strictly on its label (NOT confidence score).
 */
export function getEntityColorStyle(label) {
  const color = ENTITY_COLOR_MAP[label];
  if (!color) {
    return {
      bg: '#F1F5F9',
      text: '#1E293B',
      border: '#64748B',
      dot: '#64748B',
      backgroundColor: '#F1F5F9',
      color: '#1E293B',
      borderColor: '#64748B',
    };
  }
  return {
    ...color,
    backgroundColor: color.bg,
    color: color.text,
    borderColor: color.border,
  };
}

/**
 * Returns the dot color hex for a given entity label.
 */
export function getEntityDotColor(label) {
  return ENTITY_COLOR_MAP[label]?.dot || '#64748B';
}

/**
 * Descriptions for all 37 canonical agricultural entity types.
 */
export const ENTITY_DESCRIPTIONS = {
  Agri_Equipment: 'Agricultural equipment, tools, machinery, and implements used in farming',
  Agri_Method: 'Any methods, techniques helping agriculture',
  Agri_Pollution: 'Items that are causing pollution',
  Agri_Process: 'Types of Agricultural Process',
  Agri_Waste: 'Items of Agricultural wastes',
  Chemical: 'Names of Chemicals, Fertilizers, Pesticides, etc.',
  Citation: 'Names of any citations, citation formats, etc.',
  Crop: 'Names of grains, cereals, etc.',
  Date_and_Time: 'Any Date, time format',
  Disease: 'Names of Disease affecting plant growth',
  Duration: 'Number of days, months, time span',
  Event: 'Any Events, conferences',
  Field_Area: 'Any field are for cultivation',
  Food_Item: 'Names of any food items, products',
  Fruit: 'Names of any kinds of Fruits',
  Humidity: 'Any information related to Humidity',
  Location: 'Names of locations, places, cities',
  ML_Model: 'Any ML, mathematical models helping in agriculture',
  Money: 'Any currency, money amount',
  Natural_Disaster: 'Any disaster effecting plant growth',
  Natural_Resource: 'Any natural resources',
  Nutrient: 'Names of vitamins, carbohydrates',
  Organism: 'Names of Animal, Organism, Plant, etc.',
  Organization: 'Names of Org, Institutes, Industries, etc.',
  Other: 'Any Other potential tags',
  Other_Quantity: 'Other Quantity, and Measurements',
  Person: 'Names of Persons, farmers, etc.',
  Policy: 'Names of Govt. policies, aids, etc.',
  Quantity: 'Any crops. Fruits, etc. Quantiy',
  Rainfall: 'rainfall measurement, rainwater, etc.',
  Season: 'Names of Seasons',
  Soil: 'types of soil, soil preparations, etc.',
  Technology: 'Any Technology helping in agriculture',
  Temp: 'Any Temperatures related information',
  Treatment: 'Any treatment to recover from diseases',
  Vegetable: 'Any vegetable items',
  Weather: 'Any weather related information',
};

/**
 * Entity categories ordered alphabetically (A to Z), and within each
 * category, all entity types ordered alphabetically (A to Z).
 */
export const ENTITY_GROUPS = [
  {
    name: 'Actors & Policy',
    icon: '🏛️',
    types: ['Location', 'Organization', 'Person', 'Policy'],
  },
  {
    name: 'Chemicals & Nutrients',
    icon: '🧪',
    types: ['Chemical', 'Nutrient', 'Treatment'],
  },
  {
    name: 'Crops & Botanical',
    icon: '🌾',
    types: ['Crop', 'Food_Item', 'Fruit', 'Vegetable'],
  },
  {
    name: 'Methods & Technology',
    icon: '⚙️',
    types: ['Agri_Equipment', 'Agri_Method', 'Agri_Process', 'Citation', 'ML_Model', 'Other', 'Technology'],
  },
  {
    name: 'Pests & Diseases',
    icon: '🐛',
    types: ['Agri_Pollution', 'Agri_Waste', 'Disease', 'Organism'],
  },
  {
    name: 'Quantities & Time',
    icon: '📏',
    types: ['Date_and_Time', 'Duration', 'Event', 'Field_Area', 'Money', 'Other_Quantity', 'Quantity'],
  },
  {
    name: 'Weather & Environment',
    icon: '⛅',
    types: ['Humidity', 'Natural_Disaster', 'Natural_Resource', 'Rainfall', 'Season', 'Soil', 'Temp', 'Weather'],
  },
];

/**
 * Storage key for persisting manual annotation history across sessions.
 */
export const ANNOTATION_HISTORY_KEY = 'fieldnote.annotation-history';

/**
 * Records an entity annotation into local persistent history.
 */
export function recordAnnotationHistory(text, label) {
  if (!text || !label) return;
  const cleanText = text.trim();
  if (!cleanText) return;

  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const raw = window.localStorage.getItem(ANNOTATION_HISTORY_KEY);
    const history = raw ? JSON.parse(raw) : [];
    // Keep most recent first, max 600 items
    const next = [{ text: cleanText, label, timestamp: Date.now() }, ...history.filter(
      (h) => !(h.text.toLowerCase() === cleanText.toLowerCase() && h.label === label)
    )].slice(0, 600);
    window.localStorage.setItem(ANNOTATION_HISTORY_KEY, JSON.stringify(next));
  } catch (_) {}
}

/**
 * For every label, the (at most) `limit` words/phrases most often tagged with
 * it across the saved passages of a file. Matching ignores case; the casing
 * shown is the one used most. Deleted or rejected spans don't count.
 * Returns { [label]: [{ text, count }] }, sorted by count desc then text A-Z.
 */
export function getTopWordsByLabel(segments = [], limit = 5) {
  const byLabel = {};
  (Array.isArray(segments) ? segments : []).forEach((seg) => {
    (seg?.entities || []).forEach((e) => {
      if (!e?.label || e.status === 'deleted' || e.validationStatus === 'rejected') return;
      const raw = typeof e.text === 'string' ? e.text.trim().replace(/\s+/g, ' ') : '';
      if (!raw) return;
      const key = raw.toLowerCase();
      const words = (byLabel[e.label] ||= new Map());
      let entry = words.get(key);
      if (!entry) {
        entry = { count: 0, casings: new Map() };
        words.set(key, entry);
      }
      entry.count += 1;
      entry.casings.set(raw, (entry.casings.get(raw) || 0) + 1);
    });
  });

  const result = {};
  Object.entries(byLabel).forEach(([label, words]) => {
    result[label] = [...words.values()]
      .map(({ count, casings }) => ({
        text: [...casings.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0],
        count,
      }))
      .sort((a, b) => b.count - a.count || a.text.localeCompare(b.text))
      .slice(0, limit);
  });
  return result;
}

/**
 * For every (parent label, subtype) pair, returns at most `limit` words/phrases
 * most often tagged with that subcategory across the saved passages of a file.
 * Keyed as `${label}::${subtype}` -> [{ text, count }].
 */
export function getTopWordsBySubtype(segments = [], limit = 5) {
  const byKey = {};
  (Array.isArray(segments) ? segments : []).forEach((seg) => {
    (seg?.entities || []).forEach((e) => {
      if (!e?.label || !e?.subtype || e.status === 'deleted' || e.validationStatus === 'rejected') return;
      const raw = typeof e.text === 'string' ? e.text.trim().replace(/\s+/g, ' ') : '';
      if (!raw) return;
      const bucketKey = `${e.label}::${e.subtype}`;
      const wordKey = raw.toLowerCase();
      const words = (byKey[bucketKey] ||= new Map());
      let entry = words.get(wordKey);
      if (!entry) {
        entry = { count: 0, casings: new Map() };
        words.set(wordKey, entry);
      }
      entry.count += 1;
      entry.casings.set(raw, (entry.casings.get(raw) || 0) + 1);
    });
  });

  const result = {};
  Object.entries(byKey).forEach(([bucketKey, words]) => {
    result[bucketKey] = [...words.values()]
      .map(({ count, casings }) => ({
        text: [...casings.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0],
        count,
      }))
      .sort((a, b) => b.count - a.count || a.text.localeCompare(b.text))
      .slice(0, limit);
  });
  return result;
}

/**
 * Computes at most top 5 predictions of how a selected text was annotated earlier.
 * Scans across current working entities, all document passages (entities and originalEntities),
 * and persistent local annotation history.
 */
export function getTopEarlierAnnotations(text, doc, workingEntities = []) {
  if (!text || typeof text !== 'string') return [];
  const q = text.trim().toLowerCase();
  if (!q) return [];

  const labelStats = {};

  const registerOccurrence = (entTextRaw, label, source = 'doc', confidence = 1.0) => {
    if (!label || !entTextRaw) return;
    const entText = entTextRaw.trim().toLowerCase();
    if (!entText) return;

    const isExact = entText === q;
    const isPartial = !isExact && (entText.includes(q) || q.includes(entText)) && (q.length >= 3 || entText.length >= 3);

    if (isExact || isPartial) {
      if (!labelStats[label]) {
        labelStats[label] = { label, exact: 0, partial: 0, score: 0, confSum: 0, confCount: 0 };
      }
      if (isExact) {
        labelStats[label].exact += 1;
        labelStats[label].score += (source === 'human' || source === 'manual' ? 12 : 10);
      } else {
        labelStats[label].partial += 1;
        labelStats[label].score += (source === 'human' || source === 'manual' ? 3 : 2);
      }
      if (typeof confidence === 'number') {
        labelStats[label].confSum += confidence;
        labelStats[label].confCount += 1;
      }
    }
  };

  // 1. Current working entities
  if (Array.isArray(workingEntities)) {
    workingEntities.forEach((e) => {
      if (e?.status === 'deleted' || e?.validationStatus === 'rejected') return;
      registerOccurrence(e?.text, e?.label, e?.source || 'human', e?.confidence ?? 1.0);
    });
  }

  // 2. All passages in current document
  if (doc?.segments && Array.isArray(doc.segments)) {
    doc.segments.forEach((seg) => {
      (seg.entities || []).forEach((e) => {
        if (e?.status === 'deleted' || e?.validationStatus === 'rejected') return;
        registerOccurrence(e?.text, e?.label, e?.source, e?.confidence ?? 1.0);
      });
      (seg.originalEntities || []).forEach((e) => {
        if (e?.status === 'deleted' || e?.validationStatus === 'rejected') return;
        registerOccurrence(e?.text, e?.label, e?.source || 'model', e?.confidence ?? 1.0);
      });
    });
  }

  // 3. Persistent history in localStorage
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(ANNOTATION_HISTORY_KEY);
      if (raw) {
        const history = JSON.parse(raw);
        if (Array.isArray(history)) {
          history.forEach((h) => {
            if (h?.text && h?.label) {
              registerOccurrence(h.text, h.label, 'history', 1.0);
            }
          });
        }
      }
    }
  } catch (_) {}

  const list = Object.values(labelStats);
  if (list.length === 0) return [];

  const totalExact = list.reduce((acc, curr) => acc + (curr.exact > 0 ? curr.exact : curr.partial), 0);

  list.forEach((item) => {
    const primary = item.exact > 0 ? item.exact : item.partial;
    item.count = primary;
    item.percentage = totalExact > 0 ? Math.round((primary / totalExact) * 100) : 0;
    item.avgConfidence = item.confCount > 0 ? item.confSum / item.confCount : null;
  });

  // Sort descending by exact occurrences, then score, then confidence
  list.sort((a, b) => b.exact - a.exact || b.score - a.score || (b.avgConfidence || 0) - (a.avgConfidence || 0));

  // Return at most top 5 predictions
  return list.slice(0, 5);
}

// Legacy CATEGORY_COLORS kept for backward compatibility but now unused in favor of ENTITY_COLOR_MAP
export const CATEGORY_COLORS = {};

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
 * Uses entity-specific coloring from ENTITY_COLOR_MAP.
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
    const colorStyle = getEntityColorStyle(e.label);
    parts.push(
      <mark
        key={e._id || `${e.start}-${e.end}`}
        className="mx-0.5 rounded border px-1 py-0.5 font-medium"
        style={colorStyle}
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
