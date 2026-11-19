import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Trash2, X } from 'lucide-react';
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
 * Entity card component matching Image 2:
 * - Colored horizontal bar at top-left
 * - Shortcut key badge at top-right (if available)
 * - Formatted label name
 * - Usage count
 * - Dark floating tooltip on hover with `→ <description>`
 */
function EntityCard({ type, count, shortcut, armed, onPick, onHover }) {
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
      className={`group relative flex flex-col justify-between rounded-lg border p-2 text-left transition-all ${
        armed
          ? 'border-slate-300 bg-white hover:border-slate-900 hover:shadow-xs'
          : 'border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50/80 shadow-2xs'
      }`}
      title={`${formatted}: ${desc}`}
    >
      <div className="flex items-center justify-between gap-1 w-full">
        <span
          className="h-[3px] w-3.5 shrink-0 rounded-full"
          style={{ backgroundColor: border }}
          aria-hidden="true"
        />
        {shortcut && (
          <span className="rounded border border-slate-200 bg-slate-50 px-1 py-px font-mono text-[10px] font-medium text-slate-600">
            {shortcut}
          </span>
        )}
      </div>

      <div className="mt-1 flex items-baseline justify-between gap-1 w-full">
        <span className="truncate text-[12px] font-medium text-slate-800 group-hover:text-black">
          {formatted}
        </span>
        {count > 0 && (
          <span className="shrink-0 font-mono text-[10.5px] tabular-nums text-slate-500">
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

  // Split categories into 2 main columns (Left: 4 categories, Right: 3 categories)
  const leftColumnCategories = useMemo(() => sortedCategories.slice(0, 4), [sortedCategories]);
  const rightColumnCategories = useMemo(() => sortedCategories.slice(4), [sortedCategories]);

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
    <div className="relative flex max-h-[46rem] flex-col overflow-hidden rounded-md border border-rule bg-sheet md:h-full md:max-h-none">
      {/* Dark Hover Tooltip Card matching Image 2 */}
      {hoveredEntity && (
        <div
          role="tooltip"
          className="pointer-events-none fixed z-50 max-w-[280px] rounded-md border border-neutral-800 bg-[#222222] px-3 py-2 text-white shadow-2xl backdrop-blur-md transition-opacity duration-150"
          style={{
            left: Math.max(12, Math.min(window.innerWidth - 300, (hoveredEntity.rect?.left ?? 20))),
            top:
              hoveredEntity.rect && hoveredEntity.rect.top > 120
                ? hoveredEntity.rect.top - 6
                : (hoveredEntity.rect?.bottom ?? 100) + 6,
            transform: hoveredEntity.rect && hoveredEntity.rect.top > 120 ? 'translateY(-100%)' : 'translateY(0)',
          }}
        >
          <div className="flex items-start gap-2 text-[12px] leading-snug">
            <span className="text-white font-bold opacity-80 select-none">→</span>
            <span>{hoveredEntity.desc}</span>
          </div>
        </div>
      )}

      {/* Header: Title, Instructions & Search */}
      <div className="shrink-0 border-b border-rule px-4 pb-3 pt-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-[15px] font-bold text-ink">Entity labels</h2>
          <span className="font-mono text-[12px] text-ink-faint">
            {matches ? `${matches.length} of ${ENTITY_TYPES.length}` : ENTITY_TYPES.length}
          </span>
        </div>

        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">
          Click an entity in the passage to put it in focus, then pick a label here to correct it. To add one the pipeline missed, select the words first.
        </p>

        {/* Search input with / shortcut */}
        <div className="relative mt-2.5">
          <Search className="pointer-events-none absolute left-3 top-[10px] h-3.5 w-3.5 text-ink-faint" />
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
            className="w-full rounded-md border border-rule bg-paper py-1.5 pl-8 pr-7 text-[13px] text-ink placeholder:text-ink-faint focus:border-ink focus:bg-sheet focus:outline-none"
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
            <span className="pointer-events-none absolute right-2.5 top-1.5 rounded border border-rule bg-sheet px-1.5 font-mono text-[10.5px] text-ink-faint">
              /
            </span>
          )}
        </div>

        {/* "Suggested for selected text" card matching Image 2 */}
        {(selectedSpan || (isValidation && focusedSpan)) && (
          <div className="mt-2.5 rounded-lg border border-blue-200 bg-[#e8f1fd] p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium text-slate-800">
                Suggested for selected text
              </span>
              {selectedSpan && (
                <button
                  type="button"
                  onClick={clearSelection}
                  className="text-[11px] text-slate-500 transition hover:text-slate-800"
                >
                  Clear
                </button>
              )}
            </div>

            {topPredictions.length > 0 ? (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {topPredictions.map((pred) => {
                  const { border } = getEntityColorStyle(pred.label);
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
                      className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-800 shadow-2xs transition hover:border-slate-500 hover:bg-slate-50"
                      title={`${formatEntityLabel(pred.label)}: ${desc} (${pred.percentage}%)`}
                    >
                      <span
                        className="h-[2.5px] w-3 rounded-full"
                        style={{ backgroundColor: border }}
                      />
                      <span>
                        {formatEntityLabel(pred.label)} ({pred.percentage}%)
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="mt-1 text-[11px] text-slate-600">
                Pick a label from the categories below to annotate “{selectedSpan?.text || focusedSpan?.text}”.
              </p>
            )}
          </div>
        )}

        {justTagged && (
          <p className="mark-in mt-1.5 truncate text-[11.5px] font-medium text-hand" title={justTagged}>
            {justTagged}
          </p>
        )}
        {notice && !justTagged && (
          <p className="mt-1.5 text-[11.5px] leading-snug text-ink-soft">{notice}</p>
        )}
      </div>

      {/* The 2-Column Categories and Cards Layout matching Image 2 */}
      <div className="scroll-slim flex-1 overflow-y-auto p-3">
        {matches ? (
          matches.length > 0 ? (
            <div>
              <div className="mb-2 text-[12px] font-semibold text-slate-700">
                Search Results ({matches.length})
              </div>
              <div className="grid grid-cols-2 gap-2">
                {matches.map((type) => (
                  <EntityCard
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
            <p className="py-6 text-center text-[12.5px] text-ink-faint">
              No label matches “{search}”.
            </p>
          )
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Left Column Categories */}
            <div className="space-y-4">
              {leftColumnCategories.map((group) => (
                <section key={group.name}>
                  <h3 className="mb-1.5 text-[12.5px] font-medium text-slate-800">
                    {group.name}
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {group.types.map((type) => (
                      <EntityCard
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
              ))}
            </div>

            {/* Right Column Categories */}
            <div className="space-y-4">
              {rightColumnCategories.map((group) => (
                <section key={group.name}>
                  <h3 className="mb-1.5 text-[12.5px] font-medium text-slate-800">
                    {group.name}
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {group.types.map((type) => (
                      <EntityCard
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
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Fixed Footer matching Image 2 */}
      <div className="shrink-0 border-t border-rule bg-sheet px-4 py-3 text-[12.5px]">
        <div className="flex items-baseline justify-between gap-3 py-0.5">
          <span className="flex items-center gap-2 text-ink-soft">
            <span className="inline-block h-0 w-4 border-b-2 border-solid border-blue-600" />
            Model found
          </span>
          <span className="font-mono text-[13px] tabular-nums text-blue-600 font-medium">
            {modelSpans}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-3 py-0.5">
          <span className="flex items-center gap-2 text-ink-soft">
            <span className="inline-block h-0 w-4 border-b-2 border-dashed border-red-500" />
            You added
          </span>
          <span className="font-mono text-[13px] tabular-nums text-red-500 font-medium">
            {manualSpans}
          </span>
        </div>
      </div>
    </div>
  );
}
