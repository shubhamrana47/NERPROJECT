import React, { useState, useRef, useEffect } from 'react';
import { downloadTrainingDataFile, downloadLabelStudioFile } from '../api.js';
import { Download, ChevronDown, Check, Loader2, FileJson, Layers } from 'lucide-react';

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
  const [exportOpen, setExportOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState('');
  const exportRef = useRef(null);

  const linesLeft = Math.max(0, totalLines - currentLineNumber);
  const pagesLeft = Math.max(0, totalPages - currentPage);
  const progressPct = totalLines > 0 ? Math.min(100, Math.round((currentLineNumber / totalLines) * 100)) : 0;

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
    try {
      setDownloading(true);
      setExportOpen(false);
      if (format === 'label_studio') {
        await downloadLabelStudioFile(docId, docFilename);
        setDownloadSuccess('Label Studio JSON downloaded!');
      } else if (format === 'jsonl') {
        await downloadTrainingDataFile(docId, 'jsonl', docFilename);
        setDownloadSuccess('Training Data (.jsonl) downloaded!');
      } else {
        await downloadTrainingDataFile(docId, 'json', docFilename);
        setDownloadSuccess('Training Data (.json) downloaded!');
      }
      setTimeout(() => setDownloadSuccess(''), 3500);
    } catch (err) {
      alert(`Download failed: ${err.message}`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <footer className="sticky bottom-0 z-40 mt-8 rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-lg backdrop-blur-md transition-all">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* Left Section: Page & Line Counter */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 font-semibold text-slate-800">
            <span className="text-slate-400 font-normal">Page</span>
            <span className="text-slate-900 font-bold">{currentPage || 1}</span>
            <span className="text-slate-400 font-normal">of {totalPages || 1}</span>
            <span className="ml-1 text-[11px] text-blue-600 font-medium">
              ({pagesLeft} {pagesLeft === 1 ? 'page' : 'pages'} left)
            </span>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5 font-semibold text-blue-900 border border-blue-100">
            <span className="text-blue-500 font-normal">Line</span>
            <span className="text-blue-900 font-bold">{currentLineNumber}</span>
            <span className="text-blue-500 font-normal">of {totalLines}</span>
            <span className="ml-1 text-[11px] text-slate-600 font-normal">
              ({linesLeft} remaining)
            </span>
          </div>

          {/* Annotations Done Metrics */}
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-900 border border-emerald-100">
            <span>Annotations Done:</span>
            <span className="font-bold text-emerald-700">{annotationsDone}</span>
            <span className="text-[11px] text-emerald-600 font-normal">
              ({manualAnnotationsCount} manual, {modelAnnotationsCount} model)
            </span>
          </div>
        </div>

        {/* Center / Right Section: Progress & Export Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Progress Bar */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-600">
            <span>Progress:</span>
            <div className="h-2 w-28 rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="font-mono font-medium">{progressPct}%</span>
          </div>

          {/* View Mode Toggle */}
          <button
            type="button"
            onClick={onToggleViewMode}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            {viewMode === 'focus' ? 'Switch to Full Overview' : 'Switch to 1-Line Focus Mode'}
          </button>

          {/* Export Training Data Station (Direct File Download) */}
          <div className="relative inline-flex items-center" ref={exportRef}>
            <div className="inline-flex rounded-lg border border-slate-300 bg-white shadow-2xs overflow-hidden">
              {/* Primary Direct Download Button */}
              <button
                type="button"
                onClick={() => handleExport('json')}
                disabled={downloading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50 transition cursor-pointer"
                title="Download training data with NER vs Manual tags as JSON file"
              >
                {downloading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                ) : downloadSuccess ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-blue-600" />
                )}
                <span>{downloading ? 'Downloading…' : downloadSuccess || 'Download Training Data'}</span>
              </button>

              {/* Format Dropdown Trigger */}
              <button
                type="button"
                onClick={() => setExportOpen((prev) => !prev)}
                className="border-l border-slate-200 px-2 py-1.5 hover:bg-slate-50 text-slate-600 transition cursor-pointer"
                title="Choose export format"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Dropdown Menu */}
            {exportOpen && (
              <div className="absolute right-0 bottom-full mb-2 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl z-50 animate-fadeIn text-xs">
                <div className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
                  Export Options
                </div>

                <button
                  type="button"
                  onClick={() => handleExport('json')}
                  className="w-full flex items-start gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-slate-50 transition text-slate-800 cursor-pointer"
                >
                  <FileJson className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-slate-900">Training Data (.json)</div>
                    <div className="text-[11px] text-slate-500">Sentence-level JSON with NER vs Manual tags</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleExport('jsonl')}
                  className="w-full flex items-start gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-slate-50 transition text-slate-800 cursor-pointer"
                >
                  <Layers className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-slate-900">Training Data (.jsonl)</div>
                    <div className="text-[11px] text-slate-500">Newline-delimited JSON for ML pipelines</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleExport('label_studio')}
                  className="w-full flex items-start gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-slate-50 transition text-slate-800 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-slate-900">Label Studio Tasks (.json)</div>
                    <div className="text-[11px] text-slate-500">Official Label Studio format with annotations</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
