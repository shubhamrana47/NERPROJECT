import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  reviewEntity,
  saveSegmentEntities,
  resetSegment,
  predictSegments,
  acknowledgeEmptyPassage,
} from '../api.js';
import SegmentCard, { splitSentencesWithOffsets } from '../components/SegmentCard.jsx';
import PassageAnnotationCard from '../components/PassageAnnotationCard.jsx';
import SpanListPanel from '../components/SpanListPanel.jsx';
import LeftAnnotationSidebar from '../components/LeftAnnotationSidebar.jsx';
import EntityPaletteSidebar from '../components/EntityPaletteSidebar.jsx';
import AnnotationBottomBar from '../components/AnnotationBottomBar.jsx';
import { useAnnotation } from '../context/AnnotationContext.jsx';
import { computeStatsLocal, sameSpans, stripTempId } from '../utils/annotationState.js';

/** How far ahead of the annotator the model is kept. */
const PREDICT_AHEAD = 10;

export default function DocumentView({ doc, onChange, onOpenUpload, previewMode = false }) {
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState(previewMode ? 'overview' : 'focus');
  const [passageIndex, setPassageIndex] = useState(0);
  const [pendingSaves, setPendingSaves] = useState(0);
  const [predicting, setPredicting] = useState(false);

  // The spans of the passage on screen, shared by the text and the span list.
  const [working, setWorking] = useState([]);
  const [isDirty, setIsDirty] = useState(false);
  const [message, setMessage] = useState('');
  const [focusedSpan, setFocusedSpan] = useState(null);

  const annotation = useAnnotation();

  const docRef = useRef(doc);
  const onChangeRef = useRef(onChange);
  const pendingRef = useRef(0);
  const queueRef = useRef(Promise.resolve());
  const splitCacheRef = useRef({ docId: null, byText: new Map() });
  const requestedRef = useRef(new Set());
  const messageTimerRef = useRef(null);
  const isDirtyRef = useRef(false);
  const currentPassageIndexRef = useRef(passageIndex);

  useEffect(() => {
    currentPassageIndexRef.current = passageIndex;
  }, [passageIndex]);

  useEffect(() => {
    docRef.current = doc;
  }, [doc]);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);
  useEffect(() => {
    setViewMode(previewMode ? 'overview' : 'focus');
  }, [previewMode]);
  useEffect(() => () => window.clearTimeout(messageTimerRef.current), []);

  /*
   * A validation document holds entities the hybrid pipeline produced. The job
   * is to judge them: confirm, reject or relabel. Nothing is added, nothing is
   * predicted, and the two workflows share only the layout.
   */
  const isValidation = doc.kind === 'validate';

  const passages = doc.segments || [];
  const totalPassages = passages.length;
  const passage = passages[passageIndex] || null;

  useEffect(() => {
    if (passageIndex >= totalPassages && totalPassages > 0) setPassageIndex(totalPassages - 1);
  }, [passageIndex, totalPassages]);

  const applyDoc = useCallback((nextDoc) => {
    docRef.current = nextDoc;
    onChangeRef.current(nextDoc);
  }, []);

  const flash = useCallback((text) => {
    setMessage(text);
    window.clearTimeout(messageTimerRef.current);
    messageTimerRef.current = window.setTimeout(() => setMessage(''), 2500);
  }, []);

  // Sentence offsets depend only on the text, so each passage is split once.
  const sentencesFor = useCallback((text) => {
    const cache = splitCacheRef.current;
    if (cache.docId !== doc._id) {
      cache.docId = doc._id;
      cache.byText = new Map();
    }
    const key = text || '';
    let sentences = cache.byText.get(key);
    if (!sentences) {
      sentences = splitSentencesWithOffsets(key);
      cache.byText.set(key, sentences);
    }
    return sentences;
  }, [doc._id]);

  const sentences = useMemo(
    () => (passage ? sentencesFor(passage.text) : []),
    [passage, sentencesFor]
  );

  /*
   * Documents stored before nerStatus existed take the schema default of
   * 'pending' when loaded, even though their spans are right there. Treat a
   * passage that holds spans as read, so it is never described as waiting.
   */
  const effectiveNerStatus = useMemo(() => {
    if (!passage) return 'pending';
    if (passage.nerStatus === 'pending' && (passage.entities || []).length > 0) return 'done';
    return passage.nerStatus || 'done';
  }, [passage]);

  /* ----------------------------- on-demand model ---------------------------- */

  /**
   * Keeps the model a window ahead of the annotator. Nothing is predicted at
   * upload, so this is what puts spans on the screen; a passage already
   * predicted, skipped or in flight is never asked for twice.
   */
  const requestWindow = useCallback(
    async (from, { force = false } = {}) => {
      const current = docRef.current;
      const segs = current.segments || [];
      const wanted = [];

      for (let i = from; i < Math.min(from + PREDICT_AHEAD, segs.length); i++) {
        const seg = segs[i];
        if (!seg) continue;
        const key = `${current._id}:${seg.index}`;
        // Already has spans? Then it has been read, whatever the status says.
        if ((seg.entities || []).length > 0) continue;
        const retryable = seg.nerStatus === 'pending' || (force && seg.nerStatus === 'error');
        if (!retryable) continue;
        if (!force && requestedRef.current.has(key)) continue;
        requestedRef.current.add(key);
        wanted.push(seg.index);
      }

      if (wanted.length === 0) return;

      setPredicting(true);
      try {
        const res = await predictSegments(current._id, { indexes: wanted });
        const byIndex = new Map((res.predicted || []).map((p) => [p.index, p]));
        if (byIndex.size === 0) return;

        const base = docRef.current;
        const segments = (base.segments || []).map((seg) => {
          const got = byIndex.get(seg.index);
          if (!got) return seg;
          // A passage being annotated right now keeps what is on screen.
          if (seg.index === passage?.index && isDirtyRef.current) {
            return { ...seg, nerStatus: got.nerStatus };
          }
          return {
            ...seg,
            nerStatus: got.nerStatus,
            entities: got.entities || [],
            originalEntities: got.originalEntities || [],
          };
        });
        applyDoc({ ...base, segments, stats: res.stats || base.stats });
      } catch (e) {
        // Let the window be asked for again after a failure.
        wanted.forEach((i) => requestedRef.current.delete(`${current._id}:${i}`));
        setError(`The model could not read this passage: ${e.message}`);
      } finally {
        setPredicting(false);
      }
    },
    [applyDoc, passage]
  );

  useEffect(() => {
    if (isValidation || viewMode !== 'focus' || totalPassages === 0) return;
    requestWindow(passageIndex);
  }, [isValidation, passageIndex, viewMode, totalPassages, requestWindow]);

  /* ------------------------------ passage state ----------------------------- */

  // Re-sync when the passage changes, or when the document refreshes while
  // nothing is being edited here.
  useEffect(() => {
    const incoming = passage?.entities || [];
    setWorking(incoming);
    setIsDirty(false);
    isDirtyRef.current = false;
    setFocusedSpan(null);
    annotation?.clearSelection?.();
    annotation?.setActiveEditingEntity?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passageIndex, doc._id]);

  useEffect(() => {
    if (!isDirtyRef.current) setWorking(passage?.entities || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passage?.entities]);

  const addEntity = useCallback((newEnt) => {
    setWorking((prev) => [
      ...prev,
      {
        ...newEnt,
        _id: `temp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        confidence: 1.0,
        source: 'human',
        status: 'approved',
      },
    ]);
    setIsDirty(true);
    isDirtyRef.current = true;
    setMessage('');
  }, []);

  const updateEntity = useCallback((target, changes) => {
    setWorking((prev) =>
      prev.map((e) => {
        const match =
          (target._id && e._id === target._id) ||
          (e.start === target.start && e.end === target.end);
        return match ? { ...e, status: 'edited', source: 'human', ...changes } : e;
      })
    );
    setIsDirty(true);
    isDirtyRef.current = true;
    setMessage('');
  }, []);

  /**
   * Records a decision against a pipeline entity. Nothing is removed: a
   * rejection is a state the span carries, so it stays visible, can be undone,
   * and travels into the exported file as feedback.
   */
  const decideEntity = useCallback((target, decision, nextLabel) => {
    setWorking((prev) =>
      prev.map((e) => {
        const match =
          (target._id && e._id === target._id) ||
          (e.start === target.start && e.end === target.end);
        if (!match) return e;

        if (decision === 'unreviewed') {
          return { ...e, validationStatus: 'unreviewed', status: 'accepted', source: 'llm' };
        }
        if (decision === 'confirmed') {
          return { ...e, validationStatus: 'confirmed', status: 'approved', source: 'human' };
        }
        if (decision === 'rejected') {
          return { ...e, validationStatus: 'rejected', status: 'accepted', source: 'llm' };
        }
        return {
          ...e,
          label: nextLabel || e.label,
          originalLabel: e.originalLabel || e.label,
          validationStatus: 'relabelled',
          status: 'edited',
          source: 'human',
        };
      })
    );
    setIsDirty(true);
    isDirtyRef.current = true;
    setMessage('');
  }, []);

  const deleteEntity = useCallback((target) => {
    setWorking((prev) =>
      prev.filter((e) => {
        if (target._id && e._id === target._id) return false;
        if (e.start === target.start && e.end === target.end) return false;
        return true;
      })
    );
    setIsDirty(true);
    isDirtyRef.current = true;
    setMessage('');
  }, []);

  /*
   * The label sidebar applies to whichever passage is open. In validation mode
   * adding is not allowed, so a label click relabels the focused entity rather
   * than labelling a text selection.
   */
  useEffect(() => {
    annotation?.registerLineAnnotator?.({
      onAddEntity: isValidation ? null : addEntity,
      onUpdateEntity: updateEntity,
      onDeleteEntity: isValidation ? null : deleteEntity,
      onRelabel: isValidation
        ? (label) => {
            const target = focusedSpan || annotation?.activeEditingEntity;
            if (target) decideEntity(target, 'relabelled', label);
          }
        : null,
    });
  }, [
    annotation?.registerLineAnnotator,
    annotation?.activeEditingEntity,
    addEntity,
    updateEntity,
    deleteEntity,
    decideEntity,
    focusedSpan,
    isValidation,
  ]);

  /* -------------------------------- persistence ------------------------------ */

  const enqueue = useCallback((task) => {
    pendingRef.current += 1;
    setPendingSaves(pendingRef.current);
    const run = queueRef.current.then(
      () => task(),
      () => task()
    );
    const settle = () => {
      pendingRef.current -= 1;
      setPendingSaves(pendingRef.current);
    };
    queueRef.current = run.then(settle, settle);
    return run;
  }, []);

  /** Applies the edit at once and writes behind the interface. */
  const persist = useCallback(
    (segIndex, entities, note) => {
      setError('');
      setIsDirty(false);
      if (note) flash(note);

      const sorted = [...entities].sort((a, b) => a.start - b.start || a.end - b.end);
      const base = docRef.current;
      const segments = (base.segments || []).map((seg) =>
        seg.index === segIndex ? { ...seg, entities: sorted } : seg
      );
      applyDoc({ ...base, segments, stats: computeStatsLocal(segments) });

      const docId = base._id;
      const payload = sorted.map(stripTempId);

      return enqueue(async () => {
        const res = await saveSegmentEntities(docId, segIndex, payload).catch((e) => {
          setError(`That passage could not be saved: ${e.message}. Press Save to try again.`);
          setIsDirty(true);
          throw e;
        });
        // Pick up stored ids, but only while this passage is untouched since.
        if (Array.isArray(res?.savedEntities) && pendingRef.current <= 1) {
          const now = docRef.current;
          const seg = (now.segments || []).find((s) => s.index === segIndex);
          const stored = [...res.savedEntities].sort(
            (a, b) => a.start - b.start || a.end - b.end
          );
          if (sameSpans(seg?.entities || [], stored)) {
            const segments2 = (now.segments || []).map((s) =>
              s.index === segIndex ? { ...s, entities: stored } : s
            );
            applyDoc({ ...now, segments: segments2, stats: res.stats || now.stats });
            const activePassage = now.segments?.[currentPassageIndexRef.current];
            const isStillActive =
              activePassage &&
              (activePassage.index === segIndex || currentPassageIndexRef.current === segIndex);
            if (isStillActive && !isDirtyRef.current) setWorking(stored);
          }
        }
        return res;
      });
    },
    [applyDoc, enqueue, flash, passage]
  );

  const goToRef = useRef(() => {});

  const goTo = useCallback(
    (nextIndex) => {
      const clamped = Math.min(Math.max(0, nextIndex), Math.max(0, totalPassages - 1));
      if (clamped === passageIndex) return;

      if (isDirtyRef.current && passage) {
        const segIdx = passage.index != null ? passage.index : passageIndex;
        persist(segIdx, working, null);
      }

      currentPassageIndexRef.current = clamped;
      setPassageIndex(clamped);

      const nextPassage = passages[clamped];
      setWorking(nextPassage?.entities || []);
      setIsDirty(false);
      isDirtyRef.current = false;
      setFocusedSpan(null);
      annotation?.clearSelection?.();
      annotation?.setActiveEditingEntity?.(null);
    },
    [passage, passageIndex, passages, persist, totalPassages, working, annotation]
  );

  useEffect(() => {
    goToRef.current = goTo;
  }, [goTo]);

  const handleSave = useCallback(() => {
    if (passage) persist(passage.index != null ? passage.index : passageIndex, working, 'Saved');
  }, [passage, passageIndex, persist, working]);

  const approveAll = useCallback(() => {
    const approved = working.map((e) =>
      e.status === 'deleted' ? e : { ...e, status: 'approved', source: e.source || 'human' }
    );
    setWorking(approved);
    setIsDirty(true);
    isDirtyRef.current = true;
    return approved;
  }, [working]);

  /** Validation: every entity still unjudged is confirmed as correct. */
  const confirmRemaining = useCallback(() => {
    const confirmed = working.map((e) =>
      !e.validationStatus || e.validationStatus === 'unreviewed'
        ? { ...e, validationStatus: 'confirmed', status: 'approved', source: 'human' }
        : e
    );
    setWorking(confirmed);
    setIsDirty(true);
    isDirtyRef.current = true;
    return confirmed;
  }, [working]);

  /** Validation: a passage holding nothing still has to be acknowledged. */
  const handleNothingToValidate = useCallback(async () => {
    if (!passage) return;
    setError('');
    const segIndex = passage.index != null ? passage.index : passageIndex;
    const base = docRef.current;
    const segments = (base.segments || []).map((seg) =>
      seg.index === segIndex ? { ...seg, nothingToValidate: true } : seg
    );
    applyDoc({ ...base, segments });
    flash('Marked as nothing to validate');

    try {
      await acknowledgeEmptyPassage(base._id, segIndex);
    } catch (e) {
      setError(`That could not be recorded: ${e.message}`);
    }

    if (passageIndex < totalPassages - 1) goToRef.current(passageIndex + 1);
  }, [applyDoc, flash, passage, passageIndex, totalPassages]);

  const handleApprove = useCallback(() => {
    if (!passage) return;
    const segIdx = passage.index != null ? passage.index : passageIndex;
    const hasNext = passageIndex < totalPassages - 1;

    // Validation: confirm whatever is still undecided, or acknowledge an empty
    // passage, then move on the same way the annotation path does.
    const approved = isValidation
      ? confirmRemaining()
      : working.map((e) =>
          e.status === 'deleted' ? e : { ...e, status: 'approved', source: e.source || 'human' }
        );

    if (isValidation && working.length === 0) {
      handleNothingToValidate();
      return;
    }

    persist(segIdx, approved, hasNext ? null : isValidation ? 'Passage validated' : 'Passage approved');

    if (hasNext) {
      const nextIdx = passageIndex + 1;
      currentPassageIndexRef.current = nextIdx;
      setPassageIndex(nextIdx);

      const nextPassage = passages[nextIdx];
      setWorking(nextPassage?.entities || []);
      setIsDirty(false);
      isDirtyRef.current = false;
      setFocusedSpan(null);
      annotation?.clearSelection?.();
      annotation?.setActiveEditingEntity?.(null);
    } else {
      setWorking(approved);
      setIsDirty(false);
      isDirtyRef.current = false;
    }
  }, [
    confirmRemaining,
    handleNothingToValidate,
    isValidation,
    passage,
    passageIndex,
    passages,
    persist,
    totalPassages,
    working,
    annotation,
  ]);

  const handleReset = useCallback(() => {
    if (!passage) return;
    if (
      !window.confirm(
        'Put this passage back to what the model proposed? Anything you added here is dropped.'
      )
    ) {
      return;
    }
    const baseline = (passage.originalEntities || []).map((e) => ({ ...e }));
    setWorking(baseline);
    setIsDirty(false);
    flash('Back to model output');
    const docId = docRef.current._id;
    const segments = (docRef.current.segments || []).map((seg) =>
      seg.index === passage.index ? { ...seg, entities: baseline } : seg
    );
    applyDoc({ ...docRef.current, segments, stats: computeStatsLocal(segments) });
    enqueue(() =>
      resetSegment(docId, passage.index).catch((e) => {
        setError(`That passage could not be reset: ${e.message}`);
      })
    );
  }, [applyDoc, enqueue, flash, passage]);

  // Keys: A approves, arrows move, 1-9 label the selection (handled in context).
  useEffect(() => {
    const onKeyDown = (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      if (viewMode !== 'focus') return;
      if (e.key === 'ArrowRight') {
        if (passageIndex < totalPassages - 1) {
          e.preventDefault();
          goTo(passageIndex + 1);
        }
        return;
      }
      if (e.key === 'ArrowLeft') {
        if (passageIndex > 0) {
          e.preventDefault();
          goTo(passageIndex - 1);
        }
        return;
      }
      if ((e.key === 'a' || e.key === 'A') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        handleApprove();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goTo, handleApprove, passageIndex, totalPassages, viewMode]);

  // Warn if the tab closes with a write still going out.
  useEffect(() => {
    if (pendingSaves === 0) return undefined;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [pendingSaves]);

  const act = async (seg, ent, body) => {
    try {
      applyDoc(await reviewEntity(docRef.current._id, seg.index, ent._id, body));
    } catch (e) {
      setError(e.message);
    }
  };

  /* --------------------------------- counts --------------------------------- */

  const docTotals = useMemo(() => {
    const counts = {};
    let active = 0;
    let manual = 0;
    let reviewedPassages = 0;
    let awaitingModel = 0;

    (doc.segments || []).forEach((seg) => {
      if (seg.nerStatus === 'pending') awaitingModel += 1;

      if (doc.kind === 'validate') {
        const ents = seg.entities || [];
        const complete = ents.length
          ? ents.every((e) => e.validationStatus && e.validationStatus !== 'unreviewed')
          : seg.nothingToValidate === true;
        if (complete) reviewedPassages += 1;
        ents.forEach((e) => {
          if (e.status === 'deleted') return;
          active += 1;
          if (e.validationStatus === 'confirmed' || e.validationStatus === 'relabelled') manual += 1;
          counts[e.label] = (counts[e.label] || 0) + 1;
        });
        return;
      }

      let touched = false;
      (seg.entities || []).forEach((e) => {
        if (e.status === 'deleted') return;
        active += 1;
        if (e.source === 'human') manual += 1;
        if (e.source === 'human' || e.status === 'approved' || e.status === 'edited') touched = true;
        counts[e.label] = (counts[e.label] || 0) + 1;
      });
      if (touched) reviewedPassages += 1;
    });

    return { active, manual, model: active - manual, counts, reviewedPassages, awaitingModel };
  }, [doc]);

  const workingSpans = useMemo(() => {
    const pText = passage?.text || '';
    return [...working]
      .filter((e) => {
        if (!e || e.status === 'deleted') return false;
        // Strict boundary check: ensure span belongs to current passage text
        if (pText && (e.start < 0 || e.end > pText.length || e.start >= e.end)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => a.start - b.start);
  }, [working, passage?.text]);

  /*
   * Which sources backed an entity is the most useful thing a validator can
   * see, and it lives in the untouched source record rather than in the stored
   * entity. Looked up by offset for display only; never saved back.
   */
  const displaySpans = useMemo(() => {
    if (!isValidation) return workingSpans;
    const provided = Array.isArray(passage?.sourceRecord?.entities)
      ? passage.sourceRecord.entities
      : [];
    if (provided.length === 0) return workingSpans;
    const byOffset = new Map(provided.map((e) => [`${e.start}:${e.end}`, e]));
    return workingSpans.map((span) => {
      const origin = byOffset.get(`${span.start}:${span.end}`);
      return origin && Array.isArray(origin.sources)
        ? { ...span, sources: origin.sources }
        : span;
    });
  }, [workingSpans, isValidation, passage]);

  const lineNumberFor = useCallback(
    (span) => {
      const i = sentences.findIndex((s) => span.start >= s.start && span.start < s.end);
      return i >= 0 ? i + 1 : null;
    },
    [sentences]
  );

  const meanConfidence = useMemo(() => {
    const model = (passage?.originalEntities || []).filter((e) => e.confidence != null);
    if (model.length === 0) return null;
    return (model.reduce((a, e) => a + Number(e.confidence), 0) / model.length) * 100;
  }, [passage]);

  return (
    <div className="flex min-h-[calc(100vh-3.3rem)] flex-col">
      <div className="mx-auto w-full max-w-[1560px] flex-1 px-5 pb-8 pt-6 lg:px-8">
        {error && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-md border-l-2 border-hand bg-sheet px-4 py-3 text-[13px] text-ink">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError('')}
              className="rounded border border-rule bg-sheet px-2 py-1 text-[12px] text-ink-soft transition hover:border-rule-strong hover:text-ink"
            >
              Dismiss
            </button>
          </div>
        )}

        {viewMode === 'focus' ? (
          totalPassages > 0 && passage ? (
            <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-[1fr_21rem] lg:grid-cols-[21rem_1fr_23rem] lg:gap-7">
              {/* The span list sits to the left of the text it describes. */}
              <aside className="order-2 flex flex-col gap-4 md:order-none lg:sticky lg:top-[4.25rem] lg:h-[calc(100vh-6rem)]">
                <div className="min-h-0 flex-1">
                  <SpanListPanel
                    spans={displaySpans}
                    isValidation={isValidation}
                    onDecide={decideEntity}
                    lineNumberFor={lineNumberFor}
                    onUpdate={updateEntity}
                    onDelete={deleteEntity}
                    onApproveAll={isValidation ? confirmRemaining : approveAll}
                    focusedSpan={focusedSpan}
                    onFocusSpan={setFocusedSpan}
                    nerStatus={effectiveNerStatus}
                    passageNumber={passageIndex + 1}
                    pageNumber={passage?.page}
                  />
                </div>
                <div className="shrink-0">
                  <LeftAnnotationSidebar
                    doc={doc}
                    totalPassages={totalPassages}
                    currentPassageNumber={passageIndex + 1}
                    reviewedPassages={docTotals.reviewedPassages}
                    awaitingModel={docTotals.awaitingModel}
                    activeFilter={filter}
                    onFilterChange={setFilter}
                    onUploadClick={onOpenUpload}
                    onJumpToPassage={(n) => goTo(n - 1)}
                  />
                </div>
              </aside>

              <main className="order-1 min-w-0 md:order-none">
                <PassageAnnotationCard
                  passage={passage}
                  isValidation={isValidation}
                  onNothingToValidate={handleNothingToValidate}
                  onFocusEntity={setFocusedSpan}
                  nerStatus={effectiveNerStatus}
                  sentences={sentences}
                  entities={working}
                  passageNumber={passageIndex + 1}
                  totalPassages={totalPassages}
                  isDirty={isDirty}
                  message={message}
                  onApprove={handleApprove}
                  onSave={handleSave}
                  onReset={handleReset}
                  onNext={() => goTo(passageIndex + 1)}
                  onPrev={() => goTo(passageIndex - 1)}
                  hasPrev={passageIndex > 0}
                  hasNext={passageIndex < totalPassages - 1}
                  onRetryPredict={() => requestWindow(passageIndex, { force: true })}
                  onDeleteEntity={deleteEntity}
                />
              </main>

              {/* Entity labels stay in the right-hand column from tablet width up. */}
              <aside className="order-3 md:order-none md:sticky md:top-[4.25rem] md:h-[calc(100vh-6rem)]">
                <EntityPaletteSidebar
                  isValidation={isValidation}
                  focusedSpan={focusedSpan}
                  modelSpans={(passage.originalEntities || []).length}
                  manualSpans={
                    workingSpans.filter((e) => e.source === 'human' || e.status === 'edited').length
                  }
                  meanConfidence={meanConfidence}
                  entityCounts={docTotals.counts}
                />
              </aside>
            </div>
          ) : (
            <p className="rounded-md border border-rule bg-sheet px-5 py-10 text-center text-[13px] text-ink-faint">
              This document has no passages to annotate.
            </p>
          )
        ) : (
          <div className="mx-auto max-w-5xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-rule bg-sheet px-4 py-2.5">
              <p className="text-[12.5px] text-ink-soft">
                {totalPassages.toLocaleString()} passages
                {docTotals.awaitingModel > 0
                  ? `, ${docTotals.awaitingModel.toLocaleString()} not read by the model yet`
                  : ''}
                {filter === 'review' ? ' — showing low confidence only' : ''}
              </p>
              <button
                type="button"
                onClick={() => setViewMode('focus')}
                className="rounded-md bg-ink px-2.5 py-1.5 text-[12.5px] font-medium text-paper transition hover:bg-ink/90"
              >
                Back to one passage
              </button>
            </div>

            {passages.map((seg) => (
              <SegmentCard key={seg.index} seg={seg} filter={filter} onAction={act} />
            ))}
          </div>
        )}
      </div>

      <AnnotationBottomBar
        docId={doc._id}
        docFilename={doc.filename}
        docKind={doc.kind}
        currentPassageNumber={passageIndex + 1}
        totalPassages={totalPassages}
        sentenceCount={sentences.length}
        annotationsDone={docTotals.active}
        manualAnnotationsCount={docTotals.manual}
        modelAnnotationsCount={docTotals.model}
        pendingSaves={pendingSaves}
        predicting={predicting}
        awaitingModel={docTotals.awaitingModel}
        viewMode={viewMode}
        onToggleViewMode={() => setViewMode((m) => (m === 'focus' ? 'overview' : 'focus'))}
      />
    </div>
  );
}
