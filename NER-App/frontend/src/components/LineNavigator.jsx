import React, { useState } from 'react';

export default function LineNavigator({
  currentIndex,
  totalLines,
  allLines,
  onSelectIndex,
}) {
  const [jumpVal, setJumpVal] = useState('');

  if (totalLines <= 0) return null;

  // Calculate the 2-3 visible line items around current
  // e.g. [current - 1, current, current + 1]
  let visibleIndices = [];
  if (totalLines <= 3) {
    visibleIndices = Array.from({ length: totalLines }, (_, i) => i);
  } else if (currentIndex === 0) {
    visibleIndices = [0, 1, 2];
  } else if (currentIndex === totalLines - 1) {
    visibleIndices = [totalLines - 3, totalLines - 2, totalLines - 1];
  } else {
    visibleIndices = [currentIndex - 1, currentIndex, currentIndex + 1];
  }

  const currentItem = allLines[currentIndex];

  const handleJumpSubmit = (e) => {
    e.preventDefault();
    const num = parseInt(jumpVal, 10);
    if (!isNaN(num) && num >= 1 && num <= totalLines) {
      onSelectIndex(num - 1);
      setJumpVal('');
    }
  };

  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white px-4 py-3 shadow-xs">
      {/* Left Info / Heading */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Line Navigation
        </span>
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
          Page {currentItem?.page || 1}
        </span>
      </div>

      {/* Center: Arrows + 2-3 Number Pills */}
      <div className="flex items-center gap-1.5">
        {/* Jump to First */}
        <button
          type="button"
          onClick={() => onSelectIndex(0)}
          disabled={currentIndex === 0}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
          title="First Line (Line 1)"
          aria-label="First Line"
        >
          «
        </button>

        {/* Previous Arrow */}
        <button
          type="button"
          onClick={() => onSelectIndex(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
          title="Previous Line"
          aria-label="Previous Line"
        >
          ‹
        </button>

        {/* 2-3 Number Pills (Previous, Current, Next) */}
        <div className="flex items-center gap-1.5 mx-1">
          {visibleIndices.map((idx) => {
            const isCurrent = idx === currentIndex;
            const lineNum = idx + 1;
            const lineData = allLines[idx];
            const hasEntities = (lineData?.initialEntities || []).length > 0;
            const hasManual = (lineData?.initialEntities || []).some((e) => e.source === 'human');

            return (
              <button
                key={lineNum}
                type="button"
                onClick={() => onSelectIndex(idx)}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition shadow-xs ${
                  isCurrent
                    ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-400/30'
                    : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
                title={`Line ${lineNum} · Page ${lineData?.page || 1}${hasManual ? ' (Contains saved manual annotations)' : ''}`}
              >
                <span>Line {lineNum}</span>
                {hasManual && (
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${isCurrent ? 'bg-emerald-300 ring-2 ring-white/60' : 'bg-emerald-500 ring-1 ring-emerald-300'}`}
                    title="Manual annotations saved on this line"
                  />
                )}
                {!hasManual && hasEntities && !isCurrent && (
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" title="Contains model predictions" />
                )}
              </button>
            );
          })}
        </div>

        {/* Next Arrow */}
        <button
          type="button"
          onClick={() => onSelectIndex(Math.min(totalLines - 1, currentIndex + 1))}
          disabled={currentIndex === totalLines - 1}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
          title="Next Line"
          aria-label="Next Line"
        >
          ›
        </button>

        {/* Jump to Last */}
        <button
          type="button"
          onClick={() => onSelectIndex(totalLines - 1)}
          disabled={currentIndex === totalLines - 1}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
          title={`Last Line (Line ${totalLines})`}
          aria-label="Last Line"
        >
          »
        </button>
      </div>

      {/* Right: Quick Jump input & Current/Total Indicator */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-slate-400 font-medium hidden sm:inline">
          {currentIndex + 1} of {totalLines} lines
        </span>
        <form onSubmit={handleJumpSubmit} className="flex items-center gap-1">
          <input
            type="number"
            min="1"
            max={totalLines}
            placeholder="Go to #"
            value={jumpVal}
            onChange={(e) => setJumpVal(e.target.value)}
            className="w-16 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition"
          >
            Go
          </button>
        </form>
      </div>
    </div>
  );
}
