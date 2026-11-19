import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Trash2, X, Sparkles, HelpCircle } from 'lucide-react';
import { useAnnotation } from '../context/AnnotationContext.jsx';
import {
  ENTITY_TYPES,
  ENTITY_GROUPS,
  ENTITY_SHORTCUTS,
  ENTITY_DESCRIPTIONS,
  getEntityColorStyle,
  formatEntityLabel,
  getTopEarlierAnnotations,
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

/**
 * Compact 2-column entity button with swatch, label name, shortcut key, and count.
 * Displays description on hover.
 */
function LabelButton({ type, count, shortcut, armed, onPick, onHover }) {
  const { border } = getEntityColorStyle(type);
  const formatted = formatEntityLabel(type);
  const desc = ENTITY_DESCRIPTIONS[type] || '';

  return (
    <button
      type="button"
      onClick={() => onPick(type)}
      onMouseEnter={(e) =>
        onHover?.({
          type,
          label: formatted,
          desc,
          rect: e.currentTarget.getBoundingClientRect(),
        })
      }
      onMouseLeave={() => onHover?.(null)}
      className={`group relative flex items-center justify-between gap-1 rounded border px-2 py-1.5 text-left transition-all ${
        armed
          ? 'border-rule hover:border-ink hover:bg-paper hover:shadow-xs'
          : 'border-rule/80 bg-sheet hover:border-rule-strong hover:bg-paper'
      }`}
      title={`${formatted}: ${desc}`}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: border }}
          aria-hidden="true"
        />
        <span className="truncate text-[12px] font-medium text-ink group-hover:text-ink">
          {formatted}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {shortcut && (
          <span className="rounded border border-rule bg-paper px-1 py-px font-mono text-[9.5px] font-medium text-ink-soft">
            {shortcut}
          </span>
        )}
        {count > 0 && (
          <span className="font-mono text-[10px] tabular-nums text-ink-faint">
            {count.toLocaleString()}
          </span>
        )}
      </div>
    </button>
  );
}

export default function EntityPaletteSidebar({
  modelSpans = 0,
  manualSpans = 0,
  meanConfidence = null,
  entityCounts = {},
  isValidation = false,
  focusedSpan = null,
  doc = null,
  workingEntities = [],
}) {
  const annotation = useAnnotation();
  const [search, setSearch] = useState('');
  const [justTagged, setJustTagged] = useState('');
  const [notice, setNotice] = useState('');
  const [hoveredEntity, setHoveredEntity] = useState(null);
  const searchInputRef = useRef(null);

  const selectedSpan = annotation?.selectedSpan;
  const activeEditingEntity = annotation?.activeEditingEntity;
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

  // Compute at most top 5 predictions of how the currently selected text was annotated earlier
  const topPredictions = useMemo(() => {
    const textToPredict = selectedSpan?.text || (isValidation && focusedSpan ? focusedSpan.text : '');
    if (!textToPredict) return [];
    return getTopEarlierAnnotations(textToPredict, doc, workingEntities);
  }, [selectedSpan?.text, isValidation, focusedSpan, doc, workingEntities]);

  // Alphabetically sorted matches if search is active
  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    return [...ENTITY_TYPES]
      .filter((t) => formatEntityLabel(t).toLowerCase().includes(q))
      .sort((a, b) => formatEntityLabel(a).localeCompare(formatEntityLabel(b)));
  }, [search]);

  // Categories sorted A-Z, and within each category types sorted A-Z
  const sortedCategories = useMemo(() => {
    return [...ENTITY_GROUPS]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((group) => ({
        ...group,
        types: [...group.types].sort((a, b) =>
          formatEntityLabel(a).localeCompare(formatEntityLabel(b))
        ),
      }));
  }, []);

  const armed = Boolean(selectedSpan);

  const handlePick = (type) => {
    // Validation, with nothing selected: a label corrects the entity in focus.
    // With words selected, it adds a span, exactly as in annotation.
    if (isValidation && !selectedSpan) {
      const target = focusedSpan || activeEditingEntity;
      if (!target) {
        setJustTagged('');
        setNotice('Click an entity in the passage first, then pick its correct label.');
        setTimeout(() => setNotice(''), 3000);
        return;
      }
      applyLabel(type);
      setSearch('');
      setNotice('');
      setJustTagged(`${target.text} → ${formatEntityLabel(type)}`);
      setTimeout(() => setJustTagged(''), 2600);
      return;
    }

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
    <div className="relative flex max-h-[38rem] flex-col overflow-hidden rounded-md border border-rule bg-sheet md:h-full md:max-h-none">
      {/* Floating Hover Description Tooltip */}
      {hoveredEntity && (
        <div
          role="tooltip"
          className="pointer-events-none fixed z-50 max-w-[280px] rounded-lg border border-rule-strong bg-white/95 p-3 shadow-xl backdrop-blur-md transition-opacity duration-150"
          style={{
            left: Math.max(12, Math.min(window.innerWidth - 300, (hoveredEntity.rect?.left ?? 20) - 20)),
            top:
              hoveredEntity.rect && hoveredEntity.rect.top > 160
                ? hoveredEntity.rect.top - 8
                : (hoveredEntity.rect?.bottom ?? 100) + 8,
            transform: hoveredEntity.rect && hoveredEntity.rect.top > 160 ? 'translateY(-100%)' : 'translateY(0)',
          }}
        >
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: getEntityColorStyle(hoveredEntity.type).border }}
            />
            <span className="font-semibold text-[13px] text-ink">
              {hoveredEntity.label}
            </span>
            {shortcutMap[hoveredEntity.type] && (
              <span className="ml-auto rounded border border-rule bg-paper px-1.5 py-px font-mono text-[10px] font-medium text-ink-soft">
                Key {shortcutMap[hoveredEntity.type]}
              </span>
            )}
          </div>
          <p className="mt-1.5 text-[12px] leading-relaxed text-ink-soft">
            {hoveredEntity.desc}
          </p>
        </div>
      )}

      {/* Fixed head: what you are doing right now */}
      <div className="shrink-0 border-b border-rule px-3.5 pb-3 pt-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-[14px] font-semibold text-ink">Entity labels</h2>
          <span className="font-mono text-[11.5px] tabular-nums text-ink-faint">
            {matches ? `${matches.length} of ${ENTITY_TYPES.length}` : `${ENTITY_TYPES.length} total`}
          </span>
        </div>

        {/* Live Selection State & Top 5 Earlier Annotations */}
        {selectedSpan ? (
          <div className="mt-2.5 rounded border-l-2 border-hand bg-paper p-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[10.5px] font-semibold uppercase tracking-wider text-hand">
                  Selected text
                </span>
                <p className="truncate font-serif text-[15.5px] font-medium leading-snug text-ink">
                  “{selectedSpan.text}”
                </p>
              </div>
              <button
                type="button"
                onClick={clearSelection}
                className="shrink-0 rounded border border-rule bg-sheet px-2 py-0.5 text-[11.5px] text-ink-soft transition hover:border-rule-strong hover:text-ink"
              >
                Clear
              </button>
            </div>

            {/* Top at most 5 predictions based on earlier annotations of this text */}
            <div className="mt-2 border-t border-rule/70 pt-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-[11.5px] font-semibold text-ink">
                  <Sparkles className="h-3 w-3 text-hand" />
                  {topPredictions.length > 0
                    ? `Earlier annotations (top ${topPredictions.length}):`
                    : 'Earlier annotations:'}
                </span>
                {topPredictions.length > 0 && (
                  <span className="text-[10px] text-ink-faint">
                    Click to apply
                  </span>
                )}
              </div>

              {topPredictions.length > 0 ? (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {topPredictions.map((pred) => {
                    const { border, bg, text: textColor } = getEntityColorStyle(pred.label);
                    const shortcut = shortcutMap[pred.label];
                    const desc = ENTITY_DESCRIPTIONS[pred.label] || '';
                    return (
                      <button
                        key={pred.label}
                        type="button"
                        onClick={() => handlePick(pred.label)}
                        onMouseEnter={(e) =>
                          setHoveredEntity({
                            type: pred.label,
                            label: formatEntityLabel(pred.label),
                            desc,
                            rect: e.currentTarget.getBoundingClientRect(),
                          })
                        }
                        onMouseLeave={() => setHoveredEntity(null)}
                        className="group flex items-center gap-1.5 rounded border px-2 py-1 text-left text-[11.5px] font-medium transition hover:scale-[1.02] hover:shadow-xs"
                        style={{ backgroundColor: bg, color: textColor, borderColor: border }}
                        title={`${formatEntityLabel(pred.label)}: ${desc} (${pred.count}x earlier · ${pred.percentage}%)`}
                      >
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: border }}
                        />
                        <span className="font-semibold">{formatEntityLabel(pred.label)}</span>
                        <span className="rounded bg-black/10 px-1 py-px font-mono text-[9.5px] tabular-nums opacity-90">
                          {pred.count}× ({pred.percentage}%)
                        </span>
                        {shortcut && (
                          <span className="font-mono text-[9px] opacity-75">
                            [{shortcut}]
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-1 text-[11.5px] text-ink-faint">
                  First time this text appears. Pick an entity label from the list below.
                </p>
              )}
            </div>
          </div>
        ) : isValidation && (focusedSpan || activeEditingEntity) ? (
          <div className="mt-2.5 rounded border-l-2 border-hand bg-paper p-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[10.5px] font-semibold uppercase tracking-wider text-hand">
                  Focused entity
                </span>
                <p className="font-serif text-[15px] font-medium text-ink">
                  “{(focusedSpan || activeEditingEntity).text}”
                </p>
                <p className="mt-1 text-[11.5px] text-ink-soft">
                  Tagged{' '}
                  <span className="font-semibold text-ink">
                    {formatEntityLabel((focusedSpan || activeEditingEntity).label)}
                  </span>
                  . Pick a different label to correct it.
                </p>
              </div>
            </div>

            {/* Earlier predictions for the focused entity text */}
            {topPredictions.length > 0 && (
              <div className="mt-2 border-t border-rule/70 pt-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-[11px] font-medium text-ink">
                    <Sparkles className="h-3 w-3 text-hand" />
                    Earlier annotations:
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {topPredictions.map((pred) => {
                    const { border, bg, text: textColor } = getEntityColorStyle(pred.label);
                    const desc = ENTITY_DESCRIPTIONS[pred.label] || '';
                    return (
                      <button
                        key={pred.label}
                        type="button"
                        onClick={() => handlePick(pred.label)}
                        onMouseEnter={(e) =>
                          setHoveredEntity({
                            type: pred.label,
                            label: formatEntityLabel(pred.label),
                            desc,
                            rect: e.currentTarget.getBoundingClientRect(),
                          })
                        }
                        onMouseLeave={() => setHoveredEntity(null)}
                        className="flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-medium transition hover:shadow-xs"
                        style={{ backgroundColor: bg, color: textColor, borderColor: border }}
                        title={`${formatEntityLabel(pred.label)}: ${desc} (${pred.count}x)`}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: border }}
                        />
                        <span>{formatEntityLabel(pred.label)}</span>
                        <span className="font-mono text-[9px] opacity-75">{pred.count}×</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : activeEditingEntity ? (
          <div className="mt-2.5 rounded border-l-2 border-ink bg-paper px-3 py-2.5">
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 flex-1 truncate font-serif text-[15px] font-medium text-ink">
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
                className="mt-1 w-full rounded border border-rule bg-sheet px-2 py-1.5 text-[12.5px] text-ink focus:border-ink focus:outline-none"
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
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded border border-rule bg-sheet px-2 py-1.5 text-[12px] text-hand transition hover:border-hand/50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove this span
            </button>
          </div>
        ) : (
          <p className="mt-1.5 text-[12px] leading-relaxed text-ink-soft">
            Drag across words in the passage to label them. Hover on any entity below to view its description.
          </p>
        )}

        {/* Search Input */}
        <div className="relative mt-2.5">
          <Search className="pointer-events-none absolute left-3 top-[9px] h-3.5 w-3.5 text-ink-faint" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder={`Search all ${ENTITY_TYPES.length} labels...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && selectedSpan && matches?.length) {
                handlePick(matches[0]);
              }
            }}
            className="w-full rounded border border-rule bg-paper py-1.5 pl-8 pr-7 text-[12.5px] text-ink placeholder:text-ink-faint focus:border-ink focus:bg-sheet focus:outline-none"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 top-2 text-ink-faint transition hover:text-ink"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <span className="pointer-events-none absolute right-2.5 top-1.5 rounded border border-rule bg-sheet px-1 font-mono text-[10px] text-ink-faint">
              /
            </span>
          )}
        </div>

        {justTagged && (
          <p className="mark-in mt-2 truncate text-[12px] font-medium text-hand" title={justTagged}>
            {justTagged}
          </p>
        )}
        {notice && !justTagged && (
          <p className="mt-2 text-[12px] leading-snug text-ink-soft">{notice}</p>
        )}
      </div>

      {/* All entity names displayed in 2 columns at a time:
          - Each category listed in alphabetical order (A-Z)
          - Within each category, all entities listed in A-Z order
          - Hovering on any entity displays its description
      */}
      <div className="scroll-slim min-h-[14rem] flex-1 overflow-y-auto px-2 py-1.5">
        {matches ? (
          matches.length > 0 ? (
            <div className="py-1">
              <div className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                Search Results ({matches.length})
              </div>
              <div className="grid grid-cols-2 gap-1">
                {matches.map((type) => (
                  <LabelButton
                    key={type}
                    type={type}
                    count={entityCounts[type] || 0}
                    shortcut={shortcutMap[type]}
                    armed={armed}
                    onPick={handlePick}
                    onHover={setHoveredEntity}
                  />
                ))}
              </div>
            </div>
          ) : (
            <p className="px-2.5 py-4 text-[12.5px] text-ink-faint">
              No label matches “{search}”. Clear the search to see all{' '}
              {ENTITY_TYPES.length}.
            </p>
          )
        ) : (
          sortedCategories.map((group) => (
            <section key={group.name} className="mb-2.5 last:mb-0">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-rule/70 bg-sheet/95 px-2 py-1 backdrop-blur-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-[12px] opacity-80" aria-hidden="true">
                    {group.icon}
                  </span>
                  <h3 className="text-[11.5px] font-semibold text-ink">
                    {group.name}
                  </h3>
                </div>
                <span className="font-mono text-[10px] text-ink-faint">
                  {group.types.length}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1 px-0.5 py-1">
                {group.types.map((type) => (
                  <LabelButton
                    key={type}
                    type={type}
                    count={entityCounts[type] || 0}
                    shortcut={shortcutMap[type]}
                    armed={armed}
                    onPick={handlePick}
                    onHover={setHoveredEntity}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      {/* Fixed foot: model findings vs manual tags */}
      <div className="shrink-0 border-t border-rule bg-paper/60 px-3.5 py-2.5 text-[12px]">
        <div className="flex items-baseline justify-between gap-3 py-0.5">
          <span className="flex items-center gap-2 text-ink-soft">
            <span className="inline-block h-0 w-3.5 border-b-2 border-solid border-machine" />
            Model found
          </span>
          <span className="font-mono text-[12.5px] tabular-nums text-machine">{modelSpans}</span>
        </div>
        <div className="flex items-baseline justify-between gap-3 py-0.5">
          <span className="flex items-center gap-2 text-ink-soft">
            <span className="inline-block h-0 w-3.5 border-b-2 border-dashed border-hand" />
            You added
          </span>
          <span className="font-mono text-[12.5px] tabular-nums text-hand">{manualSpans}</span>
        </div>
        <div className="flex items-baseline justify-between gap-3 py-0.5">
          <span className="text-ink-soft">Mean confidence</span>
          <span className="font-mono text-[12.5px] tabular-nums text-ink">{confidenceLabel}</span>
        </div>
      </div>
    </div>
  );
}
