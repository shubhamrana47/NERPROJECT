import React, { createContext, useContext, useState, useCallback, useRef, useMemo } from 'react';
import { ENTITY_TYPES, ENTITY_SHORTCUTS } from '../utils/textUtils.jsx';
import {
  addRecentLabel,
  mergeQuickLabels,
  readRecentLabels,
  writeRecentLabels,
} from '../utils/recentLabels.js';

const AnnotationContext = createContext(null);

const SHORTCUT_LABELS = ENTITY_SHORTCUTS.map((s) => s.label);
const isRealLabel = (label) => ENTITY_TYPES.includes(label);

export function AnnotationProvider({ children }) {
  const [selectedSpan, setSelectedSpan] = useState(null);
  const [activeEditingEntity, setActiveEditingEntity] = useState(null);
  const [recentLabels, setRecentLabels] = useState(readRecentLabels);
  const annotatorRef = useRef(null);
  const flushRef = useRef(null);

  const registerLineAnnotator = useCallback((handlers) => {
    annotatorRef.current = handlers;
  }, []);

  /*
   * The passage view writes behind the interface, so at any moment there can be
   * work on screen that the server has not got yet. Anything that reads from
   * the server — the export above all — has to wait for it, or it quietly hands
   * back a file missing the last thing someone did.
   */
  const registerFlush = useCallback((fn) => {
    flushRef.current = fn;
  }, []);

  const flushPendingWork = useCallback(async () => {
    if (typeof flushRef.current === 'function') await flushRef.current();
  }, []);

  /** Records a label as used, whichever route applied it. */
  const rememberLabel = useCallback((label) => {
    if (!isRealLabel(label)) return;
    setRecentLabels((prev) => {
      const next = addRecentLabel(prev, label);
      writeRecentLabels(next);
      return next;
    });
  }, []);

  const applyLabel = useCallback(
    (label) => {
      /*
       * A selection is the more explicit act, so it wins. It has to: in
       * validation an entity can be in focus while words are selected, and
       * labelling what was just dragged over is plainly what was meant. Only
       * with nothing selected does a label mean "correct the entity in focus".
       */
      if (selectedSpan && annotatorRef.current?.onAddEntity) {
        annotatorRef.current.onAddEntity({
          text: selectedSpan.text,
          label,
          start: selectedSpan.globalStart,
          end: selectedSpan.globalEnd,
          confidence: 1.0,
          source: 'human',
          status: 'approved',
        });
        rememberLabel(label);
        setSelectedSpan(null);
        try {
          window.getSelection()?.removeAllRanges();
        } catch (_) {}
        return;
      }
      if (annotatorRef.current?.onRelabel) {
        annotatorRef.current.onRelabel(label);
        rememberLabel(label);
      }
    },
    [selectedSpan, rememberLabel]
  );

  const updateEntity = useCallback(
    (targetEnt, changes) => {
      if (annotatorRef.current?.onUpdateEntity) {
        annotatorRef.current.onUpdateEntity(targetEnt, changes);
        // Reclassifying a span counts as reaching for that label.
        if (changes?.label) rememberLabel(changes.label);
      }
    },
    [rememberLabel]
  );

  const deleteEntity = useCallback((targetEnt) => {
    if (annotatorRef.current?.onDeleteEntity) {
      annotatorRef.current.onDeleteEntity(targetEnt);
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedSpan(null);
    try {
      window.getSelection()?.removeAllRanges();
    } catch (_) {}
  }, []);

  // Used labels first, topped up with the keyed defaults. Both the sidebar and
  // the bar under the sentence render this same set.
  const quickLabels = useMemo(
    () => mergeQuickLabels(recentLabels, SHORTCUT_LABELS, isRealLabel),
    [recentLabels]
  );

  const value = useMemo(
    () => ({
      selectedSpan,
      setSelectedSpan,
      applyLabel,
      clearSelection,
      activeEditingEntity,
      setActiveEditingEntity,
      updateEntity,
      deleteEntity,
      registerLineAnnotator,
      registerFlush,
      flushPendingWork,
      recentLabels,
      quickLabels,
      rememberLabel,
    }),
    [
      selectedSpan,
      applyLabel,
      clearSelection,
      activeEditingEntity,
      updateEntity,
      deleteEntity,
      registerLineAnnotator,
      registerFlush,
      flushPendingWork,
      recentLabels,
      quickLabels,
      rememberLabel,
    ]
  );

  return <AnnotationContext.Provider value={value}>{children}</AnnotationContext.Provider>;
}

export function useAnnotation() {
  const context = useContext(AnnotationContext);
  return context;
}
