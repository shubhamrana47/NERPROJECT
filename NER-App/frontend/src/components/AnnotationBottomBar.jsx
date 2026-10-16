import React from 'react';
import { trainingDataUrl } from '../api.js';

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
  const linesLeft = Math.max(0, totalLines - currentLineNumber);
  const pagesLeft = Math.max(0, totalPages - currentPage);
  const progressPct = totalLines > 0 ? Math.min(100, Math.round((currentLineNumber / totalLines) * 100)) : 0;

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
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
          >
            {viewMode === 'focus' ? 'Switch to Full Overview' : 'Switch to 1-Line Focus Mode'}
          </button>

          {/* Training Data Export */}
          <a
            href={trainingDataUrl(docId)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Training Data
          </a>
        </div>
      </div>
    </footer>
  );
}
