import React, { useState } from 'react';
import { Plus } from 'lucide-react';

function Key({ children }) {
  return (
    <span className="rounded border border-rule bg-sheet px-1.5 py-px font-mono text-[11px] text-ink-soft">
      {children}
    </span>
  );
}

/**
 * Sits under the span list: where you are in the file, and how to get
 * somewhere else. Deliberately compact, because the span list above it is the
 * thing being worked with.
 */
export default function LeftAnnotationSidebar({
  doc,
  totalPassages = 0,
  currentPassageNumber = 0,
  reviewedPassages = 0,
  awaitingModel = 0,
  activeFilter = 'all',
  onFilterChange = () => {},
  onUploadClick = () => {},
  onJumpToPassage = null,
}) {
  const [jumpValue, setJumpValue] = useState('');
  const progressPct = totalPassages > 0 ? Math.round((reviewedPassages / totalPassages) * 100) : 0;

  const handleJump = (e) => {
    e.preventDefault();
    const n = parseInt(jumpValue, 10);
    if (!Number.isNaN(n) && onJumpToPassage) {
      onJumpToPassage(Math.min(Math.max(1, n), totalPassages));
      setJumpValue('');
    }
  };

  return (
    <div className="rounded-md border border-rule bg-sheet px-3.5 py-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-[13px] font-semibold text-ink">Progress</h2>
        <span className="font-mono text-[13px] tabular-nums text-ink">{progressPct}%</span>
      </div>

      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-rule">
        <div
          className="h-full rounded-full bg-ink transition-[width] duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <p className="mt-1.5 font-mono text-[11.5px] tabular-nums text-ink-faint">
        passage {currentPassageNumber.toLocaleString()} of {totalPassages.toLocaleString()} ·{' '}
        {reviewedPassages.toLocaleString()} reviewed
      </p>
      {awaitingModel > 0 && (
        <p className="mt-0.5 text-[11.5px] text-ink-faint">
          {awaitingModel.toLocaleString()} not read by the model yet
        </p>
      )}

      {onJumpToPassage && (
        <form onSubmit={handleJump} className="mt-2.5 flex gap-1.5">
          <input
            type="number"
            min="1"
            max={totalPassages || 1}
            value={jumpValue}
            onChange={(e) => setJumpValue(e.target.value)}
            placeholder="Go to passage"
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

      <div className="mt-3 border-t border-rule pt-2.5">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 break-words text-[12.5px] text-ink" title={doc?.filename}>
            {doc?.filename || 'No file open'}
          </p>
          <button
            type="button"
            onClick={onUploadClick}
            className="flex shrink-0 items-center gap-1 rounded border border-rule bg-sheet px-1.5 py-0.5 text-[11.5px] text-ink-soft transition hover:border-rule-strong hover:text-ink"
            title="Open another file"
          >
            <Plus className="h-3 w-3" />
            New
          </button>
        </div>

        <button
          type="button"
          onClick={() => onFilterChange(activeFilter === 'review' ? 'all' : 'review')}
          className={`mt-2 w-full rounded border px-2 py-1.5 text-left text-[12px] transition ${
            activeFilter === 'review'
              ? 'border-ink bg-ink text-paper'
              : 'border-rule bg-sheet text-ink-soft hover:border-rule-strong hover:text-ink'
          }`}
          title="Applies to the whole-document view"
        >
          {activeFilter === 'review' ? 'Showing low confidence only' : 'Show low confidence only'}
        </button>
      </div>

      <ul className="mt-3 space-y-1.5 border-t border-rule pt-2.5 text-[12px] text-ink-soft">
        <li className="flex items-center justify-between gap-2">
          <span>Label the selection</span>
          <span className="flex items-center gap-1">
            <Key>1</Key>
            <span className="text-ink-faint">to</span>
            <Key>9</Key>
          </span>
        </li>
        <li className="flex items-center justify-between gap-2">
          <span>Approve the passage</span>
          <Key>A</Key>
        </li>
        <li className="flex items-center justify-between gap-2">
          <span>Move between passages</span>
          <span className="flex items-center gap-1">
            <Key>←</Key>
            <Key>→</Key>
          </span>
        </li>
        <li className="flex items-center justify-between gap-2">
          <span>Search labels</span>
          <Key>/</Key>
        </li>
      </ul>
    </div>
  );
}
