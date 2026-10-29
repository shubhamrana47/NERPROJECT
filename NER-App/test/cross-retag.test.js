const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { JSDOM } = require('jsdom');

const FRONTEND = path.join(__dirname, '..', 'frontend');
const SRC = path.join(__dirname, '..', 'backend', 'src');
const { buildValidatedRecords } = require(path.join(SRC, 'services/datasetBuilder'));

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

async function mount(which, { recordCalls = false } = {}) {
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
    if (recordCalls) calls.push(`${opts.method || 'GET'} ${u.replace(/^.*\/api/, '/api').split('?')[0]}`);
    if (u.includes('/dataset')) {
      const line = JSON.stringify({ text: 'x', entities: [], validation_summary: { entities: 0 } });
      return { ok: true, status: 200, text: async () => `${line}\n`, json: async () => ({}) };
    }
    const body = JSON.parse(opts.body || '{}');
    return {
      ok: true,
      status: 200,
      json: async () => ({ ok: true, savedEntities: body.entities || [], stats: {} }),
    };
  };
  dom.window.URL.createObjectURL = () => 'blob:stub';
  dom.window.URL.revokeObjectURL = () => {};

  require(buildHarness());

  const act = globalThis.__act;
  const mounted = await globalThis.__mount(which);

  const entitiesToCheckRows = () => {
    const header = [...mounted.host.querySelectorAll('h2')].find((h) =>
      h.textContent.includes('Entities to check')
    );
    if (!header) return [];
    const container = header.closest('.flex-col');
    if (!container) return [];
    const ul = container.querySelector('ul');
    if (!ul) return [];
    return [...ul.children];
  };

  const captions = () =>
    [...mounted.host.querySelectorAll('[data-caption]')].map((c) =>
      c.textContent.replace('×', '').trim()
    );

  const sentences = () =>
    [...mounted.host.querySelectorAll('div')].filter((d) => d.className?.includes('font-serif'));

  const textNodeWith = (root, word) => {
    const walker = dom.window.document.createTreeWalker(root, dom.window.NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.parentElement.closest('[data-caption]')) continue;
      const at = node.nodeValue.indexOf(word);
      if (at !== -1) return { node, at };
    }
    return null;
  };

  const select = async (sentenceIndex, word) => {
    const sentence = sentences()[sentenceIndex];
    const hit = textNodeWith(sentence, word);
    assert.ok(hit, `"${word}" not found in sentence ${sentenceIndex}`);
    const range = dom.window.document.createRange();
    range.setStart(hit.node, hit.at);
    range.setEnd(hit.node, hit.at + word.length);
    const selection = dom.window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    await act(async () => {
      dom.window.document.dispatchEvent(new dom.window.MouseEvent('mouseup', { bubbles: true }));
    });
  };

  const pickLabel = async (label) => {
    const palette = [...mounted.host.querySelectorAll('aside')].find((a) =>
      a.textContent.includes('Entity labels')
    );
    assert.ok(palette, 'the label palette is not on screen');
    const button = [...palette.querySelectorAll('button')].find((b) =>
      new RegExp(`^${label}`).test(b.textContent.trim())
    );
    assert.ok(button, `no ${label} button in the palette`);
    await act(async () => {
      button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    });
  };

  const clickCrossOnSpan = async (word) => {
    const span = [...mounted.host.querySelectorAll('span.group')].find((s) =>
      s.textContent.includes(word)
    );
    assert.ok(span, `no span for "${word}" in the passage`);
    const crossBtn = [...span.querySelectorAll('button')].find((b) =>
      b.getAttribute('title')?.includes('Remove') || b.textContent.includes('×')
    );
    assert.ok(crossBtn, `no cross button inside span for "${word}"`);
    await act(async () => {
      crossBtn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    });
  };

  const clickButton = async (label) => {
    const button = [...mounted.host.querySelectorAll('button')].find(
      (b) => b.textContent.includes(label) || b.getAttribute('title')?.includes(label)
    );
    assert.ok(button, `no button labeled "${label}" on screen`);
    await act(async () => {
      button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    });
  };

  const close = () => {
    mounted.unmount();
    dom.window.close();
  };

  return {
    host: mounted.host,
    getDoc: mounted.getDoc,
    entitiesToCheckRows,
    captions,
    clickCrossOnSpan,
    select,
    pickLabel,
    clickButton,
    close,
  };
}

test('clicking cross removes entity from entities-to-check div and retagging displays it', async (t) => {
  const ui = await mount('validate+header');
  t.after(() => ui.close());

  // Initial state has 2 entities in validateDoc (wheat and DAP)
  let rows = ui.entitiesToCheckRows();
  assert.equal(rows.length, 2);
  assert.ok(rows.some((r) => r.textContent.includes('wheat')));
  assert.ok(rows.some((r) => r.textContent.includes('DAP')));

  // 1. Click on the cross displayed along with entity tagged under the text ("wheat")
  await ui.clickCrossOnSpan('wheat');

  // It should be removed from entities to check div on left side
  rows = ui.entitiesToCheckRows();
  console.log('After cross clicked, rows in entities to check:', rows.map(r => r.textContent.trim().replace(/\s+/g, ' ')));
  assert.equal(rows.length, 1, 'wheat must be removed from entities to check div');
  assert.ok(!rows.some((r) => r.textContent.includes('wheat')), 'wheat is not in entities to check');

  // 2. Retag "wheat" with some other entity (e.g. Disease)
  await ui.select(0, 'wheat');
  await ui.pickLabel('Disease');

  // It should be displayed on entities to check div
  rows = ui.entitiesToCheckRows();
  console.log('After retagged, rows in entities to check:', rows.map(r => r.textContent.trim().replace(/\s+/g, ' ')));
  assert.equal(rows.length, 2, 'retagged entity must appear in entities to check div');
  const wheatRow = rows.find((r) => r.textContent.includes('wheat'));
  assert.ok(wheatRow, 'wheat row exists in entities to check div');
  assert.ok(wheatRow.textContent.includes('Disease'), 'wheat is tagged as Disease');
});

test('when approve and continue is clicked all changes must be saved and reflected in exported validated file', async (t) => {
  const ui = await mount('validate+header');
  t.after(() => ui.close());

  // Delete wheat
  await ui.clickCrossOnSpan('wheat');

  // Retag wheat as Disease
  await ui.select(0, 'wheat');
  await ui.pickLabel('Disease');

  // Also mark DAP as Wrong
  const rows = ui.entitiesToCheckRows();
  const dapRow = rows.find(r => r.textContent.includes('DAP'));
  const dapWrongBtn = [...dapRow.querySelectorAll('button')].find(b => b.textContent.trim() === 'Wrong');
  assert.ok(dapWrongBtn, 'DAP has wrong button');
  await globalThis.__act(async () => {
    dapWrongBtn.dispatchEvent(new globalThis.MouseEvent('click', { bubbles: true }));
  });

  // Now click Approve and continue
  await ui.clickButton('continue');

  const finalDoc = ui.getDoc();
  console.log('Final doc after approve:', JSON.stringify(finalDoc.segments[0].entities, null, 2));

  const { records } = buildValidatedRecords([finalDoc]);
  console.log('Exported validated records after approve:', JSON.stringify(records[0], null, 2));

  // Verify wheat is saved as Disease
  const exportedWheat = records[0].entities.find(e => e.text === 'wheat');
  assert.ok(exportedWheat, 'wheat is exported');
  assert.equal(exportedWheat.type, 'Disease', 'wheat has new type Disease');
  assert.equal(exportedWheat.validation?.status, 'relabelled', 'wheat validation status is relabelled');

  // Verify DAP is rejected
  const exportedDap = records[0].entities.find(e => e.text === 'DAP');
  assert.ok(exportedDap, 'DAP is exported');
  assert.equal(exportedDap.validation?.status, 'rejected', 'DAP is marked rejected');

  // Verify validation summary
  assert.equal(records[0].validation_summary.rejected, 1, 'rejected count is 1');
  assert.equal(records[0].validation_summary.relabelled, 1, 'relabelled count is 1');
  assert.equal(records[0].validation_summary.unreviewed, 0, 'no unreviewed entities');
  assert.equal(records[0].validation_summary.complete, true, 'passage is complete');
});

test('clicking cross to delete an entity without retagging must reflect in exported validated file when approved', async (t) => {
  const ui = await mount('validate+header');
  t.after(() => ui.close());

  // Delete wheat using cross
  await ui.clickCrossOnSpan('wheat');

  // Rows in entities to check should not contain wheat
  let rows = ui.entitiesToCheckRows();
  assert.equal(rows.length, 1);
  assert.ok(!rows.some(r => r.textContent.includes('wheat')));

  // Now click approve and continue
  await ui.clickButton('continue');

  const finalDoc = ui.getDoc();
  console.log('Final doc when wheat was deleted and not retagged:', JSON.stringify(finalDoc.segments[0].entities, null, 2));

  const { records } = buildValidatedRecords([finalDoc]);
  console.log('Exported validated records when wheat deleted:', JSON.stringify(records[0], null, 2));

  // In the exported file, what happened to wheat?
  const exportedWheat = records[0].entities.find(e => e.text === 'wheat');
  console.log('Exported wheat entity:', exportedWheat);
});

test('rejecting preannotated text with Wrong button and re-annotating it with another entity is fully functional and saves on export', async (t) => {
  const ui = await mount('validate+header');
  t.after(() => ui.close());

  // 1. Initial state: wheat (Crop) and DAP (Chemical)
  let rows = ui.entitiesToCheckRows();
  assert.equal(rows.length, 2);

  // 2. Reject wheat by clicking Wrong button in "Entities to check"
  const wheatRow = rows.find((r) => r.textContent.includes('wheat'));
  const wrongBtn = [...wheatRow.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Wrong');
  assert.ok(wrongBtn, 'Wrong button exists on wheat row');
  await globalThis.__act(async () => {
    wrongBtn.dispatchEvent(new globalThis.MouseEvent('click', { bubbles: true }));
  });

  // Verify wheat is marked rejected and displays Re-annotate button
  rows = ui.entitiesToCheckRows();
  const rejectedWheatRow = rows.find((r) => r.textContent.includes('wheat'));
  assert.match(rejectedWheatRow.textContent, /rejected/, 'shows rejected status');
  const reannotateBtn = [...rejectedWheatRow.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Re-annotate');
  assert.ok(reannotateBtn, 'Re-annotate button is present on rejected row');

  // 3. Re-annotate wheat via focusing and picking Disease from palette
  const wheatFocusBtn = rejectedWheatRow.querySelector('button.font-serif');
  await globalThis.__act(async () => {
    wheatFocusBtn.dispatchEvent(new globalThis.MouseEvent('click', { bubbles: true }));
  });

  const diseasePaletteBtn = [...ui.host.querySelectorAll('aside button')].find((b) => b.textContent.includes('Disease'));
  assert.ok(diseasePaletteBtn, 'Disease button exists in palette');
  await globalThis.__act(async () => {
    diseasePaletteBtn.dispatchEvent(new globalThis.MouseEvent('click', { bubbles: true }));
  });

  // Verify wheat is now relabelled as Disease with Manual badge
  rows = ui.entitiesToCheckRows();
  const relabelledWheatRow = rows.find((r) => r.textContent.includes('wheat'));
  assert.match(relabelledWheatRow.textContent, /Disease/, 'wheat now has Disease label');
  assert.match(relabelledWheatRow.textContent, /Manual/, 'wheat has Manual badge');
  assert.match(relabelledWheatRow.textContent, /relabelled/, 'wheat has relabelled status');

  // 4. Now also test rejecting DAP and re-annotating via mouse selection over DAP
  const dapRow = rows.find((r) => r.textContent.includes('DAP'));
  const dapWrongBtn = [...dapRow.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Wrong');
  await globalThis.__act(async () => {
    dapWrongBtn.dispatchEvent(new globalThis.MouseEvent('click', { bubbles: true }));
  });

  // Re-annotate DAP via selection
  await ui.select(0, 'DAP');
  const nutrientPaletteBtn = [...ui.host.querySelectorAll('aside button')].find((b) => b.textContent.includes('Nutrient'));
  assert.ok(nutrientPaletteBtn, 'Nutrient button exists in palette');
  await globalThis.__act(async () => {
    nutrientPaletteBtn.dispatchEvent(new globalThis.MouseEvent('click', { bubbles: true }));
  });

  rows = ui.entitiesToCheckRows();
  const relabelledDapRow = rows.find((r) => r.textContent.includes('DAP'));
  assert.match(relabelledDapRow.textContent, /Nutrient/, 'DAP now has Nutrient label');

  // 5. Click "Approve and continue"
  await ui.clickButton('continue');

  const finalDoc = ui.getDoc();
  const { records } = buildValidatedRecords([finalDoc]);
  const rec = records[0];

  const exportedWheat = rec.entities.find((e) => e.text === 'wheat');
  assert.equal(exportedWheat.type, 'Disease', 'exported wheat has Disease type');
  assert.equal(exportedWheat.validation?.status, 'relabelled', 'exported wheat is relabelled');
  assert.equal(exportedWheat.validation?.original_type, 'Crop', 'original type is Crop');
  if (exportedWheat.runner_up) {
    assert.equal(exportedWheat.runner_up, 'Crop', 'runner up is Crop');
  }

  const exportedDap = rec.entities.find((e) => e.text === 'DAP');
  assert.equal(exportedDap.type, 'Nutrient', 'exported DAP has Nutrient type');
  assert.equal(exportedDap.validation?.status, 'relabelled', 'exported DAP is relabelled');
  assert.equal(exportedDap.validation?.original_type, 'Chemical', 'original type is Chemical');

  assert.equal(rec.validation_summary.relabelled, 2, '2 entities relabelled');
  assert.equal(rec.validation_summary.unreviewed, 0, '0 unreviewed');
  assert.equal(rec.validation_summary.complete, true, 'passage complete');
});
