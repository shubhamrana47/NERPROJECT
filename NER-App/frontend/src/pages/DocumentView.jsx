import React, { useState } from 'react';
import { reviewEntity, trainingDataUrl } from '../api.js';
import SegmentCard from '../components/SegmentCard.jsx';

export default function DocumentView({ doc, onChange }) {
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');

  const act = async (seg, ent, body) => {
    try { onChange(await reviewEntity(doc._id, seg.index, ent._id, body)); }
    catch (e) { setError(e.message); }
  };
  const s = doc.stats || {};

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 rounded-lg bg-white p-4 shadow">
        <div className="mr-auto">
          <h2 className="text-lg font-semibold">{doc.filename}</h2>
          <p className="text-xs text-slate-400">Threshold {doc.threshold}</p>
        </div>
        <Stat label="Entities" value={s.totalEntities} />
        <Stat label="Auto-accepted" value={s.autoAccepted} color="text-green-600" />
        <Stat label="Needs review" value={s.needsReview} color="text-amber-600" />
        <Stat label="Avg confidence" value={s.avgConfidence} />
        <select className="rounded border p-2 text-sm" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All entities</option>
          <option value="review">Needs review only</option>
        </select>
        <a className="rounded bg-indigo-600 px-3 py-2 text-sm text-white" href={trainingDataUrl(doc._id)} target="_blank" rel="noreferrer">
          Export training data
        </a>
      </div>
      {error && <div className="rounded bg-red-100 p-3 text-red-700">{error}</div>}
      {doc.segments.map((seg) => (
        <SegmentCard key={seg.index} seg={seg} filter={filter} onAction={act} />
      ))}
    </div>
  );
}

const Stat = ({ label, value, color = 'text-slate-800' }) => (
  <div className="text-center">
    <div className={`text-xl font-bold ${color}`}>{value ?? 0}</div>
    <div className="text-xs text-slate-500">{label}</div>
  </div>
);
