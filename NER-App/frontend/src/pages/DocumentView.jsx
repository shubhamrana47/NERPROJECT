import React, { useState, useMemo, useEffect } from 'react';
import { EyeOff } from 'lucide-react';
import { reviewEntity, saveSegmentEntities, saveLineEntities, resetSegment, resetLine, trainingDataUrl } from '../api.js';
import SegmentCard, { splitSentencesWithOffsets } from '../components/SegmentCard.jsx';
import LineAnnotationCard from '../components/LineAnnotationCard.jsx';
import LineNavigator from '../components/LineNavigator.jsx';
import AnnotationBottomBar from '../components/AnnotationBottomBar.jsx';

export default function DocumentView({ doc, onChange, onClose }) {
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('focus'); // 'focus' (1 screen 1 line) | 'overview' (all segments)
  const [currentLineIndex, setCurrentLineIndex] = useState(0);

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

  // Keyboard navigation for fast annotating
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only navigate if not actively typing in an input/select
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
      // Clean temporary frontend _id values from newly added manual entities
      const cleanLineEntities = lineEntities.map((e) => {
        if (e._id && String(e._id).startsWith('temp_')) {
          const { _id, ...rest } = e;
          return rest;
        }
        return e;
      });

      // Call dedicated line-level backend update endpoint
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
  const s = doc.stats || {};

  return (
    <div className="space-y-6">
      {/* Document Header & Primary Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">{doc.filename}</h2>
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              Confidence Threshold: {doc.threshold}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            {totalLines} total sentences across {doc.segments?.length || 0} sections · Mode: {viewMode === 'focus' ? 'Single Line Focus' : 'Full Overview'}
          </p>
        </div>

        {/* View Mode Toggle & Header Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1 text-xs font-medium">
            <button
              type="button"
              onClick={() => setViewMode('focus')}
              className={`rounded-md px-3 py-1.5 transition ${
                viewMode === 'focus'
                  ? 'bg-white font-bold text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              1-Line Focus Mode
            </button>
            <button
              type="button"
              onClick={() => setViewMode('overview')}
              className={`rounded-md px-3 py-1.5 transition ${
                viewMode === 'overview'
                  ? 'bg-white font-bold text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Full Document Overview
            </button>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition shadow-xs"
              title="Hide open document from screen"
            >
              <EyeOff className="w-3.5 h-3.5 text-slate-500" />
              <span>Hide Document</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800">
          {error}
        </div>
      )}

      {/* Main View Area */}
      {viewMode === 'focus' ? (
        totalLines > 0 && currentLine ? (
          <div>
            {/* Compact 2-3 Numbers Line Navigation with Arrows */}
            <LineNavigator
              currentIndex={currentLineIndex}
              totalLines={totalLines}
              allLines={allLines}
              onSelectIndex={setCurrentLineIndex}
            />

            {/* Focused Single Line Card */}
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
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-400">
            No lines found in this document.
          </div>
        )
      ) : (
        /* Overview Mode: Full Document Sections */
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm border border-slate-200 text-xs">
            <span className="font-medium text-slate-600">
              Showing all {doc.segments?.length || 0} advisory sections. You can click any line to switch to 1-Line Focus Mode.
            </span>
            <select
              className="rounded border border-slate-300 p-1.5 text-xs text-slate-700 bg-white"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All entities</option>
              <option value="review">Needs review only</option>
            </select>
          </div>

          {doc.segments.map((seg) => (
            <SegmentCard key={seg.index} seg={seg} filter={filter} onAction={act} />
          ))}
        </div>
      )}

      {/* Bottom Sticky Status Deck */}
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
