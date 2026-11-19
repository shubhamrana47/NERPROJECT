import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Trash2, X, Sparkles, HelpCircle, Info } from 'lucide-react';
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

/**
 * Compact entity button with swatch, label name, shortcut key, and count.
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
      className={`group relative flex items-center justify-between gap-1 rounded border px-1.5 py-1 text-left transition-all ${
        armed
          ? 'border-rule hover:border-ink hover:bg-paper hover:shadow-xs'
          : 'border-rule/80 bg-sheet hover:border-rule-strong hover:bg-paper'
      }`}
      title={`${formatted}: ${desc}`}
    >
      <div className="flex min-w-0 items-center gap-1">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: border }}
          aria-hidden="true"
        />
        <span className="truncate text-[11px] font-medium text-ink group-hover:text-ink">
          {formatted}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        {shortcut && (
          <span className="rounded border border-rule bg-paper px-1 py-px font-mono text-[9px] font-semibold text-ink-soft">
            {shortcut}
          </span>
        )}
        {count > 0 && (
          <span className="font-mono text-[9.5px] tabular-nums text-ink-faint">
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

  // Keyboard shortcut "/" to focus search input
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
    <div className="relative flex max-h-[42rem] flex-col overflow-hidden rounded-md border border-rule bg-sheet md:h-full md:max-h-none">
      {/* Floating Hover Description Tooltip Card */}
      {hoveredEntity && (
        <div
          role="tooltip"
          className="pointer-events-none fixed z-50 max-w-[300px] rounded-lg border border-slate-700 bg-slate-900/95 p-3 text-white shadow-2xl backdrop-blur-md transition-opacity duration-150"
          style={{
            left: Math.max(12, Math.min(window.innerWidth - 320, (hoveredEntity.rect?.left ?? 20) - 10)),
            top:
              hoveredEntity.rect && hoveredEntity.rect.top > 150
                ? hoveredEntity.rect.top - 8
                : (hoveredEntity.rect?.bottom ?? 100) + 8,
            transform: hoveredEntity.rect && hoveredEntity.rect.top > 150 ? 'translateY(-100%)' : 'translateY(0)',
          }}
        >
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: getEntityColorStyle(hoveredEntity.type).border }}
            />
            <span className="font-semibold text-[13px] text-white">
              {hoveredEntity.label}
            </span>
            {shortcutMap[hoveredEntity.type] && (
              <span className="ml-auto rounded border border-slate-700 bg-slate-800 px-1.5 py-px font-mono text-[10px] font-semibold text-amber-400">
                Key {shortcutMap[hoveredEntity.type]}
              </span>
            )}
          </div>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-slate-200">
            {hoveredEntity.desc}
          </p>
        </div>
      )}

      {/* Fixed Header: Title & Search (No Recently Used tab!) */}
      <div className="shrink-0 border-b border-rule px-3 pb-2 pt-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <h2 className="text-[13.5px] font-semibold text-ink">Entity labels</h2>
            <span className="rounded bg-paper px-1.5 py-0.5 font-mono text-[10.5px] font-medium text-ink-faint">
              {matches ? `${matches.length} of ${ENTITY_TYPES.length}` : `${ENTITY_TYPES.length} total`}
            </span>
          </div>

          {/* Compact Search input */}
          <div className="relative w-44">
            <Search className="pointer-events-none absolute left-2 top-[7px] h-3 w-3 text-ink-faint" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search labels [/]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && selectedSpan && matches?.length) {
                  handlePick(matches[0]);
                }
              }}
              className="w-full rounded border border-rule bg-paper py-1 pl-6 pr-6 text-[11.5px] text-ink placeholder:text-ink-faint focus:border-ink focus:bg-sheet focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-1.5 top-1.5 text-ink-faint transition hover:text-ink"
                title="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Live Selection State & Top 5 Earlier Predictions */}
        {selectedSpan ? (
          <div className="mt-2 rounded border-l-2 border-hand bg-paper p-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-hand">
                  Selected text to annotate
                </span>
                <p className="truncate font-serif text-[14.5px] font-medium leading-tight text-ink">
                  “{selectedSpan.text}”
                </p>
              </div>
              <button
                type="button"
                onClick={clearSelection}
                className="shrink-0 rounded border border-rule bg-sheet px-2 py-0.5 text-[11px] text-ink-soft transition hover:border-rule-strong hover:text-ink"
              >
                Clear
              </button>
            </div>

            {/* Top at most 5 predictions based on earlier annotations of this text */}
            <div className="mt-1.5 border-t border-rule/70 pt-1.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-[11px] font-semibold text-ink">
                  <Sparkles className="h-3 w-3 text-hand" />
                  {topPredictions.length > 0
                    ? `Earlier annotations (top ${topPredictions.length}):`
                    : 'Earlier annotations:'}
                </span>
                {topPredictions.length > 0 && (
                  <span className="text-[9.5px] text-ink-faint">
                    Click to apply
                  </span>
                )}
              </div>

              {topPredictions.length > 0 ? (
                <div className="mt-1 flex flex-wrap gap-1">
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
                        className="group flex items-center gap-1 rounded border px-1.5 py-0.5 text-left text-[11px] font-medium transition hover:scale-[1.02] hover:shadow-xs"
                        style={{ backgroundColor: bg, color: textColor, borderColor: border }}
                        title={`${formatEntityLabel(pred.label)}: ${desc} (${pred.count}x earlier · ${pred.percentage}%)`}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: border }}
                        />
                        <span className="font-semibold">{formatEntityLabel(pred.label)}</span>
                        <span className="rounded bg-black/10 px-1 py-px font-mono text-[9px] tabular-nums opacity-90">
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
                <p className="mt-0.5 text-[10.5px] text-ink-faint">
                  First appearance. Pick any label from the 2-row categories below.
                </p>
              )}
            </div>
          </div>
        ) : isValidation && (focusedSpan || activeEditingEntity) ? (
          <div className="mt-2 rounded border-l-2 border-hand bg-paper p-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-hand">
                  Focused entity
                </span>
                <p className="font-serif text-[14px] font-medium text-ink">
                  “{(focusedSpan || activeEditingEntity).text}”
                </p>
                <p className="text-[11px] text-ink-soft">
                  Tagged{' '}
                  <span className="font-semibold text-ink">
                    {formatEntityLabel((focusedSpan || activeEditingEntity).label)}
                  </span>
                  . Pick a different label below to correct it.
                </p>
              </div>
            </div>

            {/* Earlier predictions for focused entity */}
            {topPredictions.length > 0 && (
              <div className="mt-1.5 border-t border-rule/70 pt-1">
                <div className="flex items-center gap-1 text-[10.5px] font-medium text-ink">
                  <Sparkles className="h-2.5 w-2.5 text-hand" />
                  <span>Earlier annotations:</span>
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
                        className="flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10.5px] font-medium transition hover:shadow-xs"
                        style={{ backgroundColor: bg, color: textColor, borderColor: border }}
                        title={`${formatEntityLabel(pred.label)}: ${desc} (${pred.count}x)`}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: border }}
                        />
                        <span>{formatEntityLabel(pred.label)}</span>
                        <span className="font-mono text-[8.5px] opacity-75">{pred.count}×</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : activeEditingEntity ? (
          <div className="mt-2 rounded border-l-2 border-ink bg-paper px-2.5 py-2">
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 flex-1 truncate font-serif text-[14px] font-medium text-ink">
                “{activeEditingEntity.text}”
              </p>
              <button
                type="button"
                onClick={() => setActiveEditingEntity(null)}
                className="text-[11px] text-ink-faint transition hover:text-ink"
              >
                Done
              </button>
            </div>
            <label className="mt-1.5 block text-[11px] text-ink-soft">
              Change label
              <select
                value={activeEditingEntity.label}
                onChange={(e) => {
                  updateEntity(activeEditingEntity, { label: e.target.value });
                  setActiveEditingEntity((prev) => ({ ...prev, label: e.target.value }));
                }}
                className="mt-1 w-full rounded border border-rule bg-sheet px-2 py-1 text-[12px] text-ink focus:border-ink focus:outline-none"
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
              className="mt-1.5 flex w-full items-center justify-center gap-1 rounded border border-rule bg-sheet px-2 py-1 text-[11.5px] text-hand transition hover:border-hand/50"
            >
              <Trash2 className="h-3 w-3" />
              Remove span
            </button>
          </div>
        ) : null}

        {justTagged && (
          <p className="mark-in mt-1.5 truncate text-[11.5px] font-medium text-hand" title={justTagged}>
            {justTagged}
          </p>
        )}
        {notice && !justTagged && (
          <p className="mt-1.5 text-[11.5px] leading-snug text-ink-soft">{notice}</p>
        )}
      </div>

      {/* Entity Groups and their entities in 2 rows, in alphabetical order, all visible at a time:
          - Categories sorted in A-Z order
          - Each category renders its entities in exactly 2 rows (2 cols for <=4 items, 4 cols for >4 items)
          - Within each category, entities are in A-Z alphabetical order
          - Hovering on any entity displays its description
      */}
      <div className="scroll-slim flex-1 overflow-y-auto px-2 py-1.5">
        {matches ? (
          matches.length > 0 ? (
            <div className="py-1">
              <div className="mb-1 px-1 text-[10.5px] font-semibold uppercase tracking-wider text-ink-faint">
                Search Results ({matches.length})
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
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
            <p className="px-2.5 py-4 text-[12px] text-ink-faint">
              No label matches “{search}”. Clear search to view all {ENTITY_TYPES.length}.
            </p>
          )
        ) : (
          sortedCategories.map((group) => {
            const isLargeGroup = group.types.length > 4;
            return (
              <section key={group.name} className="mb-1.5 last:mb-0">
                {/* Category Header */}
                <div className="flex items-center justify-between border-b border-rule/60 bg-sheet/95 px-1.5 py-0.5">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] opacity-80" aria-hidden="true">
                      {group.icon}
                    </span>
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink">
                      {group.name}
                    </h3>
                  </div>
                  <span className="font-mono text-[9.5px] text-ink-faint">
                    {group.types.length}
                  </span>
                </div>

                {/* Entities arranged in 2 rows:
                    - Groups with <=4 entities use 2 columns = 2 rows
                    - Groups with >4 entities use 4 columns = 2 rows
                */}
                <div
                  className={`grid gap-1 px-0.5 pt-1 ${
                    isLargeGroup ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2'
                  }`}
                >
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
            );
          })
        )}
      </div>

      {/* Description Status Bar on Hover + Model vs Human Counts */}
      <div className="shrink-0 border-t border-rule bg-paper/80 px-3 py-1.5 text-[11px]">
        {/* Dynamic description bar on hover */}
        {hoveredEntity ? (
          <div className="flex items-center gap-1.5 text-ink transition-opacity">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: getEntityColorStyle(hoveredEntity.type).border }}
            />
            <span className="font-semibold text-ink">{hoveredEntity.label}:</span>
            <span className="truncate text-ink-soft">{hoveredEntity.desc}</span>
          </div>
        ) : (
          <div className="flex items-center justify-between text-ink-faint">
            <span className="flex items-center gap-1 text-[10.5px]">
              <Info className="h-3 w-3" />
              Hover on any entity name to read its description
            </span>
            <div className="flex items-center gap-3 font-mono text-[10.5px] tabular-nums">
              <span>Model: <strong className="font-medium text-machine">{modelSpans}</strong></span>
              <span>Added: <strong className="font-medium text-hand">{manualSpans}</strong></span>
              <span>Conf: <strong className="font-medium text-ink">{confidenceLabel}</strong></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
