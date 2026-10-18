import React, { useState, useEffect, useMemo } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import LabelStudioAnnotator from './LabelStudioAnnotator.jsx';
import {
  ENTITY_TYPES,
  ENTITY_SHORTCUTS,
  getEntityColorStyle,
  formatEntityLabel,
} from '../utils/textUtils.jsx';
import { useAnnotation } from '../context/AnnotationContext.jsx';

const VIEWS = [
  { id: 'baseline', name: 'Model output' },
  { id: 'interactive', name: 'Annotate' },
  { id: 'both', name: 'Both' },
];

/** A page of the proof: line number in the gutter, text in the measure. */
function Sheet({ lineNumber, label, meta, children, footer, tone = 'rule' }) {
  return (
    <div
      className={`overflow-hidden rounded-md border bg-sheet ${
        tone === 'hand' ? 'border-hand/40' : 'border-rule'
      }`}
    >
      <div className="flex items-baseline justify-between gap-3 border-b border-rule px-4 py-2.5">
        <span className="text-[13.5px] font-semibold text-ink">{label}</span>
        <span className="font-mono text-[12px] tabular-nums text-ink-faint">{meta}</span>
      </div>
      <div className="grid grid-cols-[3rem_1fr]">
        <div className="border-r border-rule py-6 pr-3 text-right font-mono text-[12px] tabular-nums text-ink-faint">
          {lineNumber}
        </div>
        <div className="min-w-0 px-6 py-5">{children}</div>
      </div>
      {footer}
    </div>
  );
}

/**
 * Sits directly under the sentence: what is selected, and the nine keyed labels
 * as buttons, so a span can be placed without leaving the text.
 */
function SelectionBar() {
  const annotation = useAnnotation();
  const selectedSpan = annotation?.selectedSpan;

  return (
    <div
      className={`rounded-md border px-4 py-3 ${
        selectedSpan ? 'border-hand/40 bg-sheet' : 'border-rule bg-sheet'
      }`}
    >
      {selectedSpan ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="min-w-0 text-[13px] text-ink-soft">
              Labelling{' '}
              <span className="font-serif text-[16px] text-ink">“{selectedSpan.text}”</span>
            </p>
            <button
              type="button"
              onClick={annotation?.clearSelection}
              className="rounded border border-rule bg-sheet px-2 py-1 text-[12px] text-ink-soft transition hover:border-rule-strong hover:text-ink"
            >
              Clear selection
            </button>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {ENTITY_SHORTCUTS.map(({ key, label }) => {
              const { border } = getEntityColorStyle(label);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => annotation?.applyLabel(label)}
                  className="flex items-center gap-1.5 rounded border border-rule-strong bg-sheet px-2.5 py-1.5 text-[12.5px] text-ink transition hover:border-ink hover:bg-paper"
                  title={`${formatEntityLabel(label)} — press ${key}`}
                >
                  <span
                    className="h-[3px] w-3.5 rounded-full"
                    style={{ backgroundColor: border }}
                  />
                  {formatEntityLabel(label)}
                  <span className="font-mono text-[10.5px] text-ink-faint">{key}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11.5px] text-ink-faint">
            Need a different label? All 36 are listed on the right.
          </p>
        </>
      ) : (
        <p className="text-[13px] leading-relaxed text-ink-soft">
          <span className="font-medium text-ink">To add a span:</span> drag across the words above,
          then press a number or click a label on the right. Click any existing span to change or
          remove it.
        </p>
      )}
    </div>
  );
}

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
  const [activeTab, setActiveTab] = useState('interactive');

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
        const matches =
          (targetEnt._id && e._id === targetEnt._id) ||
          (e.start === targetEnt.start && e.end === targetEnt.end);
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
      setSaveSuccessMsg('Saved');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (err) {
      alert(`Could not save this line: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Reset line back to model predictions
  const handleReset = async () => {
    if (
      window.confirm(
        'Put this line back to what the model proposed? Anything you added here is dropped.'
      )
    ) {
      setSaving(true);
      try {
        await onResetLine(segIndex, sentenceStart, sentenceEnd);
        setIsDirty(false);
        setSaveSuccessMsg('Back to model output');
        setTimeout(() => setSaveSuccessMsg(''), 4000);
      } catch (err) {
        alert(`Could not reset this line: ${err.message}`);
      } finally {
        setSaving(false);
      }
    }
  };

  const handleNextWithCheck = () => {
    if (isDirty) {
      if (window.confirm('Save your changes to this line before moving on?')) {
        handleSave().then(() => onNextLine());
        return;
      }
    }
    onNextLine();
  };

  const handlePrevWithCheck = () => {
    if (isDirty) {
      if (window.confirm('Save your changes to this line before moving back?')) {
        handleSave().then(() => onPrevLine());
        return;
      }
    }
    onPrevLine();
  };

  // Approve every span on the line, save, and advance
  const handleApproveLine = async () => {
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
      setSaveSuccessMsg('Line approved');
      setTimeout(() => setSaveSuccessMsg(''), 3000);
      if (hasNext) {
        onNextLine();
      }
    } catch (err) {
      alert(`Could not approve this line: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // 'A' approves the line; 1-9 label the current selection using the same
  // mapping the sidebar prints next to each label.
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        return;
      }
      if (e.key === 'a' || e.key === 'A') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          handleApproveLine();
        }
      }
      if (annotation?.selectedSpan && /^[1-9]$/.test(e.key)) {
        const shortcut = ENTITY_SHORTCUTS.find((s) => s.key === e.key);
        if (shortcut && annotation.applyLabel) {
          e.preventDefault();
          annotation.applyLabel(shortcut.label);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lineEntities, sentenceStart, sentenceEnd, segIndex, hasNext, annotation?.selectedSpan]);

  const modelEntitiesOnLine = useMemo(() => {
    return (staticModelEntities || []).filter(
      (e) => e.start >= sentenceStart && e.start < sentenceEnd
    );
  }, [staticModelEntities, sentenceStart, sentenceEnd]);

  const manualCountOnLine = useMemo(() => {
    return lineEntities.filter(
      (e) =>
        (e.source === 'human' ||
          e.status === 'edited' ||
          e._id?.toString().startsWith('temp_')) &&
        e.status !== 'deleted' &&
        e.start >= sentenceStart &&
        e.start < sentenceEnd
    ).length;
  }, [lineEntities, sentenceStart, sentenceEnd]);

  const currentEntities = useMemo(() => {
    return lineEntities
      .filter((e) => e.status !== 'deleted' && e.start >= sentenceStart && e.start < sentenceEnd)
      .sort((a, b) => a.start - b.start);
  }, [lineEntities, sentenceStart, sentenceEnd]);

  const spanCountLabel = `${modelEntitiesOnLine.length} from the model${
    manualCountOnLine > 0 ? `, ${manualCountOnLine} yours` : ''
  }`;

  return (
    <div className="space-y-3.5">
      <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-3">
        <div className="min-w-0">
          <h1 className="font-serif text-[26px] leading-none tracking-tight text-ink">
            Line {globalLineNumber.toLocaleString()}
          </h1>
          <p className="mt-1.5 truncate text-[12px] text-ink-faint" title={section}>
            {section}
            {page ? ` — page ${page}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="inline-flex overflow-hidden rounded-md border border-rule bg-sheet">
            {VIEWS.map((view) => (
              <button
                key={view.id}
                type="button"
                onClick={() => setActiveTab(view.id)}
                className={`border-r border-rule px-2.5 py-1.5 text-[12.5px] transition last:border-0 ${
                  activeTab === view.id
                    ? 'bg-ink text-paper'
                    : 'text-ink-soft hover:bg-paper hover:text-ink'
                }`}
              >
                {view.name}
              </button>
            ))}
          </div>

          <div className="inline-flex items-center overflow-hidden rounded-md border border-rule bg-sheet">
            <button
              type="button"
              onClick={handlePrevWithCheck}
              disabled={!hasPrev || saving}
              className="px-2.5 py-1.5 text-ink-soft transition hover:bg-paper hover:text-ink disabled:opacity-30"
              title="Previous line (←)"
            >
              ‹
            </button>
            <span className="border-x border-rule px-2.5 py-1.5 font-mono text-[12px] tabular-nums text-ink">
              {globalLineNumber} / {totalLines}
            </span>
            <button
              type="button"
              onClick={handleNextWithCheck}
              disabled={!hasNext || saving}
              className="px-2.5 py-1.5 text-ink-soft transition hover:bg-paper hover:text-ink disabled:opacity-30"
              title="Next line (→)"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {(saving || isDirty || saveSuccessMsg) && (
        <p className="flex items-center gap-2 text-[12.5px]">
          {saving ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-ink-faint" />
              <span className="text-ink-soft">Saving</span>
            </>
          ) : isDirty ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-hand" />
              <span className="text-ink-soft">
                Unsaved changes on this line — approve it or save.
              </span>
            </>
          ) : (
            <>
              <Check className="h-3.5 w-3.5 text-ink-soft" />
              <span className="text-ink-soft">{saveSuccessMsg}</span>
            </>
          )}
        </p>
      )}

      {(activeTab === 'baseline' || activeTab === 'both') && (
        <Sheet
          lineNumber={globalLineNumber}
          label="What the model proposed"
          meta={`${modelEntitiesOnLine.length} spans`}
          footer={
            <p className="border-t border-rule px-4 py-2 text-[11.5px] text-ink-faint">
              Untouched by your edits — use it to compare.
            </p>
          }
        >
          <div className="font-serif text-[20px] leading-[2.5] text-ink">
            {renderStaticModelText(sentenceText, sentenceStart, sentenceEnd, staticModelEntities)}
          </div>
        </Sheet>
      )}

      {(activeTab === 'interactive' || activeTab === 'both') && (
        <Sheet
          lineNumber={globalLineNumber}
          label="Your reading"
          meta={spanCountLabel}
          tone={annotation?.selectedSpan ? 'hand' : 'rule'}
          footer={
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule px-4 py-2.5">
              <div className="flex items-center gap-4 text-[11.5px] text-ink-soft">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-0 w-4 border-b-2 border-solid border-machine" />
                  model
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-0 w-4 border-b-2 border-dashed border-hand" />
                  yours
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={saving}
                  className="rounded-md px-2.5 py-2 text-[13px] text-ink-faint transition hover:text-hand disabled:opacity-40"
                  title="Put this line back to the model's own reading"
                >
                  Reset line
                </button>
                <button
                  type="button"
                  onClick={handleNextWithCheck}
                  disabled={!hasNext || saving}
                  className="rounded-md border border-rule bg-sheet px-3 py-2 text-[13px] text-ink-soft transition hover:border-rule-strong hover:text-ink disabled:opacity-40"
                  title="Leave this line as it is and move on"
                >
                  Skip
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-md border border-rule bg-sheet px-3 py-2 text-[13px] text-ink transition hover:border-rule-strong disabled:opacity-40"
                  title="Save this line and stay here"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={handleApproveLine}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-[13px] font-medium text-paper transition hover:bg-ink/90 disabled:opacity-50"
                  title="Approve every span here and go to the next line (A)"
                >
                  Approve and continue
                  <span className="rounded bg-paper/25 px-1.5 py-px font-mono text-[10.5px]">
                    A
                  </span>
                </button>
              </div>
            </div>
          }
        >
          <LabelStudioAnnotator
            sentenceText={sentenceText}
            sentenceStart={sentenceStart}
            sentenceEnd={sentenceEnd}
            entities={lineEntities}
            onAddEntity={handleAddEntity}
            onUpdateEntity={handleUpdateEntity}
            onDeleteEntity={handleDeleteEntity}
          />
        </Sheet>
      )}

      {(activeTab === 'interactive' || activeTab === 'both') && <SelectionBar />}

      <div className="overflow-hidden rounded-md border border-rule bg-sheet">
        <div className="flex items-baseline justify-between gap-3 border-b border-rule px-4 py-2.5">
          <span className="text-[13.5px] font-semibold text-ink">Spans on this line</span>
          <span className="font-mono text-[12px] tabular-nums text-ink-faint">
            {currentEntities.length}
          </span>
        </div>

        {currentEntities.length > 0 ? (
          <div className="scroll-slim overflow-x-auto">
            <table className="w-full text-left text-[13.5px]">
              <thead>
                <tr className="border-b border-rule bg-paper/50 text-[12px] font-normal text-ink-soft">
                  <th className="px-4 py-2.5 font-medium">Text</th>
                  <th className="px-4 py-2.5 font-medium">Label</th>
                  <th className="px-4 py-2.5 font-medium">Offsets</th>
                  <th className="px-4 py-2.5 font-medium">Confidence</th>
                  <th className="px-4 py-2.5 font-medium">From</th>
                  <th className="px-4 py-2.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
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
          <p className="px-4 py-4 text-[12.5px] text-ink-faint">
            Nothing marked here yet. Select words above and pick a label on the right.
          </p>
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
    <tr className="border-b border-rule/60 transition-colors last:border-0 hover:bg-paper/60">
      <td className="px-4 py-2 font-serif text-[15px] text-ink">{ent.text}</td>

      <td className="px-4 py-2">
        {editingType ? (
          <select
            autoFocus
            value={ent.label}
            onChange={(e) => {
              handleUpdateEntity(ent, {
                label: e.target.value,
                status: 'edited',
                source: 'human',
              });
              setEditingType(false);
            }}
            onBlur={() => setEditingType(false)}
            className="rounded border border-ink bg-sheet px-1.5 py-1 text-[12.5px] text-ink focus:outline-none"
          >
            {!ENTITY_TYPES.includes(ent.label) && (
              <option value={ent.label}>{formatEntityLabel(ent.label)}</option>
            )}
            {ENTITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {formatEntityLabel(t)}
              </option>
            ))}
          </select>
        ) : (
          <button
            type="button"
            onClick={() => setEditingType(true)}
            className="flex items-center gap-1.5 text-[12.5px] text-ink transition hover:text-ink-soft"
            title="Change this label"
          >
            <span
              className="h-[3px] w-3 shrink-0 rounded-full"
              style={{ backgroundColor: colorStyle.border }}
            />
            {formatEntityLabel(ent.label)}
            <ChevronDown className="h-3 w-3 text-ink-faint" />
          </button>
        )}
      </td>

      <td className="px-4 py-2 font-mono text-[11px] tabular-nums text-ink-faint">
        {ent.start - sentenceStart}:{ent.end - sentenceStart}
      </td>

      <td className="px-4 py-2">
        {isManual ? (
          <span className="text-ink-faint">—</span>
        ) : (
          <span className="flex items-center gap-2">
            <span className="h-[3px] w-10 overflow-hidden rounded-full bg-rule">
              <span
                className="block h-full rounded-full bg-machine"
                style={{ width: `${confPct}%` }}
              />
            </span>
            <span className="font-mono text-[11px] tabular-nums text-ink-soft">{confPct}%</span>
          </span>
        )}
      </td>

      <td className="px-4 py-2">
        <span className={`text-[12px] ${isManual ? 'text-hand' : 'text-machine'}`}>
          {isManual ? 'you' : 'model'}
        </span>
        {isApproved && <span className="ml-1.5 text-[11px] text-ink-faint">approved</span>}
      </td>

      <td className="whitespace-nowrap px-4 py-2 text-right">
        {!isApproved && (
          <button
            type="button"
            onClick={() => handleUpdateEntity(ent, { status: 'approved', source: 'human' })}
            className="rounded-md border border-rule bg-sheet px-2 py-1 text-[12px] text-ink transition hover:border-rule-strong"
            title="Mark this span correct"
          >
            Approve
          </button>
        )}
        <button
          type="button"
          onClick={() => handleDeleteEntity(ent)}
          className="ml-1.5 rounded-md px-2 py-1 text-[12px] text-ink-faint transition hover:text-hand"
        >
          Remove
        </button>
      </td>
    </tr>
  );
}

/**
 * The model's own reading, rendered read-only. Solid underline, caption beneath,
 * no fill — it is a reference, not a surface you act on.
 */
function renderStaticModelText(sentenceText, sentenceStart, sentenceEnd, staticEntities = []) {
  if (!sentenceText) return null;

  const ents = (staticEntities || [])
    .filter((e) => e.start >= sentenceStart && e.start < sentenceEnd)
    .sort((a, b) => a.start - b.start);

  if (ents.length === 0) {
    return <span>{sentenceText}</span>;
  }

  const pieces = [];
  let currentPos = sentenceStart;

  ents.forEach((ent, idx) => {
    const entStartInSent = Math.max(ent.start, sentenceStart);
    const entEndInSent = Math.min(ent.end, sentenceEnd);

    if (entStartInSent > currentPos) {
      pieces.push(
        <span key={`text-before-${idx}`}>
          {sentenceText.slice(currentPos - sentenceStart, entStartInSent - sentenceStart)}
        </span>
      );
    }

    const textChunk =
      sentenceText.slice(entStartInSent - sentenceStart, entEndInSent - sentenceStart) || ent.text;
    const colorStyle = getEntityColorStyle(ent.label);

    pieces.push(
      <span
        key={ent._id || `${ent.start}-${ent.end}-${idx}`}
        className="mr-1 inline-flex select-text flex-col items-start align-baseline"
        title={`${formatEntityLabel(ent.label)} · ${(Number(ent.confidence ?? 1) * 100).toFixed(
          0
        )}% confident`}
      >
        <span
          className="inline px-[1px] pb-[2px]"
          style={{ borderBottom: `2px solid ${colorStyle.border}` }}
        >
          {textChunk}
        </span>
        <span
          className="pt-[3px] text-[10px] leading-none"
          style={{ color: colorStyle.border }}
        >
          {formatEntityLabel(ent.label)}
        </span>
      </span>
    );

    currentPos = Math.max(currentPos, entEndInSent);
  });

  if (currentPos < sentenceEnd) {
    pieces.push(<span key="text-end">{sentenceText.slice(currentPos - sentenceStart)}</span>);
  }

  return pieces;
}
