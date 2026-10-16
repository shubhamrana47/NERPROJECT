import React, { useRef, useMemo } from 'react';
import { useAnnotation } from '../context/AnnotationContext.jsx';
import { getConfidenceThresholdClass } from '../utils/textUtils.jsx';

/**
 * Label Studio-style Interactive Text Annotator.
 * Allows user to highlight any span of text to manually annotate new entities via the dedicated sidebar,
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
  const annotation = useAnnotation();

  const selectedSpan = annotation?.selectedSpan;
  const setSelectedSpan = annotation?.setSelectedSpan;
  const activeEditingEntity = annotation?.activeEditingEntity;
  const setActiveEditingEntity = annotation?.setActiveEditingEntity;
  const clearSelection = annotation?.clearSelection;

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
      if (clearSelection) clearSelection();
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

      if (setSelectedSpan) {
        setSelectedSpan({
          text: selectedText,
          localStart,
          localEnd,
          globalStart,
          globalEnd,
        });
      }
      if (setActiveEditingEntity) setActiveEditingEntity(null);
    }
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
            if (setActiveEditingEntity) setActiveEditingEntity(ent);
            if (clearSelection) clearSelection();
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
              if (activeEditingEntity && activeEditingEntity._id === ent._id) {
                if (setActiveEditingEntity) setActiveEditingEntity(null);
              }
            }}
            title="Remove entity tag"
          >
            ×
          </button>
        </span>
      );

      currentPos = entEndInSent;
    });

    // Remainder of the sentence after the last entity
    if (currentPos < sentenceEnd) {
      const textAfter = sentenceText.slice(currentPos - sentenceStart);
      pieces.push(
        <span key={`text-end-${currentPos}`} className="text-slate-800 select-text">
          {textAfter}
        </span>
      );
    }

    return pieces;
  };

  return (
    <div className="space-y-3">
      {/* Interactive Sentence Text Box */}
      <div
        ref={containerRef}
        onMouseUp={handleMouseUp}
        className={`relative rounded-xl border bg-white p-6 shadow-sm leading-8 text-base text-slate-900 transition ${
          selectedSpan
            ? 'border-emerald-400 ring-2 ring-emerald-100'
            : 'border-slate-200 focus-within:border-blue-400'
        }`}
      >
        <div className="mb-2.5 flex items-center justify-between gap-2 text-xs border-b border-slate-100 pb-2">
          <div className="font-semibold text-slate-700">Sentence Text:</div>
          <div className="text-slate-500 font-medium">
            {selectedSpan ? (
              <span className="text-emerald-700 font-bold inline-flex items-center gap-1.5 animate-fadeIn">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Selected: "{selectedSpan.text}" → Pick an entity tag from the sidebar
              </span>
            ) : (
              'Highlight words with cursor to tag directly from the sidebar'
            )}
          </div>
        </div>

        <div className="p-1 min-h-[3.5rem] text-[17px] leading-relaxed selection:bg-emerald-200 selection:text-emerald-950">
          {renderAnnotatedText()}
        </div>
      </div>
    </div>
  );
}
