import React, { useRef, useMemo, useEffect } from 'react';
import { useAnnotation } from '../context/AnnotationContext.jsx';
import { getEntityColorStyle, formatEntityLabel } from '../utils/textUtils.jsx';
import { CAPTION_ATTR, offsetsFromRange } from '../utils/selectionOffsets.js';

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
  readOnly = false,
  // Validation: entities are judged, never added, so dragging selects nothing.
  allowSelection = true,
  onFocusEntity,
  onSelectionBlocked,
  onSelectionUnresolved,
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

  /*
   * Selection is read from the document rather than from a mouseup on this
   * element.
   *
   * Releasing the mouse a little outside the sentence — in the padding, the
   * gutter, or past the end of the last line — is completely normal when
   * selecting the final word, and an element-level handler never fires for it.
   * The selection was made, and nothing happened: indistinguishable from a
   * broken tagger. A document-level listener sees it, and each sentence
   * answers only for a selection that began inside it.
   */
  useEffect(() => {
    if (readOnly) return undefined;

    const onMouseUp = () => {
      const container = containerRef.current;
      if (!container) return;

      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      const startsHere = container.contains(range.startContainer);
      if (!startsHere) return; // another sentence will answer for it

      if (!allowSelection) {
        if (selection.toString().trim() && onSelectionBlocked) onSelectionBlocked();
        return;
      }

      // Began here but ran past the end of this sentence.
      if (!container.contains(range.endContainer)) {
        if (onSelectionUnresolved) onSelectionUnresolved('crosses-sentences');
        return;
      }

      const measured = offsetsFromRange(container, range, sentenceText);
      if (!measured) {
        if (selection.toString().trim() && onSelectionUnresolved) {
          onSelectionUnresolved('unresolved');
        }
        return;
      }

      if (setSelectedSpan) {
        setSelectedSpan({
          text: measured.text,
          localStart: measured.start,
          localEnd: measured.end,
          globalStart: sentenceStart + measured.start,
          globalEnd: sentenceStart + measured.end,
        });
      }
      if (setActiveEditingEntity) setActiveEditingEntity(null);
    };

    document.addEventListener('mouseup', onMouseUp);
    return () => document.removeEventListener('mouseup', onMouseUp);
  }, [
    readOnly,
    allowSelection,
    sentenceText,
    sentenceStart,
    setSelectedSpan,
    setActiveEditingEntity,
    onSelectionBlocked,
    onSelectionUnresolved,
  ]);

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
      const isRejected = ent.validationStatus === 'rejected';
      const isEditing =
        activeEditingEntity &&
        ((activeEditingEntity._id && activeEditingEntity._id === ent._id) ||
          (activeEditingEntity.start === ent.start && activeEditingEntity.end === ent.end));

      pieces.push(
        <span
          key={ent._id || `${ent.start}-${ent.end}-${entIdx}`}
          className={`group relative mr-1 inline-flex select-text flex-col items-start align-baseline ${
            readOnly ? '' : 'cursor-pointer'
          }`}
          onClick={(e) => {
            if (readOnly) return;
            e.stopPropagation();
            if (onFocusEntity) onFocusEntity(ent);
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
            } ${isRejected ? 'text-ink-faint line-through' : ''}`}
            style={{
              borderBottom: isRejected
                ? '2px dotted var(--color-rule-strong)'
                : `2px ${isManual ? 'dashed' : 'solid'} ${colorStyle.border}`,
              backgroundColor: isEditing ? undefined : isManual && !isRejected ? colorStyle.bg : undefined,
            }}
          >
            {entText}
          </span>

          <span
            {...{ [CAPTION_ATTR]: 'true' }}
            className={`flex select-none items-center gap-1 pt-[3px] text-[10px] leading-none ${
              isFresh ? 'mark-in' : ''
            }`}
          >
            {isManual && (
              <span className="h-[3px] w-[3px] rounded-full bg-hand" aria-hidden="true" />
            )}
            <span
              style={{ color: isRejected ? undefined : colorStyle.border }}
              className={isRejected ? 'text-ink-faint line-through' : undefined}
            >
              {formatEntityLabel(ent.label)}
            </span>
            {!readOnly && (
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
            )}
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
      className={`font-serif text-[20px] leading-[2.5] text-ink transition-colors ${
        selectedSpan ? 'selection:bg-[#f0d9d6]' : ''
      }`}
    >
      {renderAnnotatedText()}
    </div>
  );
}
