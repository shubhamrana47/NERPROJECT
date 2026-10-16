import React, { useState, useEffect, useMemo } from 'react';
import LabelStudioAnnotator from './LabelStudioAnnotator.jsx';
import { ENTITY_TYPES, getConfidenceThresholdClass } from '../utils/textUtils.jsx';

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

  // Clear success notification only when navigating away to another line
  useEffect(() => {
    setSaveSuccessMsg('');
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

  // Check if this line has saved manual annotations
  const manualCountOnLine = useMemo(() => {
    return lineEntities.filter((e) => e.source === 'human' && e.status !== 'deleted').length;
  }, [lineEntities]);

  const hasSavedManual = useMemo(() => {
    return (initialEntities || []).some((e) => e.source === 'human' && e.status !== 'deleted');
  }, [initialEntities]);

  // Entities present on this line for table view
  const currentEntities = useMemo(() => {
    return lineEntities
      .filter((e) => e.status !== 'deleted' && e.start >= sentenceStart && e.start < sentenceEnd)
      .sort((a, b) => a.start - b.start);
  }, [lineEntities, sentenceStart, sentenceEnd]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* Top Header: Line Number & Section Metadata */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center rounded-lg bg-blue-600 px-3.5 py-1.5 text-sm font-bold text-white shadow-xs">
            Line {globalLineNumber} <span className="ml-1 text-blue-200 font-normal">/ {totalLines}</span>
          </span>
          <span className="rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            Page {page || 1}
          </span>
          <span className="text-xs font-medium text-slate-500 truncate max-w-md">
            {section || 'Advisory Section'}
          </span>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2">
          {saving && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
              <span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              Updating backend…
            </span>
          )}
          {isDirty && !saving && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
              ● Unsaved changes on line
            </span>
          )}
          {saveSuccessMsg && !isDirty && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
              ✓ {saveSuccessMsg}
            </span>
          )}
          {hasSavedManual && !isDirty && !saveSuccessMsg && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50/70 px-2.5 py-1 text-xs font-medium text-emerald-800 border border-emerald-200" title="This line has manual annotations saved in the backend">
              ✓ Saved in backend ({manualCountOnLine} manual)
            </span>
          )}
          <span className="text-xs text-slate-400">
            {currentEntities.length} {currentEntities.length === 1 ? 'entity' : 'entities'} tagged
          </span>
        </div>
      </div>

      {/* 1. Static Div: Original NER Model Output (Never changes with user edits) */}
      <div className="mb-5 rounded-2xl border border-blue-200/80 bg-blue-50/30 p-5 shadow-xs transition-all">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-blue-200/50 pb-2">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-blue-600 ring-2 ring-blue-300" />
            <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
              Original NER Model Output (Static Baseline)
            </span>
            <span className="rounded-md bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
              Raw Predictions
            </span>
          </div>
          <span className="text-xs font-semibold text-blue-700">
            {staticModelEntities.length} {staticModelEntities.length === 1 ? 'entity' : 'entities'} detected by model
          </span>
        </div>

        {/* Static Sentence Highlight Display */}
        <div className="p-1 min-h-[2.75rem] text-[16px] leading-relaxed text-slate-900">
          {renderStaticModelText(sentenceText, sentenceStart, sentenceEnd, staticModelEntities)}
        </div>

        {/* Static Entities Chip Summary */}
        {staticModelEntities.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-2 border-t border-blue-200/40">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mr-1">
              Model Tags:
            </span>
            {staticModelEntities.map((me, mIdx) => (
              <span
                key={me._id || mIdx}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold border shadow-xs ${
                  getConfidenceThresholdClass(me.confidence)
                }`}
                title={`Confidence: ${(Number(me.confidence ?? 1) * 100).toFixed(1)}%`}
              >
                <span>{me.text}</span>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-black/10">
                  {me.label}
                </span>
                <span className="text-[10px] font-mono opacity-85 font-semibold">
                  {(Number(me.confidence ?? 1) * 100).toFixed(0)}%
                </span>
              </span>
            ))}
          </div>
        ) : (
          <div className="mt-2 text-xs italic text-slate-400">
            No entities were detected by the model on this sentence.
          </div>
        )}
      </div>

      {/* 2. Dynamic Div: Interactive Annotation Workspace (Mutable / Reflects User Changes) */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-300" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Interactive Annotation Workspace (User Changes &amp; Manual Tags)
            </span>
            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
              Live &amp; Editable
            </span>
          </div>
          <span className="text-xs text-slate-400">
            {/* Highlight any text to add missed entities or click tags to edit */}
          </span>
        </div>

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

      {/* NER Model Output & Entities Breakdown for this Line */}
      <div className="mb-6 rounded-xl border border-slate-200 overflow-hidden bg-slate-50/50">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-100/70 border-b border-slate-200 text-xs font-semibold text-slate-700">
          <div className="flex items-center gap-2">
            <span>Model Output & Annotated Entities for Line {globalLineNumber}</span>
            <span className="text-slate-400 font-normal">({currentEntities.length})</span>
          </div>

          <div className="flex items-center gap-2">
            {currentEntities.some((e) => e.status !== 'approved') && (
              <button
                type="button"
                onClick={handleApproveAllOnLine}
                className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition"
                title="Approve all entity predictions on this line"
              >
                ✓ Approve All on Line
              </button>
            )}
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
            No entities detected in this line by the model. Use cursor to highlight any missed entity and tag it!
          </div>
        )}
      </div>

      {/* Action Footer: Save, Reset, Prev, Next */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-white shadow-sm transition active:scale-95 disabled:opacity-50 ${
              isDirty
                ? 'bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-400/40'
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {saving ? (
              <>
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Saving to backend…</span>
              </>
            ) : (
              <span>Save Line Annotations</span>
            )}
          </button>

          <button
            type="button"
            onClick={handleReset}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition"
          >
            Reset Line to Model Output
          </button>
        </div>

        {/* Card Navigation */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevWithCheck}
            disabled={!hasPrev || saving}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            ← Previous Line
          </button>

          <button
            type="button"
            onClick={handleNextWithCheck}
            disabled={!hasNext || saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition"
          >
            Next Line →
          </button>
        </div>
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
            className={`inline-flex items-center gap-1.5 cursor-pointer rounded px-2.5 py-1 text-[11px] font-semibold border transition hover:ring-1 hover:ring-blue-400 ${
              getConfidenceThresholdClass(ent.confidence)
            }`}
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
                className={`h-full ${
                  Number(ent.confidence) > 0.75
                    ? 'bg-green-500'
                    : Number(ent.confidence) >= 0.5
                    ? 'bg-yellow-400'
                    : 'bg-red-500'
                }`}
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
 * Renders static sentence text with model baseline predictions highlighted.
 * Preserves original model outputs without allowing edits.
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

    const confPct = (Number(ent.confidence ?? 1) * 100).toFixed(0);

    pieces.push(
      <mark
        key={ent._id || `${ent.start}-${ent.end}-${idx}`}
        className={`mx-1 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold border shadow-2xs ${
          getConfidenceThresholdClass(ent.confidence)
        }`}
        title={`Model Prediction: ${ent.label} (${(Number(ent.confidence ?? 1) * 100).toFixed(1)}%)`}
      >
        <span>{textChunk}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider px-1 py-0.2 rounded bg-black/10">
          {ent.label}
        </span>
        <span className="text-[9px] font-mono opacity-85 font-semibold">
          {confPct}%
        </span>
      </mark>
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
