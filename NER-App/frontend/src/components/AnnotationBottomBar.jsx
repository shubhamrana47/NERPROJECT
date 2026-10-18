import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, Download, Loader2 } from 'lucide-react';
import { downloadTrainingDataFile } from '../api.js';

export default function AnnotationBottomBar({
  docId,
  docFilename,
  currentPage,
  totalPages,
  currentLineNumber,
  totalLines,
  annotationsDone,
  manualAnnotationsCount,
  modelAnnotationsCount,
  viewMode,
  onToggleViewMode,
}) {
  const [activeFormat, setActiveFormat] = useState('json');
  const [exportOpen, setExportOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState('');
  const exportRef = useRef(null);

  const progressPct =
    totalLines > 0 ? Math.min(100, Math.round((currentLineNumber / totalLines) * 100)) : 0;

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (exportRef.current && !exportRef.current.contains(e.target)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleExport = async (format) => {
    if (!docId) return;
    const targetFormat = format || activeFormat;
    try {
      setDownloading(true);
      setExportOpen(false);
      setActiveFormat(targetFormat);
      await downloadTrainingDataFile(docId, targetFormat, docFilename);
      setDownloadSuccess(targetFormat === 'jsonl' ? 'JSONL saved' : 'JSON saved');
      setTimeout(() => setDownloadSuccess(''), 3500);
    } catch (err) {
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
            line {currentLineNumber.toLocaleString()} / {totalLines.toLocaleString()}
          </span>
          <span className="text-ink-faint">
            page {currentPage || 1} / {totalPages || 1}
          </span>
          <span>
            {annotationsDone.toLocaleString()} spans
            <span className="text-machine"> {modelAnnotationsCount.toLocaleString()} model</span>
            <span className="text-hand"> {manualAnnotationsCount.toLocaleString()} yours</span>
          </span>
        </div>

        <div className="ml-auto flex items-center gap-3">
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

          <div className="relative inline-flex items-center" ref={exportRef}>
            <div className="inline-flex overflow-hidden rounded-md border border-rule bg-sheet">
              <button
                type="button"
                onClick={() => handleExport(activeFormat)}
                disabled={downloading}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12.5px] text-ink transition hover:bg-paper disabled:opacity-50"
                title={`Download this document as ${activeFormat.toUpperCase()}`}
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
                  : downloadSuccess || `Download ${activeFormat === 'jsonl' ? 'JSONL' : 'JSON'}`}
              </button>
              <button
                type="button"
                onClick={() => setExportOpen((prev) => !prev)}
                className="border-l border-rule px-1.5 py-1.5 text-ink-faint transition hover:bg-paper hover:text-ink"
                title="Choose a format"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>

            {exportOpen && (
              <div className="absolute bottom-full right-0 z-50 mb-2 w-44 overflow-hidden rounded-md border border-rule bg-sheet shadow-[0_12px_32px_-16px_rgba(28,38,33,0.35)]">
                {['json', 'jsonl'].map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => handleExport(fmt)}
                    className="flex w-full items-center justify-between border-b border-rule/70 px-3 py-2 text-left text-[12.5px] text-ink transition last:border-0 hover:bg-paper"
                  >
                    <span>{fmt === 'json' ? 'One JSON array' : 'One line per row'}</span>
                    <span className="font-mono text-[10.5px] text-ink-faint">.{fmt}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
