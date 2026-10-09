/**
 * Flexible JSON parser: turns an arbitrary dataset JSON into text segments.
 * Understands { pages: [{ page|page_number, text | paragraphs: [...] }] }
 * and otherwise walks the whole JSON collecting string values with >= 3 words.
 */
const paraText = (p) =>
  typeof p === 'string' ? p : p && (p.text || p.content || p.paragraph) || '';

function parseDocument(json) {
  const segments = [];
  const add = (text, meta) => {
    text = String(text || '').trim();
    if (text) segments.push({ index: segments.length, text, ...meta });
  };

  const root = Array.isArray(json) ? json : [json];
  let usedPages = false;

  const handlePages = (pages) => {
    pages.forEach((pg, i) => {
      const pageNo = pg.page ?? pg.page_number ?? pg.pageNumber ?? i + 1;
      const paras = pg.paragraphs || pg.paras;
      if (Array.isArray(paras)) {
        paras.forEach((p, j) => add(paraText(p), { page: pageNo, paragraph: j + 1 }));
      } else {
        const t = pg.text || pg.content;
        if (typeof t === 'string') {
          t.split(/\n{2,}/).forEach((p, j) => add(p, { page: pageNo, paragraph: j + 1 }));
        }
      }
    });
    usedPages = true;
  };

  root.forEach((item) => {
    if (item && Array.isArray(item.pages)) handlePages(item.pages);
  });

  if (!usedPages) {
    const walk = (node, path) => {
      if (typeof node === 'string') {
        if (node.trim().split(/\s+/).length >= 3) add(node, { path });
      } else if (Array.isArray(node)) {
        node.forEach((v, i) => walk(v, `${path}[${i}]`));
      } else if (node && typeof node === 'object') {
        Object.entries(node).forEach(([k, v]) => walk(v, path ? `${path}.${k}` : k));
      }
    };
    walk(json, '');
  }
  return segments;
}

module.exports = { parseDocument };
