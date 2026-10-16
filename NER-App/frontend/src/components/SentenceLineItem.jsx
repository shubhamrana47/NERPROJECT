import React from 'react';
import EntityRow from './EntityRow.jsx';
import { renderHighlightedSpan } from '../utils/textUtils.jsx';

export default function SentenceLineItem({
  sent,
  sIdx,
  seg,
  activeEnts,
  filter,
  onAction,
}) {
  const sentEnts = activeEnts.filter(
    (e) => e.start >= sent.start && e.start < sent.end
  );
  const shownEnts =
    filter === 'review'
      ? sentEnts.filter((e) => e.status === 'review')
      : sentEnts;

  if (filter === 'review' && shownEnts.length === 0) return null;

  return (
    <div className="rounded-lg border border-slate-200/80 bg-slate-50/50 p-4 transition hover:border-slate-300">
      {/* Sentence Line Header */}
      <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
        <span className="font-semibold text-slate-600">Line {sIdx + 1}</span>
        <span>
          {shownEnts.length} {shownEnts.length === 1 ? 'entity' : 'entities'}
        </span>
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
                <th className="px-3 py-2 font-semibold">Entity Text</th>
                <th className="px-3 py-2 font-semibold">Class / Type</th>
                <th className="px-3 py-2 font-semibold">Confidence</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 text-right font-semibold">Actions</th>
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
}
