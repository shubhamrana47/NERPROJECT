/**
 * Selecting words and turning them into a span, driven through the real
 * components in a DOM.
 *
 * This exists because the failures here are invisible to logic tests: an
 * element-level mouseup handler that never fires when the mouse is released
 * just outside the sentence, a selection crossing two sentences that resolves
 * to nothing, an offset thrown off by the little label captions. Each one looks
 * exactly like a tagger that does not work, and each one has happened.
 *
 * React and esbuild come from the frontend workspace; jsdom is a devDependency
 * of this package. No database and no network.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const FRONTEND = path.join(__dirname, '..', 'frontend');
const fromFrontend = (m) => require(require.resolve(m, { paths: [FRONTEND] }));

const { execFileSync } = require('node:child_process');

const { JSDOM } = require('jsdom');

const TWO_SENTENCES =
  'For wheat sown after mid-December, apply 55 kg DAP per acre at sowing. ' +
  'Broadcast 45 kg urea for timely sown crops in Punjab during January.';

/** Bundles the harness once, so the suite does not pay for it per test. */
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

/** A DOM with the app mounted, plus helpers to drive it. */
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
  // the export hands a blob to the browser; jsdom has no object URLs
  dom.window.URL.createObjectURL = () => 'blob:stub';
  dom.window.URL.revokeObjectURL = () => {};

  // required once; it reads the current global document when mounting
  require(buildHarness());

  const act = globalThis.__act;
  const mounted = await globalThis.__mount(which);

  const sentences = () =>
    [...mounted.host.querySelectorAll('div')].filter((d) => d.className?.includes('font-serif'));
  const captions = () =>
    [...mounted.host.querySelectorAll('[data-caption]')].map((c) =>
      c.textContent.replace('×', '').trim()
    );
  const paragraphs = () =>
    [...mounted.host.querySelectorAll('p')].map((p) => p.textContent.trim());

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

  /** Selects a word and releases the mouse wherever asked. */
  const select = async (sentenceIndex, word, releaseOn = 'sentence') => {
    const sentence = sentences()[sentenceIndex];
    const hit = textNodeWith(sentence, word);
    assert.ok(hit, `"${word}" not found in sentence ${sentenceIndex}`);
    const range = dom.window.document.createRange();
    range.setStart(hit.node, hit.at);
    range.setEnd(hit.node, hit.at + word.length);
    const selection = dom.window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    const target = releaseOn === 'sentence' ? sentence : dom.window.document.body;
    await act(async () => {
      target.dispatchEvent(new dom.window.MouseEvent('mouseup', { bubbles: true }));
    });
  };

  /** Selects from one sentence into the next. */
  const selectAcrossSentences = async () => {
    const from = textNodeWith(sentences()[0], 'sowing');
    const to = textNodeWith(sentences()[1], 'Broadcast');
    const range = dom.window.document.createRange();
    range.setStart(from.node, from.at);
    range.setEnd(to.node, to.at + 9);
    const selection = dom.window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    await act(async () => {
      dom.window.document.body.dispatchEvent(new dom.window.MouseEvent('mouseup', { bubbles: true }));
    });
  };

  /** Clicks a label in the palette, never a label picker in the span list. */
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

  const clickSpan = async (word) => {
    const span = [...mounted.host.querySelectorAll('span.group')].find((s) =>
      s.textContent.includes(word)
    );
    assert.ok(span, `no span for "${word}" in the passage`);
    await act(async () => {
      span.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    });
  };

  const clickButton = async (label) => {
    const button = [...mounted.host.querySelectorAll('button')].find(
      (b) => b.textContent.trim() === label
    );
    assert.ok(button, `no "${label}" button on screen`);
    await act(async () => {
      button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    });
  };

  /** Presses a key on the window, the way the shortcut handler hears it. */
  const pressKey = async (key) => {
    await act(async () => {
      dom.window.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key, bubbles: true }));
    });
  };

  const close = () => {
    try {
      mounted.unmount?.();
    } catch (_) {}
    dom.window.close();
  };

  return {
    ...mounted,
    calls,
    close,
    captions,
    paragraphs,
    select,
    selectAcrossSentences,
    pickLabel,
    pressKey,
    clickSpan,
    clickButton,
  };
}

const armed = (ui) => ui.paragraphs().find((t) => t.startsWith('Labelling'));

test('a word is tagged on a passage that already carries model spans', async (t) => {
  const ui = await mount('tagged');
  t.after(() => ui.close());
  assert.deepEqual(ui.captions(), ['Crop', 'Chemical', 'Chemical']);

  await ui.select(0, 'sowing');
  assert.match(armed(ui) || '', /sowing/);
  await ui.pickLabel('Location');
  assert.deepEqual(ui.captions(), ['Crop', 'Chemical', 'Location', 'Chemical']);
});

test('words in a later sentence are tagged, not the first occurrence', async (t) => {
  const ui = await mount('tagged');
  t.after(() => ui.close());
  await ui.select(1, 'Punjab');
  await ui.pickLabel('Location');
  await ui.select(1, 'January');
  await ui.pickLabel('Location');

  // one for each, in document order, with the model's spans untouched
  assert.deepEqual(ui.captions(), ['Crop', 'Chemical', 'Chemical', 'Location', 'Location']);
});

test('releasing the mouse outside the sentence still arms the selection', async (t) => {
  const ui = await mount('tagged');
  t.after(() => ui.close());
  // exactly what happens when selecting the last word of a line
  await ui.select(1, 'January', 'body');
  assert.match(armed(ui) || '', /January/, 'a selection released outside the sentence was lost');
  await ui.pickLabel('Location');
  assert.ok(ui.captions().includes('Location'), 'and it must still be taggable');
});

test('a selection crossing two sentences says so instead of doing nothing', async (t) => {
  const ui = await mount('tagged');
  t.after(() => ui.close());
  await ui.selectAcrossSentences();
  assert.equal(armed(ui), undefined, 'it must not arm a span across a sentence boundary');
  assert.ok(
    ui.paragraphs().some((t) => t.includes('ran across two sentences')),
    'and it must explain why, rather than failing silently'
  );
});

test('clicking a label with nothing selected explains itself', async (t) => {
  const ui = await mount('tagged');
  t.after(() => ui.close());
  await ui.pickLabel('Location');
  assert.deepEqual(ui.captions(), ['Crop', 'Chemical', 'Chemical'], 'nothing is tagged');
  assert.ok(
    ui.paragraphs().some((t) => /Select the words in the sentence first/.test(t)),
    'the palette has to say why'
  );
});

test('validation: dragging across words adds the entity the pipeline missed', async (t) => {
  const ui = await mount('validate');
  t.after(() => ui.close());
  assert.deepEqual(ui.captions(), ['Crop', 'Chemical']);

  await ui.select(0, 'sowing');
  assert.match(armed(ui) || '', /sowing/, 'a selection has to arm here too');
  await ui.pickLabel('Location');

  assert.deepEqual(ui.captions(), ['Crop', 'Chemical', 'Location'], 'the span is on the passage');
  const row = [...ui.host.querySelectorAll('li')].find((li) =>
    li.textContent.includes('sowing')
  );
  assert.ok(row, 'and in the list beside it');
  assert.match(row.textContent, /you added this/, "recorded as the annotator's own");
});

test('validation: a selection wins over an entity in focus', async (t) => {
  const ui = await mount('validate');
  t.after(() => ui.close());

  // focus one entity, then select different words: the label must act on the
  // selection, not relabel what happens to be in focus
  await ui.clickSpan('wheat');
  await ui.select(0, 'sowing');
  await ui.pickLabel('Location');

  assert.deepEqual(ui.captions(), ['Crop', 'Chemical', 'Location']);
  const wheat = ui.getDoc().segments[0].entities.find((e) => e.text === 'wheat');
  assert.equal(wheat.label, 'Crop', 'the focused entity is left exactly as it was');
  assert.notEqual(wheat.validationStatus, 'relabelled');
});

test('validation: an added entity is removed rather than rejected', async (t) => {
  const ui = await mount('validate');
  t.after(() => ui.close());
  await ui.select(0, 'sowing');
  await ui.pickLabel('Location');

  const rowFor = (word) =>
    [...ui.host.querySelectorAll('li')].find((li) => li.textContent.includes(word));
  const row = rowFor('sowing');
  assert.ok(row, 'the added span is in the list');
  assert.match(row.textContent, /you added this/);
  assert.ok(
    ![...row.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Wrong'),
    'there is nothing to mark wrong: the annotator put it there'
  );

  const remove = [...row.querySelectorAll('button')].find(
    (b) => b.textContent.trim() === 'Remove'
  );
  assert.ok(remove, 'it is removable instead');
  await globalThis.__act(async () => {
    remove.dispatchEvent(new globalThis.MouseEvent('click', { bubbles: true }));
  });

  assert.deepEqual(ui.captions(), ['Crop', 'Chemical'], 'and it is gone from the passage');
});

test('validation: a focused entity is relabelled from the palette', async (t) => {
  const ui = await mount('validate');
  t.after(() => ui.close());
  assert.deepEqual(ui.captions(), ['Crop', 'Chemical']);
  await ui.clickSpan('wheat');
  assert.ok(ui.paragraphs().some((t) => /Pick a different label/.test(t)));
  await ui.pickLabel('Disease');
  assert.deepEqual(ui.captions(), ['Disease', 'Chemical'], 'the tag on screen must change');
});

test('validation: relabelling shows Manual badge and shifts previous top entity to runner up', async (t) => {
  const ui = await mount('validate');
  t.after(() => ui.close());

  // Check initial runner up badge in entities to check
  assert.ok(ui.host.textContent.includes('2nd:'));
  assert.ok(ui.host.textContent.includes('Chemical'));

  await ui.clickSpan('wheat');
  await ui.pickLabel('Disease');

  // Manual badge should appear
  assert.ok(ui.host.textContent.includes('Manual'), 'Manual badge appears');

  // Earlier 1st place entity (Crop) moved to 2nd place / runner up
  assert.deepEqual(ui.captions(), ['Disease', 'Chemical']);
  assert.ok(ui.host.textContent.includes('Crop'), 'Crop is now runner up');

  await ui.clickButton('Save');
  const doc = ui.getDoc();
  const wheat = doc.segments[0].entities.find((e) => e.text === 'wheat');
  assert.equal(wheat.label, 'Disease');
  assert.equal(wheat.runnerUp, 'Crop');
  assert.notEqual(wheat.runnerUp, 'Chemical');
  assert.equal(wheat.isManual, true);
});

test('validation: an entity is marked wrong without choosing another label', async (t) => {
  const ui = await mount('validate');
  t.after(() => ui.close());

  const hasButton = (label) =>
    [...ui.host.querySelectorAll('button')].some((b) => b.textContent.trim() === label);
  const struckSpans = () =>
    [...ui.host.querySelectorAll('span.group .line-through')].length;

  assert.equal(struckSpans(), 0);
  await ui.clickButton('Wrong');

  // the entity is still there, struck through in the passage, with no label
  // having been chosen for it
  assert.equal(ui.captions().length, 2, 'nothing is removed from the passage');
  assert.ok(struckSpans() > 0, 'a rejected entity is struck through');
  assert.ok(hasButton('Put it back'), 'and the rejection can be taken back');

  await ui.clickButton('Put it back');
  assert.equal(struckSpans(), 0, 'undone');
  assert.ok(hasButton('Wrong'), 'and it can be rejected again');
});

test('exporting writes the open passage first, instead of leaving it behind', async (t) => {
  const ui = await mount('validate+header', { recordCalls: true });
  t.after(() => ui.close());

  // tag something and go straight to Export, without pressing Save
  await ui.select(0, 'sowing');
  await ui.pickLabel('Location');
  assert.deepEqual(ui.captions(), ['Crop', 'Chemical', 'Location']);
  assert.deepEqual(ui.calls, [], 'nothing has been written yet');

  await ui.clickButton('Export');

  const saves = ui.calls.filter((c) => c.endsWith('/entities'));
  const exports = ui.calls.filter((c) => c.includes('/dataset'));
  assert.equal(saves.length, 1, 'the open passage is saved');
  assert.equal(exports.length, 1, 'and the file is still fetched');
  assert.ok(
    ui.calls.indexOf(saves[0]) < ui.calls.indexOf(exports[0]),
    'the save has to come first, or the server builds a file without it'
  );
});

test('the bottom bar export writes the open passage too', async (t) => {
  const ui = await mount('validate', { recordCalls: true });
  t.after(() => ui.close());

  await ui.select(0, 'sowing');
  await ui.pickLabel('Location');
  assert.deepEqual(ui.calls, [], 'nothing written yet');

  await ui.clickButton('Export validated file');

  const saves = ui.calls.filter((c) => c.endsWith('/entities'));
  const exports = ui.calls.filter((c) => c.includes('/dataset'));
  assert.equal(saves.length, 1, 'the open passage is saved');
  assert.equal(exports.length, 1);
  assert.ok(ui.calls.indexOf(saves[0]) < ui.calls.indexOf(exports[0]), 'save first');
});

test('the number printed beside a label is the key that applies it', async (t) => {
  const ui = await mount('tagged');
  t.after(() => ui.close());

  await ui.select(1, 'Punjab');
  await ui.pressKey('3'); // Location
  assert.deepEqual(ui.captions(), ['Crop', 'Chemical', 'Chemical', 'Location']);

  // and with nothing selected it stays out of the way
  await ui.pressKey('4');
  assert.deepEqual(ui.captions(), ['Crop', 'Chemical', 'Chemical', 'Location'], 'nothing tagged');
});

test('validation: a number corrects the entity in focus', async (t) => {
  const ui = await mount('validate');
  t.after(() => ui.close());

  await ui.clickSpan('wheat');
  await ui.pressKey('7'); // Disease
  assert.deepEqual(ui.captions(), ['Disease', 'Chemical']);
});
