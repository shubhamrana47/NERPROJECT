import React, { useState, useRef, useEffect } from 'react';
import { FileText, Eye, Download, ChevronDown, Check, Sparkles } from 'lucide-react';
import { downloadTrainingDataFile, downloadLabelStudioFile } from '../api.js';

export default function TopHeaderBar({
  doc,
  onOpenUpload,
  onTogglePreview,
  isPreviewOpen = false,
}) {
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = async (format) => {
    if (!doc?._id) return;
    setExporting(true);
    setExportMenuOpen(false);
    try {
      if (format === 'labelstudio') {
        await downloadLabelStudioFile(doc._id, doc.filename);
      } else {
        await downloadTrainingDataFile(doc._id, format, doc.filename);
      }
    } catch (e) {
      alert(`Export failed: ${e.message}`);
    } finally {
      setExporting(false);
    }
  };

  const filename = doc?.filename || 'agri_reports_v4.jsonl';

  return (
    <header className="border-b border-slate-200 bg-white">
      {/* Top Concept Banner matching design.png */}
      <div className="flex items-center justify-between px-6 py-1.5 border-b border-slate-100 text-[11px] text-slate-500 bg-slate-50/60">
        <div className="flex items-center gap-1.5 font-medium">
          <span className="text-slate-400">❖</span>
          <span>NER design concepts</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400">01 · Baseline</span>
          <span className="font-bold text-slate-800">02 · Studio Workspace</span>
        </div>
      </div>

      {/* Main Bar matching design.png */}
      <div className="flex items-center justify-between px-6 py-3">
        {/* Left: Brand + File Selector */}
        <div className="flex items-center gap-6">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-900 text-emerald-200 shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 leading-tight flex items-center gap-1.5">
                <span>Fieldnote</span>
              </div>
              <div className="text-[11px] text-slate-400 leading-none">
                Entity annotation studio
              </div>
            </div>
          </div>

          <div className="h-4 w-px bg-slate-200" />

          {/* Document Dropdown Pill matching design.png */}
          <button
            type="button"
            onClick={onOpenUpload}
            className="flex items-center gap-2 rounded-xl border border-slate-200/90 bg-slate-50/70 hover:bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-800 transition cursor-pointer shadow-2xs"
            title="Click to switch or upload document"
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>{filename}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>
        </div>

        {/* Right Actions matching design.png */}
        <div className="flex items-center gap-3">
          {/* Status: Saved just now */}
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600 mr-1">
            <span className="h-2 w-2 rounded-full bg-emerald-600" />
            <span>Saved just now</span>
          </div>

          {/* Preview Button */}
          <button
            type="button"
            onClick={onTogglePreview}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition cursor-pointer shadow-2xs ${
              isPreviewOpen
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{isPreviewOpen ? 'Exit Preview' : 'Preview'}</span>
          </button>

          {/* Export Button with Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              disabled={exporting}
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              className="flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{exporting ? 'Exporting…' : 'Export'}</span>
              <ChevronDown className="w-3 h-3 text-slate-300" />
            </button>

            {exportMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl z-50 animate-in fade-in slide-in-from-top-1">
                <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  Choose Export Format
                </div>
                <button
                  type="button"
                  onClick={() => handleExport('jsonl')}
                  className="flex w-full items-center justify-between px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg text-left transition"
                >
                  <span>JSONL Training Data</span>
                  <span className="text-[10px] text-slate-400 font-mono">.jsonl</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('json')}
                  className="flex w-full items-center justify-between px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg text-left transition"
                >
                  <span>JSON Line Annotations</span>
                  <span className="text-[10px] text-slate-400 font-mono">.json</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('labelstudio')}
                  className="flex w-full items-center justify-between px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg text-left transition"
                >
                  <span>Label Studio Tasks</span>
                  <span className="text-[10px] text-slate-400 font-mono">.json</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
