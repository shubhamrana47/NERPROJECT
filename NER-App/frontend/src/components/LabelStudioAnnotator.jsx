import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ENTITY_TYPES, getConfidenceThresholdClass } from '../utils/textUtils.jsx';

const CATEGORY_COLORS = {
  // Crops & Plants
  Crop: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  Fruit: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  Vegetable: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  Food_Item: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  
  // Diseases & Organisms
  Disease: 'bg-rose-100 text-rose-900 border-rose-300',
  Organism: 'bg-rose-100 text-rose-900 border-rose-300',
  Agri_Pollution: 'bg-rose-100 text-rose-900 border-rose-300',
  Agri_Waste: 'bg-amber-100 text-amber-900 border-amber-300',
  
  // Chemicals & Treatments
  Chemical: 'bg-teal-100 text-teal-900 border-teal-300',
  Treatment: 'bg-teal-100 text-teal-900 border-teal-300',
  Nutrient: 'bg-cyan-100 text-cyan-900 border-cyan-300',
  
  // Weather & Environment
  Weather: 'bg-sky-100 text-sky-900 border-sky-300',
  Rainfall: 'bg-sky-100 text-sky-900 border-sky-300',
  Temp: 'bg-sky-100 text-sky-900 border-sky-300',
  Humidity: 'bg-sky-100 text-sky-900 border-sky-300',
  Season: 'bg-sky-100 text-sky-900 border-sky-300',
  Natural_Disaster: 'bg-red-100 text-red-900 border-red-300',
  Natural_Resource: 'bg-lime-100 text-lime-900 border-lime-300',
  Soil: 'bg-amber-100 text-amber-900 border-amber-400',
  
  // Quantities & Time
  Quantity: 'bg-purple-100 text-purple-900 border-purple-300',
  Other_Quantity: 'bg-purple-100 text-purple-900 border-purple-300',
  Field_Area: 'bg-purple-100 text-purple-900 border-purple-300',
  Duration: 'bg-purple-100 text-purple-900 border-purple-300',
  Money: 'bg-emerald-100 text-emerald-900 border-emerald-400',
  Date_and_Time: 'bg-blue-100 text-blue-900 border-blue-300',
  Event: 'bg-blue-100 text-blue-900 border-blue-300',
  
  // Entity Actors
  Person: 'bg-indigo-100 text-indigo-900 border-indigo-300',
  Organization: 'bg-indigo-100 text-indigo-900 border-indigo-300',
  Location: 'bg-violet-100 text-violet-900 border-violet-300',
  Policy: 'bg-slate-200 text-slate-900 border-slate-400',
  
  // Tech & Methods
  Agri_Method: 'bg-amber-100 text-amber-900 border-amber-300',
  Agri_Process: 'bg-amber-100 text-amber-900 border-amber-300',
  Technology: 'bg-slate-100 text-slate-800 border-slate-300',
  ML_Model: 'bg-fuchsia-100 text-fuchsia-900 border-fuchsia-300',
  Citation: 'bg-slate-100 text-slate-700 border-slate-300',
  Other: 'bg-slate-100 text-slate-800 border-slate-300',
};

const QUICK_LABELS = [
  'Crop', 'Chemical', 'Disease', 'Treatment', 'Nutrient',
  'Quantity', 'Location', 'Weather', 'Soil', 'Agri_Method'
];

/**
 * Label Studio-style Interactive Text Annotator.
 * Allows user to highlight any span of text to manually annotate new entities,
 * or click on existing entities to change their label or remove them.
 */
export default function LabelStudioAnnotator({
  sentenceText,
  sentenceStart,
  sentenceEnd,
  entities,
  onAddEntity,
  onUpdateEntity,
  onDeleteEntity,
}) {
  const containerRef = useRef(null);
  const [selectedSpan, setSelectedSpan] = useState(null); // { text, localStart, localEnd, globalStart, globalEnd }
  const [activeEditingEntity, setActiveEditingEntity] = useState(null);
  const [labelSearch, setLabelSearch] = useState('');

  // Filter entities that fall within this sentence range
  const sentenceEntities = useMemo(() => {
    return entities
      .filter((e) => e.status !== 'deleted' && e.start >= sentenceStart && e.start < sentenceEnd)
      .sort((a, b) => a.start - b.start);
  }, [entities, sentenceStart, sentenceEnd]);

  // Handle user selecting text with mouse
  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      return;
    }

    const selectedText = selection.toString().trim();
    if (!selectedText) {
      setSelectedSpan(null);
      return;
    }

    let localStart = -1;

    // 1. Try calculating exact character offset via DOM Range relative to containerRef
    try {
      if (containerRef.current && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (containerRef.current.contains(range.commonAncestorContainer)) {
          const preRange = range.cloneRange();
          preRange.selectNodeContents(containerRef.current);
          preRange.setEnd(range.startContainer, range.startOffset);
          const rawPrefix = preRange.toString();
          const approxStart = rawPrefix.length;

          // Search in a window around approxStart (+/- 40 chars)
          const searchStart = Math.max(0, approxStart - 40);
          const candidatePos = sentenceText.indexOf(selectedText, searchStart);
          if (candidatePos !== -1 && Math.abs(candidatePos - approxStart) <= 50) {
            localStart = candidatePos;
          }
        }
      }
    } catch (_) {}

    // 2. Fallback to standard search if DOM range method was unavailable
    if (localStart === -1) {
      localStart = sentenceText.indexOf(selectedText);
      if (localStart === -1) {
        const normalizedSentence = sentenceText.replace(/\s+/g, ' ');
        const normSel = selectedText.replace(/\s+/g, ' ');
        localStart = normalizedSentence.indexOf(normSel);
      }
    }

    if (localStart >= 0) {
      const localEnd = localStart + selectedText.length;
      const globalStart = sentenceStart + localStart;
      const globalEnd = sentenceStart + localEnd;

      setSelectedSpan({
        text: selectedText,
        localStart,
        localEnd,
        globalStart,
        globalEnd,
      });
      setLabelSearch('');
      setActiveEditingEntity(null);
    }
  };

  const applyLabel = (labelName) => {
    if (!selectedSpan) return;
    onAddEntity({
      text: selectedSpan.text,
      label: labelName,
      start: selectedSpan.globalStart,
      end: selectedSpan.globalEnd,
      confidence: 1.0,
      source: 'human',
      status: 'approved',
    });
    setSelectedSpan(null);
    window.getSelection()?.removeAllRanges();
  };

  // Render tokens/spans with interactive entity highlights
  const renderAnnotatedText = () => {
    const pieces = [];
    let currentPos = sentenceStart;

    sentenceEntities.forEach((ent) => {
      // Normal non-entity text before this entity
      if (ent.start > currentPos) {
        const textBefore = sentenceText.slice(currentPos - sentenceStart, ent.start - sentenceStart);
        pieces.push(
          <span key={`text-${currentPos}`} className="text-slate-800 select-text">
            {textBefore}
          </span>
        );
      }

      // Entity span
      const entEndInSent = Math.min(ent.end, sentenceEnd);
      const entText = sentenceText.slice(ent.start - sentenceStart, entEndInSent - sentenceStart) || ent.text;
      const colorCls = getConfidenceThresholdClass(ent.confidence);
      const isManual = ent.source === 'human';
      const isEditing = activeEditingEntity && activeEditingEntity._id === ent._id;

      pieces.push(
        <span
          key={ent._id || `${ent.start}-${ent.end}`}
          className={`group relative inline-flex items-center gap-1.5 px-2 py-0.5 mx-1 my-0.5 rounded-md border font-medium text-sm transition-all duration-150 select-text cursor-pointer ${colorCls} ${
            isEditing ? 'ring-2 ring-blue-500 shadow-sm' : 'hover:brightness-95'
          }`}
          onClick={(e) => {
            e.stopPropagation();
            setActiveEditingEntity(ent);
            setSelectedSpan(null);
          }}
          title={`Click to edit · ${ent.label} · ${isManual ? 'Manual Annotation' : `Confidence: ${(Number(ent.confidence ?? 1) * 100).toFixed(1)}%`}`}
        >
          <span className="font-semibold">{entText}</span>
          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-black/10">
            {ent.label}
          </span>
          {isManual ? (
            <span className="text-[9px] px-1 rounded bg-emerald-600 text-white font-semibold">
              Manual
            </span>
          ) : (
            <span className="text-[10px] font-mono opacity-85 font-semibold">
              {(Number(ent.confidence ?? 1) * 100).toFixed(0)}%
            </span>
          )}
          <button
            type="button"
            className="ml-0.5 text-xs font-bold text-slate-500 hover:text-red-700 opacity-60 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteEntity(ent);
            }}
            title="Remove entity tag"
          >
            ×
          </button>
        </span>
      );

      currentPos = entEndInSent;
    });

    // Remainder of sentence
    if (currentPos < sentenceEnd) {
      const remaining = sentenceText.slice(currentPos - sentenceStart);
      pieces.push(
        <span key={`text-end`} className="text-slate-800 select-text">
          {remaining}
        </span>
      );
    }

    return pieces;
  };

  const filteredLabels = useMemo(() => {
    if (!labelSearch) return ENTITY_TYPES;
    return ENTITY_TYPES.filter((t) => t.toLowerCase().includes(labelSearch.toLowerCase()));
  }, [labelSearch]);

  return (
    <div className="space-y-4">
      {/* Interactive Sentence Reading Workspace */}
      <div
        ref={containerRef}
        onMouseUp={handleMouseUp}
        className="relative rounded-xl border border-slate-200 bg-white p-6 shadow-sm leading-8 text-base text-slate-900 transition focus-within:border-blue-400"
      >
        <div className="mb-2.5 flex items-center justify-between gap-2 text-xs border-b border-slate-100 pb-2">
          <div className="font-semibold text-slate-700">Sentence Text:</div>
          <div className="text-slate-400 font-medium">Tip· Highlight words with cursor to tag manually</div>
        </div>
        
        <div className="p-1 min-h-[3.5rem] text-[17px] leading-relaxed selection:bg-blue-200 selection:text-blue-900">
          {renderAnnotatedText()}
        </div>
      </div>

      {/* Manual Annotation Toolbar / Popover: Triggered when user selects text */}
      {selectedSpan && (
        <div className="rounded-xl border-2 border-blue-400 bg-blue-50/60 p-4 shadow-md transition-all animate-fadeIn">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                Selected Text to Annotate:
              </span>
              <span className="rounded bg-white px-2.5 py-1 text-sm font-bold text-slate-900 border border-blue-200">
                "{selectedSpan.text}"
              </span>
              <span className="text-xs font-mono text-slate-500">
                offsets [{selectedSpan.localStart}:{selectedSpan.localEnd}]
              </span>
            </div>
            <button
              onClick={() => setSelectedSpan(null)}
              className="text-xs text-slate-500 hover:text-slate-800 underline font-medium"
            >
              Cancel selection
            </button>
          </div>

          {/* Quick Category Chips */}
          <div className="mb-2">
            <span className="text-[11px] font-semibold text-slate-600 block mb-1">
              Select Entity Label:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_LABELS.map((ql) => (
                <button
                  key={ql}
                  type="button"
                  onClick={() => applyLabel(ql)}
                  className={`rounded px-2.5 py-1 text-xs font-semibold border transition hover:scale-105 active:scale-95 shadow-xs ${
                    CATEGORY_COLORS[ql] || 'bg-white text-slate-800 border-slate-300'
                  }`}
                >
                  + {ql}
                </button>
              ))}
            </div>
          </div>

          {/* Search / All 36 labels dropdown */}
          <div className="mt-3 flex items-center gap-2">
            <input
              type="text"
              placeholder="Search all 36 entity types..."
              value={labelSearch}
              onChange={(e) => setLabelSearch(e.target.value)}
              className="w-56 rounded border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
              {filteredLabels.slice(0, 10).map((fl) => (
                <button
                  key={fl}
                  type="button"
                  onClick={() => applyLabel(fl)}
                  className="rounded bg-white px-2 py-1 text-[11px] font-medium text-slate-700 border border-slate-200 hover:bg-slate-100"
                >
                  {fl}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Entity Edit Drawer: When clicking an existing entity */}
      {activeEditingEntity && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-indigo-900">
                Editing Entity Tag:
              </span>
              <span className="font-bold text-slate-900">
                "{activeEditingEntity.text}"
              </span>
              <span className="text-xs text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded font-mono">
                Current: {activeEditingEntity.label}
              </span>
            </div>
            <button
              onClick={() => setActiveEditingEntity(null)}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium"
            >
              Done
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-600">Change label to:</span>
            <select
              value={activeEditingEntity.label}
              onChange={(e) => {
                onUpdateEntity(activeEditingEntity, { label: e.target.value });
                setActiveEditingEntity((prev) => ({ ...prev, label: e.target.value }));
              }}
              className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none"
            >
              {ENTITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => {
                onDeleteEntity(activeEditingEntity);
                setActiveEditingEntity(null);
              }}
              className="rounded bg-rose-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-rose-700"
            >
              Remove Tag
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
