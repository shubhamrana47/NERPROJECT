import React, { useState, useMemo, useEffect } from 'react';
import { reviewEntity, saveLineEntities, resetLine } from '../api.js';
import SegmentCard, { splitSentencesWithOffsets } from '../components/SegmentCard.jsx';
import LineAnnotationCard from '../components/LineAnnotationCard.jsx';
import LeftAnnotationSidebar from '../components/LeftAnnotationSidebar.jsx';
import EntityPaletteSidebar from '../components/EntityPaletteSidebar.jsx';
import AnnotationBottomBar from '../components/AnnotationBottomBar.jsx';

export default function DocumentView({ doc, onChange, onOpenUpload, previewMode = false }) {
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState(previewMode ? 'overview' : 'focus');
  const [currentLineIndex, setCurrentLineIndex] = useState(0);

  // Sync previewMode with viewMode
  useEffect(() => {
    setViewMode(previewMode ? 'overview' : 'focus');
  }, [previewMode]);

  // Extract all lines/sentences across all segments in the document
  const allLines = useMemo(() => {
    const lines = [];
    let globalCount = 0;
    (doc.segments || []).forEach((seg) => {
      const sents = splitSentencesWithOffsets(seg.text);
      sents.forEach((sent, sIdx) => {
        globalCount++;
        const sentEnts = (seg.entities || []).filter(
          (e) => e.start >= sent.start && e.start < sent.end
        );
        const originalList =
          seg.originalEntities && seg.originalEntities.length > 0
            ? seg.originalEntities
            : (seg.entities || []).filter((e) => e.source !== 'human');
        const staticModelEnts = originalList.filter(
          (e) => e.start >= sent.start && e.start < sent.end
        );
        lines.push({
          globalLineNumber: globalCount,
          segIndex: seg.index,
          page: seg.page || 1,
          section: seg.section || (seg.heading ? seg.heading : `Advisory section ${seg.index + 1}`),
          sentenceText: sent.text,
          sentenceStart: sent.start,
          sentenceEnd: sent.end,
          initialEntities: sentEnts,
          staticModelEntities: staticModelEnts,
          sentenceIndexInSegment: sIdx,
          docFilename: doc.filename,
        });
      });
    });
    return lines;
  }, [doc]);

  // Keep line index in bounds if document changes
  useEffect(() => {
    if (currentLineIndex >= allLines.length && allLines.length > 0) {
      setCurrentLineIndex(allLines.length - 1);
    }
  }, [allLines.length, currentLineIndex]);

  // Keyboard navigation for fast line switching
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        return;
      }
      if (e.key === 'ArrowRight' && currentLineIndex < allLines.length - 1) {
        setCurrentLineIndex((i) => i + 1);
      } else if (e.key === 'ArrowLeft' && currentLineIndex > 0) {
        setCurrentLineIndex((i) => i - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentLineIndex, allLines.length]);

  // Save entities for a specific sentence/line directly to the backend
  const handleSaveLine = async (segIndex, sentStart, sentEnd, lineEntities) => {
    try {
      setError('');
      const cleanLineEntities = lineEntities.map((e) => {
        if (e._id && String(e._id).startsWith('temp_')) {
          const { _id, ...rest } = e;
          return rest;
        }
        return e;
      });

      const res = await saveLineEntities(doc._id, segIndex, {
        sentenceStart: sentStart,
        sentenceEnd: sentEnd,
        entities: cleanLineEntities,
      });

      const updatedDoc = res.doc || res;
      onChange(updatedDoc);
      return res;
    } catch (e) {
      setError(e.message);
      throw e;
    }
  };

  // Reset only the current line back to original model output
  const handleResetLine = async (segIndex, sentStart, sentEnd) => {
    try {
      setError('');
      const res = await resetLine(doc._id, segIndex, {
        sentenceStart: sentStart,
        sentenceEnd: sentEnd,
      });
      const updatedDoc = res.doc || res;
      onChange(updatedDoc);
      return res;
    } catch (e) {
      setError(e.message);
      throw e;
    }
  };

  const act = async (seg, ent, body) => {
    try {
      onChange(await reviewEntity(doc._id, seg.index, ent._id, body));
    } catch (e) {
      setError(e.message);
    }
  };

  const totalLines = allLines.length;
  const currentLine = allLines[currentLineIndex] || null;
  const currentPage = currentLine?.page || (doc.segments?.[0]?.page ?? 1);
  const totalPages = Math.max(1, ...(doc.segments || []).map((s) => s.page || 1));

  const allActiveEntities = useMemo(() => {
    return (doc.segments || [])
      .flatMap((s) => s.entities || [])
      .filter((e) => e.status !== 'deleted');
  }, [doc]);

  const annotationsDone = allActiveEntities.length;
  const manualAnnotationsCount = allActiveEntities.filter((e) => e.source === 'human').length;
  const modelAnnotationsCount = allActiveEntities.filter((e) => e.source !== 'human').length;

  // Lines a person has actually touched: anything human-sourced, approved or edited.
  const reviewedLines = useMemo(() => {
    return allLines.filter((l) =>
      (l.initialEntities || []).some(
        (e) => e.source === 'human' || e.status === 'approved' || e.status === 'edited'
      )
    ).length;
  }, [allLines]);

  const lineModelSpans = currentLine?.staticModelEntities?.length || 0;

  const lineManualSpans = useMemo(() => {
    return (currentLine?.initialEntities || []).filter(
      (e) => e.source === 'human' || e.status === 'edited'
    ).length;
  }, [currentLine]);

  const lineMeanConfidence = useMemo(() => {
    const ents = currentLine?.staticModelEntities || [];
    if (ents.length === 0) return null;
    const sum = ents.reduce((acc, e) => acc + Number(e.confidence ?? 1), 0);
    return (sum / ents.length) * 100;
  }, [currentLine]);

  // Entity counts across the whole document, used by the label list
  const docEntityCounts = useMemo(() => {
    const counts = {};
    allActiveEntities.forEach((e) => {
      counts[e.label] = (counts[e.label] || 0) + 1;
    });
    return counts;
  }, [allActiveEntities]);

  return (
    <div className="flex min-h-[calc(100vh-3.3rem)] flex-col">
      <div className="mx-auto w-full max-w-[1560px] flex-1 px-5 pb-8 pt-6 lg:px-8">
        {error && (
          <div className="mb-5 rounded-md border-l-2 border-hand bg-sheet px-4 py-3 text-[13px] text-ink">
            {error}
          </div>
        )}

        {viewMode === 'focus' ? (
          totalLines > 0 && currentLine ? (
            <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-[1fr_21rem] lg:grid-cols-[16rem_1fr_23rem] lg:gap-7">
              <aside className="scroll-slim hidden lg:sticky lg:top-[4.25rem] lg:block lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
                <LeftAnnotationSidebar
                  doc={doc}
                  totalLines={totalLines}
                  currentLineNumber={currentLineIndex + 1}
                  reviewedLines={reviewedLines}
                  activeFilter={filter}
                  onFilterChange={setFilter}
                  onUploadClick={onOpenUpload}
                  onJumpToLine={(n) => setCurrentLineIndex(Math.min(Math.max(0, n - 1), totalLines - 1))}
                />
              </aside>

              <main className="min-w-0">
                <LineAnnotationCard
                  lineItem={currentLine}
                  totalLines={totalLines}
                  onSaveLine={handleSaveLine}
                  onResetLine={handleResetLine}
                  onNextLine={() => setCurrentLineIndex((i) => Math.min(totalLines - 1, i + 1))}
                  onPrevLine={() => setCurrentLineIndex((i) => Math.max(0, i - 1))}
                  hasPrev={currentLineIndex > 0}
                  hasNext={currentLineIndex < totalLines - 1}
                />
              </main>

              {/* Entity labels stay in the right-hand column from tablet width up,
                  always open, filling the column and scrolling on their own. */}
              <aside className="md:sticky md:top-[4.25rem] md:h-[calc(100vh-6rem)]">
                <EntityPaletteSidebar
                  modelSpans={lineModelSpans}
                  manualSpans={lineManualSpans}
                  meanConfidence={lineMeanConfidence}
                  entityCounts={docEntityCounts}
                />
              </aside>
            </div>
          ) : (
            <p className="rounded-md border border-rule bg-sheet px-5 py-10 text-center text-[13px] text-ink-faint">
              This document has no sentences to annotate.
            </p>
          )
        ) : (
          <div className="mx-auto max-w-5xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-rule bg-sheet px-4 py-2.5">
              <p className="text-[12.5px] text-ink-soft">
                {doc.segments?.length || 0} advisory sections, {totalLines.toLocaleString()} lines
                {filter === 'review' ? ' — showing low confidence only' : ''}
              </p>
              <button
                type="button"
                onClick={() => setViewMode('focus')}
                className="rounded-md bg-ink px-2.5 py-1.5 text-[12.5px] font-medium text-paper transition hover:bg-ink/90"
              >
                Back to one line
              </button>
            </div>

            {doc.segments.map((seg) => (
              <SegmentCard key={seg.index} seg={seg} filter={filter} onAction={act} />
            ))}
          </div>
        )}
      </div>

      <AnnotationBottomBar
        docId={doc._id}
        docFilename={doc.filename}
        currentPage={currentPage}
        totalPages={totalPages}
        currentLineNumber={currentLineIndex + 1}
        totalLines={totalLines}
        annotationsDone={annotationsDone}
        manualAnnotationsCount={manualAnnotationsCount}
        modelAnnotationsCount={modelAnnotationsCount}
        viewMode={viewMode}
        onToggleViewMode={() => setViewMode((m) => (m === 'focus' ? 'overview' : 'focus'))}
      />
    </div>
  );
}
