/**
 * Character offsets for a text selection inside an annotated sentence.
 *
 * The sentence is not rendered as plain text: each marked span also renders a
 * small caption beneath it with the label name and a remove button, and those
 * captions sit inside the same container. Measuring the rendered text before a
 * selection therefore counted the captions too, and the offset came out too
 * large — by 81 characters on a passage with eight spans before the selection.
 * The old code tried to recover by searching for the selected string within
 * fifty characters of that estimate and, failing that, taking the string's
 * first occurrence in the sentence. With a term that repeats, the first
 * occurrence is usually the wrong one, so selecting the third "wheat" could
 * label the first.
 *
 * Here the offset is measured rather than estimated: clone the range that
 * precedes the position, drop the caption subtrees from the clone, and count
 * what is left. That is the browser's own range arithmetic over exactly the
 * sentence's own characters, so it is correct for every occurrence and needs no
 * tolerance and no guessing.
 */

/** Marks an element whose text is annotation chrome, not sentence content. */
export const CAPTION_ATTR = 'data-caption';

/** Exact offset of a DOM position, counting sentence text only. */
export function measureOffset(container, node, nodeOffset) {
  const doc = container.ownerDocument;
  const pre = doc.createRange();
  pre.selectNodeContents(container);
  pre.setEnd(node, nodeOffset);

  const fragment = pre.cloneContents();
  fragment.querySelectorAll(`[${CAPTION_ATTR}]`).forEach((el) => el.remove());
  return fragment.textContent.length;
}

/**
 * Offsets for a selection range, or null when it cannot be resolved against
 * this sentence. Returning null is deliberate: an unresolvable selection adds
 * nothing, which is safer than labelling the wrong words.
 */
export function offsetsFromRange(container, range, sentenceText) {
  if (!container || !range || typeof sentenceText !== 'string') return null;
  if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) {
    return null;
  }

  let start;
  let end;
  try {
    start = measureOffset(container, range.startContainer, range.startOffset);
    end = measureOffset(container, range.endContainer, range.endOffset);
  } catch (_) {
    return null;
  }

  if (end < start) [start, end] = [end, start];

  start = Math.max(0, Math.min(start, sentenceText.length));
  end = Math.max(0, Math.min(end, sentenceText.length));

  // A span never carries the whitespace around it.
  while (start < end && /\s/.test(sentenceText[start])) start += 1;
  while (end > start && /\s/.test(sentenceText[end - 1])) end -= 1;

  if (end <= start) return null;

  // The text comes from the sentence at those offsets, so a span's text and its
  // offsets can never disagree.
  return { start, end, text: sentenceText.slice(start, end) };
}
