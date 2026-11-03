const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { JSDOM } = require('jsdom');

const FRONTEND = path.join(__dirname, '..', 'frontend');
const SRC = path.join(__dirname, '..', 'backend', 'src');
const { buildAnnotatedRecords } = require(path.join(SRC, 'services/datasetBuilder'));

let bundlePath;
function buildHarness() {
  if (bundlePath) return bundlePath;
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ner-ui-')), 'harness.cjs');
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

test('revisiting previous passages preserves all annotations across navigation and background predictions', async (t) => {
  const TEXT1 = 'For wheat sown after mid-December, apply 55 kg DAP per acre at sowing.';
  const TEXT2 = 'Spray imidacloprid on cotton to control whitefly during flowering.';
  const TEXT3 = 'Farmers should contact the extension office in Ludhiana.';

  const doc = {
    _id: 'doc1',
    filename: 'test_multi.jsonl',
    kind: 'annotate',
    threshold: 0.75,
    stats: {},
    segments: [
      {
        index: 0,
        text: TEXT1,
        passageTag: 'PUN-0001',
        section: 'Passage 1',
        nerStatus: 'pending',
        entities: [],
        originalEntities: [],
        sourceRecord: { text: TEXT1 },
      },
      {
        index: 1,
        text: TEXT2,
        passageTag: 'PUN-0002',
        section: 'Passage 2',
        nerStatus: 'pending',
        entities: [],
        originalEntities: [],
        sourceRecord: { text: TEXT2 },
      },
      {
        index: 2,
        text: TEXT3,
        passageTag: 'PUN-0003',
        section: 'Passage 3',
        nerStatus: 'pending',
        entities: [],
        originalEntities: [],
        sourceRecord: { text: TEXT3 },
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
    getComputedStyle: dom.window.getComputedStyle,
    IS_REACT_ACT_ENVIRONMENT: true,
  });

  const calls = [];
  global.fetch = async (url, opts = {}) => {
    const u = String(url);
    calls.push(`${opts.method || 'GET'} ${u}`);
    const body = opts.body ? JSON.parse(opts.body) : {};

    if (u.includes('/predict')) {
      // Simulate background model prediction returning for passage 0 and 1
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          predicted: [
            {
              index: 0,
              nerStatus: 'done',
              entities: [{ text: 'wheat', label: 'Crop', start: 4, end: 9, confidence: 0.9, source: 'model' }],
            },
            {
              index: 1,
              nerStatus: 'done',
              entities: [{ text: 'cotton', label: 'Crop', start: 22, end: 28, confidence: 0.9, source: 'model' }],
            },
          ],
          stats: {},
          pending: 1,
        }),
      };
    }

    return {
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        savedEntities: (body.entities || []).map((e, idx) => ({ ...e, _id: e._id || `id_${idx}` })),
        stats: {},
      }),
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

  // 1. On passage 1: Tag DAP as Chemical
  await selectAndTag(0, 'DAP', 'Chemical');

  // Verify caption
  let captions = [...host.querySelectorAll('[data-caption]')].map((c) => c.textContent.replace('×', '').trim());
  assert.ok(captions.includes('Chemical'), 'DAP is tagged as Chemical on passage 1');

  // 2. Click "Approve & Save All" then "Next"
  const saveBtn = [...host.querySelectorAll('button')].find((b) => b.textContent.includes('Save'));
  await act(async () => {
    saveBtn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  });

  const nextBtn = [...host.querySelectorAll('button')].find((b) =>
    b.textContent.includes('Next') || b.textContent.toLowerCase().includes('continue')
  );
  assert.ok(nextBtn, 'next button found');

  await act(async () => {
    nextBtn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  });

  // Verify on passage 2
  assert.equal(host.querySelector('h1')?.textContent.trim(), 'Passage 2');

  // 3. On passage 2: Tag cotton as Crop
  await selectAndTag(0, 'cotton', 'Crop');
  captions = [...host.querySelectorAll('[data-caption]')].map((c) => c.textContent.replace('×', '').trim());
  assert.ok(captions.includes('Crop'), 'cotton is tagged as Crop on passage 2');

  // 4. Click "Approve & Save All" then "Next" to go to passage 3
  await act(async () => {
    const sBtn = [...host.querySelectorAll('button')].find((b) => b.textContent.includes('Save'));
    sBtn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  });

  await act(async () => {
    const btn = [...host.querySelectorAll('button')].find((b) =>
      b.textContent.includes('Next') || b.textContent.toLowerCase().includes('continue')
    );
    btn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  });
  assert.equal(host.querySelector('h1')?.textContent.trim(), 'Passage 3');

  // 5. Revisit passage 2 (click Previous)
  const prevBtn = [...host.querySelectorAll('button')].find((b) => b.getAttribute('title')?.includes('Previous'));
  await act(async () => {
    prevBtn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  });
  assert.equal(host.querySelector('h1')?.textContent.trim(), 'Passage 2');

  captions = [...host.querySelectorAll('[data-caption]')].map((c) => c.textContent.replace('×', '').trim());
  console.log('Passage 2 captions upon revisiting:', captions);
  assert.ok(captions.includes('Crop'), 'Passage 2 preserves Crop annotation');

  // 6. Revisit passage 1 (click Previous again)
  await act(async () => {
    prevBtn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  });
  assert.equal(host.querySelector('h1')?.textContent.trim(), 'Passage 1');

  captions = [...host.querySelectorAll('[data-caption]')].map((c) => c.textContent.replace('×', '').trim());
  console.log('Passage 1 captions upon revisiting:', captions);
  assert.ok(captions.includes('Chemical'), 'Passage 1 preserves Chemical annotation');

  // 7. Verify exported file contains the saved annotations
  const finalDoc = mounted.getDoc();
  const { records } = buildAnnotatedRecords([finalDoc]);
  console.log('Exported records count:', records.length);
  assert.equal(records.length, 3, 'all 3 records exported');

  const p1DAP = records[0].entities.find((e) => e.text === 'DAP');
  assert.ok(p1DAP, 'DAP is in exported record 0');
  assert.equal(p1DAP.label, 'Chemical');

  const p2Cotton = records[1].entities.find((e) => e.text === 'cotton');
  assert.ok(p2Cotton, 'cotton is in exported record 1');
  assert.equal(p2Cotton.label, 'Crop');

  mounted.unmount();
  dom.window.close();
});
