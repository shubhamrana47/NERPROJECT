import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Trash2, X } from 'lucide-react';
import { useAnnotation } from '../context/AnnotationContext.jsx';
import {
  ENTITY_TYPES,
  ENTITY_GROUPS,
  ENTITY_SHORTCUTS,
  getEntityColorStyle,
  formatEntityLabel,
} from '../utils/textUtils.jsx';

/** A span's underline, shrunk to a swatch, so the list and the text speak the same language. */
function Swatch({ label, className = 'h-[3px] w-3.5' }) {
  const { border } = getEntityColorStyle(label);
  return (
    <span
      className={`${className} shrink-0 rounded-full`}
      style={{ backgroundColor: border }}
      aria-hidden="true"
    />
  );
}

function LabelRow({ type, count, shortcut, armed, onPick }) {
  return (
    <button
      type="button"
      onClick={() => onPick(type)}
      className={`flex w-full items-center gap-3 rounded px-2.5 py-2.5 text-left transition ${
        armed ? 'hover:bg-paper hover:ring-1 hover:ring-rule-strong' : 'hover:bg-paper'
      }`}
      title={
        armed ? `Label the selection as ${formatEntityLabel(type)}` : formatEntityLabel(type)
      }
    >
      <Swatch label={type} />
      <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink">
        {formatEntityLabel(type)}
      </span>
      {shortcut && (
        <span className="rounded border border-rule bg-paper px-1.5 py-px font-mono text-[11px] text-ink-soft">
          {shortcut}
        </span>
      )}
      <span className="w-8 text-right font-mono text-[12px] tabular-nums text-ink-faint">
        {count > 0 ? count.toLocaleString() : ''}
      </span>
    </button>
  );
}

/**
 * The quick block: labels you have actually used, most recent first, topped up
 * with the keyed defaults. A digit shows only where one is really bound, since
 * the key mapping never moves.
 */
function QuickLabels({ labels, shortcutMap, armed, onPick, counts }) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {labels.map((label) => {
        const { border } = getEntityColorStyle(label);
        const key = shortcutMap[label];
        return (
          <button
            key={label}
            type="button"
            onClick={() => onPick(label)}
            className={`flex flex-col items-start gap-1 rounded border px-2 py-1.5 text-left transition ${
              armed
                ? 'border-rule-strong bg-sheet hover:border-ink hover:bg-paper'
                : 'border-rule bg-sheet hover:bg-paper'
            }`}
            title={
              key
                ? `${formatEntityLabel(label)} — press ${key}`
                : formatEntityLabel(label)
            }
          >
            <span className="flex w-full items-center justify-between gap-1">
              <span
                className="h-[3px] w-3.5 shrink-0 rounded-full"
                style={{ backgroundColor: border }}
              />
              <span className="font-mono text-[10.5px] text-ink-faint">{key || ''}</span>
            </span>
            <span className="w-full truncate text-[11.5px] leading-tight text-ink">
              {formatEntityLabel(label)}
            </span>
            <span className="font-mono text-[10px] tabular-nums text-ink-faint">
              {counts[label] > 0 ? counts[label].toLocaleString() : ''}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function EntityPaletteSidebar({
  modelSpans = 0,
  manualSpans = 0,
  meanConfidence = null,
  entityCounts = {},
}) {
  const annotation = useAnnotation();
  const [search, setSearch] = useState('');
  const [justTagged, setJustTagged] = useState('');
  const [notice, setNotice] = useState('');
  const searchInputRef = useRef(null);

  const selectedSpan = annotation?.selectedSpan;
  const activeEditingEntity = annotation?.activeEditingEntity;
  const recentLabels = annotation?.recentLabels || [];
  const quickLabels = annotation?.quickLabels || [];
  const applyLabel = annotation?.applyLabel;
  const clearSelection = annotation?.clearSelection;
  const setActiveEditingEntity = annotation?.setActiveEditingEntity;
  const updateEntity = annotation?.updateEntity;
  const deleteEntity = annotation?.deleteEntity;

  // Focus stays out of the search box on selection, so 1–9 reach the document.
  // "/" is the way in.
  useEffect(() => {
    const handleKeyDown = (e) => {
      const typing = ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName);
      if (e.key === '/' && !typing) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if (e.key === 'Escape') {
        if (search) {
          setSearch('');
          searchInputRef.current?.blur();
        } else if (selectedSpan) {
          clearSelection?.();
        } else if (activeEditingEntity) {
          setActiveEditingEntity?.(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [search, selectedSpan, activeEditingEntity, clearSelection, setActiveEditingEntity]);

  const shortcutMap = useMemo(() => {
    const map = {};
    ENTITY_SHORTCUTS.forEach((s) => {
      map[s.label] = s.key;
    });
    return map;
  }, []);

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    return ENTITY_TYPES.filter((t) => formatEntityLabel(t).toLowerCase().includes(q));
  }, [search]);

  const armed = Boolean(selectedSpan);

  const handlePick = (type) => {
    if (!selectedSpan) {
      setJustTagged('');
      setNotice('Select the words in the sentence first, then pick this label.');
      setTimeout(() => setNotice(''), 3000);
      return;
    }
    const text = selectedSpan.text;
    applyLabel(type);
    setSearch('');
    setNotice('');
    setJustTagged(`${text} → ${formatEntityLabel(type)}`);
    setTimeout(() => setJustTagged(''), 2600);
  };

  const confidenceLabel =
    typeof meanConfidence === 'number' && !Number.isNaN(meanConfidence)
      ? `${Number(meanConfidence).toFixed(0)}%`
      : '—';

  return (
    <div className="flex max-h-[38rem] flex-col overflow-hidden rounded-md border border-rule bg-sheet md:h-full md:max-h-none">
      {/* Fixed head: what you are doing right now */}
      <div className="shrink-0 border-b border-rule px-4 pb-3.5 pt-4">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-[14px] font-semibold text-ink">Entity labels</h2>
          <span className="font-mono text-[11.5px] tabular-nums text-ink-faint">
            {matches ? `${matches.length} of ${ENTITY_TYPES.length}` : ENTITY_TYPES.length}
          </span>
        </div>

        {selectedSpan ? (
          <div className="mt-2.5 rounded border-l-2 border-hand bg-paper px-3 py-2.5">
            <p className="font-serif text-[16px] leading-snug text-ink">“{selectedSpan.text}”</p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-[12px] text-ink-soft">Pick a label, or press its number</span>
              <button
                type="button"
                onClick={clearSelection}
                className="rounded border border-rule bg-sheet px-2 py-1 text-[11.5px] text-ink-soft transition hover:border-rule-strong hover:text-ink"
              >
                Clear
              </button>
            </div>
          </div>
        ) : activeEditingEntity ? (
          <div className="mt-2.5 rounded border-l-2 border-ink bg-paper px-3 py-2.5">
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 flex-1 truncate font-serif text-[16px] text-ink">
                “{activeEditingEntity.text}”
              </p>
              <button
                type="button"
                onClick={() => setActiveEditingEntity(null)}
                className="text-[11.5px] text-ink-faint transition hover:text-ink"
              >
                Done
              </button>
            </div>
            <label className="mt-2 block text-[11.5px] text-ink-soft">
              Change its label
              <select
                value={activeEditingEntity.label}
                onChange={(e) => {
                  updateEntity(activeEditingEntity, { label: e.target.value });
                  setActiveEditingEntity((prev) => ({ ...prev, label: e.target.value }));
                }}
                className="mt-1 w-full rounded border border-rule bg-sheet px-2 py-2 text-[13px] text-ink focus:border-ink focus:outline-none"
              >
                {ENTITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {formatEntityLabel(t)}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => {
                deleteEntity(activeEditingEntity);
                setActiveEditingEntity(null);
              }}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded border border-rule bg-sheet px-2 py-1.5 text-[12.5px] text-hand transition hover:border-hand/50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove this span
            </button>
          </div>
        ) : (
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">
            Drag across any words in the passage, then choose the label that fits. Click a span
            you have already marked to change or remove it.
          </p>
        )}

        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-[11px] h-4 w-4 text-ink-faint" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder={`Search all ${ENTITY_TYPES.length} labels`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && selectedSpan && matches?.length) {
                handlePick(matches[0]);
              }
            }}
            className="w-full rounded border border-rule bg-paper py-2 pl-9 pr-8 text-[13px] text-ink placeholder:text-ink-faint focus:border-ink focus:bg-sheet focus:outline-none"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-2.5 text-ink-faint transition hover:text-ink"
              title="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <span className="pointer-events-none absolute right-3 top-2 rounded border border-rule bg-sheet px-1.5 font-mono text-[10.5px] text-ink-faint">
              /
            </span>
          )}
        </div>

        {justTagged && (
          <p className="mark-in mt-2.5 truncate text-[12px] text-hand" title={justTagged}>
            {justTagged}
          </p>
        )}
        {notice && !justTagged && (
          <p className="mt-2.5 text-[12px] leading-snug text-ink-soft">{notice}</p>
        )}

        {!matches && quickLabels.length > 0 && (
          <div className="mt-3.5">
            <p className="mb-1.5 text-[11.5px] text-ink-faint">
              {recentLabels.length > 0 ? 'Recently used' : 'Common labels'}
            </p>
            <QuickLabels
              labels={quickLabels}
              shortcutMap={shortcutMap}
              armed={armed}
              onPick={handlePick}
              counts={entityCounts}
            />
          </div>
        )}
      </div>

      {/* The full list — always open, scrolls on its own */}
      <div className="scroll-slim min-h-[12rem] flex-1 overflow-y-auto px-2 py-1.5">
        {matches ? (
          matches.length > 0 ? (
            matches.map((type) => (
              <LabelRow
                key={type}
                type={type}
                count={entityCounts[type] || 0}
                shortcut={shortcutMap[type]}
                armed={armed}
                onPick={handlePick}
              />
            ))
          ) : (
            <p className="px-2.5 py-4 text-[13px] text-ink-faint">
              No label matches “{search}”. Clear the search to see all{' '}
              {ENTITY_TYPES.length}.
            </p>
          )
        ) : (
          ENTITY_GROUPS.map((group) => (
            <section key={group.name} className="mb-2 last:mb-0">
              <h3 className="sticky top-0 z-10 border-b border-rule/70 bg-sheet px-2.5 py-1.5 text-[11.5px] font-medium text-ink-soft">
                {group.name}
                <span className="ml-1.5 font-mono text-[10.5px] text-ink-faint">
                  {group.types.length}
                </span>
              </h3>
              {group.types.map((type) => (
                <LabelRow
                  key={type}
                  type={type}
                  count={entityCounts[type] || 0}
                  shortcut={shortcutMap[type]}
                  armed={armed}
                  onPick={handlePick}
                />
              ))}
            </section>
          ))
        )}
      </div>

      {/* Fixed foot: the line you are on, and what the marks mean */}
      <div className="shrink-0 border-t border-rule bg-paper/60 px-4 py-3">
        <div className="flex items-baseline justify-between gap-3 py-0.5">
          <span className="flex items-center gap-2 text-[12.5px] text-ink-soft">
            <span className="inline-block h-0 w-4 border-b-2 border-solid border-machine" />
            Model found
          </span>
          <span className="font-mono text-[13px] tabular-nums text-machine">{modelSpans}</span>
        </div>
        <div className="flex items-baseline justify-between gap-3 py-0.5">
          <span className="flex items-center gap-2 text-[12.5px] text-ink-soft">
            <span className="inline-block h-0 w-4 border-b-2 border-dashed border-hand" />
            You added
          </span>
          <span className="font-mono text-[13px] tabular-nums text-hand">{manualSpans}</span>
        </div>
        <div className="flex items-baseline justify-between gap-3 py-0.5">
          <span className="text-[12.5px] text-ink-soft">Mean confidence</span>
          <span className="font-mono text-[13px] tabular-nums text-ink">{confidenceLabel}</span>
        </div>
      </div>
    </div>
  );
}
