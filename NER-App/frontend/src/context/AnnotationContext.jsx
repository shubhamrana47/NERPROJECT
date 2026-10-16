import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const AnnotationContext = createContext(null);

export function AnnotationProvider({ children }) {
  const [selectedSpan, setSelectedSpan] = useState(null);
  const [activeEditingEntity, setActiveEditingEntity] = useState(null);
  const annotatorRef = useRef(null);

  const registerLineAnnotator = useCallback((handlers) => {
    annotatorRef.current = handlers;
  }, []);

  const applyLabel = useCallback((label) => {
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
      setSelectedSpan(null);
      try {
        window.getSelection()?.removeAllRanges();
      } catch (_) {}
    }
  }, [selectedSpan]);

  const updateEntity = useCallback((targetEnt, changes) => {
    if (annotatorRef.current?.onUpdateEntity) {
      annotatorRef.current.onUpdateEntity(targetEnt, changes);
    }
  }, []);

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

  return (
    <AnnotationContext.Provider
      value={{
        selectedSpan,
        setSelectedSpan,
        applyLabel,
        clearSelection,
        activeEditingEntity,
        setActiveEditingEntity,
        updateEntity,
        deleteEntity,
        registerLineAnnotator,
      }}
    >
      {children}
    </AnnotationContext.Provider>
  );
}

export function useAnnotation() {
  const context = useContext(AnnotationContext);
  return context;
}
