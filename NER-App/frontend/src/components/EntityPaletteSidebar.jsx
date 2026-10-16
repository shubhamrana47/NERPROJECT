import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAnnotation } from '../context/AnnotationContext.jsx';
import { ENTITY_TYPES, ENTITY_GROUPS, CATEGORY_COLORS } from '../utils/textUtils.jsx';
import { Search, X, Tag, Check, Sparkles, AlertCircle, Edit3, Trash2 } from 'lucide-react';

export default function EntityPaletteSidebar() {
  const annotation = useAnnotation();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [notice, setNotice] = useState('');
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

  // Filter entities according to search query and active category tab
  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ENTITY_GROUPS.map((grp) => {
      // If a specific tab is chosen, filter out others
      if (activeTab !== 'all' && grp.name !== activeTab) {
        return { ...grp, types: [] };
      }
      const matched = grp.types.filter((t) => {
        if (!q) return true;
        return t.toLowerCase().includes(q) || grp.name.toLowerCase().includes(q);
      });
      return { ...grp, types: matched };
    }).filter((grp) => grp.types.length > 0);
  }, [search, activeTab]);

  const totalMatchedCount = useMemo(() => {
    return filteredGroups.reduce((acc, g) => acc + g.types.length, 0);
  }, [filteredGroups]);

  // Handle entity tag click
  const handleTagClick = (tag) => {
    if (selectedSpan) {
      applyLabel(tag);
      setSearch('');
      setNotice(`Tagged "${selectedSpan.text}" as ${tag}!`);
      setTimeout(() => setNotice(''), 2500);
    } else {
      setNotice('Select/highlight text in the sentence first!');
      setTimeout(() => setNotice(''), 3000);
    }
  };

  return (
    <div className="sticky top-4 self-start flex flex-col rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm max-h-[calc(100vh-2rem)] overflow-hidden transition-all">
      {/* 1. Header: State & Active Selection Banner */}
      <div className="mb-3 shrink-0">
        {selectedSpan ? (
          // Active Text Selection State: Prominent Emerald Banner
          <div className="rounded-xl border border-emerald-300 bg-emerald-50/90 p-3 shadow-2xs animate-fadeIn">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-emerald-900 mb-1.5">
              <span className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                </span>
                Active Text Selection
              </span>
              <button
                type="button"
                onClick={clearSelection}
                className="text-emerald-700 hover:text-emerald-950 font-bold px-1.5 py-0.5 rounded hover:bg-emerald-100 transition cursor-pointer"
                title="Cancel selection (Esc)"
              >
                ✕ Cancel
              </button>
            </div>

            <div className="font-bold text-xs text-slate-900 bg-white rounded-lg p-2 border border-emerald-200 break-words shadow-2xs">
              "{selectedSpan.text}"
            </div>

            <div className="mt-1.5 flex items-center justify-between text-[10px] text-emerald-800 font-semibold">
              <span>Choose entity tag below:</span>
              <span className="font-mono text-emerald-700">[{selectedSpan.localStart}:{selectedSpan.localEnd}]</span>
            </div>
          </div>
        ) : activeEditingEntity ? (
          // Active Entity Editing State: Indigo Banner
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/90 p-3 shadow-2xs animate-fadeIn">
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
                  Change tag type to:
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
                      {t}
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
                Remove Entity Tag
              </button>
            </div>
          </div>
        ) : (
          // Idle State: Info Card
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-2.5">
            <div className="flex items-center justify-between gap-1 text-xs font-bold text-slate-800 mb-0.5">
              <span className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-blue-600" />
                Entity Categories
              </span>
              <span className="rounded-full bg-blue-100 text-blue-800 px-1.5 py-0.2 text-[10px] font-mono font-bold">
                36 Types
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              Highlight words in the sentence to tag them directly from this sidebar.
            </p>
          </div>
        )}

        {/* Temporary Notice / Hint */}
        {notice && (
          <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 border border-amber-200 animate-fadeIn">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>{notice}</span>
          </div>
        )}
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="mb-2.5 shrink-0">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Filter 36 entities... (Enter to apply)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && selectedSpan && totalMatchedCount === 1) {
                // If exactly 1 match exists, Enter applies it
                const singleTag = filteredGroups[0]?.types[0];
                if (singleTag) handleTagClick(singleTag);
              }
            }}
            className="w-full rounded-lg border border-slate-300 bg-white pl-8 pr-7 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 top-1.5 text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 3. Category Quick Filter Tabs */}
      <div className="mb-2.5 flex items-center gap-1 overflow-x-auto pb-1 text-[11px] shrink-0 no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`rounded-md px-2 py-0.5 font-semibold transition cursor-pointer shrink-0 ${
            activeTab === 'all'
              ? 'bg-slate-800 text-white shadow-2xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All (36)
        </button>
        {ENTITY_GROUPS.map((g) => (
          <button
            key={g.name}
            type="button"
            onClick={() => setActiveTab(activeTab === g.name ? 'all' : g.name)}
            className={`rounded-md px-2 py-0.5 font-semibold transition cursor-pointer shrink-0 ${
              activeTab === g.name
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            title={g.name}
          >
            <span>{g.icon}</span> <span className="hidden sm:inline">{g.name.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      {/* 4. Scrollable Categorized Entity Badges Area */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 min-h-[14rem]">
        {filteredGroups.map((group) => (
          <div key={group.name} className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-0.5">
              <span className="flex items-center gap-1">
                <span>{group.icon}</span>
                <span>{group.name}</span>
              </span>
              <span className="text-[10px] font-mono font-normal text-slate-400">
                {group.types.length}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {group.types.map((type) => {
                const colorStyle = CATEGORY_COLORS[type] || 'bg-slate-100 text-slate-800 border-slate-300';
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleTagClick(type)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold border transition shadow-2xs cursor-pointer active:scale-95 ${colorStyle} ${
                      selectedSpan
                        ? 'ring-1 ring-emerald-400/40 hover:scale-105 hover:shadow-xs'
                        : 'opacity-90 hover:opacity-100'
                    }`}
                    title={
                      selectedSpan
                        ? `Annotate "${selectedSpan.text}" as ${type}`
                        : `Highlight text first, then click ${type}`
                    }
                  >
                    <span>+ {type}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {filteredGroups.length === 0 && (
          <div className="text-center py-8 text-xs text-slate-400 italic">
            No entity types matching "{search}".
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setActiveTab('all');
              }}
              className="block mx-auto mt-2 text-blue-600 hover:underline font-semibold"
            >
              Reset filters
            </button>
          </div>
        )}
      </div>

      {/* 5. Footer: Shortcut Hint */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between shrink-0">
        <span>💡 Select text to tag</span>
        <span className="font-mono text-[10px]">Esc to cancel</span>
      </div>
    </div>
  );
}
