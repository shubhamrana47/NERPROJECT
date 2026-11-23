import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { useAnnotation } from '../context/AnnotationContext.jsx';
import {
  ENTITY_TYPES,
  ENTITY_GROUPS,
  ENTITY_SHORTCUTS,
  ENTITY_DESCRIPTIONS,
  getEntityColorStyle,
  formatEntityLabel,
} from '../utils/textUtils.jsx';
import { getEntitySubtypes } from '../utils/entitySubtypes.js';

/**
 * Extract compact ontology IDs (e.g. "AGRO_00000325", "c_1474") for concise proof display.
 */
function compactOntologyProof(sub) {
  const parts = [];
  if (sub.agro) {
    const m = sub.agro.match(/[A-Za-z]+_\d+/);
    if (m) parts.push(`AgrO: ${m[0]}`);
  }
  if (sub.agrovoc) {
    const m = sub.agrovoc.match(/c_[0-9a-zA-Z]+/);
    if (m) parts.push(`AGROVOC: ${m[0]}`);
  }
  return parts.join(' · ');
}

/**
 * Entity card component:
 * - Entities without verified subcategories render as a single click-to-label card.
 * - Parent entities with verified ontology-backed subcategories render with a
 *   split dropdown trigger on the right that opens the subcategory list.
 */
function EntityCard({
  type,
  count,
  shortcut,
  armed,
  subtypes,
  isOpen,
  onPick,
  onHover,
  onToggleDropdown,
}) {
  const { border } = getEntityColorStyle(type);
  const formatted = formatEntityLabel(type);
  const desc = ENTITY_DESCRIPTIONS[type] || '';
  const hasSubtypes = subtypes.length > 0;

  if (!hasSubtypes) {
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
        className={`group relative flex flex-col justify-between rounded-md border px-1.5 py-1 text-left transition-all focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-900 ${
          armed
            ? 'border-slate-300 bg-white hover:border-slate-900 hover:shadow-xs'
            : 'border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50/80 shadow-2xs'
        }`}
        aria-label={desc ? `${formatted}: ${desc}` : formatted}
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

        <div className="mt-0.5 flex items-baseline justify-between gap-1 w-full">
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

  return (
    <div
      className={`group relative flex items-stretch overflow-hidden rounded-md border transition-all ${
        isOpen
          ? 'border-slate-900 bg-white shadow-xs'
          : armed
            ? 'border-slate-300 bg-white hover:border-slate-900 hover:shadow-xs'
            : 'border-slate-200 bg-white hover:border-slate-400 shadow-2xs'
      }`}
    >
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
        className="flex min-w-0 flex-1 flex-col justify-between px-1.5 py-1 text-left transition-colors hover:bg-slate-50/80 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-slate-900"
        aria-label={desc ? `${formatted}: ${desc}` : formatted}
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

        <div className="mt-0.5 flex items-baseline justify-between gap-1 w-full">
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

      <button
        type="button"
        data-subtype-toggle={type}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Show verified subcategories for ${formatted} (${subtypes.length})`}
        onClick={(e) => {
          e.stopPropagation();
          const cardRect = e.currentTarget.parentElement.getBoundingClientRect();
          onToggleDropdown(type, cardRect);
        }}
        className={`flex shrink-0 items-center justify-center border-l px-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-slate-900 ${
          isOpen
            ? 'border-slate-300 bg-slate-900 text-white'
            : 'border-slate-200 bg-slate-50/70 text-slate-500 hover:bg-slate-100 hover:text-slate-900'
        }`}
      >
        <ChevronDown
          className={`h-3 w-3 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
    </div>
  );
}

export default function EntityPaletteSidebar({
  modelSpans = 0,
  manualSpans = 0,
  meanConfidence = null,
  entityCounts = {},
  topWordsByLabel = {},
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
  const [openDropdown, setOpenDropdown] = useState(null);
  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);

  const selectedSpan = annotation?.selectedSpan;
  const activeEditingEntity = annotation?.activeEditingEntity;
  const applyLabel = annotation?.applyLabel;
  const clearSelection = annotation?.clearSelection;
  const setActiveEditingEntity = annotation?.setActiveEditingEntity;

  // Close subcategory dropdown on outside click or scroll/resize
  useEffect(() => {
    if (!openDropdown) return;
    const handlePointerDown = (e) => {
      if (dropdownRef.current?.contains(e.target)) return;
      if (e.target.closest?.('[data-subtype-toggle]')) return;
      setOpenDropdown(null);
    };
    const handleResize = () => setOpenDropdown(null);
    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('resize', handleResize);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('resize', handleResize);
    };
  }, [openDropdown]);

  // Keyboard shortcut "/" to focus search input & Escape to close dropdown/search/selection
  useEffect(() => {
    const handleKeyDown = (e) => {
      const typing = ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName);
      if (e.key === '/' && !typing) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if (e.key === 'Escape') {
        if (openDropdown) {
          setOpenDropdown(null);
        } else if (search) {
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
  }, [openDropdown, search, selectedSpan, activeEditingEntity, clearSelection, setActiveEditingEntity]);

  const shortcutMap = useMemo(() => {
    const map = {};
    ENTITY_SHORTCUTS.forEach((s) => {
      map[s.label] = s.key;
    });
    return map;
  }, []);

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

  const handleToggleDropdown = (type, rect) => {
    setHoveredEntity(null);
    setOpenDropdown((prev) => (prev?.type === type ? null : { type, rect }));
  };

  const handlePick = (type, subtype = undefined) => {
    setOpenDropdown(null);
    const displayTag = subtype ? `${formatEntityLabel(type)} / ${subtype}` : formatEntityLabel(type);

    if (isValidation && !selectedSpan) {
      const target = focusedSpan || activeEditingEntity;
      if (!target) {
        setJustTagged('');
        setNotice('Click an entity in the passage first, then pick its correct label.');
        setTimeout(() => setNotice(''), 3000);
        return;
      }
      applyLabel(type, subtype);
      setSearch('');
      setNotice('');
      setJustTagged(`${target.text} → ${displayTag}`);
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
    applyLabel(type, subtype);
    setSearch('');
    setNotice('');
    setJustTagged(`${text} → ${displayTag}`);
    setTimeout(() => setJustTagged(''), 2600);
  };

  const openSubtypes = openDropdown ? getEntitySubtypes(openDropdown.type) : [];
  const openColor = openDropdown ? getEntityColorStyle(openDropdown.type) : null;

  // Compute viewport-safe position for the subcategory dropdown popover
  const dropdownPosition = useMemo(() => {
    if (!openDropdown?.rect) return null;
    const width = 288;
    const estimatedHeight = Math.min(320, 44 + openSubtypes.length * 46);
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
    const left = Math.max(12, Math.min(vw - width - 12, openDropdown.rect.left));
    const spaceBelow = vh - openDropdown.rect.bottom - 12;
    const openUpward = spaceBelow < estimatedHeight && openDropdown.rect.top > estimatedHeight;
    return openUpward
      ? { left, top: openDropdown.rect.top - 4, transform: 'translateY(-100%)', width }
      : { left, top: openDropdown.rect.bottom + 4, width };
  }, [openDropdown, openSubtypes.length]);

  const renderCard = (type) => (
    <EntityCard
      key={type}
      type={type}
      count={entityCounts[type] || 0}
      shortcut={shortcutMap[type]}
      armed={armed}
      subtypes={getEntitySubtypes(type)}
      isOpen={openDropdown?.type === type}
      onPick={handlePick}
      onHover={(info) => {
        if (!openDropdown) setHoveredEntity(info);
      }}
      onToggleDropdown={handleToggleDropdown}
    />
  );

  return (
    <div className="relative flex max-h-[46rem] flex-col overflow-hidden rounded-md border border-rule bg-sheet md:h-full md:max-h-none">
      {/* Dark Hover Tooltip Card */}
      {hoveredEntity && !openDropdown && (
        <div
          role="tooltip"
          className="pointer-events-none fixed z-50 max-w-[280px] rounded-md border border-neutral-800 bg-[#222222] px-3 py-2 text-white shadow-2xl backdrop-blur-md transition-opacity duration-150"
          style={{
            left: Math.max(12, Math.min(window.innerWidth - 300, hoveredEntity.rect?.left ?? 20)),
            top: (hoveredEntity.rect?.top ?? 100) - 6,
            transform: 'translateY(-100%)',
          }}
        >
          <div className="flex items-start gap-2 text-[12px] leading-snug">
            <span className="text-white font-bold opacity-80 select-none">→</span>
            <span>{hoveredEntity.desc}</span>
          </div>
          {(() => {
            const top = topWordsByLabel[hoveredEntity.type] || [];
            return (
              <div className="mt-2 border-t border-white/15 pt-1.5">
                <p className="text-[10.5px] text-neutral-400">Most tagged in this file</p>
                {top.length > 0 ? (
                  <ol className="mt-1 space-y-0.5" data-testid="top-words">
                    {top.map((w) => (
                      <li key={w.text} className="flex items-baseline justify-between gap-4 text-[12px]">
                        <span className="truncate">{w.text}</span>
                        <span className="shrink-0 font-mono text-[11px] tabular-nums text-neutral-400">
                          ×{w.count.toLocaleString()}
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-0.5 text-[11.5px] text-neutral-300">Nothing saved under this label yet.</p>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Ontology-Verified Subcategories Dropdown Popover */}
      {openDropdown && dropdownPosition && openSubtypes.length > 0 && (
        <div
          ref={dropdownRef}
          role="listbox"
          aria-label={`${formatEntityLabel(openDropdown.type)} subcategories`}
          data-testid={`subtype-dropdown-${openDropdown.type}`}
          className="fixed z-50 max-h-[320px] overflow-y-auto rounded-md border border-slate-300 bg-white shadow-xl"
          style={dropdownPosition}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-2.5 py-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: openColor?.border }}
                aria-hidden="true"
              />
              <span className="truncate text-[11.5px] font-semibold text-slate-800">
                {formatEntityLabel(openDropdown.type)} subcategories
              </span>
            </div>
            <span className="shrink-0 font-mono text-[10px] text-slate-500">
              {openSubtypes.length} verified
            </span>
          </div>

          <div className="divide-y divide-slate-100 py-0.5">
            {openSubtypes.map((sub) => (
              <button
                key={sub.name}
                type="button"
                role="option"
                onClick={() => handlePick(openDropdown.type, sub.name)}
                className="flex w-full flex-col gap-0.5 px-2.5 py-1.5 text-left transition-colors hover:bg-slate-50 focus-visible:bg-slate-100 focus-visible:outline-none"
                title={[
                  sub.agro ? `CGIAR AgrO: ${sub.agro}` : null,
                  sub.agrovoc ? `FAO AGROVOC: ${sub.agrovoc}` : null,
                ]
                  .filter(Boolean)
                  .join('\n')}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-medium text-slate-800">{sub.name}</span>
                  <span className="flex shrink-0 items-center gap-1">
                    {sub.ontologies.map((ont) => (
                      <span
                        key={ont}
                        className="rounded border border-slate-200 bg-slate-100 px-1 py-px font-mono text-[9.5px] font-medium text-slate-600"
                      >
                        {ont}
                      </span>
                    ))}
                  </span>
                </div>
                <span className="truncate font-mono text-[10px] text-slate-500">
                  {compactOntologyProof(sub)}
                </span>
              </button>
            ))}
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
          Click an entity in the passage to put it in focus, then pick a label here to correct it. Use the dropdown arrow on parent entities to pick a verified subcategory.
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

        {justTagged && (
          <p className="mark-in mt-1.5 truncate text-[11.5px] font-medium text-hand" title={justTagged}>
            {justTagged}
          </p>
        )}
        {notice && !justTagged && (
          <p className="mt-1.5 text-[11.5px] leading-snug text-ink-soft">{notice}</p>
        )}
      </div>

      {/* The 2-Column Categories and Cards Layout */}
      <div className="scroll-slim flex-1 overflow-y-auto p-2.5">
        {matches ? (
          matches.length > 0 ? (
            <div>
              <div className="mb-2 text-[12px] font-semibold text-slate-700">
                Search Results ({matches.length})
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {matches.map((type) => renderCard(type))}
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
                  <div className="grid grid-cols-2 gap-1.5">
                    {group.types.map((type) => renderCard(type))}
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
                  <div className="grid grid-cols-2 gap-1.5">
                    {group.types.map((type) => renderCard(type))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Fixed Footer */}
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
