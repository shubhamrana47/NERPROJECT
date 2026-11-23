import React, { useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Loader2, RotateCw } from 'lucide-react';
import LabelStudioAnnotator from './LabelStudioAnnotator.jsx';
import { useAnnotation } from '../context/AnnotationContext.jsx';

const VIEWS = [
  { id: 'baseline', name: 'Model output' },
  { id: 'interactive', name: 'Annotate' },
  { id: 'both', name: 'Both' },
];

/** Crop and stage, as the source file records them for this passage. */
function SubjectChips({ crops = [], stages = [] }) {
  if (crops.length === 0 && stages.length === 0) return null;
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {crops.map((crop) => (
        <span
          key={`crop-${crop}`}
          className="rounded border border-rule bg-sheet px-1.5 py-px text-[11.5px] text-ink"
          title="Crop"
        >
          {crop}
        </span>
      ))}
      {stages.map((stage) => (
        <span
          key={`stage-${stage}`}
          className="rounded border border-rule bg-paper px-1.5 py-px text-[11.5px] text-ink-soft"
          title="Growth stage"
        >
          {stage}
        </span>
      ))}
    </span>
  );
}

/** One passage of the proof: a numbered gutter down the side, sentence by sentence. */
function PassageSheet({ label, meta, sentences, renderSentence, footer, tone = 'rule' }) {
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

      <div>
        {sentences.map((sentence, i) => (
          <div
            key={`${sentence.start}-${sentence.end}`}
            className="grid grid-cols-[3rem_1fr] border-b border-rule/60 last:border-0"
          >
            <div className="border-r border-rule py-4 pr-3 text-right font-mono text-[11.5px] tabular-nums text-ink-faint">
              {i + 1}
            </div>
            <div className="min-w-0 px-5 py-3">{renderSentence(sentence, i)}</div>
          </div>
        ))}
      </div>

      {footer}
    </div>
  );
}

export default function PassageAnnotationCard({
  doc = null,
  passage,
  nerStatus,
  isValidation = false,
  onNothingToValidate,
  sentences,
  entities,
  passageNumber,
  totalPassages,
  isDirty,
  isSaving = false,
  message,
  onApproveAndSaveAll,
  onApprove,
  onSave,
  onDiscard,
  onReset,
  onNext,
  onPrev,
  hasPrev,
  hasNext,
  onRetryPredict,
  onDeleteEntity,
  onFocusEntity,
  focusedSpan = null,
}) {
  const annotation = useAnnotation();
  const handleApproveSave = onApproveAndSaveAll || onSave || onApprove;
  const [activeTab, setActiveTab] = useState('interactive');

  const modelSpans = (passage.originalEntities || []).length;
  const yourSpans = entities.filter(
    (e) => Boolean(e.isManual) || e.source === 'human' || e.status === 'edited' || String(e._id || '').startsWith('temp_')
  ).length;

  const decided = entities.filter(
    (e) => e.validationStatus && e.validationStatus !== 'unreviewed'
  ).length;
  const addedSpans = entities.filter((e) => e.validationStatus === 'added').length;

  const selectedSpan = annotation?.selectedSpan;

  const renderInteractive = (sentence) => (
    <LabelStudioAnnotator
      sentenceText={sentence.text}
      sentenceStart={sentence.start}
      sentenceEnd={sentence.end}
      entities={entities}
      onAddEntity={() => {}}
      onUpdateEntity={() => {}}
      onDeleteEntity={onDeleteEntity}
      onFocusEntity={onFocusEntity}
    />
  );

  const renderBaseline = (sentence) => (
    <LabelStudioAnnotator
      key="baseline"
      sentenceText={sentence.text}
      sentenceStart={sentence.start}
      sentenceEnd={sentence.end}
      entities={passage.originalEntities || []}
      onAddEntity={() => {}}
      onUpdateEntity={() => {}}
      onDeleteEntity={() => {}}
      readOnly
    />
  );

  return (
    <div className="space-y-3.5">
      <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {passage.passageTag && (
              <span className="font-mono text-[12.5px] text-ink-soft">{passage.passageTag}</span>
            )}
            <SubjectChips crops={passage.crops} stages={passage.stages} />
          </div>
          <h1 className="mt-1.5 font-serif text-[24px] leading-none tracking-tight text-ink">
            {passage.section || `Passage ${passageNumber}`}
          </h1>
          <p className="mt-1.5 text-[12px] text-ink-faint">
            {sentences.length} {sentences.length === 1 ? 'sentence' : 'sentences'}
            {passage.page ? ` · page ${passage.page}` : ''}
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
              onClick={onPrev}
              disabled={!hasPrev || isSaving}
              className="px-2.5 py-1.5 text-ink-soft transition hover:bg-paper hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed"
              title={isDirty ? "Previous page (unsaved changes will prompt save)" : "Previous page (‹)"}
            >
              ‹
            </button>
            <span className="border-x border-rule px-2.5 py-1.5 font-mono text-[12px] tabular-nums text-ink">
              {passageNumber} / {totalPassages}
            </span>
            <button
              type="button"
              onClick={onNext}
              disabled={!hasNext || isSaving}
              className="px-2.5 py-1.5 text-ink-soft transition hover:bg-paper hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed"
              title={isDirty ? "Next page (unsaved changes will prompt save)" : "Next page (›)"}
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {(isDirty || isSaving || message || nerStatus === 'pending' || nerStatus === 'error') && (
        <p className="flex flex-wrap items-center gap-2 text-[12.5px]">
          {isSaving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin text-ink-soft" />
              <span className="text-ink-soft">Saving to database...</span>
            </>
          ) : nerStatus === 'pending' ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-ink-faint" />
              <span className="text-ink-soft">
                The model is reading this passage. You can start marking it up now.
              </span>
            </>
          ) : nerStatus === 'error' ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-hand" />
              <span className="text-ink-soft">The model service could not be reached.</span>
              <button
                type="button"
                onClick={onRetryPredict}
                className="inline-flex items-center gap-1 rounded border border-rule bg-sheet px-2 py-0.5 text-[12px] text-ink transition hover:border-rule-strong"
              >
                <RotateCw className="h-3 w-3" />
                Try again
              </button>
            </>
          ) : isDirty ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-hand" />
              <span className="text-ink-soft">
                Unsaved changes. Please save or discard them before continuing.
              </span>
            </>
          ) : (
            <>
              <Check className="h-3.5 w-3.5 text-ink-soft" />
              <span className="text-ink-soft">{message}</span>
            </>
          )}
        </p>
      )}

      {(activeTab === 'baseline' || activeTab === 'both') && (
        <PassageSheet
          label={isValidation ? 'What the pipeline tagged' : 'What the model proposed'}
          meta={`${modelSpans} ${modelSpans === 1 ? 'span' : 'spans'}`}
          sentences={sentences}
          renderSentence={renderBaseline}
          footer={
            <p className="border-t border-rule px-4 py-2 text-[11.5px] text-ink-faint">
              Untouched by your edits — use it to compare.
            </p>
          }
        />
      )}

      {(activeTab === 'interactive' || activeTab === 'both') && (
        <PassageSheet
          label={isValidation ? 'Checking these' : 'Your reading'}
          meta={
            isValidation
              ? `${entities.length} ${entities.length === 1 ? 'entity' : 'entities'}${
                  decided > 0 ? `, ${decided} decided` : ''
                }${addedSpans > 0 ? `, ${addedSpans} added` : ''}`
              : `${entities.length} ${entities.length === 1 ? 'span' : 'spans'}${
                  yourSpans > 0 ? `, ${yourSpans} yours` : ''
                }`
          }
          sentences={sentences}
          renderSentence={renderInteractive}
          tone={selectedSpan ? 'hand' : 'rule'}
          footer={
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule px-4 py-2.5">
              <div className="flex flex-wrap items-center gap-4 text-[11.5px] text-ink-soft">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-0 w-4 border-b-2 border-solid border-machine" />
                  {isValidation ? 'from the pipeline' : 'model'}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-0 w-4 border-b-2 border-dashed border-hand" />
                  {isValidation ? 'you changed or added it' : 'yours'}
                </span>
                {isValidation && (
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-0 w-4 border-b-2 border-dotted border-rule-strong" />
                    <span className="line-through">rejected</span>
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onReset}
                  disabled={isSaving}
                  className="rounded-md px-2.5 py-2 text-[13px] text-ink-faint transition hover:text-hand disabled:opacity-40"
                  title={
                    isValidation
                      ? 'Undo every decision in this passage'
                      : "Put this passage back to the model's own reading"
                  }
                >
                  {isValidation ? 'Undo decisions' : 'Reset passage'}
                </button>
                {isDirty && onDiscard && (
                  <button
                    type="button"
                    onClick={onDiscard}
                    disabled={isSaving}
                    className="rounded-md border border-rule bg-sheet px-3 py-2 text-[13px] text-ink-soft transition hover:border-rule-strong hover:text-hand disabled:opacity-40"
                    title="Discard unsaved changes made to this passage"
                  >
                    Discard changes
                  </button>
                )}
                {hasPrev && (
                  <button
                    type="button"
                    onClick={onPrev}
                    disabled={isSaving}
                    className="flex items-center gap-1 rounded-md border border-rule bg-sheet px-3 py-2 text-[13px] font-medium text-ink-soft transition hover:border-rule-strong hover:bg-paper hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed"
                    title={isDirty ? "Previous page (unsaved changes will prompt save)" : "Previous page (‹)"}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Prev</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleApproveSave}
                  disabled={isSaving}
                  className={`flex items-center gap-1.5 rounded-md px-3.5 py-2 text-[13px] font-medium transition disabled:opacity-50 ${
                    isDirty
                      ? 'border border-ink bg-ink text-paper hover:bg-ink/90 shadow-sm'
                      : 'border border-rule bg-sheet text-ink hover:border-rule-strong hover:bg-paper'
                  }`}
                  title={
                    isDirty
                      ? "Approve all annotations and save to database (Ctrl+S / A)"
                      : "All annotations approved & saved to database (Ctrl+S / A)"
                  }
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-current" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5 text-current" />
                      <span>Approve & Save All</span>
                      <span
                        className={`ml-1 rounded px-1.5 py-px font-mono text-[10.5px] ${
                          isDirty
                            ? 'bg-paper/20 text-paper'
                            : 'bg-paper text-ink-soft border border-rule'
                        }`}
                      >
                        A
                      </span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={onNext}
                  disabled={!hasNext || isSaving}
                  className="flex items-center gap-1.5 rounded-md border border-rule bg-sheet px-3.5 py-2 text-[13px] font-medium text-ink transition hover:border-rule-strong hover:bg-paper disabled:opacity-40 disabled:cursor-not-allowed"
                  title={hasNext ? (isDirty ? "Next page (unsaved changes will prompt save)" : "Next page (›)") : "You are on the last page"}
                >
                  <span>Next</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          }
        />
      )}
    </div>
  );
}
