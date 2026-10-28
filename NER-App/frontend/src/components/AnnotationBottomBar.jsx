import React, { useState } from 'react';
import { Check, ChevronDown, Download, Loader2 } from 'lucide-react';
import { downloadAnnotatedFile } from '../api.js';
import { useAnnotation } from '../context/AnnotationContext.jsx';

export default function AnnotationBottomBar({
  docId,
  docFilename,
  docKind = 'annotate',
  currentPassageNumber = 0,
  totalPassages = 0,
  sentenceCount = 0,
  annotationsDone,
  manualAnnotationsCount,
  modelAnnotationsCount,
  pendingSaves = 0,
  predicting = false,
  awaitingModel = 0,
  viewMode,
  onToggleViewMode,
  onBeforeExport,
}) {
  const annotation = useAnnotation();
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState('');

  const progressPct =
    totalPassages > 0
      ? Math.min(100, Math.round((currentPassageNumber / totalPassages) * 100))
      : 0;

  const handleExport = async () => {
    if (!docId) return;
    try {
      setDownloading(true);
      // The file is built on the server, so the passage on screen is written
      // first. Both export buttons have to do this, not just the one in the
      // top bar.
      if (typeof onBeforeExport === 'function') {
        await onBeforeExport();
      } else {
        await annotation?.flushPendingWork?.();
      }
      const saved = await downloadAnnotatedFile(docId, docFilename, docKind);
      setDownloadSuccess(
        `${saved.records.toLocaleString()} ${saved.records === 1 ? 'record' : 'records'} saved`
      );
      setTimeout(() => setDownloadSuccess(''), 4000);
    } catch (err) {
      setDownloadSuccess('');
      alert(`Download failed: ${err.message}`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <footer className="sticky bottom-0 z-30 border-t border-rule bg-paper/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1560px] flex-wrap items-center gap-x-6 gap-y-2 px-5 py-2.5 lg:px-8">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-[11.5px] tabular-nums text-ink-soft">
          <span>
            passage {currentPassageNumber.toLocaleString()} / {totalPassages.toLocaleString()}
          </span>
          <span className="text-ink-faint">
            {sentenceCount} {sentenceCount === 1 ? 'sentence' : 'sentences'} here
          </span>
          <span>
            {annotationsDone.toLocaleString()} spans
            <span className="text-machine"> {modelAnnotationsCount.toLocaleString()} model</span>
            <span className="text-hand"> {manualAnnotationsCount.toLocaleString()} yours</span>
          </span>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {/* Writes happen behind the interface; this is the only place that
              admits one is still in flight. */}
          <span
            className={`flex items-center gap-1.5 text-[12px] transition-opacity ${
              pendingSaves > 0 || predicting ? 'text-ink-soft opacity-100' : 'opacity-0'
            }`}
            aria-live="polite"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-ink-faint" />
            {pendingSaves > 0
              ? pendingSaves > 1
                ? `saving ${pendingSaves}`
                : 'saving'
              : `reading ahead${awaitingModel > 0 ? ` · ${awaitingModel} left` : ''}`}
          </span>

          <div className="hidden items-center gap-2 lg:flex">
            <span className="h-[3px] w-24 overflow-hidden rounded-full bg-rule">
              <span
                className="block h-full rounded-full bg-ink transition-[width] duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </span>
            <span className="font-mono text-[11.5px] tabular-nums text-ink-faint">
              {progressPct}%
            </span>
          </div>

          <button
            type="button"
            onClick={onToggleViewMode}
            className="rounded-md border border-rule bg-sheet px-2.5 py-1.5 text-[12.5px] text-ink-soft transition hover:border-rule-strong hover:text-ink"
          >
            {viewMode === 'focus' ? 'Whole document' : 'One line at a time'}
          </button>

          <button
            type="button"
            onClick={handleExport}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 rounded-md border border-rule bg-sheet px-3 py-1.5 text-[12.5px] text-ink transition hover:border-rule-strong disabled:opacity-50"
            title={
              docKind === 'validate'
                ? 'Download the file with your validation decisions'
                : 'Download the file with annotations appended'
            }
          >
            {downloading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-ink-faint" />
            ) : downloadSuccess ? (
              <Check className="h-3.5 w-3.5 text-ink-soft" />
            ) : (
              <Download className="h-3.5 w-3.5 text-ink-faint" />
            )}
            {downloading
              ? 'Saving'
              : downloadSuccess || (docKind === 'validate' ? 'Export validated file' : 'Export annotated file')}
          </button>
        </div>
      </div>
    </footer>
  );
}
