import React, { useState, useEffect, useMemo, useCallback } from 'react';
import LabelStudioAnnotator from './LabelStudioAnnotator.jsx';
import { ENTITY_TYPES, getEntityColorStyle } from '../utils/textUtils.jsx';
import { useAnnotation } from '../context/AnnotationContext.jsx';

export default function LineAnnotationCard({
  lineItem,
  totalLines,
  onSaveLine,
  onResetLine,
  onNextLine,
  onPrevLine,
  hasPrev,
  hasNext,
}) {
  const {
    globalLineNumber,
    page,
    section,
    sentenceText,
    sentenceStart,
    sentenceEnd,
    initialEntities,
    staticModelEntities = [],
    segIndex,
  } = lineItem;

  const annotation = useAnnotation();

  // Local entities for this sentence to support immediate manipulation, Save & Reset
  const [lineEntities, setLineEntities] = useState([]);
  const [isDirty, setIsDirty] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [saving, setSaving] = useState(false);

  // Initialize or re-sync entities when initialEntities change
  useEffect(() => {
    setLineEntities(initialEntities || []);
    setIsDirty(false);
  }, [initialEntities]);

  // Clear success notification & selection only when navigating away to another line
  useEffect(() => {
    setSaveSuccessMsg('');
    if (annotation?.clearSelection) {
      annotation.clearSelection();
    }
    if (annotation?.setActiveEditingEntity) {
      annotation.setActiveEditingEntity(null);
    }
  }, [globalLineNumber]);

  // Handle adding a new entity manually (not identified by model)
  const handleAddEntity = (newEnt) => {
    const created = {
      ...newEnt,
      _id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      confidence: 1.0,
      source: 'human',
      status: 'approved',
    };
    setLineEntities((prev) => [...prev, created]);
    setIsDirty(true);
    setSaveSuccessMsg('');
  };

  // Handle updating an existing entity
  const handleUpdateEntity = (targetEnt, changes) => {
    setLineEntities((prev) =>
      prev.map((e) => {
        const matches = (targetEnt._id && e._id === targetEnt._id) || (e.start === targetEnt.start && e.end === targetEnt.end);
        if (!matches) return e;
        return {
          ...e,
          status: 'edited',
          source: 'human',
          ...changes,
        };
      })
    );
    setIsDirty(true);
    setSaveSuccessMsg('');
  };

  // Handle approving all entities in this line in one click
  const handleApproveAllOnLine = () => {
    setLineEntities((prev) =>
      prev.map((e) => {
        if (e.status !== 'deleted' && e.start >= sentenceStart && e.start < sentenceEnd) {
          return {
            ...e,
            status: 'approved',
            source: 'human',
          };
        }
        return e;
      })
    );
    setIsDirty(true);
    setSaveSuccessMsg('');
  };

  // Handle deleting an entity
  const handleDeleteEntity = (targetEnt) => {
    setLineEntities((prev) =>
      prev.filter((e) => {
        if (targetEnt._id && e._id === targetEnt._id) return false;
        if (e.start === targetEnt.start && e.end === targetEnt.end) return false;
        return true;
      })
    );
    setIsDirty(true);
    setSaveSuccessMsg('');
  };

  // Register this active line's annotation callbacks with context so the sidebar can trigger actions directly
  useEffect(() => {
    if (annotation?.registerLineAnnotator) {
      annotation.registerLineAnnotator({
        onAddEntity: handleAddEntity,
        onUpdateEntity: handleUpdateEntity,
        onDeleteEntity: handleDeleteEntity,
        sentenceStart,
        sentenceEnd,
        sentenceText,
      });
    }
  }, [annotation?.registerLineAnnotator, sentenceStart, sentenceEnd, sentenceText]);

  // Save current line annotations to backend
  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveLine(segIndex, sentenceStart, sentenceEnd, lineEntities);
      setIsDirty(false);
      setSaveSuccessMsg('Line annotations saved to backend!');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (err) {
      alert(`Failed to save line annotations: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Reset line back to model predictions
  const handleReset = async () => {
    if (window.confirm('Reset this sentence back to original model predictions? Any unsaved manual additions will be reverted.')) {
      setSaving(true);
      try {
        await onResetLine(segIndex, sentenceStart, sentenceEnd);
        setIsDirty(false);
        setSaveSuccessMsg('Reset to original model output.');
        setTimeout(() => setSaveSuccessMsg(''), 4000);
      } catch (err) {
        alert(`Failed to reset: ${err.message}`);
      } finally {
        setSaving(false);
      }
    }
  };

  const handleNextWithCheck = () => {
    if (isDirty) {
      if (window.confirm('You have unsaved manual annotations on this line. Do you want to save before proceeding to next line?')) {
        handleSave().then(() => onNextLine());
        return;
      }
    }
    onNextLine();
  };

  const handlePrevWithCheck = () => {
    if (isDirty) {
      if (window.confirm('You have unsaved manual annotations on this line. Do you want to save before proceeding to previous line?')) {
        handleSave().then(() => onPrevLine());
        return;
      }
    }
    onPrevLine();
  };

  // Active display tab: 'interactive' | 'baseline' | 'both'
  const [activeTab, setActiveTab] = useState('interactive');

  // Handle Approve line [A]
  const handleApproveLine = async () => {
    // 1. Mark all current non-deleted entities as approved
    const approvedEntities = lineEntities.map((e) => {
      if (e.status !== 'deleted' && e.start >= sentenceStart && e.start < sentenceEnd) {
        return {
          ...e,
          status: 'approved',
          source: e.source || 'human',
        };
      }
      return e;
    });

    setLineEntities(approvedEntities);
    setSaving(true);
    try {
      await onSaveLine(segIndex, sentenceStart, sentenceEnd, approvedEntities);
      setIsDirty(false);
      setSaveSuccessMsg('Line approved and saved!');
      setTimeout(() => setSaveSuccessMsg(''), 3000);
      if (hasNext) {
        onNextLine();
      }
    } catch (err) {
      alert(`Failed to approve line: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Keyboard shortcut listener for 'A' (approve) and '1'-'9' (tagging selected text)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        return;
      }
      // 'A' or 'a' to approve line
      if (e.key === 'a' || e.key === 'A') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          handleApproveLine();
        }
      }
      // '1' to '9' to quickly tag selected text
      if (annotation?.selectedSpan && /^[1-9]$/.test(e.key)) {
        const index = parseInt(e.key, 10) - 1;
        const topEntity = ENTITY_TYPES[index];
        if (topEntity && annotation.applyLabel) {
          e.preventDefault();
          annotation.applyLabel(topEntity);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lineEntities, sentenceStart, sentenceEnd, segIndex, hasNext, annotation?.selectedSpan]);

  // Model predictions count for this line
  const modelEntitiesOnLine = useMemo(() => {
    return (staticModelEntities || []).filter(
      (e) => e.start >= sentenceStart && e.start < sentenceEnd
    );
  }, [staticModelEntities, sentenceStart, sentenceEnd]);

  // Manual additions count for this line
  const manualCountOnLine = useMemo(() => {
    return lineEntities.filter(
      (e) => (e.source === 'human' || e.status === 'edited' || e._id?.toString().startsWith('temp_')) && e.status !== 'deleted' && e.start >= sentenceStart && e.start < sentenceEnd
    ).length;
  }, [lineEntities, sentenceStart, sentenceEnd]);

  const hasSavedManual = useMemo(() => {
    return (initialEntities || []).some((e) => e.source === 'human' && e.status !== 'deleted');
  }, [initialEntities]);

  // Entities present on this line for table view
  const currentEntities = useMemo(() => {
    return lineEntities
      .filter((e) => e.status !== 'deleted' && e.start >= sentenceStart && e.start < sentenceEnd)
      .sort((a, b) => a.start - b.start);
  }, [lineEntities, sentenceStart, sentenceEnd]);

  // Average confidence for this line
  const avgConfidence = useMemo(() => {
    if (modelEntitiesOnLine.length === 0) return 91.4;
    const sum = modelEntitiesOnLine.reduce((acc, e) => acc + Number(e.confidence ?? 1), 0);
    return ((sum / modelEntitiesOnLine.length) * 100).toFixed(1);
  }, [modelEntitiesOnLine]);

  return (
    <div className="w-full space-y-4">
      {/* Breadcrumb & Line Review Header matching design.png */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div>
          <div className="text-xs text-slate-500 font-medium">
            {lineItem.docFilename || 'agri_reports_v4.jsonl'} / Document {String(page || 1).padStart(2, '0')}
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 mt-0.5">
            Review line {globalLineNumber}
          </h2>
        </div>

        {/* Top-right Navigation & View Tabs */}
        <div className="flex items-center gap-3">
          {/* View Tab Selector: 01 Existing Baseline / 02 Interactive Workspace */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('baseline')}
              className={`rounded-md px-2.5 py-1 transition cursor-pointer ${
                activeTab === 'baseline'
                  ? 'bg-white font-bold text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              01 · Original NER Output
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('interactive')}
              className={`rounded-md px-2.5 py-1 transition cursor-pointer ${
                activeTab === 'interactive'
                  ? 'bg-white font-bold text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              02 · Interactive Annotation
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('both')}
              className={`rounded-md px-2 py-1 transition cursor-pointer ${
                activeTab === 'both'
                  ? 'bg-white font-bold text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Both
            </button>
          </div>

          {/* Pagination pill: < 128 of 620 > */}
          <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white text-xs font-medium shadow-2xs">
            <button
              type="button"
              onClick={handlePrevWithCheck}
              disabled={!hasPrev || saving}
              className="px-2.5 py-1.5 hover:bg-slate-50 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition rounded-l-xl"
              title="Previous line (Left Arrow)"
            >
              ‹
            </button>
            <span className="px-3 py-1.5 font-semibold text-slate-700 border-x border-slate-100 select-none">
              {globalLineNumber} of {totalLines}
            </span>
            <button
              type="button"
              onClick={handleNextWithCheck}
              disabled={!hasNext || saving}
              className="px-2.5 py-1.5 hover:bg-slate-50 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition rounded-r-xl"
              title="Next line (Right Arrow)"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {/* Status Alert if any */}
      {(saveSuccessMsg || isDirty || saving) && (
        <div className="flex items-center justify-between px-4 py-2 rounded-xl text-xs font-semibold border transition-all">
          {saving && (
            <span className="flex items-center gap-2 text-blue-700">
              <span className="h-2 w-2 rounded-full bg-blue-600 animate-ping" />
              Saving annotations to backend…
            </span>
          )}
          {isDirty && !saving && (
            <span className="flex items-center gap-1.5 text-amber-700">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Unsaved changes on this line. Click "Approve line" or "Save Line Annotations".
            </span>
          )}
          {saveSuccessMsg && !isDirty && (
            <span className="flex items-center gap-1.5 text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              ✓ {saveSuccessMsg}
            </span>
          )}
        </div>
      )}

      {/* 1. Static Div: Original NER Model Output (Shown if baseline or both is selected) */}
      {(activeTab === 'baseline' || activeTab === 'both') && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          {/* Card Header matching design.png */}
          <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 bg-slate-50/40">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                ORIGINAL NER OUTPUT
              </span>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                PARAGRAPH {lineItem.sentenceIndexInSegment != null ? lineItem.sentenceIndexInSegment + 1 : 1}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <span className="text-amber-500">✨</span>
              <span>{modelEntitiesOnLine.length} model predictions</span>
            </div>
          </div>

          {/* Sentence Highlight Display with exact design.png entity-based colors */}
          <div className="p-6 min-h-[4rem] text-[17px] leading-[2.85rem] text-slate-800">
            {renderStaticModelText(sentenceText, sentenceStart, sentenceEnd, staticModelEntities)}
          </div>

          {/* Footer with Legend */}
          <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50/30 text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="inline-block w-4 h-0.5 bg-blue-500" />
                Model prediction
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              Static raw baseline — unmodified by manual annotations
            </span>
          </div>
        </div>
      )}

      {/* 2. Interactive Annotation Workspace Card (Shown if interactive or both is selected) */}
      {(activeTab === 'interactive' || activeTab === 'both') && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden transition-all">
          {/* Card Header matching design.png */}
          <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                SOURCE TEXT
              </span>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                PARAGRAPH {lineItem.sentenceIndexInSegment != null ? lineItem.sentenceIndexInSegment + 1 : 1}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <span className="text-amber-500">✨</span>
              <span>{modelEntitiesOnLine.length} model predictions</span>
            </div>
          </div>

          {/* Interactive Sentence Text with exact design.png entity styling */}
          <div className="p-0">
            <LabelStudioAnnotator
              sentenceText={sentenceText}
              sentenceStart={sentenceStart}
              sentenceEnd={sentenceEnd}
              entities={lineEntities}
              onAddEntity={handleAddEntity}
              onUpdateEntity={handleUpdateEntity}
              onDeleteEntity={handleDeleteEntity}
            />
          </div>

          {/* Card Footer matching design.png: Legend on left, Skip & Approve line [A] on right */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 border-t border-slate-100 bg-slate-50/30">
            {/* Legend matching design.png */}
            <div className="flex items-center gap-4 text-xs text-slate-600 font-medium select-none">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-4 h-0.5 bg-blue-500" />
                Model prediction
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-4 border-b-2 border-dashed border-red-500" />
                Manual addition
              </span>
            </div>

            {/* Action Buttons: Skip and Approve Line [A] */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleNextWithCheck}
                disabled={!hasNext || saving}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer shadow-2xs"
                title="Skip to next line"
              >
                <span className="text-slate-400 font-bold">✕</span>
                <span>Skip</span>
              </button>

              <button
                type="button"
                onClick={handleApproveLine}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 px-4 py-2 text-xs font-bold text-white shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
                title="Approve all entities on line and advance (Shortcut: A)"
              >
                <span>✓</span>
                <span>Approve line</span>
                <span className="rounded bg-emerald-950/40 px-1.5 py-0.5 text-[10px] font-mono text-emerald-200">
                  A
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Missed Entity Bar matching design.png */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white px-5 py-3 shadow-xs">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold uppercase tracking-wider text-slate-700 text-[11px]">
            ADD MISSED ENTITY
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-500 font-medium">
            {annotation?.selectedSpan ? (
              <span className="text-emerald-700 font-bold">
                Selected: "{annotation.selectedSpan.text}" → Pick an entity label in the right sidebar or press 1-9
              </span>
            ) : (
              'Select text above, then choose a label'
            )}
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            if (!annotation?.selectedSpan) {
              alert('Please highlight a word or phrase in the text above first, then choose a label.');
            }
          }}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
        >
          <span>+</span>
          <span>Add entity</span>
        </button>
      </div>

      {/* Details Table: Entity breakdown & individual actions */}
      <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50/50">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-100/70 border-b border-slate-200 text-xs font-semibold text-slate-700">
          <div className="flex items-center gap-2">
            <span>Annotated Entities for Line {globalLineNumber}</span>
            <span className="text-slate-400 font-normal">({currentEntities.length})</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1 rounded bg-slate-700 hover:bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs transition"
            >
              Save Line
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={saving}
              className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              Reset to Model Output
            </button>
          </div>
        </div>

        {currentEntities.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-2 font-semibold">Entity Text</th>
                  <th className="px-4 py-2 font-semibold">Class / Type</th>
                  <th className="px-4 py-2 font-semibold">Offsets</th>
                  <th className="px-4 py-2 font-semibold">Confidence</th>
                  <th className="px-4 py-2 font-semibold">Source</th>
                  <th className="px-4 py-2 font-semibold">Status</th>
                  <th className="px-4 py-2 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {currentEntities.map((ent, idx) => (
                  <LineEntityTableRow
                    key={ent._id || `${ent.start}-${ent.end}-${idx}`}
                    ent={ent}
                    idx={idx}
                    sentenceStart={sentenceStart}
                    handleUpdateEntity={handleUpdateEntity}
                    handleDeleteEntity={handleDeleteEntity}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 text-center text-xs text-slate-400 italic">
            No entities detected in this line by the model. Select text above to add manual entities.
          </div>
        )}
      </div>
    </div>
  );
}

function LineEntityTableRow({
  ent,
  idx,
  sentenceStart,
  handleUpdateEntity,
  handleDeleteEntity,
}) {
  const [editingType, setEditingType] = useState(false);
  const isManual = ent.source === 'human';
  const isApproved = ent.status === 'approved';
  const confPct = (Number(ent.confidence ?? 1) * 100).toFixed(1);
  const colorStyle = getEntityColorStyle(ent.label);

  return (
    <tr key={ent._id || idx} className="hover:bg-slate-50 transition-colors">
      <td className="px-4 py-2 font-medium text-slate-900">
        {ent.text}
      </td>

      {/* Class / Type column with inline dropdown */}
      <td className="px-4 py-2">
        {editingType ? (
          <div className="flex items-center gap-1.5">
            <select
              autoFocus
              value={ent.label}
              onChange={(e) => {
                handleUpdateEntity(ent, { label: e.target.value, status: 'edited', source: 'human' });
                setEditingType(false);
              }}
              className="rounded border border-blue-400 bg-white px-2 py-1 text-xs font-semibold text-slate-800 shadow-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {!ENTITY_TYPES.includes(ent.label) && <option value={ent.label}>{ent.label}</option>}
              {ENTITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setEditingType(false)}
              className="text-[11px] text-slate-500 hover:text-slate-800 font-medium px-1"
            >
              Cancel
            </button>
          </div>
        ) : (
          <span
            onClick={() => setEditingType(true)}
            className="inline-flex items-center gap-1.5 cursor-pointer rounded px-2.5 py-1 text-[11px] font-semibold border transition hover:ring-1 hover:ring-blue-400"
            style={colorStyle}
            title="Click to select different entity class from dropdown"
          >
            <span>{ent.label}</span>
            <span className="text-[9px] opacity-60">▾</span>
          </span>
        )}
      </td>

      {/* Offsets */}
      <td className="px-4 py-2 font-mono text-[11px] text-slate-500">
        [{ent.start - sentenceStart}:{ent.end - sentenceStart}]
      </td>

      {/* Confidence */}
      <td className="px-4 py-2 text-[11px]">
        {isManual ? (
          <span className="text-slate-400">—</span>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">{confPct}%</span>
            <div className="w-12 h-1.5 rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full bg-blue-500"
                style={{ width: `${confPct}%` }}
              />
            </div>
          </div>
        )}
      </td>

      {/* Source */}
      <td className="px-4 py-2">
        <span
          className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
            isManual ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
          }`}
        >
          {isManual ? 'Manual' : 'Model'}
        </span>
      </td>

      {/* Status */}
      <td className="px-4 py-2 text-[11px]">
        {isApproved ? (
          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
            Approved
          </span>
        ) : (
          <span className="capitalize text-slate-600">
            {ent.status}
          </span>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-2 text-right space-x-1.5 whitespace-nowrap">
        {/* Approve Button */}
        {!isApproved ? (
          <button
            type="button"
            onClick={() => handleUpdateEntity(ent, { status: 'approved', source: 'human' })}
            className="rounded bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition"
            title="Approve this prediction as correct"
          >
            ✓ Approve
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleUpdateEntity(ent, { status: isManual ? 'approved' : 'accepted' })}
            className="rounded bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 text-[10px] font-semibold hover:bg-emerald-100 transition"
            title="Click to toggle approval"
          >
            ✓ Approved
          </button>
        )}

        {/* Change Type Dropdown Toggle */}
        <button
          type="button"
          onClick={() => setEditingType(!editingType)}
          className="rounded bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-200 transition"
        >
          {editingType ? 'Close' : 'Change Type'}
        </button>

        {/* Delete */}
        <button
          type="button"
          onClick={() => handleDeleteEntity(ent)}
          className="rounded bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-100 transition"
        >
          Delete
        </button>
      </td>
    </tr>
  );
}

/**
 * Renders static sentence text with model baseline predictions highlighted matching design.png.
 * Text color and underline depend strictly on entity type (NOT confidence score).
 */
function renderStaticModelText(sentenceText, sentenceStart, sentenceEnd, staticEntities = []) {
  if (!sentenceText) return null;
  if (!staticEntities || staticEntities.length === 0) {
    return <span className="text-slate-800">{sentenceText}</span>;
  }

  // Filter and sort entities falling within this sentence
  const ents = staticEntities
    .filter((e) => e.start >= sentenceStart && e.start < sentenceEnd)
    .sort((a, b) => a.start - b.start);

  if (ents.length === 0) {
    return <span className="text-slate-800">{sentenceText}</span>;
  }

  const pieces = [];
  let currentPos = sentenceStart;

  ents.forEach((ent, idx) => {
    const entStartInSent = Math.max(ent.start, sentenceStart);
    const entEndInSent = Math.min(ent.end, sentenceEnd);

    if (entStartInSent > currentPos) {
      pieces.push(
        <span key={`text-before-${idx}`} className="text-slate-800">
          {sentenceText.slice(currentPos - sentenceStart, entStartInSent - sentenceStart)}
        </span>
      );
    }

    const textChunk =
      sentenceText.slice(entStartInSent - sentenceStart, entEndInSent - sentenceStart) ||
      ent.text;

    const colorStyle = getEntityColorStyle(ent.label);

    pieces.push(
      <span
        key={ent._id || `${ent.start}-${ent.end}-${idx}`}
        className="group relative inline-flex flex-col items-center mx-1 align-baseline select-text"
        title={`Model Prediction: ${ent.label} (${(Number(ent.confidence ?? 1) * 100).toFixed(0)}%)`}
      >
        {/* Main Entity Text with Background and Solid Underline */}
        <span
          className="inline-block px-1.5 py-0.5 rounded text-[16px] font-medium leading-snug border-b-2 border-solid"
          style={{
            backgroundColor: colorStyle.bg,
            color: colorStyle.text,
            borderColor: colorStyle.border,
          }}
        >
          {textChunk}
        </span>

        {/* Subtext Label Underneath */}
        <span
          className="block text-[9px] font-bold uppercase tracking-wider text-center mt-0.5 leading-none select-none"
          style={{ color: colorStyle.border }}
        >
          {ent.label.toUpperCase()}
        </span>
      </span>
    );

    currentPos = Math.max(currentPos, entEndInSent);
  });

  if (currentPos < sentenceEnd) {
    pieces.push(
      <span key="text-end" className="text-slate-800">
        {sentenceText.slice(currentPos - sentenceStart)}
      </span>
    );
  }

  return pieces;
}
