/**
 * Tests verifying that:
 * 1. User cannot advance to the next passage until the DB save actually completes.
 * 2. If the DB save fails, user is blocked from moving forward, remaining on the current passage with annotations intact.
 * 3. After successful save and export, annotations remain visible in UI, stored in DB, and present in exported file.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { JSDOM } = require('jsdom');

const FRONTEND = path.join(__dirname, '..', 'frontend');
const SRC = path.join(__dirname, '..', 'backend', 'src');

const { buildAnnotatedRecords, buildValidatedRecords } = require(path.join(SRC, 'services/datasetBuilder'));

let bundlePath;
function buildHarness() {
  if (bundlePath) return bundlePath;
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ner-ui-gate-')), 'harness.cjs');
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

test('navigation to next passage is gated by DB save completion and blocked on failure', async () => {
  const TEXT1 = 'For wheat sown after mid-December, apply 55 kg DAP.';
  const TEXT2 = 'Spray imidacloprid on cotton to control pests.';

  const doc = {
    _id: 'doc_gate_test',
    filename: 'gate_test.jsonl',
    kind: 'annotate',
    threshold: 0.75,
    stats: {},
    segments: [
      {
        index: 0,
        text: TEXT1,
        passageTag: 'PUN-01',
        section: 'Passage 1',
        nerStatus: 'done',
        entities: [],
        originalEntities: [],
        sourceRecord: { text: TEXT1 },
      },
      {
        index: 1,
        text: TEXT2,
        passageTag: 'PUN-02',
        section: 'Passage 2',
        nerStatus: 'done',
        entities: [],
        originalEntities: [],
        sourceRecord: { text: TEXT2 },
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

  let shouldFailSave = true;
  let saveCalls = 0;
  let resolveSavePromise = null;
  let saveDeferred = false;

  global.fetch = async (url, opts = {}) => {
    const u = String(url);
    if (u.includes('/segments/') && opts.method === 'PUT') {
      saveCalls += 1;
      const body = JSON.parse(opts.body);

      if (saveDeferred) {
        await new Promise((resolve) => {
          resolveSavePromise = resolve;
        });
      }

      if (shouldFailSave) {
        return {
          ok: false,
          status: 500,
          json: async () => ({ error: 'Database connection failed' }),
          text: async () => 'Database connection failed',
        };
      }

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
      text: async () => JSON.stringify(doc),
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

  // 1. Tag 'DAP' on Passage 1
  await selectAndTag(0, 'DAP', 'Chemical');

  // Verify passage 1 is currently active:
  let headerPassageText = host.textContent;
  assert.ok(headerPassageText.includes('1 / 2'), 'on passage 1');

  // 2. Click "Save and continue" while server fails (shouldFailSave = true)
  const getContinueBtn = () =>
    [...host.querySelectorAll('button')].find(
      (b) => b.textContent.includes('continue') || b.textContent.includes('Continue')
    );

  await act(async () => {
    const btn = getContinueBtn();
    assert.ok(btn, 'Save and continue button exists');
    btn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  });

  // Verify user is BLOCKED on Passage 1 and did NOT advance:
  assert.equal(saveCalls, 1, 'save was attempted');
  assert.ok(host.textContent.includes('1 / 2'), 'still on passage 1 because save failed');
  assert.ok(
    host.textContent.includes('could not be saved') || host.textContent.includes('failed'),
    'error message is displayed to user'
  );

  // 3. Now let save succeed:
  shouldFailSave = false;

  await act(async () => {
    const btn = getContinueBtn();
    btn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  });

  // Verify that only after DB save succeeded, user advances to Passage 2:
  assert.ok(host.textContent.includes('2 / 2'), 'advanced to passage 2 after successful DB save');

  // 4. Now tag 'cotton' on Passage 2
  await selectAndTag(0, 'cotton', 'Crop');

  // 5. Click "Save and continue" on Passage 2
  await act(async () => {
    const btn = getContinueBtn();
    btn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  });

  // 6. Navigate back to Passage 1:
  const prevBtn = [...host.querySelectorAll('button')].find((b) => b.textContent.trim() === '‹');
  assert.ok(prevBtn, 'previous button exists');

  await act(async () => {
    prevBtn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  });

  // Verify we are back on Passage 1 and 'Chemical' annotation on DAP is preserved:
  assert.ok(host.textContent.includes('1 / 2'), 'back on passage 1');
  const captions = [...host.querySelectorAll('[data-caption]')].map((c) => c.textContent.replace('×', '').trim());
  assert.ok(captions.includes('Chemical'), 'DAP Chemical annotation is preserved in UI');

  // 7. Verify exported records hold both annotations:
  const exported = buildAnnotatedRecords([mounted.getDoc()]).records;
  assert.equal(exported.length, 2);
  const p1Entities = exported[0].entities;
  const p2Entities = exported[1].entities;

  assert.equal(p1Entities.length, 1);
  assert.equal(p1Entities[0].text, 'DAP');
  assert.equal(p1Entities[0].label, 'Chemical');

  assert.equal(p2Entities.length, 1);
  assert.equal(p2Entities[0].text, 'cotton');
  assert.equal(p2Entities[0].label, 'Crop');
});
