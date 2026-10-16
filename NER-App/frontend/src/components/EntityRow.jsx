import React, { useState } from 'react';
import { ENTITY_TYPES, getConfidenceThresholdClass } from '../utils/textUtils.jsx';

export default function EntityRow({ e, onAction }) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(e.label);
  const [text, setText] = useState(e.text);
  const pct = (Number(e.confidence ?? 1) * 100).toFixed(1);
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
