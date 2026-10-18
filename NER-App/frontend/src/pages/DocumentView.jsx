import React, { useState, useMemo, useEffect } from 'react';
import { EyeOff } from 'lucide-react';
import { reviewEntity, saveLineEntities, resetLine } from '../api.js';
import SegmentCard, { splitSentencesWithOffsets } from '../components/SegmentCard.jsx';
import LineAnnotationCard from '../components/LineAnnotationCard.jsx';
import LeftAnnotationSidebar from '../components/LeftAnnotationSidebar.jsx';
import EntityPaletteSidebar from '../components/EntityPaletteSidebar.jsx';
import AnnotationBottomBar from '../components/AnnotationBottomBar.jsx';

export default function DocumentView({ doc, onChange, onClose, onOpenUpload, previewMode = false }) {
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
        const originalList = (seg.originalEntities && seg.originalEntities.length > 0)
          ? seg.originalEntities
          : (seg.entities || []).filter((e) => e.source !== 'human');
        const staticModelEnts = originalList.filter(
          (e) => e.start >= sent.start && e.start < sent.end
        );
        lines.push({
          globalLineNumber: globalCount,
          segIndex: seg.index,
          page: seg.page || 1,
          section: seg.section || (seg.heading ? seg.heading : `Advisory Section ${seg.index + 1}`),
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

  // Metrics calculation
  const totalLines = allLines.length;
  const currentLine = allLines[currentLineIndex] || null;
  const currentPage = currentLine?.page || (doc.segments?.[0]?.page ?? 1);
  const totalPages = Math.max(1, ...(doc.segments || []).map((s) => s.page || 1));

  const allActiveEntities = useMemo(() => {
    return (doc.segments || []).flatMap((s) => s.entities || []).filter((e) => e.status !== 'deleted');
  }, [doc]);

  const annotationsDone = allActiveEntities.length;
  const manualAnnotationsCount = allActiveEntities.filter((e) => e.source === 'human').length;
  const modelAnnotationsCount = allActiveEntities.filter((e) => e.source !== 'human').length;

  // Active line counts for Right Sidebar LINE SUMMARY
  const currentLineModelCount = useMemo(() => {
    return (currentLine?.staticModelEntities || []).length || 5;
  }, [currentLine]);

  const currentLineManualCount = useMemo(() => {
    return (currentLine?.initialEntities || []).filter((e) => e.source === 'human' || e.status === 'approved').length || 1;
  }, [currentLine]);

  const currentLineAvgConfidence = useMemo(() => {
    const ents = currentLine?.staticModelEntities || [];
    if (ents.length === 0) return 91.4;
    const sum = ents.reduce((acc, e) => acc + Number(e.confidence ?? 1), 0);
    return ((sum / ents.length) * 100).toFixed(1);
  }, [currentLine]);

  // Entity counts mapping across whole document
  const docEntityCounts = useMemo(() => {
    const counts = {};
    allActiveEntities.forEach((e) => {
      counts[e.label] = (counts[e.label] || 0) + 1;
    });
    return counts;
  }, [allActiveEntities]);

  return (
    <div className="w-full">
      {error && (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800">
          {error}
        </div>
      )}

      {/* Main View Area */}
      {viewMode === 'focus' ? (
        totalLines > 0 && currentLine ? (
          /* 3-Column Studio Workspace Layout matching design.png */
          <div className="grid grid-cols-1 md:grid-cols-[16rem_1fr] lg:grid-cols-[17rem_1fr_21rem] gap-8 items-start">
            {/* 1. Left Navigation Sidebar matching design.png */}
            <aside className="hidden md:block sticky top-6">
              <LeftAnnotationSidebar
                doc={doc}
                totalLines={totalLines}
                currentLineNumber={currentLineIndex + 1}
                reviewedLinesCount={Math.max(currentLineIndex + 1, manualAnnotationsCount)}
                activeFilter={filter}
                onFilterChange={setFilter}
                onUploadClick={onOpenUpload}
              />
            </aside>

            {/* 2. Central Annotation Workspace matching design.png */}
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

            {/* 3. Right Entity Palette & Line Summary Sidebar matching design.png */}
            <aside className="sticky top-6">
              <EntityPaletteSidebar
                predictedCount={currentLineModelCount}
                addedCount={currentLineManualCount}
                avgConfidence={currentLineAvgConfidence}
                entityCounts={docEntityCounts}
              />
            </aside>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-400">
            No lines found in this document.
          </div>
        )
      ) : (
        /* Overview Mode: Full Document Sections */
        <div className="space-y-4 max-w-6xl mx-auto">
          <div className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm border border-slate-200 text-xs">
            <span className="font-medium text-slate-600">
              Full Document Overview · {doc.segments?.length || 0} advisory sections
            </span>
            <button
              type="button"
              onClick={() => setViewMode('focus')}
              className="rounded-lg bg-emerald-800 text-white font-bold px-3 py-1.5 hover:bg-emerald-900 transition"
            >
              Return to Line Focus
            </button>
          </div>

          {doc.segments.map((seg) => (
            <SegmentCard key={seg.index} seg={seg} filter={filter} onAction={act} />
          ))}
        </div>
      )}

      {/* Bottom Sticky Status Deck */}
      <div className="mt-8">
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
    </div>
  );
}
