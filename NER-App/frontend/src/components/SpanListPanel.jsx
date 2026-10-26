import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { ENTITY_TYPES, getEntityColorStyle, formatEntityLabel } from '../utils/textUtils.jsx';

/**
 * Every span in the passage on screen, as a working list. It sits beside the
 * text rather than beneath it, so a long passage and its markup are visible at
 * the same time.
 *
 * In validation mode this is where the work happens: each row carries what the
 * pipeline said, how sure it was, which sources agreed, and the decision a
 * person has recorded. A rejected span is struck through rather than removed,
 * so it can be seen and taken back.
 */

const DECISION_LABEL = {
  confirmed: 'confirmed',
  rejected: 'rejected',
  relabelled: 'relabelled',
};

function LabelPicker({ span, onPick, onCancel }) {
  return (
    <select
      autoFocus
      value={span.label}
      onChange={(e) => onPick(e.target.value)}
      onBlur={onCancel}
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
  );
}

/** One row of the annotation workflow's span list. */
function AnnotationRow({ span, lineNumber, onUpdate, onDelete, onFocus, isFocused }) {
  const [editing, setEditing] = useState(false);
  const color = getEntityColorStyle(span.label);
  const isManual = span.source === 'human' || span.status === 'edited';
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
          <LabelPicker
            span={span}
            onCancel={() => setEditing(false)}
            onPick={(label) => {
              onUpdate(span, { label, status: 'edited', source: 'human' });
              setEditing(false);
            }}
          />
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

/** One row of the validation workflow's span list. */
function ValidationRow({ span, lineNumber, onDecide, onFocus, isFocused }) {
  const [editing, setEditing] = useState(false);
  const color = getEntityColorStyle(span.label);
  const decision = span.validationStatus && span.validationStatus !== 'unreviewed'
    ? span.validationStatus
    : null;
  const rejected = decision === 'rejected';
  const score = Number(span.confidence ?? 1);
  const sources = Array.isArray(span.sources) ? span.sources : null;

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
          className={`min-w-0 flex-1 truncate text-left font-serif text-[15px] ${
            rejected ? 'text-ink-faint line-through' : 'text-ink'
          }`}
          title={span.text}
        >
          {span.text}
        </button>
        {decision && (
          <span
            className={`shrink-0 text-[11px] ${
              rejected ? 'text-hand' : decision === 'relabelled' ? 'text-hand' : 'text-ink-soft'
            }`}
          >
            {DECISION_LABEL[decision]}
          </span>
        )}
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
        {editing ? (
          <LabelPicker
            span={span}
            onCancel={() => setEditing(false)}
            onPick={(label) => {
              onDecide(span, 'relabelled', label);
              setEditing(false);
            }}
          />
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

        {decision === 'relabelled' && span.originalLabel && (
          <span className="text-[11px] text-ink-faint line-through">
            {formatEntityLabel(span.originalLabel)}
          </span>
        )}

        <span className="font-mono text-[10.5px] tabular-nums text-ink-faint">
          {(score * 100).toFixed(0)}%
        </span>

        {sources && (
          <span className="truncate text-[11px] text-ink-faint" title={sources.join(', ')}>
            {sources.join(' + ')}
          </span>
        )}
      </div>

      <div className="mt-1.5 flex items-center gap-1.5">
        {rejected ? (
          <button
            type="button"
            onClick={() => onDecide(span, 'unreviewed')}
            className="rounded border border-rule bg-sheet px-2 py-0.5 text-[11.5px] text-ink transition hover:border-rule-strong"
          >
            Put it back
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onDecide(span, 'confirmed')}
              className={`rounded border px-2 py-0.5 text-[11.5px] transition ${
                decision === 'confirmed'
                  ? 'border-ink bg-ink text-paper'
                  : 'border-rule bg-sheet text-ink hover:border-rule-strong'
              }`}
            >
              Correct
            </button>
            <button
              type="button"
              onClick={() => onDecide(span, 'rejected')}
              className="rounded border border-rule bg-sheet px-2 py-0.5 text-[11.5px] text-hand transition hover:border-hand/50"
            >
              Wrong
            </button>
          </>
        )}
        {decision && !rejected && (
          <button
            type="button"
            onClick={() => onDecide(span, 'unreviewed')}
            className="ml-auto text-[11px] text-ink-faint transition hover:text-ink"
          >
            Undo
          </button>
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
  onDecide,
  isValidation = false,
  focusedSpan,
  onFocusSpan,
  nerStatus,
  passageNumber,
  pageNumber,
}) {
  const undecided = isValidation
    ? spans.filter((s) => !s.validationStatus || s.validationStatus === 'unreviewed').length
    : spans.filter((s) => s.status !== 'approved').length;

  const counts = isValidation
    ? spans.reduce(
        (acc, s) => {
          const d = s.validationStatus || 'unreviewed';
          acc[d] = (acc[d] || 0) + 1;
          return acc;
        },
        {}
      )
    : null;

  return (
    <div className="flex max-h-[32rem] flex-col overflow-hidden rounded-md border border-rule bg-sheet lg:h-full lg:max-h-none">
      <div className="shrink-0 border-b border-rule px-3.5 py-3">
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <h2 className="text-[13.5px] font-semibold text-ink">
              {isValidation ? 'Entities to check' : 'Spans here'}
            </h2>
            {passageNumber != null && (
              <span className="font-mono text-[11px] tabular-nums text-ink-faint">
                {pageNumber != null ? `p. ${pageNumber}` : `pass. ${passageNumber}`}
              </span>
            )}
          </div>
          <span className="font-mono text-[12px] tabular-nums text-ink-faint">{spans.length}</span>
        </div>

        {isValidation && spans.length > 0 && (
          <p className="mt-1 text-[11.5px] text-ink-faint">
            {counts.confirmed ? `${counts.confirmed} correct` : ''}
            {counts.confirmed && (counts.rejected || counts.relabelled) ? ', ' : ''}
            {counts.rejected ? `${counts.rejected} wrong` : ''}
            {counts.rejected && counts.relabelled ? ', ' : ''}
            {counts.relabelled ? `${counts.relabelled} relabelled` : ''}
            {undecided > 0 ? `${counts.confirmed || counts.rejected || counts.relabelled ? ', ' : ''}${undecided} to go` : ''}
          </p>
        )}

        {spans.length > 0 && undecided > 0 && (
          <button
            type="button"
            onClick={onApproveAll}
            className="mt-2 w-full rounded border border-rule bg-sheet px-2 py-1.5 text-[12.5px] text-ink transition hover:border-rule-strong"
          >
            {isValidation ? `Mark the remaining ${undecided} correct` : `Approve all ${undecided}`}
          </button>
        )}
      </div>

      <ul className="scroll-slim min-h-[8rem] flex-1 overflow-y-auto">
        {spans.length === 0 ? (
          <li className="px-3.5 py-4 text-[12.5px] leading-relaxed text-ink-soft">
            {isValidation
              ? 'The pipeline found nothing in this passage. If that looks right, mark it as nothing to validate.'
              : nerStatus === 'pending'
                ? 'The model has not read this passage yet.'
                : nerStatus === 'skipped'
                  ? 'Select words in the passage and pick a label to add the first span.'
                  : 'No spans in this passage. Select words to add one.'}
          </li>
        ) : (
          spans.map((span, i) => {
            const key = span._id || `${span.start}-${span.end}-${i}`;
            const isFocused =
              focusedSpan && focusedSpan.start === span.start && focusedSpan.end === span.end;
            const lineNumber = lineNumberFor ? lineNumberFor(span) : null;

            return isValidation ? (
              <ValidationRow
                key={key}
                span={span}
                lineNumber={lineNumber}
                onDecide={onDecide}
                onFocus={() => onFocusSpan && onFocusSpan(span)}
                isFocused={isFocused}
              />
            ) : (
              <AnnotationRow
                key={key}
                span={span}
                lineNumber={lineNumber}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onFocus={() => onFocusSpan && onFocusSpan(span)}
                isFocused={isFocused}
              />
            );
          })
        )}
      </ul>
    </div>
  );
}
