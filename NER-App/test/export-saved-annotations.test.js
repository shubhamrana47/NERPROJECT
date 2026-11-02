/**
 * Test verifying that all annotation changes are successfully saved and reflected
 * in exported files across various formats and interaction workflows.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { JSDOM } = require('jsdom');

const FRONTEND = path.join(__dirname, '..', 'frontend');
const SRC = path.join(__dirname, '..', 'backend', 'src');

const {
  buildAnnotatedRecords,
  buildValidatedRecords,
  buildRows,
} = require(path.join(SRC, 'services/datasetBuilder'));
const exportController = require(path.join(SRC, 'controllers/exportController'));
const Document = require(path.join(SRC, 'models/Document'));
const { fakeDoc, invoke } = require('./helpers');

let bundlePath;
function buildHarness() {
  if (bundlePath) return bundlePath;
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ner-ui-export-')), 'harness.cjs');
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

test('exporting retains human verified annotations even when unreviewed model span starts earlier and overlaps', () => {
  const text = 'For late sown wheat, apply 55 kg DAP per acre at sowing.';
  const seg = {
    index: 0,
    text,
    sourceRecord: { text },
    nerStatus: 'done',
    entities: [
      {
        // Unreviewed model span that starts earlier: 'apply 55 kg DAP' (start 21, end 36)
        text: 'apply 55 kg DAP',
        label: 'Chemical',
        start: 21,
        end: 36,
        confidence: 0.9,
        status: 'accepted',
        source: 'model',
      },
      {
        // Human added / approved annotation: '55 kg DAP' (start 27, end 36)
        text: '55 kg DAP',
        label: 'Chemical',
        start: 27,
        end: 36,
        confidence: 1.0,
        status: 'approved',
        source: 'human',
        isManual: true,
      },
    ],
  };

  const doc = {
    filename: 'test.jsonl',
    kind: 'annotate',
    segments: [seg],
  };

  const { records, issues } = buildAnnotatedRecords([doc], { resolveOverlaps: true });
  assert.equal(records.length, 1);
  const exportedEntities = records[0].entities;

  // The human annotation '55 kg DAP' must be preserved in the export:
  assert.equal(exportedEntities.length, 1);
  assert.equal(exportedEntities[0].text, '55 kg DAP');
  assert.equal(exportedEntities[0].start, 27);
  assert.equal(exportedEntities[0].end, 36);
  assert.equal(exportedEntities[0].verified, true);
  assert.equal(exportedEntities[0].source, 'human');
  assert.equal(issues.overlaps_removed, 1);
});

test('casing differences between entity text and passage text do not drop the annotation from export', () => {
  const text = 'apply 55 kg urea per acre.';
  const seg = {
    index: 0,
    text,
    sourceRecord: { text },
    nerStatus: 'done',
    entities: [
      {
        // Capitalized 'Urea' while text has lowercase 'urea'
        text: 'Urea',
        label: 'Chemical',
        start: 12,
        end: 16,
        confidence: 1.0,
        status: 'approved',
        source: 'human',
      },
    ],
  };

  const doc = {
    filename: 'test.jsonl',
    kind: 'annotate',
    segments: [seg],
  };

  const { records, issues } = buildAnnotatedRecords([doc]);
  assert.equal(records.length, 1);
  assert.equal(records[0].entities.length, 1);
  assert.equal(records[0].entities[0].text, 'urea');
  assert.equal(records[0].entities[0].label, 'Chemical');
  assert.equal(issues.offset_mismatch_dropped, 0);
});

test('all changes (add, relabel, reject, confirm) in validation document are saved into exported validated file', () => {
  const source = {
    text: 'For wheat sown after mid-December, apply 55 kg DAP per acre.',
    entities: [
      { text: 'wheat', type: 'Crop', start: 4, end: 9, score: 0.95 },
      { text: 'mid-December', type: 'Date_and_Time', start: 21, end: 33, score: 0.92 },
      { text: '55 kg', type: 'Quantity', start: 41, end: 46, score: 0.88 },
      { text: 'DAP', type: 'Chemical', start: 47, end: 50, score: 0.9 },
      { text: 'acre', type: 'Field_Area', start: 55, end: 59, score: 0.85 },
    ],
  };

  const seg = {
    index: 0,
    text: source.text,
    sourceRecord: source,
    entities: [
      // 1. Confirmed
      { text: 'wheat', label: 'Crop', start: 4, end: 9, validationStatus: 'confirmed', status: 'approved', source: 'human' },
      // 2. Relabelled from Date_and_Time to Season
      {
        text: 'mid-December',
        label: 'Season',
        originalLabel: 'Date_and_Time',
        start: 21,
        end: 33,
        validationStatus: 'relabelled',
        status: 'edited',
        source: 'human',
        isManual: true,
      },
      // 3. Rejected (deleted)
      { text: '55 kg', label: 'Quantity', start: 41, end: 46, validationStatus: 'rejected', status: 'deleted', source: 'human' },
      // 4. Unreviewed DAP stays unreviewed
      { text: 'DAP', label: 'Chemical', start: 47, end: 50, validationStatus: 'unreviewed', status: 'accepted', source: 'llm' },
      // 5. Rejected acre
      { text: 'acre', label: 'Field_Area', start: 55, end: 59, validationStatus: 'rejected', status: 'deleted', source: 'human' },
      // 6. User added new entity 'sown' as Agri_Process
      { text: 'sown', label: 'Agri_Process', start: 10, end: 14, validationStatus: 'added', status: 'approved', source: 'human' },
    ],
  };

  const doc = {
    filename: 'val_test.jsonl',
    kind: 'validate',
    segments: [seg],
  };

  const { records, totals } = buildValidatedRecords([doc]);
  assert.equal(records.length, 1);
  const out = records[0];

  assert.equal(totals.confirmed, 1);
  assert.equal(totals.relabelled, 1);
  assert.equal(totals.rejected, 2);
  assert.equal(totals.added, 1);
  assert.equal(totals.unreviewed, 1);

  // Check confirmed
  const wheat = out.entities.find((e) => e.text === 'wheat');
  assert.equal(wheat.validation.status, 'confirmed');

  // Check relabelled
  const dec = out.entities.find((e) => e.text === 'mid-December');
  assert.equal(dec.type, 'Season');
  assert.equal(dec.validation.status, 'relabelled');
  assert.equal(dec.validation.original_type, 'Date_and_Time');

  // Check rejected
  const kg = out.entities.find((e) => e.text === '55 kg');
  assert.equal(kg.validation.status, 'rejected');

  // Check addition
  const sown = out.entities.find((e) => e.text === 'sown');
  assert.equal(sown.type, 'Agri_Process');
  assert.equal(sown.validation.status, 'added');
});

test('training data export excludes rejected and deleted entities while keeping approved/edited ones', async () => {
  const doc = fakeDoc({
    _id: 'd1',
    filename: 'training.jsonl',
    kind: 'validate',
    segments: [
      {
        index: 0,
        text: 'Wheat needs DAP fertilizer.',
        entities: [
          { text: 'Wheat', label: 'Crop', start: 0, end: 5, status: 'approved', validationStatus: 'confirmed' },
          { text: 'needs', label: 'Other', start: 6, end: 11, status: 'deleted', validationStatus: 'rejected' },
          { text: 'DAP', label: 'Chemical', start: 12, end: 15, status: 'edited', validationStatus: 'relabelled' },
        ],
      },
    ],
  });

  Document.find = async () => [doc];

  const res = await invoke(exportController.trainingData, {
    params: { id: 'd1' },
    query: { download: 'false' },
  });

  const rows = res.body;
  assert.equal(rows.length, 1);
  const entTexts = rows[0].entities.map((e) => e.text);
  assert.ok(entTexts.includes('Wheat'), 'approved entity is in training export');
  assert.ok(entTexts.includes('DAP'), 'edited entity is in training export');
  assert.ok(!entTexts.includes('needs'), 'rejected/deleted entity is excluded from training export');
});

test('UI flushPending flushes dirty in-memory annotations before export is downloaded', async () => {
  const TEXT = 'Wheat is grown extensively in Punjab.';
  const doc = {
    _id: 'doc_flush',
    filename: 'flush_test.jsonl',
    kind: 'annotate',
    threshold: 0.75,
    stats: {},
    segments: [
      {
        index: 0,
        text: TEXT,
        passageTag: 'PUN-100',
        section: 'Passage 1',
        nerStatus: 'done',
        entities: [],
        originalEntities: [],
        sourceRecord: { text: TEXT },
      },
    ],
  };

  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>');
  dom.window.alert = () => {};
  Object.assign(global, {
    window: dom.window,
    document: dom.window.document,
    Node: dom.window.Node,
    HTMLElement: dom.window.HTMLElement,
    MouseEvent: dom.window.MouseEvent,
    getComputedStyle: dom.window.getComputedStyle,
    alert: () => {},
    IS_REACT_ACT_ENVIRONMENT: true,
  });

  const savedRequests = [];
  global.fetch = async (url, opts = {}) => {
    const u = String(url);
    if (u.includes('/segments/') && opts.method === 'PUT') {
      const body = JSON.parse(opts.body);
      savedRequests.push({ url: u, body });
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          savedCount: body.entities.length,
          savedEntities: body.entities.map((e, i) => ({ ...e, _id: `stored_${i}` })),
        }),
      };
    }
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ text: TEXT, entities: [] }),
      blob: async () => ({ size: 50 }),
      json: async () => ({ ok: true }),
    };
  };

  require(buildHarness());
  const act = globalThis.__act;
  const mounted = await globalThis.__mount(doc);
  const host = mounted.host;

  const selectAndTag = async (sentenceIndex, word, label) => {
    const sentences = [...host.querySelectorAll('div')].filter((d) => d.className?.includes('font-serif'));
    const walker = dom.window.document.createTreeWalker(sentences[sentenceIndex], dom.window.NodeFilter.SHOW_TEXT);
    let node;
    let hit = null;
    while ((node = walker.nextNode())) {
      if (node.parentElement.closest('[data-caption]')) continue;
      const at = node.nodeValue.indexOf(word);
      if (at !== -1) {
        hit = { node, at };
        break;
      }
    }
    assert.ok(hit, `${word} text found`);

    const range = dom.window.document.createRange();
    range.setStart(hit.node, hit.at);
    range.setEnd(hit.node, hit.at + word.length);
    const selection = dom.window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    await act(async () => {
      dom.window.document.dispatchEvent(new dom.window.MouseEvent('mouseup', { bubbles: true }));
    });

    const allButtons = [...host.querySelectorAll('button')];
    const labelBtn = allButtons.find((b) => b.textContent.includes(label));
    assert.ok(labelBtn, `${label} button found`);

    await act(async () => {
      labelBtn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    });
  };

  // Tag 'Wheat' as Crop
  await selectAndTag(0, 'Wheat', 'Crop');

  // Verify that an in-flight un-persisted change exists:
  assert.equal(savedRequests.length, 0, 'no save request before export or approve');

  // Now simulate Export button being clicked (which calls flushPending / flushPendingWork):
  await act(async () => {
    const exportBtn = Array.from(host.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Download') || b.textContent.includes('Export')
    );
    if (exportBtn) {
      exportBtn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    }
  });

  // Verify flushPending executed and saved the newly added entity:
  assert.ok(savedRequests.length >= 1, 'flushPending triggered saveSegmentEntities');
  const savedEnts = savedRequests[0].body.entities;
  assert.equal(savedEnts.length, 1);
  assert.equal(savedEnts[0].text, 'Wheat');
  assert.equal(savedEnts[0].label, 'Crop');
});
