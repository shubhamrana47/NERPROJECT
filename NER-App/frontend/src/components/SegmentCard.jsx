import React, { useState } from 'react';

const statusStyle = {
  accepted: 'bg-green-100 border-green-400',
  approved: 'bg-green-200 border-green-600',
  edited: 'bg-blue-100 border-blue-400',
  review: 'bg-amber-100 border-amber-400',
};

export default function SegmentCard({ seg, filter, onAction }) {
  const ents = seg.entities.filter((e) => e.status !== 'deleted');
  if (filter === 'review' && !ents.some((e) => e.status === 'review')) return null;
  const sorted = [...ents].sort((a, b) => a.start - b.start);

  // build highlighted text
  const parts = [];
  let pos = 0;
  sorted.forEach((e) => {
    if (e.start < pos) return;
    if (e.start > pos) parts.push(seg.text.slice(pos, e.start));
    parts.push(
      <mark key={e._id} className={`rounded border px-1 ${statusStyle[e.status]}`} title={`${e.label} ${(e.confidence * 100).toFixed(1)}%`}>
        {seg.text.slice(e.start, e.end)}
        <sup className="ml-1 text-[10px] font-semibold">{e.label}</sup>
      </mark>
    );
    pos = e.end;
  });
  parts.push(seg.text.slice(pos));

  const shown = filter === 'review' ? ents.filter((e) => e.status === 'review') : ents;

  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <div className="mb-2 text-xs text-slate-400">
        {seg.page != null ? `Page ${seg.page} · Paragraph ${seg.paragraph}` : seg.path || `Segment ${seg.index}`}
      </div>
      <p className="mb-3 whitespace-pre-wrap leading-8 text-slate-800">{parts}</p>
      {shown.length > 0 && (
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-slate-500">
            <tr><th>Text</th><th>Label</th><th>Confidence</th><th>Status</th><th className="text-right">Actions</th></tr>
          </thead>
          <tbody>
            {shown.map((e) => <EntityRow key={e._id} e={e} onAction={(b) => onAction(seg, e, b)} />)}
          </tbody>
        </table>
      )}
    </div>
  );
}

function EntityRow({ e, onAction }) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(e.label);
  const [text, setText] = useState(e.text);
  const pct = (e.confidence * 100).toFixed(1);
  const bar = e.confidence >= 0.75 ? 'bg-green-500' : e.confidence >= 0.5 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <tr className="border-t">
      <td className="py-1 pr-2">{editing ? <input className="w-full rounded border px-1" value={text} onChange={(x) => setText(x.target.value)} /> : e.text}</td>
      <td className="pr-2">{editing ? <input className="w-full rounded border px-1" value={label} onChange={(x) => setLabel(x.target.value)} /> : e.label}</td>
      <td className="pr-2">
        <div className="flex items-center gap-2">
          <div className="h-2 w-20 rounded bg-slate-200"><div className={`h-2 rounded ${bar}`} style={{ width: `${pct}%` }} /></div>
          <span>{pct}%</span>
        </div>
      </td>
      <td className="pr-2 capitalize">{e.status}</td>
      <td className="space-x-1 text-right">
        {editing ? (
          <>
            <button className="rounded bg-blue-600 px-2 py-1 text-xs text-white" onClick={() => { onAction({ action: 'edit', label, text }); setEditing(false); }}>Save</button>
            <button className="rounded bg-slate-200 px-2 py-1 text-xs" onClick={() => setEditing(false)}>Cancel</button>
          </>
        ) : (
          <>
            <button className="rounded bg-green-600 px-2 py-1 text-xs text-white" onClick={() => onAction({ action: 'accept' })}>Accept</button>
            <button className="rounded bg-blue-600 px-2 py-1 text-xs text-white" onClick={() => setEditing(true)}>Edit</button>
            <button className="rounded bg-red-600 px-2 py-1 text-xs text-white" onClick={() => onAction({ action: 'delete' })}>Delete</button>
          </>
        )}
      </td>
    </tr>
  );
}
