import React, { useState } from 'react';
import { Plus } from 'lucide-react';

function Stat({ label, value, tone = 'ink' }) {
  const toneClass =
    tone === 'machine' ? 'text-machine' : tone === 'hand' ? 'text-hand' : 'text-ink';
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="text-[13px] text-ink-soft">{label}</span>
      <span className={`font-mono text-[13px] tabular-nums ${toneClass}`}>{value}</span>
    </div>
  );
}

function Key({ children }) {
  return (
    <span className="rounded border border-rule bg-sheet px-1.5 py-px font-mono text-[11px] text-ink-soft">
      {children}
    </span>
  );
}

export default function LeftAnnotationSidebar({
  doc,
  totalLines = 0,
  currentLineNumber = 0,
  reviewedLines = 0,
  activeFilter = 'all',
  onFilterChange = () => {},
  onUploadClick = () => {},
  onJumpToLine = null,
}) {
  const [jumpValue, setJumpValue] = useState('');

  const stats = doc?.stats || {};
  const progressPct = totalLines > 0 ? Math.round((reviewedLines / totalLines) * 100) : 0;
  const linesLeft = Math.max(0, totalLines - currentLineNumber);
  const uploaded = doc?.createdAt ? new Date(doc.createdAt) : null;
  const uploadedLabel =
    uploaded && !Number.isNaN(uploaded.getTime())
      ? uploaded.toLocaleDateString([], { day: 'numeric', month: 'short' })
      : null;

  const meanConfidence =
    typeof stats.avgConfidence === 'number' && stats.avgConfidence > 0
      ? `${(stats.avgConfidence * 100).toFixed(0)}%`
      : '—';

  const handleJump = (e) => {
    e.preventDefault();
    const n = parseInt(jumpValue, 10);
    if (!Number.isNaN(n) && onJumpToLine) {
      onJumpToLine(Math.min(Math.max(1, n), totalLines));
      setJumpValue('');
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-md border border-rule bg-sheet px-4 py-3.5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[13.5px] font-semibold text-ink">Progress</h2>
          <span className="font-mono text-[14px] tabular-nums text-ink">{progressPct}%</span>
        </div>
        <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-rule">
          <div
            className="h-full rounded-full bg-ink transition-[width] duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <Stat label="Lines touched" value={`${reviewedLines.toLocaleString()} / ${totalLines.toLocaleString()}`} />
        <Stat label="On line" value={currentLineNumber.toLocaleString()} />
        <Stat label="Still ahead" value={linesLeft.toLocaleString()} />

        {onJumpToLine && (
          <form onSubmit={handleJump} className="mt-2.5 flex gap-1.5">
            <input
              type="number"
              min="1"
              max={totalLines || 1}
              value={jumpValue}
              onChange={(e) => setJumpValue(e.target.value)}
              placeholder="Go to line"
              className="min-w-0 flex-1 rounded border border-rule bg-paper px-2.5 py-1.5 text-[13px] text-ink placeholder:text-ink-faint focus:border-ink focus:bg-sheet focus:outline-none"
            />
            <button
              type="submit"
              className="rounded border border-rule bg-sheet px-2.5 py-1.5 text-[12.5px] text-ink transition hover:border-rule-strong"
            >
              Go
            </button>
          </form>
        )}
      </section>

      <section className="rounded-md border border-rule bg-sheet px-4 py-3.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[13.5px] font-semibold text-ink">Open file</h2>
          <button
            type="button"
            onClick={onUploadClick}
            className="flex items-center gap-1 rounded border border-rule bg-sheet px-2 py-1 text-[12px] text-ink-soft transition hover:border-rule-strong hover:text-ink"
            title="Open another file"
          >
            <Plus className="h-3.5 w-3.5" />
            New
          </button>
        </div>
        <p className="mt-2 break-words text-[13px] font-medium text-ink" title={doc?.filename}>
          {doc?.filename || 'No file open'}
        </p>
        <p className="mt-1 font-mono text-[11.5px] tabular-nums text-ink-faint">
          {(doc?.segments?.length || 0).toLocaleString()} sections,{' '}
          {totalLines.toLocaleString()} lines
          {uploadedLabel ? `, opened ${uploadedLabel}` : ''}
        </p>
      </section>

      <section className="rounded-md border border-rule bg-sheet px-4 py-3.5">
        <h2 className="text-[13.5px] font-semibold text-ink">Spans in this file</h2>
        <div className="mt-1">
          <Stat label="Total" value={(stats.totalEntities ?? 0).toLocaleString()} />
          <Stat
            label="Above threshold"
            value={(stats.autoAccepted ?? 0).toLocaleString()}
            tone="machine"
          />
          <Stat
            label="Needs a look"
            value={(stats.needsReview ?? 0).toLocaleString()}
            tone="hand"
          />
          <Stat label="Mean confidence" value={meanConfidence} />
        </div>

        <button
          type="button"
          onClick={() => onFilterChange(activeFilter === 'review' ? 'all' : 'review')}
          className={`mt-2.5 w-full rounded border px-2.5 py-2 text-left text-[12.5px] transition ${
            activeFilter === 'review'
              ? 'border-ink bg-ink text-paper'
              : 'border-rule bg-sheet text-ink-soft hover:border-rule-strong hover:text-ink'
          }`}
        >
          {activeFilter === 'review' ? 'Showing low confidence only' : 'Show low confidence only'}
        </button>
        <p className="mt-1.5 text-[11.5px] leading-snug text-ink-faint">
          Applies to the whole-document view.
        </p>
      </section>

      <section className="rounded-md border border-rule bg-sheet px-4 py-3.5">
        <h2 className="mb-2.5 text-[13.5px] font-semibold text-ink">Keys</h2>
        <ul className="space-y-2 text-[12.5px] text-ink-soft">
          <li className="flex items-center justify-between gap-2">
            <span>Label the selection</span>
            <span className="flex items-center gap-1">
              <Key>1</Key>
              <span className="text-ink-faint">to</span>
              <Key>9</Key>
            </span>
          </li>
          <li className="flex items-center justify-between gap-2">
            <span>Approve the line</span>
            <Key>A</Key>
          </li>
          <li className="flex items-center justify-between gap-2">
            <span>Move between lines</span>
            <span className="flex items-center gap-1">
              <Key>←</Key>
              <Key>→</Key>
            </span>
          </li>
          <li className="flex items-center justify-between gap-2">
            <span>Search labels</span>
            <Key>/</Key>
          </li>
          <li className="flex items-center justify-between gap-2">
            <span>Drop the selection</span>
            <Key>Esc</Key>
          </li>
        </ul>
      </section>
    </div>
  );
}
