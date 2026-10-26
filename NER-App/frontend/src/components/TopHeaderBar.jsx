import React, { useState } from 'react';
import { ChevronDown, Download, Eye, FileText } from 'lucide-react';
import { downloadAnnotatedFile } from '../api.js';
import { describeExport } from '../utils/annotatedFile.js';

/**
 * Wordmark: three marked-up lines of text. The blue rule is a model prediction,
 * the red one a human correction — the same language the spans use downstream.
 */
function Wordmark() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" className="shrink-0">
      <rect x="2" y="4" width="16" height="2" rx="1" fill="#1C2621" />
      <rect x="2" y="9" width="9" height="2" rx="1" fill="#2F5FA8" />
      <rect x="2" y="14" width="13" height="2" rx="1" fill="#B5403A" />
    </svg>
  );
}

export default function TopHeaderBar({
  doc,
  onOpenUpload,
  onTogglePreview,
  isPreviewOpen = false,
}) {
  const [exporting, setExporting] = useState(false);
  const [exportNote, setExportNote] = useState('');

  const handleExport = async () => {
    if (!doc?._id) return;
    setExporting(true);
    setExportNote('');
    try {
      const saved = await downloadAnnotatedFile(doc._id, doc.filename, doc.kind);
      setExportNote(describeExport(saved.filename, saved));
      setTimeout(() => setExportNote(''), 10000);
    } catch (e) {
      setExportNote(`Export failed: ${e.message}`);
    } finally {
      setExporting(false);
    }
  };

  const savedAt = doc?.updatedAt ? new Date(doc.updatedAt) : null;
  const savedLabel =
    savedAt && !Number.isNaN(savedAt.getTime())
      ? savedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : null;

  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-paper/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1560px] flex-wrap items-center gap-x-5 gap-y-2 px-5 py-2.5 lg:px-8">
        <div className="flex items-center gap-2.5">
          <Wordmark />
          <span className="text-[15px] font-semibold tracking-tight text-ink">Fieldnote</span>
        </div>

        {doc && (
          <>
            <span className="hidden h-4 w-px bg-rule sm:block" />
            <button
              type="button"
              onClick={onOpenUpload}
              className="group flex min-w-0 items-center gap-2 rounded-md border border-rule bg-sheet px-2.5 py-1.5 text-[13px] text-ink transition hover:border-rule-strong"
              title="Open a different document"
            >
              <FileText className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
              <span className="max-w-[16rem] truncate font-medium">{doc.filename}</span>
              <ChevronDown className="h-3 w-3 shrink-0 text-ink-faint" />
            </button>
          </>
        )}

        <div className="ml-auto flex items-center gap-2.5">
          {savedLabel && (
            <span className="hidden items-center gap-1.5 text-[12px] text-ink-faint md:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-ink-faint" />
              Saved {savedLabel}
            </span>
          )}

          {doc && (
            <button
              type="button"
              onClick={onTogglePreview}
              className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[13px] font-medium transition ${
                isPreviewOpen
                  ? 'border-ink bg-ink text-paper'
                  : 'border-rule bg-sheet text-ink-soft hover:border-rule-strong hover:text-ink'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              {isPreviewOpen ? 'Back to one line' : 'Whole document'}
            </button>
          )}

          {doc && (
            <button
              type="button"
              disabled={exporting}
              onClick={handleExport}
              className="flex items-center gap-1.5 rounded-md bg-ink px-3 py-1.5 text-[13px] font-medium text-paper transition hover:bg-ink/90 disabled:opacity-50"
              title="Download the file with annotations appended"
            >
              <Download className="h-3.5 w-3.5" />
              {exporting ? 'Exporting' : 'Export'}
            </button>
          )}
        </div>
      </div>

      {exportNote && (
        <p className="border-t border-rule bg-sheet px-5 py-1.5 text-[12px] text-ink-soft lg:px-8">
          {exportNote}
        </p>
      )}
    </header>
  );
}
