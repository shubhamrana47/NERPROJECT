import React, { useState, useMemo } from 'react';
import { getConfidenceThresholdClass } from '../utils/textUtils.jsx';

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

export default function SegmentCard({ seg, filter, onAction }) {
  const [viewMode, setViewMode] = useState('sentences'); // 'sentences' | 'block'

  const activeEnts = useMemo(
    () => seg.entities.filter((e) => e.status !== 'deleted'),
    [seg.entities]
  );

  if (filter === 'review' && !activeEnts.some((e) => e.status === 'review')) {
    return null;
  }

  // Split text into individual sentences
  const sentences = useMemo(() => splitSentencesWithOffsets(seg.text), [seg.text]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
      {/* Section Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            {seg.section || (seg.heading ? seg.heading : `Advisory Section ${seg.index + 1}`)}
          </span>
          <span className="text-xs text-slate-400">
            {seg.page != null ? `Page ${seg.page}` : ''}
            {seg.paragraph != null ? ` · Paragraph ${seg.paragraph}` : ''}
          </span>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">Display:</span>
          <button
            onClick={() => setViewMode('sentences')}
            className={`rounded px-2.5 py-1 font-medium transition ${
              viewMode === 'sentences'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Line by Line (Sentences)
          </button>
          <button
            onClick={() => setViewMode('block')}
            className={`rounded px-2.5 py-1 font-medium transition ${
              viewMode === 'block'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Full Block
          </button>
        </div>
      </div>

      {/* Mode 1: Sentence by Sentence (Line by Line) with Dedicated NER Results */}
      {viewMode === 'sentences' ? (
        <div className="space-y-4">
          {sentences.map((sent, sIdx) => {
            const sentEnts = activeEnts.filter(
              (e) => e.start >= sent.start && e.start < sent.end
            );
            const shownEnts =
              filter === 'review'
                ? sentEnts.filter((e) => e.status === 'review')
                : sentEnts;

            if (filter === 'review' && shownEnts.length === 0) return null;

            return (
              <div
                key={sIdx}
                className="rounded-lg border border-slate-200/80 bg-slate-50/50 p-4 transition hover:border-slate-300"
              >
                {/* Sentence Line Header */}
                <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-slate-600">Line {sIdx + 1}</span>
                  <span>{shownEnts.length} {shownEnts.length === 1 ? 'entity' : 'entities'}</span>
                </div>

                {/* Highlighted Sentence Text */}
                <div className="mb-3 leading-7 text-slate-800 text-sm">
                  {renderHighlightedSpan(seg.text, sent.start, sent.end, activeEnts)}
                </div>

                {/* Line by Line NER Results Table */}
                {shownEnts.length > 0 ? (
                  <div className="overflow-x-auto rounded border border-slate-200 bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-100 bg-slate-50 text-slate-500">
                        <tr>
                          <th className="px-3 py-2">Entity Text</th>
                          <th className="px-3 py-2">Class / Type</th>
                          <th className="px-3 py-2">Confidence</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {shownEnts.map((e) => (
                          <EntityRow
                            key={e._id || `${e.start}-${e.end}`}
                            e={e}
                            onAction={(b) => onAction(seg, e, b)}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs italic text-slate-400">No entities detected in this line.</p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Mode 2: Full Paragraph Block View */
        <div>
          <p className="mb-4 whitespace-pre-wrap leading-8 text-slate-800 text-sm">
            {renderHighlightedSpan(seg.text, 0, seg.text.length, activeEnts)}
          </p>
          {activeEnts.length > 0 && (
            <div className="overflow-x-auto rounded border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Entity Text</th>
                    <th className="px-3 py-2">Entity Type</th>
                    <th className="px-3 py-2">Confidence</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(filter === 'review'
                    ? activeEnts.filter((e) => e.status === 'review')
                    : activeEnts
                  ).map((e) => (
                    <EntityRow
                      key={e._id || `${e.start}-${e.end}`}
                      e={e}
                      onAction={(b) => onAction(seg, e, b)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EntityRow({ e, onAction }) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(e.label);
  const [text, setText] = useState(e.text);
  const pct = (e.confidence * 100).toFixed(1);
  const conf = Number(e.confidence ?? 1);
  const bar =
    conf > 0.75
      ? 'bg-green-500'
      : conf >= 0.5
      ? 'bg-yellow-400'
      : 'bg-red-500';
  const tagColor = getConfidenceThresholdClass(e.confidence);

  return (
    <tr className="hover:bg-slate-50/70">
      <td className="px-3 py-1.5 font-medium text-slate-900">
        {editing ? (
          <input
            className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
            value={text}
            onChange={(x) => setText(x.target.value)}
          />
        ) : (
          e.text
        )}
      </td>
      <td className="px-3 py-1.5">
        {editing ? (
          <select
            className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            value={label}
            onChange={(x) => setLabel(x.target.value)}
          >
            {!ENTITY_TYPES.includes(label) && <option value={label}>{label}</option>}
            {ENTITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        ) : (
          <span className={`inline-block rounded border px-2 py-0.5 text-[11px] font-semibold ${tagColor}`}>
            {e.label}
          </span>
        )}
      </td>
      <td className="px-3 py-1.5">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 rounded bg-slate-200">
            <div className={`h-1.5 rounded ${bar}`} style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[11px] text-slate-500">{pct}%</span>
        </div>
      </td>
      <td className="px-3 py-1.5 capitalize text-slate-600 text-[11px]">{e.status}</td>
      <td className="px-3 py-1.5 space-x-1 text-right whitespace-nowrap">
        {editing ? (
          <>
            <button
              className="rounded bg-blue-600 px-2 py-1 text-[11px] text-white hover:bg-blue-700"
              onClick={() => {
                onAction({ action: 'edit', label, text });
                setEditing(false);
              }}
            >
              Save
            </button>
            <button
              className="rounded bg-slate-200 px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-300"
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              className="rounded bg-green-600 px-2 py-0.5 text-[11px] text-white hover:bg-green-700"
              onClick={() => onAction({ action: 'accept' })}
            >
              Accept
            </button>
            <button
              className="rounded bg-blue-600 px-2 py-0.5 text-[11px] text-white hover:bg-blue-700"
              onClick={() => setEditing(true)}
            >
              Edit
            </button>
            <button
              className="rounded bg-red-600 px-2 py-0.5 text-[11px] text-white hover:bg-red-700"
              onClick={() => onAction({ action: 'delete' })}
            >
              Delete
            </button>
          </>
        )}
      </td>
    </tr>
  );
}
