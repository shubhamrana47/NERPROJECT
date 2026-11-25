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
  getTopWordsByLabel,
  formatEntityLabel,
} = require(out);

test('getTopWordsByLabel returns at most 5 most frequent words per label and follows saved changes', () => {
  const ent = (text, label, extra = {}) => ({ text, label, ...extra });
  const segments = [
    { entities: [ent('wheat', 'CROP'), ent('Wheat', 'CROP'), ent('rice', 'CROP'), ent('DAP', 'CHEMICAL')] },
    { entities: [ent('wheat', 'CROP'), ent('maize', 'CROP'), ent('gram', 'CROP'), ent('bajra', 'CROP'), ent('jowar', 'CROP')] },
    { entities: [ent('rice', 'CROP'), ent('cotton', 'CROP', { status: 'deleted' }), ent('urea', 'CROP', { validationStatus: 'rejected' })] },
  ];
  const top = getTopWordsByLabel(segments, 5);
  assert.equal(top.CROP.length, 5, 'capped at 5');
  assert.deepEqual(top.CROP.slice(0, 2), [{ text: 'wheat', count: 3 }, { text: 'rice', count: 2 }], 'case-insensitive, most frequent first');
  assert.ok(!top.CROP.some((w) => w.text === 'cotton' || w.text === 'urea'), 'deleted/rejected ignored');
  assert.deepEqual(top.CHEMICAL, [{ text: 'DAP', count: 1 }]);

  // Simulate an Approve & Save that relabels both "rice" spans: the ranking must move.
  const saved = segments.map((s) => ({
    entities: s.entities.map((e) => (e.text === 'rice' ? { ...e, label: 'FOOD_ITEM' } : e)),
  }));
  const after = getTopWordsByLabel(saved, 5);
  assert.ok(!after.CROP.some((w) => w.text === 'rice'), 'rice left CROP after save');
  assert.deepEqual(after.FOOD_ITEM, [{ text: 'rice', count: 2 }]);
});

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

  // Predictions must be sorted descending by exact matches first, then score
  for (let i = 0; i < predictions.length - 1; i++) {
    assert.ok(
      predictions[i].exact >= predictions[i + 1].exact,
      `Prediction ${i} (${predictions[i].exact} exact) should be >= ${i + 1} (${predictions[i + 1].exact} exact)`
    );
  }

  const mixedDoc = {
    segments: [
      {
        entities: [
          { text: 'water', label: 'Natural_Resource', confidence: 0.9 }, // 1 exact
          { text: 'water harvesting', label: 'Agri_Process', confidence: 0.9 }, // partial
          { text: 'water logging', label: 'Agri_Process', confidence: 0.9 }, // partial
          { text: 'water management', label: 'Agri_Process', confidence: 0.9 }, // partial
          { text: 'water conservation', label: 'Agri_Process', confidence: 0.9 }, // partial
        ],
      },
    ],
  };
  const mixedPreds = getTopEarlierAnnotations('water', mixedDoc, []);
  assert.equal(mixedPreds[0].label, 'Natural_Resource', 'Exact match sorts before partial-only matches');
  assert.equal(mixedPreds[0].exact, 1);
  assert.equal(mixedPreds[1].label, 'Agri_Process');
  assert.equal(mixedPreds[1].exact, 0);

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

  // Descriptions live in aria-label (no native title, so the browser's own
  // tooltip doesn't pop up below the card alongside the custom one above it)
  const cropBtn = [...palette.querySelectorAll('button')].find((b) => b.textContent.includes('Crop'));
  assert.ok(cropBtn, 'Crop button exists in palette');
  assert.equal(cropBtn.getAttribute('title'), null, 'Crop button has no native title tooltip');
  assert.ok(cropBtn.getAttribute('aria-label').includes('Names of grains, cereals, etc.'), 'Crop button label has description');

  const chemBtn = [...palette.querySelectorAll('button')].find((b) => b.textContent.includes('Chemical'));
  assert.ok(chemBtn, 'Chemical button exists in palette');
  assert.ok(chemBtn.getAttribute('aria-label').includes('Names of Chemicals, Fertilizers, Pesticides, etc.'));
});


test('only parent entities with AgrO/AGROVOC-verified subcategories render a dropdown, and exports save type + subtype', async (t) => {
  const subtypesOut = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ner-sub-')), 'entitySubtypes.cjs');
  esbuild.buildSync({
    entryPoints: [path.join(FRONTEND, 'src', 'utils', 'entitySubtypes.js')],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outfile: subtypesOut,
    nodePaths: [path.join(FRONTEND, 'node_modules')],
    logLevel: 'error',
  });
  const { ENTITY_SUBTYPES, getEntitySubtypes } = require(subtypesOut);

  // Verify v3 taxonomy counts (strictly ontology-verified NEW subcategories only):
  // 12 parents, 58 subcategories (52 AgrO + AGROVOC, 4 AgrO only, 2 AGROVOC only)
  const parentsWithSubtypes = Object.keys(ENTITY_SUBTYPES);
  assert.equal(parentsWithSubtypes.length, 12, '12 parent entities have subcategories');
  let totalSubs = 0;
  let bothCount = 0;
  let agroOnlyCount = 0;
  let agrovocOnlyCount = 0;
  for (const [parent, subs] of Object.entries(ENTITY_SUBTYPES)) {
    assert.ok(subs.length > 0, `${parent} has subcategories`);
    for (const sub of subs) {
      totalSubs += 1;
      assert.ok(
        sub.agro || sub.agrovoc,
        `${parent} -> ${sub.name} must exist in at least one ontology (AgrO or AGROVOC)`
      );
      assert.ok(sub.ontologies.length >= 1, `${parent} -> ${sub.name} must list verified ontologies`);
      if (sub.agro && sub.agrovoc) bothCount += 1;
      else if (sub.agro) agroOnlyCount += 1;
      else if (sub.agrovoc) agrovocOnlyCount += 1;
    }
  }
  assert.equal(totalSubs, 58, '58 total ontology-verified subcategories across 12 parents');
  assert.equal(bothCount, 52, '52 subcategories mapped in both AgrO and AGROVOC');
  assert.equal(agroOnlyCount, 4, '4 subcategories mapped in AgrO only');
  assert.equal(agrovocOnlyCount, 2, '2 subcategories mapped in AGROVOC only');

  // Spot-check key v3 mapping corrections & exclusion of non-ontology NEW subcategory
  const varietySub = getEntitySubtypes('Crop').find((s) => s.name === 'Variety / Cultivar');
  assert.ok(varietySub.agro?.includes('AGRO_00000616'), 'Crop / Variety / Cultivar mapped to AGRO_00000616 in v3');
  assert.equal(varietySub.agrovoc, 'c_8157 (varieties)');
  const visualSymptom = getEntitySubtypes('Disease').find((s) => s.name === 'Visual Symptom / Damage Sign');
  assert.equal(visualSymptom, undefined, 'Visual Symptom / Damage Sign excluded (no ontology match in v3)');
  const concSub = getEntitySubtypes('Quantity').find((s) => s.name === 'Concentration / Percentage / Ratio');
  assert.equal(concSub.agrovoc, null, 'Wrong-sense AGROVOC IDs removed from Concentration in v3');

  assert.deepEqual(getEntitySubtypes('Policy'), [], 'Policy has no subcategories');
  assert.deepEqual(getEntitySubtypes('Citation'), [], 'Citation has no subcategories');
  assert.deepEqual(getEntitySubtypes('ML_Model'), [], 'ML_Model has no subcategories');

  // Verify DOM: dropdown toggles exist ONLY for the 12 parent entities
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
  const toggles = [...palette.querySelectorAll('[data-subtype-toggle]')].map((b) =>
    b.getAttribute('data-subtype-toggle')
  );
  assert.deepEqual(
    toggles.sort(),
    [...parentsWithSubtypes].sort(),
    'Dropdown toggles render exclusively for entities with verified subcategories'
  );
  assert.equal(palette.querySelector('[data-subtype-toggle="Policy"]'), null, 'No dropdown for Policy');
  assert.equal(palette.querySelector('[data-subtype-toggle="Citation"]'), null, 'No dropdown for Citation');

  // Subsumed entities (e.g. Nutrient, Rainfall, Vegetable) must not render as independent cards
  const cardLabels = [...palette.querySelectorAll('section button')]
    .filter((b) => !b.hasAttribute('data-subtype-toggle'))
    .map((b) => b.textContent.trim());
  assert.ok(!cardLabels.some((t) => t.startsWith('Nutrient')), 'Nutrient must not appear as a standalone card');
  assert.ok(!cardLabels.some((t) => t.startsWith('Rainfall')), 'Rainfall must not appear as a standalone card');
  assert.ok(!cardLabels.some((t) => t.startsWith('Vegetable')), 'Vegetable must not appear as a standalone card');

  // Organization, Person, and Natural_Resource are independent entities (no dropdown, not under Location/Soil)
  assert.ok(cardLabels.some((t) => t.includes('Organization')), 'Organization appears as an independent card');
  assert.ok(cardLabels.some((t) => t.includes('Person')), 'Person appears as an independent card');
  assert.ok(cardLabels.some((t) => t.includes('Natural Resource')), 'Natural Resource appears as an independent card');
  assert.equal(palette.querySelector('[data-subtype-toggle="Organization"]'), null, 'No dropdown for Organization');
  assert.equal(palette.querySelector('[data-subtype-toggle="Person"]'), null, 'No dropdown for Person');
  assert.equal(palette.querySelector('[data-subtype-toggle="Natural_Resource"]'), null, 'No dropdown for Natural_Resource');
  assert.ok(!getEntitySubtypes('Location').some((s) => /Organization|Person/i.test(s.name)), 'Location does not include Organization/Person');
  assert.ok(!getEntitySubtypes('Soil').some((s) => /Natural_Resource/i.test(s.name)), 'Soil does not include Natural_Resource');

  // Open Chemical dropdown and verify Nutrient is inside WITHOUT ontology mapping codes
  const chemToggle = palette.querySelector('[data-subtype-toggle="Chemical"]');
  chemToggle.click();
  await new Promise((r) => setTimeout(r, 10));
  const dropdown = palette.querySelector('[data-testid="subtype-dropdown-Chemical"]');
  assert.ok(dropdown, 'Chemical subcategory dropdown opens');
  assert.ok(dropdown.textContent.includes('Nutrient'), 'Nutrient appears inside Chemical dropdown');
  assert.ok(!/CHEBI_|AGRO_|AGROVOC|AgrO|c_\d+/.test(dropdown.textContent), 'Ontology mapping codes must not be displayed in dropdown');

  // Verify JSON exports save type (parent entity) and subtype (subcategory)
  const { buildAnnotatedRecords, buildValidatedRecords } = require(path.join(
    __dirname,
    '..',
    'backend',
    'src',
    'services',
    'datasetBuilder'
  ));

  const annDoc = {
    _id: 'sub-ann',
    kind: 'annotate',
    segments: [
      {
        index: 0,
        text: 'Sow PBW 752 wheat variety.',
        nerStatus: 'done',
        sourceRecord: { text: 'Sow PBW 752 wheat variety.' },
        entities: [
          {
            text: 'PBW 752',
            label: 'Crop',
            subtype: 'Variety / Cultivar',
            start: 4,
            end: 11,
            confidence: 1,
            status: 'approved',
            source: 'human',
            isManual: true,
          },
        ],
      },
    ],
  };
  const annExport = buildAnnotatedRecords([annDoc], {}).records[0].entities[0];
  assert.equal(annExport.type, 'Crop');
  assert.equal(annExport.subtype, 'Variety / Cultivar');

  const valDoc = {
    _id: 'sub-val',
    kind: 'validate',
    segments: [
      {
        index: 0,
        text: 'Sow PBW 752 wheat variety.',
        nerStatus: 'provided',
        sourceRecord: { text: 'Sow PBW 752 wheat variety.', entities: [] },
        entities: [
          {
            text: 'PBW 752',
            label: 'Crop',
            subtype: 'Variety / Cultivar',
            start: 4,
            end: 11,
            confidence: 1,
            status: 'approved',
            source: 'human',
            validationStatus: 'added',
            isManual: true,
          },
        ],
      },
    ],
  };
  const valExport = buildValidatedRecords([valDoc]).records[0].entities[0];
  assert.equal(valExport.type, 'Crop');
  assert.equal(valExport.subtype, 'Variety / Cultivar');
});
