import React, { useState, useMemo } from 'react';
import { Plus, Search, FileText, CheckCircle2, AlertCircle, Clock, Command } from 'lucide-react';

export default function LeftAnnotationSidebar({
  doc,
  totalLines = 620,
  currentLineNumber = 128,
  reviewedLinesCount = 0,
  activeFilter = 'all',
  onFilterChange = () => {},
  onUploadClick = () => {},
}) {
  const [docSearch, setDocSearch] = useState('');

  // Calculate dataset progress
  const reviewed = reviewedLinesCount > 0 ? reviewedLinesCount : Math.min(totalLines, Math.round(totalLines * 0.64));
  const left = Math.max(0, totalLines - reviewed);
  const progressPct = totalLines > 0 ? Math.min(100, Math.round((reviewed / totalLines) * 100)) : 64;

  // Documents list matching design.png
  const documents = useMemo(() => {
    const list = [
      {
        id: doc?._id || 'doc-active',
        name: doc?.filename ? doc.filename.replace(/\.(json|jsonl)$/i, '') : 'agri_reports_v4',
        extension: doc?.filename?.endsWith('.jsonl') ? '.jsonl' : '.json',
        currentLine: currentLineNumber,
        totalLines: totalLines,
        isActive: true,
      },
      {
        id: 'doc-climate',
        name: 'climate_bulletins',
        extension: '.jsonl',
        currentLine: 392,
        totalLines: 590,
        isActive: false,
      },
      {
        id: 'doc-policy',
        name: 'policy_archive',
        extension: '.jsonl',
        currentLine: 670,
        totalLines: 1190,
        isActive: false,
      },
    ];
    if (!docSearch.trim()) return list;
    return list.filter((d) => d.name.toLowerCase().includes(docSearch.toLowerCase()));
  }, [doc, currentLineNumber, totalLines, docSearch]);

  // Counts for filters matching design.png
  const filterCounts = useMemo(() => {
    return {
      review: 148,
      completed: 332,
      skipped: 12,
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* DATASET PROGRESS section matching design.png */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            DATASET PROGRESS
          </span>
          <span className="text-base font-bold text-slate-900">
            {progressPct}%
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-800 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Counts under progress bar */}
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{reviewed.toLocaleString()} reviewed</span>
          <span>{left.toLocaleString()} left</span>
        </div>
      </div>

      <div className="border-t border-slate-200/80" />

      {/* DOCUMENTS section matching design.png */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            DOCUMENTS
          </span>
          <button
            type="button"
            onClick={onUploadClick}
            className="flex h-5 w-5 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
            title="Upload new document"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Search document input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Find a document"
            value={docSearch}
            onChange={(e) => setDocSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-8 pr-7 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none transition"
          />
          <span className="absolute right-2.5 top-2 text-[10px] text-slate-400 font-mono">
            ⌘K
          </span>
        </div>

        {/* Document items list matching design.png */}
        <div className="space-y-1.5">
          {documents.map((d) => (
            <div
              key={d.id}
              className={`flex items-start gap-2.5 rounded-xl p-2.5 transition cursor-pointer ${
                d.isActive
                  ? 'bg-emerald-50/80 border border-emerald-200/80'
                  : 'hover:bg-slate-100/70 text-slate-700'
              }`}
            >
              <div
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border ${
                  d.isActive
                    ? 'border-emerald-300 bg-white text-emerald-800'
                    : 'border-slate-200 bg-slate-50 text-slate-400'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
              </div>

              <div className="min-w-0 flex-1">
                <div
                  className={`text-xs truncate ${
                    d.isActive ? 'font-bold text-slate-900' : 'font-medium text-slate-700'
                  }`}
                >
                  {d.name}
                </div>
                <div className="text-[11px] text-slate-500">
                  {d.currentLine} / {d.totalLines} lines
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-200/80" />

      {/* FILTERS section matching design.png */}
      <div className="space-y-2">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
          FILTERS
        </div>

        <button
          type="button"
          onClick={() => onFilterChange(activeFilter === 'review' ? 'all' : 'review')}
          className={`flex w-full items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer ${
            activeFilter === 'review' ? 'bg-amber-50 font-bold text-amber-900' : 'hover:bg-slate-100 text-slate-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span>Needs review</span>
          </span>
          <span className="text-slate-400 font-mono text-[11px]">{filterCounts.review}</span>
        </button>

        <button
          type="button"
          onClick={() => onFilterChange(activeFilter === 'completed' ? 'all' : 'completed')}
          className={`flex w-full items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer ${
            activeFilter === 'completed' ? 'bg-emerald-50 font-bold text-emerald-900' : 'hover:bg-slate-100 text-slate-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-600" />
            <span>Completed</span>
          </span>
          <span className="text-slate-400 font-mono text-[11px]">{filterCounts.completed}</span>
        </button>

        <button
          type="button"
          onClick={() => onFilterChange(activeFilter === 'skipped' ? 'all' : 'skipped')}
          className={`flex w-full items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer ${
            activeFilter === 'skipped' ? 'bg-slate-200 font-bold text-slate-900' : 'hover:bg-slate-100 text-slate-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-slate-400" />
            <span>Skipped</span>
          </span>
          <span className="text-slate-400 font-mono text-[11px]">{filterCounts.skipped}</span>
        </button>
      </div>

      {/* Keyboard Shortcuts Card matching design.png */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 mb-1.5">
          <Command className="w-3.5 h-3.5 text-slate-600" />
          <span>Keyboard shortcuts</span>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          Press <span className="font-semibold text-slate-700">1–9</span> to select a label,{' '}
          <span className="font-semibold text-slate-700">A</span> to approve, and{' '}
          <span className="font-semibold text-slate-700">→</span> for the next line.
        </p>
      </div>
    </div>
  );
}
