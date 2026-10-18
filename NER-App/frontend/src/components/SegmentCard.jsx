import React, { useState, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { getEntityColorStyle, formatEntityLabel, ENTITY_TYPES } from '../utils/textUtils.jsx';

export { ENTITY_TYPES };

export const statusStyle = {
  accepted: 'text-machine',
  approved: 'text-ink',
  edited: 'text-hand',
  review: 'text-ink-faint',
};

/**
 * Splits section text into sentences with exact character offsets.
 * Preserves decimal numbers (e.g. 1.5 litre, 0.5%) and abbreviations.
 */
export function splitSentencesWithOffsets(txt) {
  const sentences = [];
  let start = 0;
  for (let i = 0; i < txt.length; i++) {
    const ch = txt[i];
    const nextCh = txt[i + 1] || '';
    const prevCh = i > 0 ? txt[i - 1] : '';

    const isNewline = ch === '\n';
    const isPeriod =
      (ch === '.' || ch === '!' || ch === '?') &&
      !(/\d/.test(prevCh) && /\d/.test(nextCh)) && // avoid splitting 1.5 or 0.5%
      !(txt.slice(Math.max(0, i - 3), i).toLowerCase() === 'e.g') &&
      !(txt.slice(Math.max(0, i - 3), i).toLowerCase() === 'i.e') &&
      !(txt.slice(Math.max(0, i - 3), i).toLowerCase() === 'etc');

    if (isNewline || (isPeriod && (/\s/.test(nextCh) || i === txt.length - 1))) {
      const sentenceText = txt.slice(start, i + 1).trim();
      if (sentenceText) {
        sentences.push({
          start,
          end: i + 1,
          text: sentenceText,
        });
      }
      while (
        i + 1 < txt.length &&
        (txt[i + 1] === ' ' || txt[i + 1] === '\t' || txt[i + 1] === '\r' || txt[i + 1] === '\n')
      ) {
        i++;
      }
      start = i + 1;
    }
  }
  if (start < txt.length) {
    const remaining = txt.slice(start).trim();
    if (remaining) {
      sentences.push({ start, end: txt.length, text: remaining });
    }
  }
  return sentences;
}

/** Same marks as the focus view, set smaller for scanning a whole section. */
function renderMarkedText(rawText, startOffset, endOffset, entities) {
  const relevant = entities
    .filter((e) => e.start >= startOffset && e.start < endOffset)
    .sort((a, b) => a.start - b.start);

  const parts = [];
  let pos = startOffset;

  relevant.forEach((e) => {
    if (e.start < pos) return;
    if (e.start > pos) {
      parts.push(rawText.slice(pos, e.start));
    }
    const chunkEnd = Math.min(e.end, endOffset);
    const colorStyle = getEntityColorStyle(e.label);
    const isManual = e.source === 'human' || e.status === 'edited';

    parts.push(
      <span
        key={e._id || `${e.start}-${e.end}`}
        className="mr-0.5 inline-flex flex-col items-start align-baseline"
        title={`${formatEntityLabel(e.label)} · ${(Number(e.confidence ?? 1) * 100).toFixed(0)}%`}
      >
        <span
          className="inline px-[1px] pb-[1px]"
          style={{ borderBottom: `2px ${isManual ? 'dashed' : 'solid'} ${colorStyle.border}` }}
        >
          {rawText.slice(e.start, chunkEnd)}
        </span>
        <span className="pt-[2px] text-[9px] leading-none" style={{ color: colorStyle.border }}>
          {formatEntityLabel(e.label)}
        </span>
      </span>
    );
    pos = chunkEnd;
  });

  if (pos < endOffset) {
    parts.push(rawText.slice(pos, endOffset));
  }
  return parts;
}

export default function SegmentCard({ seg, filter, onAction }) {
  const [viewMode, setViewMode] = useState('sentences');

  const activeEnts = useMemo(
    () => seg.entities.filter((e) => e.status !== 'deleted'),
    [seg.entities]
  );

  const sentences = useMemo(() => splitSentencesWithOffsets(seg.text), [seg.text]);

  if (filter === 'review' && !activeEnts.some((e) => e.status === 'review')) {
    return null;
  }

  const shownForBlock =
    filter === 'review' ? activeEnts.filter((e) => e.status === 'review') : activeEnts;

  return (
    <section className="overflow-hidden rounded-md border border-rule bg-sheet">
      <header className="flex flex-wrap items-baseline justify-between gap-3 border-b border-rule px-4 py-2.5">
        <div className="min-w-0">
          <h2 className="truncate text-[13px] font-medium text-ink">
            {seg.section || (seg.heading ? seg.heading : `Advisory section ${seg.index + 1}`)}
          </h2>
          <p className="mt-0.5 font-mono text-[11px] tabular-nums text-ink-faint">
            {seg.page != null ? `page ${seg.page}` : ''}
            {seg.paragraph != null ? ` paragraph ${seg.paragraph}` : ''}
            {` ${activeEnts.length} spans`}
          </p>
        </div>

        <div className="inline-flex overflow-hidden rounded-md border border-rule">
          <button
            type="button"
            onClick={() => setViewMode('sentences')}
            className={`border-r border-rule px-2 py-1 text-[12px] transition ${
              viewMode === 'sentences'
                ? 'bg-ink text-paper'
                : 'text-ink-soft hover:bg-paper hover:text-ink'
            }`}
          >
            By line
          </button>
          <button
            type="button"
            onClick={() => setViewMode('block')}
            className={`px-2 py-1 text-[12px] transition ${
              viewMode === 'block'
                ? 'bg-ink text-paper'
                : 'text-ink-soft hover:bg-paper hover:text-ink'
            }`}
          >
            Whole section
          </button>
        </div>
      </header>

      {viewMode === 'sentences' ? (
        <div>
          {sentences.map((sent, sIdx) => {
            const sentEnts = activeEnts.filter(
              (e) => e.start >= sent.start && e.start < sent.end
            );
            const shownEnts =
              filter === 'review' ? sentEnts.filter((e) => e.status === 'review') : sentEnts;

            if (filter === 'review' && shownEnts.length === 0) return null;

            return (
              <div key={sIdx} className="grid grid-cols-[2.75rem_1fr] border-b border-rule last:border-0">
                <div className="border-r border-rule py-3.5 pr-2.5 text-right font-mono text-[11px] tabular-nums text-ink-faint">
                  {sIdx + 1}
                </div>
                <div className="min-w-0 px-4 py-3">
                  <p className="font-serif text-[16px] leading-[2.1] text-ink">
                    {renderMarkedText(seg.text, sent.start, sent.end, activeEnts)}
                  </p>

                  {shownEnts.length > 0 && (
                    <table className="mt-2 w-full text-left text-[12.5px]">
                      <tbody>
                        {shownEnts.map((e) => (
                          <EntityRow
                            key={e._id || `${e.start}-${e.end}`}
                            e={e}
                            onAction={(b) => onAction(seg, e, b)}
                          />
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="px-4 py-4">
          <p className="whitespace-pre-wrap font-serif text-[16px] leading-[2.1] text-ink">
            {renderMarkedText(seg.text, 0, seg.text.length, activeEnts)}
          </p>

          {shownForBlock.length > 0 && (
            <table className="mt-3 w-full text-left text-[12.5px]">
              <tbody>
                {shownForBlock.map((e) => (
                  <EntityRow
                    key={e._id || `${e.start}-${e.end}`}
                    e={e}
                    onAction={(b) => onAction(seg, e, b)}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </section>
  );
}

function EntityRow({ e, onAction }) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(e.label);
  const pct = (Number(e.confidence ?? 1) * 100).toFixed(0);
  const colorStyle = getEntityColorStyle(e.label);
  const isManual = e.source === 'human' || e.status === 'edited';

  return (
    <tr className="border-b border-rule/60 last:border-0">
      <td className="py-1.5 pr-3 font-serif text-[14px] text-ink">{e.text}</td>
      <td className="py-1.5 pr-3">
        {editing ? (
          <select
            autoFocus
            className="rounded border border-ink bg-sheet px-1.5 py-1 text-[12px] text-ink focus:outline-none"
            value={label}
            onChange={(x) => {
              setLabel(x.target.value);
              onAction({ action: 'edit', label: x.target.value });
              setEditing(false);
            }}
            onBlur={() => setEditing(false)}
          >
            {!ENTITY_TYPES.includes(label) && (
              <option value={label}>{formatEntityLabel(label)}</option>
            )}
            {ENTITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {formatEntityLabel(t)}
              </option>
            ))}
          </select>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 text-[12px] text-ink transition hover:text-ink-soft"
          >
            <span
              className="h-[3px] w-3 shrink-0 rounded-full"
              style={{ backgroundColor: colorStyle.border }}
            />
            {formatEntityLabel(e.label)}
            <ChevronDown className="h-3 w-3 text-ink-faint" />
          </button>
        )}
      </td>
      <td className="py-1.5 pr-3 font-mono text-[11px] tabular-nums text-ink-faint">
        {isManual ? '—' : `${pct}%`}
      </td>
      <td className="py-1.5 pr-3">
        <span className={`text-[11.5px] ${isManual ? 'text-hand' : 'text-machine'}`}>
          {isManual ? 'you' : 'model'}
        </span>
      </td>
      <td className="whitespace-nowrap py-1.5 text-right">
        <button
          type="button"
          onClick={() => onAction({ action: 'accept' })}
          className="rounded-md border border-rule bg-sheet px-2 py-0.5 text-[11.5px] text-ink transition hover:border-rule-strong"
        >
          Approve
        </button>
        <button
          type="button"
          onClick={() => onAction({ action: 'delete' })}
          className="ml-1.5 rounded-md px-1.5 py-0.5 text-[11.5px] text-ink-faint transition hover:text-hand"
        >
          Remove
        </button>
      </td>
    </tr>
  );
}
