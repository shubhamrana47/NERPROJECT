import React, { useEffect, useRef, useState } from 'react';
import { Check, RotateCw } from 'lucide-react';
import LabelStudioAnnotator from './LabelStudioAnnotator.jsx';
import { ENTITY_SHORTCUTS, getEntityColorStyle, formatEntityLabel } from '../utils/textUtils.jsx';
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
  passage,
  nerStatus,
  isValidation = false,
  onNothingToValidate,
  sentences,
  entities,
  passageNumber,
  totalPassages,
  isDirty,
  message,
  onApprove,
  onSave,
  onReset,
  onNext,
  onPrev,
  hasPrev,
  hasNext,
  onRetryPredict,
  onDeleteEntity,
  onFocusEntity,
}) {
  const annotation = useAnnotation();
  const [activeTab, setActiveTab] = useState('interactive');

  // Why a selection did not turn into a span, when it did not.
  const [selectionNote, setSelectionNote] = useState(null);
  const noteTimer = useRef(null);
  useEffect(() => () => window.clearTimeout(noteTimer.current), []);
  const flashNote = (kind) => {
    setSelectionNote(kind);
    window.clearTimeout(noteTimer.current);
    noteTimer.current = window.setTimeout(() => setSelectionNote(null), 6000);
  };
  const noteSelectionUnresolved = (reason) => flashNote(reason || 'unresolved');

  const modelSpans = (passage.originalEntities || []).length;
  const yourSpans = entities.filter(
    (e) => e.source === 'human' || e.status === 'edited' || String(e._id || '').startsWith('temp_')
  ).length;

  const decided = entities.filter(
    (e) => e.validationStatus && e.validationStatus !== 'unreviewed'
  ).length;
  const undecided = entities.length - decided;
  const addedSpans = entities.filter((e) => e.validationStatus === 'added').length;

  const quickLabels = annotation?.quickLabels || ENTITY_SHORTCUTS.map((s) => s.label);
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
      onSelectionUnresolved={noteSelectionUnresolved}
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
              disabled={!hasPrev}
              className="px-2.5 py-1.5 text-ink-soft transition hover:bg-paper hover:text-ink disabled:opacity-30"
              title="Previous passage (←)"
            >
              ‹
            </button>
            <span className="border-x border-rule px-2.5 py-1.5 font-mono text-[12px] tabular-nums text-ink">
              {passageNumber} / {totalPassages}
            </span>
            <button
              type="button"
              onClick={onNext}
              disabled={!hasNext}
              className="px-2.5 py-1.5 text-ink-soft transition hover:bg-paper hover:text-ink disabled:opacity-30"
              title="Next passage (→)"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {(isDirty || message || nerStatus === 'pending' || nerStatus === 'error') && (
        <p className="flex flex-wrap items-center gap-2 text-[12.5px]">
          {nerStatus === 'pending' ? (
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
              <span className="text-ink-soft">Unsaved changes in this passage.</span>
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
                  className="rounded-md px-2.5 py-2 text-[13px] text-ink-faint transition hover:text-hand"
                  title={
                    isValidation
                      ? 'Undo every decision in this passage'
                      : "Put this passage back to the model's own reading"
                  }
                >
                  {isValidation ? 'Undo decisions' : 'Reset passage'}
                </button>
                <button
                  type="button"
                  onClick={onNext}
                  disabled={!hasNext}
                  className="rounded-md border border-rule bg-sheet px-3 py-2 text-[13px] text-ink-soft transition hover:border-rule-strong hover:text-ink disabled:opacity-40"
                >
                  Skip
                </button>
                <button
                  type="button"
                  onClick={onSave}
                  className="rounded-md border border-rule bg-sheet px-3 py-2 text-[13px] text-ink transition hover:border-rule-strong"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={onApprove}
                  className="flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-[13px] font-medium text-paper transition hover:bg-ink/90"
                  title="Approve every span here and go to the next passage (A)"
                >
                  {isValidation
                    ? entities.length === 0
                      ? 'Nothing to validate'
                      : undecided > 0
                        ? `Mark ${undecided} correct and continue`
                        : 'Done, continue'
                    : 'Approve and continue'}
                  <span className="rounded bg-paper/25 px-1.5 py-px font-mono text-[10.5px]">A</span>
                </button>
              </div>
            </div>
          }
        />
      )}

      {/*
        The selection step, shared by both workflows. A validation passage is
        judged rather than written, but the pipeline can still have missed an
        entity, and adding one is the same act as anywhere else: select the
        words, pick a label.
      */}
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
              {quickLabels.map((label) => {
                const { border } = getEntityColorStyle(label);
                const key = ENTITY_SHORTCUTS.find((sc) => sc.label === label)?.key;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => annotation?.applyLabel(label)}
                    className="flex items-center gap-1.5 rounded border border-rule-strong bg-sheet px-2.5 py-1.5 text-[12.5px] text-ink transition hover:border-ink hover:bg-paper"
                    title={key ? `${formatEntityLabel(label)} — press ${key}` : formatEntityLabel(label)}
                  >
                    <span
                      className="h-[3px] w-3.5 rounded-full"
                      style={{ backgroundColor: border }}
                    />
                    {formatEntityLabel(label)}
                    {key && <span className="font-mono text-[10.5px] text-ink-faint">{key}</span>}
                  </button>
                );
              })}
            </div>
          </>
        ) : isValidation && entities.length === 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="min-w-0 text-[13px] leading-relaxed text-ink-soft">
              The pipeline tagged nothing here. If that is right, say so — an unopened passage
              should never look like a checked one. If it missed something, select those words and
              give them a label.
            </p>
            <button
              type="button"
              onClick={onNothingToValidate}
              className="shrink-0 rounded-md bg-ink px-3.5 py-2 text-[13px] font-medium text-paper transition hover:bg-ink/90"
            >
              Nothing to validate
            </button>
          </div>
        ) : isValidation ? (
          <p className="text-[13px] leading-relaxed text-ink-soft">
            <span className="font-medium text-ink">Checking, and adding what is missing:</span>{' '}
            click a tagged entity to put it in focus, then mark it correct or wrong in the list on
            the left; press a number or pick a label on the right to fix its type. If the pipeline
            missed an entity, drag across the words and give it a label.
          </p>
        ) : (
          <p className="text-[13px] leading-relaxed text-ink-soft">
            <span className="font-medium text-ink">To add a span:</span> drag across the words in
            any sentence above, then press a number or click a label on the right. Click an
            existing span to change or remove it.
          </p>
        )}

        {/* Why a selection did not become a span, rather than silence. */}
        {!selectedSpan && selectionNote === 'crosses-sentences' && (
          <div className="mt-2 rounded border-l-2 border-hand bg-paper px-3 py-2">
            <p className="text-[13px] leading-relaxed text-ink">
              That selection ran across two sentences, so nothing was tagged.
            </p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">
              A span belongs to one sentence. Select the words inside a single numbered line and
              try again.
            </p>
          </div>
        )}
        {!selectedSpan && selectionNote === 'unresolved' && (
          <div className="mt-2 rounded border-l-2 border-hand bg-paper px-3 py-2">
            <p className="text-[13px] leading-relaxed text-ink">
              That selection could not be placed exactly, so nothing was tagged.
            </p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">
              Select the words again, starting and finishing inside the sentence text.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
