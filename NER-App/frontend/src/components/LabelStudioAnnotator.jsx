import React, { useRef, useMemo } from 'react';
import { useAnnotation } from '../context/AnnotationContext.jsx';
import { getEntityColorStyle, formatEntityLabel } from '../utils/textUtils.jsx';

/**
 * Interactive span annotator.
 *
 * Marks follow proof-correction convention: a solid underline is the model's
 * reading, a dashed one is a person's. The caption sits under the span so the
 * sentence keeps reading as a sentence, and the character-offset maths is
 * unchanged from the original implementation.
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

  const renderAnnotatedText = () => {
    const pieces = [];
    let currentPos = sentenceStart;

    sentenceEntities.forEach((ent, entIdx) => {
      if (ent.start > currentPos) {
        pieces.push(
          <span key={`text-${currentPos}`} className="select-text">
            {sentenceText.slice(currentPos - sentenceStart, ent.start - sentenceStart)}
          </span>
        );
      }

      const entEndInSent = Math.min(ent.end, sentenceEnd);
      const entText =
        sentenceText.slice(ent.start - sentenceStart, entEndInSent - sentenceStart) || ent.text;
      const colorStyle = getEntityColorStyle(ent.label);
      const isManual =
        ent.source === 'human' ||
        ent.status === 'edited' ||
        ent._id?.toString().startsWith('temp_');
      const isFresh = String(ent._id || '').startsWith('temp_');
      const isEditing =
        activeEditingEntity &&
        ((activeEditingEntity._id && activeEditingEntity._id === ent._id) ||
          (activeEditingEntity.start === ent.start && activeEditingEntity.end === ent.end));

      pieces.push(
        <span
          key={ent._id || `${ent.start}-${ent.end}-${entIdx}`}
          className="group relative mr-1 inline-flex cursor-pointer select-text flex-col items-start align-baseline"
          onClick={(e) => {
            e.stopPropagation();
            if (setActiveEditingEntity) setActiveEditingEntity(ent);
            if (clearSelection) clearSelection();
          }}
          title={
            isManual
              ? `${formatEntityLabel(ent.label)} · added by hand`
              : `${formatEntityLabel(ent.label)} · model, ${(
                  Number(ent.confidence ?? 1) * 100
                ).toFixed(0)}% confident`
          }
        >
          <span
            className={`inline px-[1px] pb-[2px] transition-colors ${
              isEditing ? 'bg-ink/[0.07]' : 'group-hover:bg-ink/[0.04]'
            }`}
            style={{
              borderBottom: `2px ${isManual ? 'dashed' : 'solid'} ${colorStyle.border}`,
              backgroundColor: isEditing ? undefined : isManual ? colorStyle.bg : undefined,
            }}
          >
            {entText}
          </span>

          <span
            className={`flex items-center gap-1 pt-[3px] text-[10px] leading-none ${
              isFresh ? 'mark-in' : ''
            }`}
          >
            {isManual && (
              <span className="h-[3px] w-[3px] rounded-full bg-hand" aria-hidden="true" />
            )}
            <span style={{ color: colorStyle.border }}>{formatEntityLabel(ent.label)}</span>
            <button
              type="button"
              className="text-ink-faint opacity-0 transition-opacity group-hover:opacity-100 hover:text-hand"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteEntity(ent);
                if (activeEditingEntity && activeEditingEntity._id === ent._id) {
                  if (setActiveEditingEntity) setActiveEditingEntity(null);
                }
              }}
              title="Remove this span"
            >
              ×
            </button>
          </span>
        </span>
      );

      currentPos = entEndInSent;
    });

    if (currentPos < sentenceEnd) {
      pieces.push(
        <span key={`text-end-${currentPos}`} className="select-text">
          {sentenceText.slice(currentPos - sentenceStart)}
        </span>
      );
    }

    return pieces;
  };

  return (
    <div
      ref={containerRef}
      onMouseUp={handleMouseUp}
      className={`font-serif text-[20px] leading-[2.5] text-ink transition-colors ${
        selectedSpan ? 'selection:bg-[#f0d9d6]' : ''
      }`}
    >
      {renderAnnotatedText()}
    </div>
  );
}
