const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { JSDOM } = require('jsdom');

const FRONTEND = path.join(__dirname, '..', 'frontend');
const SRC = path.join(__dirname, '..', 'backend', 'src');
const { buildValidatedRecords, buildAnnotatedRecords } = require(path.join(SRC, 'services/datasetBuilder'));

let bundlePath;
function buildHarness() {
  if (bundlePath) return bundlePath;
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ner-ui-peracre-')), 'harness.cjs');
  const esbuild = require(path.join(FRONTEND, 'node_modules', 'esbuild'));
  esbuild.buildSync({
    entryPoints: [path.join(__dirname, 'ui-harness.jsx')],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outfile: out,
    loader: { '.jsx': 'jsx' },
    define: { 'import.meta.env': '{}' },
    nodePaths: [path.join(FRONTEND, 'node_modules')],
    logLevel: 'error',
  });
  bundlePath = out;
  return out;
}

test('trace per acre removal and acre addition in validation mode', async () => {
  const TEXT = 'releases of Trichogramma chilonis @ 20,000 per acre are to be made at 10 days interval.';
  // 'per acre':
  const perAcreStart = TEXT.indexOf('per acre');
  const perAcreEnd = perAcreStart + 'per acre'.length;
  // 'acre':
  const acreStart = TEXT.indexOf('acre');
  const acreEnd = acreStart + 'acre'.length;

  console.log(`per acre: ${perAcreStart}..${perAcreEnd}, acre: ${acreStart}..${acreEnd}`);

  const validateDoc = {
    _id: 'v_peracre',
    filename: 'test_pun50.jsonl',
    kind: 'validate',
    threshold: 0.75,
    stats: {},
    segments: [
      {
        index: 0,
        text: TEXT,
        passageTag: 'PUN-0050',
        section: 'PUN-0050',
        nerStatus: 'provided',
        entities: [
          {
            _id: 'e_per_acre',
            text: 'per acre',
            label: 'Field_Area',
            start: perAcreStart,
            end: perAcreEnd,
            confidence: 1,
            status: 'accepted',
            source: 'llm',
            validationStatus: 'unreviewed',
            originalLabel: 'Field_Area',
          },
        ],
        originalEntities: [
          {
            _id: 'e_per_acre',
            text: 'per acre',
            label: 'Field_Area',
            start: perAcreStart,
            end: perAcreEnd,
            confidence: 1,
            source: 'llm',
          },
        ],
        sourceRecord: {
          text: TEXT,
          passage_tag: 'PUN-0050',
          entities: [
            {
              text: 'per acre',
              type: 'Field_Area',
              start: perAcreStart,
              end: perAcreEnd,
              score: 1,
              sources: ['llm', 'rx_rate'],
            },
          ],
        },
      },
    ],
  };

  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>');
  Object.assign(global, {
    window: dom.window,
    document: dom.window.document,
    Node: dom.window.Node,
    HTMLElement: dom.window.HTMLElement,
    MouseEvent: dom.window.MouseEvent,
    Event: dom.window.Event,
    getComputedStyle: dom.window.getComputedStyle,
    alert: () => {},
    IS_REACT_ACT_ENVIRONMENT: true,
  });

  let savedPayload = null;
  global.fetch = async (url, opts = {}) => {
    const u = String(url);
    if (opts.method === 'PUT') {
      savedPayload = JSON.parse(opts.body).entities;
      console.log('PUT entities payload:', JSON.stringify(savedPayload, null, 2));
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          savedEntities: savedPayload.map((e, idx) => ({ ...e, _id: e._id || `db_id_${idx}` })),
          stats: {},
        }),
      };
    }
    return { ok: true, status: 200, json: async () => ({}) };
  };

  require(buildHarness());
  const act = globalThis.__act;
  const mounted = await globalThis.__mount({ doc: validateDoc });
  const host = mounted.host;

  // 1. Delete "per acre"
  const perAcreSpan = [...host.querySelectorAll('span.group')].find((s) => s.textContent.includes('per acre'));
  assert.ok(perAcreSpan, 'per acre span found');
  const crossBtn = [...perAcreSpan.querySelectorAll('button')].find(
    (b) => b.getAttribute('title')?.includes('Remove') || b.textContent.includes('×')
  );
  await act(async () => {
    crossBtn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  });

  console.log('After deleting per acre, spans on screen:', [...host.querySelectorAll('[data-caption]')].map(c => c.textContent.trim()));

  // 2. Select only "acre"
  const sentences = [...host.querySelectorAll('div')].filter((d) => d.className?.includes('font-serif'));
  const walker = dom.window.document.createTreeWalker(sentences[0], dom.window.NodeFilter.SHOW_TEXT);
  let node;
  let hit = null;
  while ((node = walker.nextNode())) {
    if (node.parentElement.closest('[data-caption]')) continue;
    const at = node.nodeValue.indexOf('acre');
    if (at !== -1) {
      hit = { node, at };
      break;
    }
  }
  assert.ok(hit, 'text node with "acre" found');

  const range = dom.window.document.createRange();
  range.setStart(hit.node, hit.at);
  range.setEnd(hit.node, hit.at + 'acre'.length);
  const selection = dom.window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);

  await act(async () => {
    dom.window.document.dispatchEvent(new dom.window.MouseEvent('mouseup', { bubbles: true }));
  });

  // Pick Field Area
  const palette = [...host.querySelectorAll('aside')].find((a) => a.textContent.includes('Entity labels'));
  assert.ok(palette, 'label palette found');
  const fieldAreaBtn = [...palette.querySelectorAll('button')].find((b) => b.textContent.includes('Field Area') || b.textContent.includes('Field_Area'));
  assert.ok(fieldAreaBtn, 'Field Area button found');
  await act(async () => {
    fieldAreaBtn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  });

  console.log('After selecting acre as Field Area, captions on screen:', [...host.querySelectorAll('[data-caption]')].map(c => c.textContent.trim()));

  // 3. Click "Approve & Save All"
  const saveBtn = [...host.querySelectorAll('button')].find(
    (b) => b.textContent.includes('Approve & Save All') || b.textContent.includes('Save')
  );
  await act(async () => {
    saveBtn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  });

  // 4. Test exported records:
  const finalDoc = mounted.getDoc();
  console.log('Final doc segments entities:', JSON.stringify(finalDoc.segments[0].entities, null, 2));

  const { records } = buildValidatedRecords([finalDoc]);
  console.log('Exported validated records entities:', JSON.stringify(records[0].entities, null, 2));

  const exportedEntities = records[0].entities;
  const exportedPerAcre = exportedEntities.find((e) => e.text === 'per acre');
  assert.ok(exportedPerAcre, 'per acre must be present in exported entities');
  assert.equal(exportedPerAcre.validation?.status, 'rejected', 'per acre must be marked rejected');

  const exportedAcre = exportedEntities.find((e) => e.text === 'acre');
  assert.ok(exportedAcre, 'acre must be present in exported entities');
  assert.equal(exportedAcre.validation?.status, 'added', 'acre must be marked added');

  // Verify annotated records export excludes the rejected span and keeps the added span
  const { records: annotatedRecords } = buildAnnotatedRecords([finalDoc]);
  const annotatedSpans = annotatedRecords[0].entities;
  assert.ok(!annotatedSpans.some((e) => e.text === 'per acre'), 'per acre must not be in annotated export');
  assert.ok(annotatedSpans.some((e) => e.text === 'acre'), 'acre must be in annotated export');

  mounted.unmount();
  dom.window.close();
});
