import React from 'react';
import EntityRow from './EntityRow.jsx';
import { renderHighlightedSpan } from '../utils/textUtils.jsx';

export default function FullBlockView({
  seg,
  activeEnts,
  filter,
  onAction,
}) {
  const filteredEnts =
    filter === 'review'
      ? activeEnts.filter((e) => e.status === 'review')
      : activeEnts;

  return (
    <div>
      <p className="mb-4 whitespace-pre-wrap leading-8 text-slate-800 text-sm">
        {renderHighlightedSpan(seg.text, 0, seg.text.length, activeEnts)}
      </p>

      {filteredEnts.length > 0 && (
        <div className="overflow-x-auto rounded border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-3 py-2 font-semibold">Entity Text</th>
                <th className="px-3 py-2 font-semibold">Entity Type</th>
                <th className="px-3 py-2 font-semibold">Confidence</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEnts.map((e) => (
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
  );
}
