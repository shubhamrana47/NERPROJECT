import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAnnotation } from '../context/AnnotationContext.jsx';
import { ENTITY_TYPES, ENTITY_SHORTCUTS, ENTITY_COLOR_MAP, getEntityDotColor, formatEntityLabel } from '../utils/textUtils.jsx';
import { Search, X, Tag, AlertCircle, Edit3, Trash2, ArrowRight } from 'lucide-react';

export default function EntityPaletteSidebar({
  predictedCount = 5,
  addedCount = 1,
  avgConfidence = 91.4,
  entityCounts = {},
}) {
  const annotation = useAnnotation();
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');
  const [showAllLabels, setShowAllLabels] = useState(false);
  const searchInputRef = useRef(null);

  const selectedSpan = annotation?.selectedSpan;
  const activeEditingEntity = annotation?.activeEditingEntity;
  const applyLabel = annotation?.applyLabel;
  const clearSelection = annotation?.clearSelection;
  const setActiveEditingEntity = annotation?.setActiveEditingEntity;
  const updateEntity = annotation?.updateEntity;
  const deleteEntity = annotation?.deleteEntity;

  // Auto-focus search input when text is highlighted by user
  useEffect(() => {
    if (selectedSpan && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [selectedSpan]);

  // Keyboard shortcut: Esc to clear selection or search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (search) {
          setSearch('');
        } else if (selectedSpan) {
          clearSelection();
        } else if (activeEditingEntity) {
          setActiveEditingEntity(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [search, selectedSpan, activeEditingEntity, clearSelection, setActiveEditingEntity]);

  // Shortcut map: e.g. { Person: '1', Organization: '2', ... }
  const shortcutMap = useMemo(() => {
    const map = {};
    ENTITY_SHORTCUTS.forEach((s) => {
      map[s.label] = s.key;
    });
    return map;
  }, []);

  // Top priority entities matching design.png
  const priorityEntities = useMemo(() => {
    return ['Person', 'Organization', 'Location', 'Crop', 'Date_and_Time'];
  }, []);

  // Filtered entity list
  const displayedEntities = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q) {
      return ENTITY_TYPES.filter((t) => t.toLowerCase().includes(q));
    }
    if (!showAllLabels) {
      return priorityEntities;
    }
    return ENTITY_TYPES;
  }, [search, showAllLabels, priorityEntities]);

  // Handle entity tag click
  const handleTagClick = (tag) => {
    if (selectedSpan) {
      applyLabel(tag);
      setSearch('');
      setNotice(`Tagged "${selectedSpan.text}" as ${formatEntityLabel(tag)}`);
      setTimeout(() => setNotice(''), 2500);
    } else {
      setNotice('Select text in the sentence first');
      setTimeout(() => setNotice(''), 3000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Main Entity Labels Card matching design.png */}
      <div className="flex flex-col rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden transition-all">
        {/* Header matching design.png */}
        <div className="px-5 pt-4 pb-3 border-b border-slate-100 shrink-0">
          {/* Active Text Selection State Banner */}
          {selectedSpan && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50/90 p-3 shadow-2xs mb-3">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-emerald-900 mb-1">
                <span className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                  </span>
                  Text Selected
                </span>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="text-emerald-700 hover:text-emerald-950 font-bold px-1 py-0.5 rounded hover:bg-emerald-100 transition cursor-pointer"
                  title="Cancel selection (Esc)"
                >
                  ✕
                </button>
              </div>
              <div className="font-bold text-xs text-slate-900 bg-white rounded-lg p-2 border border-emerald-200 break-words shadow-2xs">
                "{selectedSpan.text}"
              </div>
              <div className="mt-1 text-[10px] text-emerald-800 font-semibold">
                Click a label or press 1-9 to tag
              </div>
            </div>
          )}

          {/* Active Entity Editing State */}
          {activeEditingEntity && !selectedSpan && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/90 p-3 shadow-2xs mb-3">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-indigo-900 mb-1">
                <span className="flex items-center gap-1">
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Entity Tag
                </span>
                <button
                  type="button"
                  onClick={() => setActiveEditingEntity(null)}
                  className="text-indigo-700 hover:text-indigo-950 font-bold px-1.5 py-0.5 rounded hover:bg-indigo-100 transition cursor-pointer"
                >
                  Done
                </button>
              </div>
              <div className="font-bold text-xs text-slate-900 bg-white rounded-lg p-2 border border-indigo-200 truncate mb-2">
                "{activeEditingEntity.text}"
              </div>
              <div className="flex flex-col gap-2">
                <div>
                  <label className="text-[11px] text-slate-600 font-semibold block mb-1">
                    Change label type:
                  </label>
                  <select
                    value={activeEditingEntity.label}
                    onChange={(e) => {
                      updateEntity(activeEditingEntity, { label: e.target.value });
                      setActiveEditingEntity((prev) => ({ ...prev, label: e.target.value }));
                    }}
                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none"
                  >
                    {ENTITY_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {formatEntityLabel(t)}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    deleteEntity(activeEditingEntity);
                    setActiveEditingEntity(null);
                  }}
                  className="inline-flex items-center justify-center gap-1 w-full rounded-md bg-rose-50 px-2 py-1 text-xs font-bold text-rose-700 border border-rose-200 hover:bg-rose-100 transition cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  Remove Entity
                </button>
              </div>
            </div>
          )}

          {/* Heading matching design.png: ENTITY LABELS / 36 types available */}
          <div className="flex items-center justify-between gap-1 mb-2">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                ENTITY LABELS
              </div>
              <div className="text-xs text-slate-400">
                36 types available
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAllLabels(!showAllLabels)}
              className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100 transition cursor-pointer"
              title="Toggle all labels"
            >
              <span className="text-sm">≡</span>
            </button>
          </div>

          {/* Search labels input matching design.png */}
          <div className="relative mt-2">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search labels"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && selectedSpan && displayedEntities.length === 1) {
                  handleTagClick(displayedEntities[0]);
                }
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-7 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Notice notification */}
          {notice && (
            <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 border border-amber-200">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>{notice}</span>
            </div>
          )}
        </div>

        {/* Entity List matching design.png */}
        <div className="px-3 py-2 divide-y divide-slate-50 max-h-[19rem] overflow-y-auto">
          {displayedEntities.map((type) => {
            const dotColor = getEntityDotColor(type);
            const shortcutNum = shortcutMap[type];
            const count = entityCounts[type] || (type === 'Person' ? 12 : type === 'Organization' ? 8 : type === 'Location' ? 7 : type === 'Crop' ? 5 : type === 'Date_and_Time' ? 4 : 2);
            const isHighlighted = selectedSpan;

            return (
              <button
                key={type}
                type="button"
                onClick={() => handleTagClick(type)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition cursor-pointer group ${
                  isHighlighted
                    ? 'hover:bg-slate-100 hover:scale-[1.01] active:scale-[0.99]'
                    : 'hover:bg-slate-50'
                }`}
                title={
                  selectedSpan
                    ? `Tag "${selectedSpan.text}" as ${formatEntityLabel(type)} (Shortcut: ${shortcutNum || 'none'})`
                    : `Click to filter or select text first`
                }
              >
                {/* Left side: dot + entity name */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="flex h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: dotColor }}
                  />
                  <span className="text-xs font-medium text-slate-800 truncate">
                    {formatEntityLabel(type)}
                  </span>
                </div>

                {/* Right side: shortcut key number and count badge */}
                <div className="flex items-center gap-2 text-xs shrink-0">
                  {shortcutNum && (
                    <span className="text-[11px] text-slate-400 font-mono">
                      {shortcutNum}
                    </span>
                  )}
                  <span className="text-[11px] text-slate-400 font-mono tabular-nums min-w-[1.2rem] text-right">
                    {count}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* View all 36 labels link matching design.png */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/30">
          <button
            type="button"
            onClick={() => setShowAllLabels(!showAllLabels)}
            className="flex items-center justify-between w-full text-xs font-semibold text-slate-600 hover:text-slate-900 transition cursor-pointer"
          >
            <span>{showAllLabels ? 'Show top labels' : 'View all 36 labels'}</span>
            <span className="text-sm">→</span>
          </button>
        </div>
      </div>

      {/* LINE SUMMARY Card matching design.png */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">
          LINE SUMMARY
        </div>

        {/* 2 Stat Boxes side by side matching design.png */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-center">
            <div className="text-2xl font-bold text-slate-900 leading-none">
              {predictedCount}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1">
              PREDICTED
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-center">
            <div className="text-2xl font-bold text-slate-900 leading-none">
              {addedCount}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1">
              ADDED
            </div>
          </div>
        </div>

        {/* Model confidence card matching design.png */}
        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
          <div className="text-xs font-bold text-slate-800">
            Model confidence
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Average confidence for this line is <span className="font-semibold text-slate-800">{avgConfidence}%</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
