const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { JSDOM } = require('jsdom');

const FRONTEND = path.join(__dirname, '..', 'frontend');
const esbuild = require(path.join(FRONTEND, 'node_modules', 'esbuild'));

const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ner-test-')), 'textUtils.cjs');
esbuild.buildSync({
  entryPoints: [path.join(FRONTEND, 'src', 'utils', 'textUtils.jsx')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: out,
  loader: { '.jsx': 'jsx' },
  define: { 'import.meta.env': '{}' },
  nodePaths: [path.join(FRONTEND, 'node_modules')],
  logLevel: 'error',
});

const {
  ENTITY_TYPES,
  ENTITY_GROUPS,
  ENTITY_DESCRIPTIONS,
  getTopEarlierAnnotations,
  formatEntityLabel,
} = require(out);

test('categories are listed in alphabetical order', () => {
  const categoryNames = ENTITY_GROUPS.map((g) => g.name);
  const sortedNames = [...categoryNames].sort((a, b) => a.localeCompare(b));
  assert.deepEqual(categoryNames, sortedNames, 'Categories must be strictly in alphabetical order');
});

test('within each category/group, all entities are listed in a-z alphabetical order', () => {
  ENTITY_GROUPS.forEach((group) => {
    const formattedTypes = group.types.map((t) => formatEntityLabel(t));
    const sortedTypes = [...formattedTypes].sort((a, b) => a.localeCompare(b));
    assert.deepEqual(
      formattedTypes,
      sortedTypes,
      `Entities in category "${group.name}" must be sorted alphabetically: expected ${sortedTypes.join(', ')}, got ${formattedTypes.join(', ')}`
    );
  });
});

test('all 37 entity types have accurate descriptions matching user specification', () => {
  assert.equal(ENTITY_TYPES.length, 37, 'Total 37 entity types');
  ENTITY_TYPES.forEach((type) => {
    const desc = ENTITY_DESCRIPTIONS[type];
    assert.ok(desc && desc.length > 5, `Missing description for entity type ${type}`);
  });

  // Verify specific descriptions requested by user
  assert.equal(ENTITY_DESCRIPTIONS.Chemical, 'Names of Chemicals, Fertilizers, Pesticides, etc.');
  assert.equal(ENTITY_DESCRIPTIONS.Crop, 'Names of grains, cereals, etc.');
  assert.equal(ENTITY_DESCRIPTIONS.Disease, 'Names of Disease affecting plant growth');
  assert.equal(ENTITY_DESCRIPTIONS.Agri_Pollution, 'Items that are causing pollution');
  assert.equal(ENTITY_DESCRIPTIONS.Agri_Process, 'Types of Agricultural Process');
  assert.equal(ENTITY_DESCRIPTIONS.Agri_Waste, 'Items of Agricultural wastes');
  assert.equal(ENTITY_DESCRIPTIONS.Agri_Method, 'Any methods, techniques helping agriculture');
  assert.equal(ENTITY_DESCRIPTIONS.Agri_Equipment, 'Agricultural equipment, tools, machinery, and implements used in farming');
});

test('getTopEarlierAnnotations returns at most top 5 predictions for selected text', () => {
  const mockDoc = {
    segments: [
      {
        entities: [
          { text: 'wheat', label: 'Crop', confidence: 0.95 },
          { text: 'Wheat', label: 'Crop', confidence: 0.98 },
          { text: 'wheat', label: 'Crop', confidence: 0.92 },
          { text: 'wheat', label: 'Food_Item', confidence: 0.85 },
          { text: 'wheat', label: 'Plant', confidence: 0.70 },
          { text: 'wheat', label: 'Natural_Resource', confidence: 0.60 },
          { text: 'wheat', label: 'Organism', confidence: 0.65 },
          { text: 'wheat', label: 'Other', confidence: 0.40 },
          { text: 'urea', label: 'Chemical', confidence: 0.99 },
        ],
      },
    ],
  };

  const working = [
    { text: 'wheat', label: 'Crop', confidence: 1.0 },
  ];

  const predictions = getTopEarlierAnnotations('wheat', mockDoc, working);

  // Must be at most 5
  assert.ok(predictions.length <= 5, 'Must return at most top 5 predictions');
  assert.equal(predictions.length, 5, 'Should return top 5 predictions out of the 6 available tags');

  // Top prediction should be Crop with highest count
  assert.equal(predictions[0].label, 'Crop');
  assert.equal(predictions[0].count, 4); // 3 in doc + 1 in working
  assert.ok(predictions[0].percentage > 0);

  // Predictions must be sorted descending by count / score
  for (let i = 0; i < predictions.length - 1; i++) {
    assert.ok(
      predictions[i].count >= predictions[i + 1].count,
      `Prediction ${i} (${predictions[i].count}) should be >= ${i + 1} (${predictions[i + 1].count})`
    );
  }

  // Irrelevant text
  const noPredictions = getTopEarlierAnnotations('completely_unknown_token_xyz', mockDoc, working);
  assert.deepEqual(noPredictions, []);
});

let harnessBundlePath;
function getHarnessBundle() {
  if (harnessBundlePath) return harnessBundlePath;
  const hOut = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ner-ui-')), 'harness.cjs');
  esbuild.buildSync({
    entryPoints: [path.join(__dirname, 'ui-harness.jsx')],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outfile: hOut,
    loader: { '.jsx': 'jsx' },
    define: { 'import.meta.env': '{}' },
    nodePaths: [path.join(FRONTEND, 'node_modules')],
    logLevel: 'error',
  });
  harnessBundlePath = hOut;
  return hOut;
}

test('UI renders categories in alphabetical order with 2 columns of entities and hover descriptions', async (t) => {
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
  global.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ ok: true, savedEntities: [], stats: {} }),
  });
  dom.window.URL.createObjectURL = () => 'blob:stub';
  dom.window.URL.revokeObjectURL = () => {};

  require(getHarnessBundle());
  const mounted = await globalThis.__mount('tagged');
  t.after(() => mounted.unmount?.());

  const palette = [...mounted.host.querySelectorAll('aside')].find((a) =>
    a.textContent.includes('Entity labels')
  );
  assert.ok(palette, 'Entity labels sidebar must be present');

  // Check that "Recently used" is completely removed
  assert.ok(!palette.textContent.includes('Recently used'), '"Recently used" tab must not be present in palette');

  // Check category titles in DOM are sorted A-Z
  const categoryHeaders = [...palette.querySelectorAll('h3')].map((h) => h.textContent.trim());
  const sortedHeaders = [...categoryHeaders].sort((a, b) => a.localeCompare(b));
  assert.deepEqual(categoryHeaders, sortedHeaders, 'Category headers in sidebar must be sorted A-Z');

  // Check 2-row layout inside sections
  const gridContainers = [...palette.querySelectorAll('section .grid')];
  assert.ok(gridContainers.length >= 7, 'All 7 categories should have grid containers');
  gridContainers.forEach((grid) => {
    assert.ok(
      grid.className.includes('grid-cols-2') || grid.className.includes('grid-cols-4'),
      'Entities in each group must be laid out in 2 rows'
    );
  });

  // Check buttons have title attribute with descriptions
  const cropBtn = [...palette.querySelectorAll('button')].find((b) => b.textContent.includes('Crop'));
  assert.ok(cropBtn, 'Crop button exists in palette');
  assert.ok(cropBtn.getAttribute('title').includes('Names of grains, cereals, etc.'), 'Crop button title has description');

  const chemBtn = [...palette.querySelectorAll('button')].find((b) => b.textContent.includes('Chemical'));
  assert.ok(chemBtn, 'Chemical button exists in palette');
  assert.ok(chemBtn.getAttribute('title').includes('Names of Chemicals, Fertilizers, Pesticides, etc.'));
});
