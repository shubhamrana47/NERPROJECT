import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { ENTITY_TYPES, getEntityColorStyle, formatEntityLabel } from '../utils/textUtils.jsx';

/**
 * Every span in the passage on screen, as a working list. It sits beside the
 * text rather than beneath it, so a long passage and its markup are visible at
 * the same time.
 */
function SpanRow({ span, lineNumber, onUpdate, onDelete, onFocus, isFocused }) {
  const [editing, setEditing] = useState(false);
  const color = getEntityColorStyle(span.label);
  const isManual = span.origin === 'human' || span.source === 'human' || span.status === 'edited';
  const approved = span.status === 'approved';
  const confidence = Number(span.confidence ?? 1);

  return (
    <li
      className={`border-b border-rule/70 px-3 py-2 transition last:border-0 ${
        isFocused ? 'bg-paper' : 'hover:bg-paper/60'
      }`}
    >
      <div className="flex items-baseline gap-2">
        {lineNumber != null && (
          <span className="shrink-0 font-mono text-[10.5px] tabular-nums text-ink-faint">
            {lineNumber}
          </span>
        )}
        <button
          type="button"
          onClick={onFocus}
          className="min-w-0 flex-1 truncate text-left font-serif text-[15px] text-ink"
          title={span.text}
        >
          {span.text}
        </button>
        <button
          type="button"
          onClick={() => onDelete(span)}
          className="shrink-0 text-[11.5px] text-ink-faint transition hover:text-hand"
        >
          remove
        </button>
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
        {editing ? (
          <select
            autoFocus
            value={span.label}
            onChange={(e) => {
              onUpdate(span, { label: e.target.value, status: 'edited', source: 'human' });
              setEditing(false);
            }}
            onBlur={() => setEditing(false)}
            className="rounded border border-ink bg-sheet px-1.5 py-1 text-[12px] text-ink focus:outline-none"
          >
            {!ENTITY_TYPES.includes(span.label) && (
              <option value={span.label}>{formatEntityLabel(span.label)}</option>
            )}
            {ENTITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {formatEntityLabel(t)}
              </option>
            ))}
          </select>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 text-[12px] text-ink transition hover:text-ink-soft"
            title="Change this label"
          >
            <span
              className="h-[3px] w-3 shrink-0 rounded-full"
              style={{ backgroundColor: color.border }}
            />
            {formatEntityLabel(span.label)}
            <ChevronDown className="h-3 w-3 text-ink-faint" />
          </button>
        )}

        <span className="font-mono text-[10.5px] tabular-nums text-ink-faint">
          {span.start}:{span.end}
        </span>

        <span className={`text-[11px] ${isManual ? 'text-hand' : 'text-machine'}`}>
          {isManual ? 'yours' : `model ${(confidence * 100).toFixed(0)}%`}
        </span>

        {!approved ? (
          <button
            type="button"
            onClick={() => onUpdate(span, { status: 'approved', source: 'human' })}
            className="ml-auto rounded border border-rule bg-sheet px-1.5 py-0.5 text-[11px] text-ink transition hover:border-rule-strong"
          >
            Approve
          </button>
        ) : (
          <span className="ml-auto text-[11px] text-ink-faint">approved</span>
        )}
      </div>
    </li>
  );
}

export default function SpanListPanel({
  spans = [],
  lineNumberFor,
  onUpdate,
  onDelete,
  onApproveAll,
  focusedSpan,
  onFocusSpan,
  nerStatus,
  passageNumber,
  pageNumber,
}) {
  const unapproved = spans.filter((s) => s.status !== 'approved').length;

  return (
    <div className="flex max-h-[32rem] flex-col overflow-hidden rounded-md border border-rule bg-sheet lg:h-full lg:max-h-none">
      <div className="shrink-0 border-b border-rule px-3.5 py-3">
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <h2 className="text-[13.5px] font-semibold text-ink">Spans here</h2>
            {passageNumber != null && (
              <span className="font-mono text-[11px] tabular-nums text-ink-faint">
                {pageNumber != null ? `p. ${pageNumber}` : `pass. ${passageNumber}`}
              </span>
            )}
          </div>
          <span className="font-mono text-[12px] tabular-nums text-ink-faint">{spans.length}</span>
        </div>
        {spans.length > 0 && unapproved > 0 && (
          <button
            type="button"
            onClick={onApproveAll}
            className="mt-2 w-full rounded border border-rule bg-sheet px-2 py-1.5 text-[12.5px] text-ink transition hover:border-rule-strong"
          >
            Approve all {unapproved}
          </button>
        )}
      </div>

      <ul className="scroll-slim min-h-[8rem] flex-1 overflow-y-auto">
        {spans.length === 0 ? (
          <li className="px-3.5 py-4 text-[12.5px] leading-relaxed text-ink-soft">
            {nerStatus === 'pending'
              ? 'The model has not read this passage yet.'
              : nerStatus === 'skipped'
                ? 'Select words in the passage and pick a label to add the first span.'
                : 'No spans in this passage. Select words to add one.'}
          </li>
        ) : (
          spans.map((span, i) => (
            <SpanRow
              key={span._id || `${span.start}-${span.end}-${i}`}
              span={span}
              lineNumber={lineNumberFor ? lineNumberFor(span) : null}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onFocus={() => onFocusSpan && onFocusSpan(span)}
              isFocused={
                focusedSpan &&
                focusedSpan.start === span.start &&
                focusedSpan.end === span.end
              }
            />
          ))
        )}
      </ul>
    </div>
  );
}
