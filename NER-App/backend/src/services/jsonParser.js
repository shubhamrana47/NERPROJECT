/**
 * Agricultural Document JSON Parser.
 *
 * Requirements:
 * 1. Select Only Advisory Sections: Extracts only actual advisory sections,
 *    filtering out table of contents, weather forecast summaries, metadata headers,
 *    and warnings without impact.
 * 2. Single Block Extraction: Combines all content from an entire advisory section
 *    (e.g., Crop Specific Advisory, Horticulture Specific Advisory) into a single cohesive segment.
 * 3. Graceful Fallback: Supports { pages: [...] }, { test_cases: [...] }, and arbitrary JSON.
 */

const EXCLUDED_SECTION_KEYWORDS = [
  'table of contents',
  'contents',
  'forecast summary',
  'weather warning',
  'weather warnings',
  'gramin krishi mausam',
  'agromet advisory bulletin',
  'parameter',
  'disclaimer',
];

const KNOWN_ADVISORY_TITLES = [
  'crop specific advisory',
  'crop advisory',
  'horticulture specific advisory',
  'horticulture advisory',
  'live stock specific advisory',
  'livestock specific advisory',
  'animal husbandry',
  'general advisory',
  'sms advisory',
  'impact based advisories',
  'impact based advisory',
  'associated agromet advisories',
];

const DUMMY_VALUES = new Set(['no impact', 'no warning', 'none', 'nil', 'n/a', '-']);

function isDummyText(str) {
  if (!str) return true;
  return DUMMY_VALUES.has(String(str).trim().toLowerCase());
}

function parseSectionContent(section) {
  const parts = [];
  const tables = Array.isArray(section.tables) ? section.tables : [];
  const textBlocks = Array.isArray(section.text_blocks) ? section.text_blocks : [];
  const listItems = Array.isArray(section.list_items) ? section.list_items : [];

  // 1. Extract from tables (e.g. Crop Specific Advisory, Horticulture Specific Advisory)
  tables.forEach((t) => {
    const rows = Array.isArray(t.rows) ? t.rows : [];
    rows.forEach((r) => {
      if (r && typeof r === 'object' && !Array.isArray(r)) {
        let itemLabel = '';
        let advisoryText = '';
        Object.entries(r).forEach(([k, v]) => {
          const val = String(v ?? '').trim();
          if (!val) return;
          const kLower = k.toLowerCase();
          if (kLower.includes('advisory')) {
            advisoryText = val;
          } else {
            itemLabel = val;
          }
        });
        if (advisoryText && !isDummyText(advisoryText)) {
          if (itemLabel && !advisoryText.toLowerCase().startsWith(itemLabel.toLowerCase())) {
            parts.push(`${itemLabel}: ${advisoryText}`);
          } else {
            parts.push(advisoryText);
          }
        }
      } else if (Array.isArray(r)) {
        const rowStr = r.map((c) => String(c ?? '').trim()).filter(Boolean).join(' ');
        if (rowStr && !isDummyText(rowStr)) parts.push(rowStr);
      }
    });
  });

  // 2. Extract from text blocks
  textBlocks.forEach((tb) => {
    const text = String(typeof tb === 'string' ? tb : tb?.text ?? '').trim();
    if (!text || isDummyText(text)) return;
    const tLower = text.toLowerCase();
    // Exclude app links / boilerplate
    if (
      tLower.startsWith('mausam mobileapp link') ||
      tLower.startsWith('meghdoot mobileapp link') ||
      tLower.startsWith('damini mobileapp link')
    ) {
      return;
    }
    parts.push(text);
  });

  // 3. Extract from list items
  listItems.forEach((li) => {
    const text = String(typeof li === 'string' ? li : li?.text ?? '').trim();
    if (text && !isDummyText(text)) parts.push(text);
  });

  return parts;
}

function parseDocument(json) {
  const segments = [];
  const add = (text, meta) => {
    text = String(text || '').trim();
    if (text && text.split(/\s+/).length >= 3) {
      segments.push({ index: segments.length, text, ...meta });
    }
  };

  const root = Array.isArray(json) ? json : [json];
  let processedSections = false;

  // Process structured sections format (PAU / Agromet / Docling)
  root.forEach((docItem) => {
    if (docItem && Array.isArray(docItem.sections)) {
      docItem.sections.forEach((s) => {
        const heading = (s.heading || '').trim();
        const hdLower = heading.toLowerCase();

        // Check if table headers indicate an advisory
        let tableAdvisoryHeader = null;
        if (Array.isArray(s.tables)) {
          s.tables.forEach((t) => {
            (t.headers || []).forEach((h) => {
              if (String(h).toLowerCase().includes('advisory')) {
                tableAdvisoryHeader = h;
              }
            });
          });
        }

        // Check exclusion keywords
        if (EXCLUDED_SECTION_KEYWORDS.some((kw) => hdLower.includes(kw))) {
          return;
        }

        // Determine if this is an advisory section
        let isAdvisory = false;
        let cleanTitle = heading;

        if (KNOWN_ADVISORY_TITLES.some((t) => hdLower.includes(t))) {
          isAdvisory = true;
        } else if (hdLower.includes('advisory') || hdLower.includes('advisories')) {
          isAdvisory = true;
        } else if (
          (heading === '__preamble__' || !heading || hdLower.includes('preamble')) &&
          tableAdvisoryHeader
        ) {
          isAdvisory = true;
          cleanTitle = tableAdvisoryHeader;
        }

        if (!isAdvisory) return;

        // Extract entire section as a single block
        const parts = parseSectionContent(s);
        if (parts.length > 0) {
          const combinedSectionText = parts.join('\n\n').trim();
          const pageNo = Array.isArray(s.page_range) ? s.page_range[0] : (s.page ?? 1);
          const normalizedTitle = cleanTitle
            .replace(/[:\s]+$/, '')
            .replace(/^__preamble__$/i, 'Crop Specific Advisory');

          add(combinedSectionText, {
            section: normalizedTitle,
            heading: heading || normalizedTitle,
            page: pageNo,
          });
          processedSections = true;
        }
      });
    }
  });

  if (processedSections && segments.length > 0) {
    return segments;
  }

  // Fallback 1: Pages format { pages: [{ page, paragraphs | text }] }
  let usedPages = false;
  root.forEach((item) => {
    if (item && Array.isArray(item.pages)) {
      item.pages.forEach((pg, i) => {
        const pageNo = pg.page ?? pg.page_number ?? pg.pageNumber ?? i + 1;
        const paras = pg.paragraphs || pg.paras;
        if (Array.isArray(paras)) {
          const validParas = paras
            .map((p) => (typeof p === 'string' ? p : p?.text || p?.content || ''))
            .map((t) => t.trim())
            .filter((t) => t && !/^table of contents/i.test(t) && !isDummyText(t));
          if (validParas.length > 0) {
            add(validParas.join('\n\n'), { page: pageNo, section: `Page ${pageNo} Advisory` });
          }
        } else {
          const t = pg.text || pg.content;
          if (typeof t === 'string' && t.trim() && !/^table of contents/i.test(t.trim())) {
            add(t.trim(), { page: pageNo, section: `Page ${pageNo} Advisory` });
          }
        }
      });
      usedPages = true;
    }
  });

  if (usedPages && segments.length > 0) {
    return segments;
  }

  // Fallback 2: Handle test_cases format e.g. { test_cases: [{ text }] }
  root.forEach((item) => {
    if (item && Array.isArray(item.test_cases)) {
      item.test_cases.forEach((tc, i) => {
        if (tc && typeof tc.text === 'string') {
          add(tc.text, { section: tc.id || `Test Case ${i + 1}` });
        }
      });
    }
  });

  if (segments.length > 0) return segments;

  // Fallback 3: Walk general JSON collecting candidate string values
  const walk = (node, path) => {
    if (typeof node === 'string') {
      const trimmed = node.trim();
      if (!/^table of contents/i.test(trimmed) && !isDummyText(trimmed) && trimmed.split(/\s+/).length >= 3) {
        add(trimmed, { path });
      }
    } else if (Array.isArray(node)) {
      node.forEach((v, i) => walk(v, `${path}[${i}]`));
    } else if (node && typeof node === 'object') {
      Object.entries(node).forEach(([k, v]) => walk(v, path ? `${path}.${k}` : k));
    }
  };
  walk(json, '');

  return segments;
}

module.exports = { parseDocument };
