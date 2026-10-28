/**
 * Character offsets for a text selection inside an annotated sentence.
 *
 * Each text span rendered in the sentence (both unannotated text and entity spans)
 * carries its exact local character offsets via `data-start` and `data-end`
 * attributes. This enables direct, exact O(1) character positioning for any
 * selection range, completely immune to any captions, chrome, margin, styling,
 * duplicate words, or overlapping spans earlier in the sentence.
 *
 * As a robust fallback, if `data-start` is absent on a node's container,
 * `measureOffset` clones the preceding range, drops any caption chrome subtrees,
 * and measures the remaining text count.
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
 * Resolves a DOM node and offset to an exact character offset within sentenceText.
 * Uses `data-start` / `data-end` when available, falling back to `measureOffset`.
 */
export function getOffsetFromPosition(container, node, nodeOffset, isEnd = false) {
  if (!container || !node) return null;

  // 1. Text node: parent element should carry data-start
  if (node.nodeType === 3) {
    const el = node.parentElement;
    if (el) {
      // If inside caption chrome, find the parent entity's text boundary
      const caption = el.closest(`[${CAPTION_ATTR}]`);
      if (caption) {
        const entitySpan = caption.closest('.group');
        if (entitySpan) {
          const textEl = entitySpan.querySelector('[data-start]');
          if (textEl) {
            return isEnd
              ? Number(textEl.getAttribute('data-end'))
              : Number(textEl.getAttribute('data-start'));
          }
        }
        return null;
      }

      const offsetEl = el.closest('[data-start]');
      if (offsetEl && container.contains(offsetEl)) {
        const baseStart = Number(offsetEl.getAttribute('data-start'));
        if (Number.isFinite(baseStart)) {
          return baseStart + nodeOffset;
        }
      }
    }
  }

  // 2. Element node:
  if (node.nodeType === 1) {
    // If inside caption chrome
    if (node.hasAttribute?.(CAPTION_ATTR) || node.closest?.(`[${CAPTION_ATTR}]`)) {
      const entitySpan = node.closest('.group');
      if (entitySpan) {
        const textEl = entitySpan.querySelector('[data-start]');
        if (textEl) {
          return isEnd
            ? Number(textEl.getAttribute('data-end'))
            : Number(textEl.getAttribute('data-start'));
        }
      }
      return null;
    }

    if (node.hasAttribute?.('data-start')) {
      const s = Number(node.getAttribute('data-start'));
      const e = Number(node.getAttribute('data-end'));
      if (nodeOffset === 0) return s;
      if (nodeOffset >= node.childNodes.length) return e;
      const child = node.childNodes[nodeOffset];
      if (child) return getOffsetFromPosition(container, child, 0, isEnd);
      return s;
    }

    if (node === container || container.contains(node)) {
      const children = Array.from(node.childNodes);
      if (nodeOffset === 0 && children.length > 0) {
        return getOffsetFromPosition(container, children[0], 0, isEnd);
      }
      if (nodeOffset >= children.length && children.length > 0) {
        const last = children[children.length - 1];
        return getOffsetFromPosition(
          container,
          last,
          last.nodeType === 3 ? last.nodeValue.length : last.childNodes.length,
          true
        );
      }
      if (nodeOffset < children.length) {
        return getOffsetFromPosition(container, children[nodeOffset], 0, isEnd);
      }
    }
  }

  // Fallback to DOM-range measurement
  return measureOffset(container, node, nodeOffset);
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
    start = getOffsetFromPosition(container, range.startContainer, range.startOffset, false);
    end = getOffsetFromPosition(container, range.endContainer, range.endOffset, true);
  } catch (_) {
    return null;
  }

  if (start == null || end == null) return null;
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
