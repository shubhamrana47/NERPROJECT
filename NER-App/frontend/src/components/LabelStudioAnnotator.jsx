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

  // In the inline text flow, resolve overlapping entities so text in sentenceText
  // is never duplicated on screen. Human/manual additions take precedence over
  // unreviewed pipeline spans, followed by confirmed spans and longer spans.
  const visibleEntities = useMemo(() => {
    const sorted = [...sentenceEntities].sort((a, b) => {
      const aHuman =
        a.validationStatus === 'added' || a.isManual || a.source === 'human' || a.status === 'edited'
          ? 1
          : 0;
      const bHuman =
        b.validationStatus === 'added' || b.isManual || b.source === 'human' || b.status === 'edited'
          ? 1
          : 0;
      if (aHuman !== bHuman) return bHuman - aHuman;

      const aConf = a.validationStatus === 'confirmed' ? 1 : 0;
      const bConf = b.validationStatus === 'confirmed' ? 1 : 0;
      if (aConf !== bConf) return bConf - aConf;

      const aLen = (a.end || 0) - (a.start || 0);
      const bLen = (b.end || 0) - (b.start || 0);
      if (aLen !== bLen) return bLen - aLen;

      return (Number(b.confidence) || 0) - (Number(a.confidence) || 0);
    });

    const chosen = [];
    for (const ent of sorted) {
      const overlaps = chosen.some((c) => ent.start < c.end && c.start < ent.end);
      if (!overlaps) {
        chosen.push(ent);
      }
    }

    return chosen.sort((a, b) => a.start - b.start || a.end - b.end);
  }, [sentenceEntities]);

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

    visibleEntities.forEach((ent, entIdx) => {
      if (ent.start > currentPos) {
        const segStart = currentPos - sentenceStart;
        const segEnd = ent.start - sentenceStart;
        pieces.push(
          <span
            key={`text-${currentPos}`}
            data-start={segStart}
            data-end={segEnd}
            className="select-text"
          >
            {sentenceText.slice(segStart, segEnd)}
          </span>
        );
      }

      const entStartInSent = Math.max(0, ent.start - sentenceStart);
      const entEndInSent = Math.min(sentenceText.length, ent.end - sentenceStart);
      const entText =
        sentenceText.slice(entStartInSent, entEndInSent) || ent.text;
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
            const sel = window.getSelection();
            if (sel && !sel.isCollapsed && sel.toString().trim()) {
              return;
            }
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
            data-start={entStartInSent}
            data-end={entEndInSent}
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

      currentPos = Math.max(currentPos, ent.end);
    });

    if (currentPos < sentenceEnd) {
      const segStart = currentPos - sentenceStart;
      const segEnd = sentenceText.length;
      pieces.push(
        <span
          key={`text-end-${currentPos}`}
          data-start={segStart}
          data-end={segEnd}
          className="select-text"
        >
          {sentenceText.slice(segStart, segEnd)}
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
