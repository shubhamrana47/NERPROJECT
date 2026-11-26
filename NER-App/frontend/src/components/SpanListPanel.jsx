import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Check, ChevronDown, ChevronRight, Search, X } from 'lucide-react';
import { ENTITY_TYPES, getEntityColorStyle, formatEntityLabel, formatSubtypeLabel } from '../utils/textUtils.jsx';
import { getEntitySubtypes, SUBSUMED_ENTITY_TYPES } from '../utils/entitySubtypes.js';

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
  added: 'you added this',
};

const VISIBLE_TOP_LEVEL_TYPES = ENTITY_TYPES
  .filter((t) => !SUBSUMED_ENTITY_TYPES.has(t))
  .sort((a, b) => formatEntityLabel(a).localeCompare(formatEntityLabel(b)));

/**
 * Find the parent entity for a legacy subsumed label (e.g. 'Agri_Method' -> 'Agri_Process'),
 * or return the label itself if it is already a top-level parent entity.
 */
function resolveInitialExpandedParent(label) {
  if (!label) return null;
  if (getEntitySubtypes(label).length > 0) return label;
  for (const parent of VISIBLE_TOP_LEVEL_TYPES) {
    if (getEntitySubtypes(parent).some((s) => s.legacyLabel === label)) {
      return parent;
    }
  }
  return null;
}

/**
 * Hierarchical entity & subcategory picker for the left-side span list.
 * Renders as a viewport-safe fixed popover so it never clips inside the narrow
 * scrollable sidebar, with instant search and the current entity's subcategories
 * expanded by default.
 */
function LabelPicker({ span, anchorRect, onPick, onCancel }) {
  const [query, setQuery] = useState('');
  const [expandedParent, setExpandedParent] = useState(() =>
    resolveInitialExpandedParent(span.label)
  );
  const popoverRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  useEffect(() => {
    const onPointerDown = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        onCancel();
      }
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancel();
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onCancel]);

  const trimmed = query.trim().toLowerCase();

  const entries = useMemo(() => {
    return VISIBLE_TOP_LEVEL_TYPES.map((type) => {
      const formatted = formatEntityLabel(type);
      const allSubtypes = getEntitySubtypes(type);
      if (!trimmed) {
        return { type, formatted, subtypes: allSubtypes, forceExpand: false };
      }
      const parentMatches =
        formatted.toLowerCase().includes(trimmed) || type.toLowerCase().includes(trimmed);
      const matchingSubtypes = allSubtypes.filter(
        (s) =>
          s.name.toLowerCase().includes(trimmed) ||
          (s.legacyLabel && s.legacyLabel.toLowerCase().includes(trimmed)) ||
          (s.description && s.description.toLowerCase().includes(trimmed))
      );
      if (!parentMatches && matchingSubtypes.length === 0) return null;
      return {
        type,
        formatted,
        subtypes: parentMatches ? allSubtypes : matchingSubtypes,
        forceExpand: matchingSubtypes.length > 0,
      };
    }).filter(Boolean);
  }, [trimmed]);

  // Compute viewport-safe fixed coordinates anchored to the trigger button
  const positionStyle = useMemo(() => {
    const width = 276;
    const maxHeight = 340;
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
    const pad = 10;

    if (!anchorRect) {
      return { position: 'relative', width: '100%' };
    }

    let left = anchorRect.left;
    if (left + width > vw - pad) left = Math.max(pad, vw - width - pad);
    if (left < pad) left = pad;

    const spaceBelow = vh - anchorRect.bottom - pad;
    const spaceAbove = anchorRect.top - pad;
    let top;
    if (spaceBelow >= 220 || spaceBelow >= spaceAbove) {
      top = Math.min(anchorRect.bottom + 4, Math.max(pad, vh - maxHeight - pad));
    } else {
      top = Math.max(pad, anchorRect.top - Math.min(maxHeight, spaceAbove) - 4);
    }

    return {
      position: 'fixed',
      top,
      left,
      width,
      zIndex: 60,
    };
  }, [anchorRect]);

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Choose entity label or subcategory"
      data-testid="span-label-picker"
      style={positionStyle}
      className="flex flex-col overflow-hidden rounded-md border border-ink/30 bg-sheet shadow-lg"
    >
      <div className="flex items-center gap-1.5 border-b border-rule bg-paper/70 px-2 py-1.5">
        <Search className="h-3.5 w-3.5 shrink-0 text-ink-faint" aria-hidden="true" />
        <input
          ref={searchRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search entity or subcategory…"
          aria-label="Search entity or subcategory"
          className="min-w-0 flex-1 bg-transparent text-[12px] text-ink placeholder:text-ink-faint focus:outline-none"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className="rounded p-0.5 text-ink-faint hover:text-ink"
          >
            <X className="h-3 w-3" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close label picker"
            className="rounded p-0.5 text-ink-faint hover:text-ink"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      <div className="scroll-slim max-h-[290px] overflow-y-auto py-1" role="listbox">
        {entries.length === 0 ? (
          <p className="px-3 py-3 text-[11.5px] text-ink-faint">
            No matching entity or subcategory.
          </p>
        ) : (
          entries.map(({ type, formatted, subtypes, forceExpand }) => {
            const color = getEntityColorStyle(type);
            const hasSubtypes = subtypes.length > 0;
            const isExpanded = forceExpand || expandedParent === type;
            const isCurrentParent = span.label === type && !span.subtype;

            return (
              <div key={type} className="border-b border-rule/40 last:border-0">
                <div className="flex items-stretch">
                  <button
                    type="button"
                    role="option"
                    aria-selected={isCurrentParent}
                    data-picker-entity={type}
                    onClick={() => onPick(type, undefined)}
                    className={`flex min-w-0 flex-1 items-center gap-2 px-2.5 py-1.5 text-left text-[12px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ink ${
                      isCurrentParent
                        ? 'bg-paper font-semibold text-ink'
                        : 'font-medium text-ink hover:bg-paper/70'
                    }`}
                  >
                    <span
                      className="h-[3px] w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: color.border }}
                      aria-hidden="true"
                    />
                    <span className="truncate">{formatted}</span>
                    {isCurrentParent && (
                      <Check className="ml-auto h-3 w-3 shrink-0 text-ink" aria-hidden="true" />
                    )}
                  </button>

                  {hasSubtypes && (
                    <button
                      type="button"
                      data-picker-expand={type}
                      aria-expanded={isExpanded}
                      aria-label={`${isExpanded ? 'Hide' : 'Show'} subcategories for ${formatted}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedParent((prev) => (prev === type ? null : type));
                      }}
                      className="flex shrink-0 items-center gap-1 border-l border-rule/50 px-2 text-[10.5px] font-mono tabular-nums text-ink-faint transition-colors hover:bg-paper hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ink"
                    >
                      <span>{subtypes.length}</span>
                      {isExpanded ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                    </button>
                  )}
                </div>

                {hasSubtypes && isExpanded && (
                  <div className="bg-paper/45 pb-1 pl-5 pr-1.5 pt-0.5">
                    {subtypes.map((sub) => {
                      const isCurrentSub =
                        span.label === type && span.subtype === sub.name;
                      return (
                        <button
                          key={sub.name}
                          type="button"
                          role="option"
                          aria-selected={isCurrentSub}
                          data-picker-subtype={`${type}::${sub.name}`}
                          title={sub.description}
                          onClick={() => onPick(type, sub.name)}
                          className={`flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-[11.5px] leading-snug transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ink ${
                            isCurrentSub
                              ? 'bg-sheet font-medium text-ink shadow-2xs ring-1 ring-rule'
                              : 'text-ink-soft hover:bg-sheet hover:text-ink'
                          }`}
                        >
                          <span className="min-w-0 flex-1 truncate">
                            {formatSubtypeLabel(sub.name)}
                          </span>
                          {isCurrentSub && (
                            <Check className="h-3 w-3 shrink-0 text-ink" aria-hidden="true" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/** One row of the annotation workflow's span list. */
function AnnotationRow({ span, lineNumber, onUpdate, onDelete, onFocus, isFocused }) {
  const [editing, setEditing] = useState(false);
  const [anchorRect, setAnchorRect] = useState(null);
  const triggerRef = useRef(null);
  const color = getEntityColorStyle(span.label);
  const isManual = span.source === 'human' || span.status === 'edited' || Boolean(span.isManual);
  const approved = span.status === 'approved';
  const confidence = Number(span.confidence ?? 1);

  const openPicker = () => {
    setAnchorRect(triggerRef.current?.getBoundingClientRect() || null);
    setEditing(true);
  };

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
        {isManual && (
          <span
            className="shrink-0 inline-flex items-center rounded border border-hand/40 bg-hand/10 px-1.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-hand"
            title="Manual annotation"
          >
            Manual
          </span>
        )}
        <button
          type="button"
          onClick={() => onDelete(span)}
          className="shrink-0 text-[11.5px] text-ink-faint transition hover:text-hand"
        >
          remove
        </button>
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <button
          ref={triggerRef}
          type="button"
          onClick={openPicker}
          className="flex flex-col items-start text-left text-[12px] text-ink transition hover:text-ink-soft"
          title="Change this label or subcategory"
        >
          <span className="flex items-center gap-1.5 font-medium leading-tight">
            <span
              className="h-[3px] w-3 shrink-0 rounded-full"
              style={{ backgroundColor: color.border }}
            />
            {formatEntityLabel(span.label)}
            <ChevronDown className="h-3 w-3 text-ink-faint" />
          </span>
          {span.subtype && (
            <span className="mt-0.5 pl-[18px] text-[10.5px] leading-tight text-ink-soft">
              {formatSubtypeLabel(span.subtype)}
            </span>
          )}
        </button>
        {editing && (
          <LabelPicker
            span={span}
            anchorRect={anchorRect}
            onCancel={() => setEditing(false)}
            onPick={(label, subtype) => {
              onUpdate(span, { label, subtype: subtype || undefined, status: 'edited', source: 'human' });
              setEditing(false);
            }}
          />
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
function ValidationRow({ span, lineNumber, onDecide, onDelete, onFocus, isFocused, overlaps }) {
  const [editing, setEditing] = useState(false);
  const [anchorRect, setAnchorRect] = useState(null);
  const triggerRef = useRef(null);
  const color = getEntityColorStyle(span.label);
  const decision = span.validationStatus && span.validationStatus !== 'unreviewed'
    ? span.validationStatus
    : null;
  const rejected = decision === 'rejected';
  // A span someone added has no pipeline proposal behind it, so there is
  // nothing to confirm or reject: it is either right or it goes.
  const isAdded = decision === 'added';
  const isManual = Boolean(span.isManual) || decision === 'relabelled' || isAdded || span.source === 'human' || span.status === 'edited';
  const score = Number(span.confidence ?? 1);
  const sources = Array.isArray(span.sources) ? span.sources : null;

  const openPicker = () => {
    setAnchorRect(triggerRef.current?.getBoundingClientRect() || null);
    setEditing(true);
  };

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
        {isManual && (
          <span
            className="shrink-0 inline-flex items-center rounded border border-hand/40 bg-hand/10 px-1.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-hand"
            title="Entity was manually changed"
          >
            Manual
          </span>
        )}
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
        <button
          ref={triggerRef}
          type="button"
          onClick={openPicker}
          className="flex flex-col items-start text-left text-[12px] text-ink transition hover:text-ink-soft"
          title="Change this label or subcategory"
        >
          <span className="flex items-center gap-1.5 font-medium leading-tight">
            <span
              className="h-[3px] w-3 shrink-0 rounded-full"
              style={{ backgroundColor: color.border }}
            />
            {formatEntityLabel(span.label)}
            <ChevronDown className="h-3 w-3 text-ink-faint" />
          </span>
          {span.subtype && (
            <span className="mt-0.5 pl-[18px] text-[10.5px] leading-tight text-ink-soft">
              {formatSubtypeLabel(span.subtype)}
            </span>
          )}
        </button>
        {editing && (
          <LabelPicker
            span={span}
            anchorRect={anchorRect}
            onCancel={() => setEditing(false)}
            onPick={(label, subtype) => {
              onDecide(span, 'relabelled', label, subtype);
              setEditing(false);
            }}
          />
        )}

        {decision === 'relabelled' && span.originalLabel && span.originalLabel !== span.label && (
          <span className="text-[11px] text-ink-faint line-through">
            {formatEntityLabel(span.originalLabel)}
          </span>
        )}

        {isAdded ? (
          <span className="text-[11px] text-hand">yours</span>
        ) : (
          <>
            <span className="font-mono text-[10.5px] tabular-nums text-ink-faint">
              {(score * 100).toFixed(0)}%
            </span>

            {sources && (
              <span className="truncate text-[11px] text-ink-faint" title={sources.join(', ')}>
                {sources.join(' + ')}
              </span>
            )}
          </>
        )}

        {overlaps && (
          <span
            className="text-[11px] text-ink-faint"
            title="Another span here covers some of the same words. Both are kept in the validated file; a training export keeps the one a person stands behind."
          >
            overlaps
          </span>
        )}
      </div>

      <div className="mt-1.5 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onDecide(span, decision === 'confirmed' ? 'unreviewed' : 'confirmed')}
          className={`rounded border px-2 py-0.5 text-[11.5px] transition ${
            decision === 'confirmed'
              ? 'border-ink bg-ink text-paper font-medium'
              : 'border-rule bg-sheet text-ink hover:border-rule-strong'
          }`}
          title="Mark this entity as correct"
        >
          Correct
        </button>
        <button
          type="button"
          onClick={() => onDecide(span, decision === 'rejected' ? 'unreviewed' : 'rejected')}
          className={`rounded border px-2 py-0.5 text-[11.5px] transition ${
            decision === 'rejected'
              ? 'border-hand bg-hand text-paper font-medium'
              : 'border-rule bg-sheet text-hand hover:border-hand/50'
          }`}
          title="Mark this entity as wrong"
        >
          Wrong
        </button>
        {rejected && (
          <button
            type="button"
            onClick={openPicker}
            className="rounded border border-rule bg-sheet px-2 py-0.5 text-[11.5px] text-ink transition hover:border-rule-strong"
            title="Re-annotate this rejected entity with another label"
          >
            Re-annotate
          </button>
        )}
        {isAdded && (
          <button
            type="button"
            onClick={() => onDelete && onDelete(span)}
            className="rounded border border-rule bg-sheet px-2 py-0.5 text-[11.5px] text-hand transition hover:border-hand/50"
            title="Remove this added span"
          >
            Remove
          </button>
        )}
        {rejected ? (
          <button
            type="button"
            onClick={() => onDecide(span, 'unreviewed')}
            className="ml-auto text-[11px] text-ink-faint transition hover:text-ink"
            title="Undo rejection"
          >
            Put it back
          </button>
        ) : decision && decision !== 'unreviewed' ? (
          <button
            type="button"
            onClick={() => onDecide(span, 'unreviewed')}
            className="ml-auto text-[11px] text-ink-faint transition hover:text-ink"
            title="Reset decision"
          >
            Undo
          </button>
        ) : null}
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

  /*
   * Spans covering some of the same words. Allowed — a person may well mark a
   * longer phrase than the pipeline did — but worth seeing, because only one of
   * them can survive into a training export.
   */
  const overlapping = new Set();
  if (isValidation) {
    for (let i = 0; i < spans.length; i += 1) {
      for (let j = i + 1; j < spans.length; j += 1) {
        if (spans[i].start < spans[j].end && spans[j].start < spans[i].end) {
          overlapping.add(`${spans[i].start}:${spans[i].end}`);
          overlapping.add(`${spans[j].start}:${spans[j].end}`);
        }
      }
    }
  }

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
            {[
              counts.confirmed ? `${counts.confirmed} correct` : null,
              counts.rejected ? `${counts.rejected} wrong` : null,
              counts.relabelled ? `${counts.relabelled} relabelled` : null,
              counts.added ? `${counts.added} added` : null,
              undecided > 0 ? `${undecided} to go` : null,
            ]
              .filter(Boolean)
              .join(', ')}
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
              ? 'The pipeline found nothing in this passage. If that looks right, mark it as nothing to validate — or select the words it missed and give them a label.'
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
                onDelete={onDelete}
                onFocus={() => onFocusSpan && onFocusSpan(span)}
                isFocused={isFocused}
                overlaps={overlapping.has(`${span.start}:${span.end}`)}
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
