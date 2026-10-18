import React, { useRef, useMemo } from 'react';
import { useAnnotation } from '../context/AnnotationContext.jsx';
import { getEntityColorStyle } from '../utils/textUtils.jsx';

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

  // Render tokens/spans with interactive entity highlights matching design.png
  const renderAnnotatedText = () => {
    const pieces = [];
    let currentPos = sentenceStart;

    sentenceEntities.forEach((ent, entIdx) => {
      // Normal non-entity text before this entity
      if (ent.start > currentPos) {
        const textBefore = sentenceText.slice(currentPos - sentenceStart, ent.start - sentenceStart);
        pieces.push(
          <span key={`text-${currentPos}`} className="text-slate-800 select-text">
            {textBefore}
          </span>
        );
      }

      // Entity span — exact styling from design.png
      const entEndInSent = Math.min(ent.end, sentenceEnd);
      const entText = sentenceText.slice(ent.start - sentenceStart, entEndInSent - sentenceStart) || ent.text;
      const colorStyle = getEntityColorStyle(ent.label);
      const isManual = ent.source === 'human' || ent.status === 'edited' || ent._id?.toString().startsWith('temp_');
      const isEditing = activeEditingEntity && ((activeEditingEntity._id && activeEditingEntity._id === ent._id) || (activeEditingEntity.start === ent.start && activeEditingEntity.end === ent.end));

      pieces.push(
        <span
          key={ent._id || `${ent.start}-${ent.end}-${entIdx}`}
          className={`group relative inline-flex flex-col items-center mx-1 align-baseline select-text cursor-pointer transition-all ${
            isEditing ? 'ring-2 ring-blue-500 rounded' : ''
          }`}
          onClick={(e) => {
            e.stopPropagation();
            if (setActiveEditingEntity) setActiveEditingEntity(ent);
            if (clearSelection) clearSelection();
          }}
          title={`Click to edit · ${ent.label} · ${isManual ? 'Manual Addition' : `Model Prediction (${(Number(ent.confidence ?? 1) * 100).toFixed(0)}%)`}`}
        >
          {/* Main Entity Text with Background and Underline */}
          <span
            className={`inline-block px-1.5 py-0.5 rounded text-[16px] font-medium leading-snug transition ${
              isManual
                ? 'border-b-2 border-dashed'
                : 'border-b-2 border-solid'
            }`}
            style={{
              backgroundColor: colorStyle.bg,
              color: colorStyle.text,
              borderColor: colorStyle.border,
            }}
          >
            {entText}
            {/* Quick delete button visible on hover */}
            <button
              type="button"
              className="ml-1 inline-flex items-center justify-center text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
              style={{ color: colorStyle.border }}
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

          {/* Subtext Label Underneath */}
          <span
            className="block text-[9px] font-bold uppercase tracking-wider text-center mt-0.5 leading-none select-none"
            style={{ color: colorStyle.border }}
          >
            {isManual ? `${ent.label.toUpperCase()} · manual` : ent.label.toUpperCase()}
          </span>
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
        className={`relative rounded-xl border bg-white p-6 shadow-xs leading-[2.85rem] text-[17px] text-slate-800 transition ${
          selectedSpan
            ? 'border-emerald-400 ring-2 ring-emerald-100 bg-emerald-50/20'
            : 'border-slate-200 focus-within:border-blue-400'
        }`}
      >
        <div className="min-h-[4rem] text-[17px] leading-[2.85rem] selection:bg-emerald-200 selection:text-emerald-950 font-normal">
          {renderAnnotatedText()}
        </div>
      </div>
    </div>
  );
}
