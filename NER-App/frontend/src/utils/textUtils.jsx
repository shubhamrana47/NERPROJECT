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
    types: ['Agri_Equipment', 'Agri_Method', 'Agri_Process', 'Technology', 'ML_Model', 'Citation', 'Other'],
  },
];

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
