const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { JSDOM } = require('jsdom');

const FRONTEND = path.join(__dirname, '..', 'frontend');
const SRC = path.join(__dirname, '..', 'backend', 'src');
const { buildValidatedRecords, buildAnnotatedRecords } = require(path.join(SRC, 'services/datasetBuilder'));
const Document = require(path.join(SRC, 'models/Document'));
const entityController = require(path.join(SRC, 'controllers/entityController'));
const { fakeDoc, invoke } = require('./helpers');

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

test('removing "per acre" and manually annotating "acre" as Field_Area overwrites the entry in-place as manual and saves the rejected pipeline annotation with its sources', async () => {
  const TEXT = 'releases of Trichogramma chilonis @ 20,000 per acre are to be made at 10 days interval.';
  // 'per acre':
  const perAcreStart = TEXT.indexOf('per acre');
  const perAcreEnd = perAcreStart + 'per acre'.length;
  // 'acre':
  const acreStart = TEXT.indexOf('acre');
  const acreEnd = acreStart + 'acre'.length;

  const validateDoc = fakeDoc({
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
            _id: '65f000000000000000000001',
            text: 'per acre',
            label: 'Field_Area',
            start: perAcreStart,
            end: perAcreEnd,
            confidence: 1,
            status: 'accepted',
            source: 'llm',
            sources: ['llm', 'rx_rate'],
            validationStatus: 'unreviewed',
            originalLabel: 'Field_Area',
            originalText: 'per acre',
            originalStart: perAcreStart,
            originalEnd: perAcreEnd,
            originalSources: ['llm', 'rx_rate'],
          },
        ],
        originalEntities: [
          {
            _id: '65f000000000000000000001',
            text: 'per acre',
            label: 'Field_Area',
            start: perAcreStart,
            end: perAcreEnd,
            confidence: 1,
            source: 'llm',
            sources: ['llm', 'rx_rate'],
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
  });

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

  Document.findById = async () => validateDoc;
  let savedPayload = null;
  global.fetch = async (url, opts = {}) => {
    const u = String(url);
    if (opts.method === 'PUT') {
      const body = JSON.parse(opts.body);
      savedPayload = body.entities;
      const res = await invoke(entityController.saveSegmentEntities, {
        params: { id: 'v_peracre', segmentIndex: '0' },
        query: { lean: '1' },
        body,
      });
      return {
        ok: true,
        status: 200,
        json: async () => res.body,
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

  // 3. Click "Approve & Save All"
  const saveBtn = [...host.querySelectorAll('button')].find(
    (b) => b.textContent.includes('Approve & Save All') || b.textContent.includes('Save')
  );
  await act(async () => {
    saveBtn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  });

  // 4. Verify database state (validateDoc.segments[0]):
  const dbSeg = validateDoc.segments[0];
  assert.equal(dbSeg.entities.length, 1, 'database entry was overwritten in-place (not duplicated)');
  const dbEnt = dbSeg.entities[0];
  assert.equal(dbEnt.text, 'acre', 'entity text in database became "acre"');
  assert.equal(dbEnt.label, 'Field_Area', 'entity label is Field_Area');
  assert.equal(dbEnt.start, acreStart);
  assert.equal(dbEnt.end, acreEnd);
  assert.equal(dbEnt.isManual, true, 'tagged as manual');
  assert.deepEqual(dbEnt.sources, ['manual'], 'sources updated to ["manual"]');
  assert.equal(dbEnt.source, 'human');

  // Verify rejected annotation is saved on the entity and on the segment in DB:
  assert.ok(dbEnt.rejectedAnnotation, 'rejectedAnnotation saved on the entity');
  assert.equal(dbEnt.rejectedAnnotation.text, 'per acre', 'rejected text is "per acre"');
  assert.equal(dbEnt.rejectedAnnotation.label, 'Field_Area');
  assert.equal(dbEnt.rejectedAnnotation.start, perAcreStart);
  assert.equal(dbEnt.rejectedAnnotation.end, perAcreEnd);
  assert.deepEqual(dbEnt.rejectedAnnotation.sources, ['llm', 'rx_rate'], 'pipeline sources preserved');

  assert.equal(dbSeg.rejectedAnnotations.length, 1, 'segment-level rejectedAnnotations log has 1 entry');
  assert.equal(dbSeg.rejectedAnnotations[0].text, 'per acre');
  assert.deepEqual(dbSeg.rejectedAnnotations[0].sources, ['llm', 'rx_rate']);

  // 5. Test exported validated records:
  const finalDoc = mounted.getDoc();
  const { records } = buildValidatedRecords([finalDoc]);
  const exportedEntities = records[0].entities;
  assert.equal(exportedEntities.length, 1, 'exported entities list has 1 overwritten entry in-place');

  const exportedAcre = exportedEntities[0];
  assert.equal(exportedAcre.text, 'acre', 'exported entity text is "acre"');
  assert.equal(exportedAcre.type, 'Field_Area');
  assert.equal(exportedAcre.start, acreStart);
  assert.equal(exportedAcre.end, acreEnd);
  assert.deepEqual(exportedAcre.sources, ['manual'], 'exported sources is ["manual"]');
  assert.equal(exportedAcre.source, 'manual');
  assert.ok(exportedAcre.rejected_annotation, 'exported entity includes rejected_annotation');
  assert.equal(exportedAcre.rejected_annotation.text, 'per acre');
  assert.deepEqual(exportedAcre.rejected_annotation.sources, ['llm', 'rx_rate']);
  assert.equal(exportedAcre.validation?.status, 'relabelled');
  assert.equal(exportedAcre.validation?.original_text, 'per acre');
  assert.deepEqual(exportedAcre.validation?.original_sources, ['llm', 'rx_rate']);

  // 6. Verify annotated records export excludes the rejected span and keeps the overwritten "acre" span:
  const { records: annotatedRecords } = buildAnnotatedRecords([finalDoc]);
  const annotatedSpans = annotatedRecords[0].entities;
  assert.equal(annotatedSpans.length, 1);
  assert.equal(annotatedSpans[0].text, 'acre');
  assert.equal(annotatedSpans[0].verified, true);

  try {
    // 7. Verify real Mongoose schema validation passes with rejectedAnnotation (object) and rejectedAnnotations (array of objects):
    const mongooseDoc = new Document({
      filename: validateDoc.filename || 'test.jsonl',
      originalName: validateDoc.originalName || 'test.jsonl',
      kind: validateDoc.kind,
      segments: validateDoc.segments,
    });
    const validationErr = mongooseDoc.validateSync();
    assert.equal(validationErr, undefined, `Mongoose schema validation must succeed without CastError, got: ${validationErr?.message}`);
  } finally {
    mounted.unmount();
    dom.window.close();
  }
});
