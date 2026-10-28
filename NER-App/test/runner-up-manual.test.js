/**
 * Tests for entity relabelling with runner-up progression and manual tag
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { SRC, fakeDoc, fakeRes, invoke } = require('./helpers');

const Document = require(path.join(SRC, 'models/Document'));
const documentController = require(path.join(SRC, 'controllers/documentController'));
const entityController = require(path.join(SRC, 'controllers/entityController'));
const { buildValidatedRecords } = require(path.join(SRC, 'services/datasetBuilder'));

const SAMPLE_PREANNOTATED = [
  {
    passage_id: 'p1',
    passage_tag: 'PUN-0001',
    text: 'Spray imidacloprid on wheat to protect crops.',
    entities: [
      {
        text: 'wheat',
        type: 'Crop',
        start: 22,
        end: 27,
        score: 0.98,
        runner_up: 'Chemical',
        sources: ['berta', 'llm'],
      },
    ],
  },
];

async function loadTestDoc(records = SAMPLE_PREANNOTATED) {
  let created;
  Document.create = async (fields) => {
    created = fakeDoc({ _id: 'doc1', ...fields });
    return created;
  };
  await invoke(documentController.upload, {
    file: {
      originalname: 'preannotated.jsonl',
      buffer: Buffer.from(records.map((r) => JSON.stringify(r)).join('\n'), 'utf8'),
    },
    query: {},
    body: {},
  });
  return created;
}

test('preannotated file correctly loads 1st place entity and runner-up entity', async () => {
  const doc = await loadTestDoc();
  const wheat = doc.segments[0].entities[0];

  assert.equal(wheat.text, 'wheat');
  assert.equal(wheat.label, 'Crop');
  assert.equal(wheat.runnerUp, 'Chemical');
  assert.equal(wheat.originalRunnerUp, 'Chemical');
  assert.equal(wheat.isManual, false);
});

test('manually changing entity updates database: rejected 1st place becomes runner-up, previous runner-up disappears, manual label is marked', async () => {
  const doc = await loadTestDoc();
  Document.findById = async () => doc;

  // Annotator manually changes 'wheat' (was Crop, runner-up Chemical) to 'Agri_Process'
  const segmentIndex = 0;
  const payload = {
    entities: [
      {
        text: 'wheat',
        label: 'Agri_Process',
        start: 22,
        end: 27,
        validationStatus: 'relabelled',
        isManual: true,
      },
    ],
  };

  const res = fakeRes();
  await entityController.saveSegmentEntities(
    { params: { id: 'doc1', segmentIndex }, body: payload, query: { lean: '1' } },
    res,
    () => {}
  );

  const updatedWheat = doc.segments[0].entities.find((e) => e.text === 'wheat');
  assert.ok(updatedWheat, 'entity exists');
  assert.equal(updatedWheat.label, 'Agri_Process', 'new label reflects manual choice');
  assert.equal(updatedWheat.originalLabel, 'Crop', 'original pipeline label is preserved');
  assert.equal(
    updatedWheat.runnerUp,
    'Crop',
    'the rejected entity that was predicted by the pipeline earlier at 1st place has moved to 2nd place / runner up'
  );
  assert.notEqual(
    updatedWheat.runnerUp,
    'Chemical',
    'the old runner up entity (Chemical) has disappeared'
  );
  assert.equal(updatedWheat.isManual, true, 'isManual is true');
  assert.equal(updatedWheat.validationStatus, 'relabelled');
});

test('undoing a manual relabel restores original 1st place and original runner-up entity', async () => {
  const doc = await loadTestDoc();
  Document.findById = async () => doc;

  // 1. Manually relabel
  await entityController.saveSegmentEntities(
    {
      params: { id: 'doc1', segmentIndex: 0 },
      body: {
        entities: [
          {
            text: 'wheat',
            label: 'Agri_Process',
            start: 22,
            end: 27,
            validationStatus: 'relabelled',
            isManual: true,
          },
        ],
      },
      query: { lean: '1' },
    },
    fakeRes(),
    () => {}
  );

  // 2. Undo / unreviewed
  await entityController.saveSegmentEntities(
    {
      params: { id: 'doc1', segmentIndex: 0 },
      body: {
        entities: [
          {
            text: 'wheat',
            label: 'Crop',
            start: 22,
            end: 27,
            validationStatus: 'unreviewed',
            isManual: false,
          },
        ],
      },
      query: { lean: '1' },
    },
    fakeRes(),
    () => {}
  );

  const undoneWheat = doc.segments[0].entities.find((e) => e.text === 'wheat');
  assert.equal(undoneWheat.label, 'Crop', 'label reverted to Crop');
  assert.equal(undoneWheat.runnerUp, 'Chemical', 'runner up reverted to Chemical');
  assert.equal(undoneWheat.isManual, false, 'isManual is false');
});

test('exporting validated records reflects updated runner-up entity for relabelled entity', async () => {
  const doc = await loadTestDoc();
  const wheat = doc.segments[0].entities[0];
  wheat.label = 'Agri_Process';
  wheat.originalLabel = 'Crop';
  wheat.runnerUp = 'Crop';
  wheat.validationStatus = 'relabelled';
  wheat.isManual = true;

  const { records } = buildValidatedRecords([doc]);
  const exportedWheat = records[0].entities[0];

  assert.equal(exportedWheat.type, 'Agri_Process');
  assert.equal(exportedWheat.runner_up, 'Crop');
  assert.deepEqual(exportedWheat.validation, {
    status: 'relabelled',
    original_type: 'Crop',
  });
});

test('export schema is unchanged: a relabel adds no new keys when the record has no runner-up field', async () => {
  const record = {
    passage_id: 'p2',
    text: 'Spray imidacloprid on wheat to protect crops.',
    entities: [
      { text: 'wheat', type: 'Crop', start: 22, end: 27, score: 0.9,
        runner_up_token: { token: 'Cro', logprob: -14.25 }, sources: ['llm'] },
    ],
  };
  const doc = await loadTestDoc([record]);
  const wheat = doc.segments[0].entities[0];
  wheat.label = 'Disease';
  wheat.originalLabel = 'Crop';
  wheat.runnerUp = 'Crop';
  wheat.validationStatus = 'relabelled';

  const { records } = buildValidatedRecords([doc]);
  const out = records[0].entities[0];
  assert.deepEqual(
    Object.keys(out),
    [...Object.keys(record.entities[0]), 'validation'],
    'only the existing validation block is appended'
  );
  assert.equal(out.type, 'Disease', 'the edit is in the file');
  assert.deepEqual(out.runner_up_token, record.entities[0].runner_up_token, 'token metadata untouched');
});

test('annotated export reflects saved edits with the same entity keys', async () => {
  const { buildAnnotatedRecords } = require(path.join(SRC, 'services/datasetBuilder'));
  const doc = fakeDoc({
    _id: 'a1', kind: 'annotate',
    segments: [{
      index: 0, text: 'Spray imidacloprid on wheat to protect crops.', nerStatus: 'done',
      sourceRecord: { text: 'Spray imidacloprid on wheat to protect crops.' },
      entities: [{ text: 'wheat', label: 'Disease', start: 22, end: 27, confidence: 1,
        status: 'edited', source: 'human', runnerUp: 'Crop', isManual: true }],
    }],
  });
  const { records } = buildAnnotatedRecords([doc], {});
  const ent = records[0].entities[0];
  assert.equal(ent.label, 'Disease');
  assert.deepEqual(Object.keys(ent).sort(),
    ['confidence', 'end', 'label', 'source', 'start', 'status', 'text', 'verified']);
});


test('manual selection calculates exact offsets for Markpower 75 WG without character drift', () => {
  const { JSDOM } = require('jsdom');
  const { offsetsFromRange, CAPTION_ATTR } = require('../frontend/src/utils/selectionOffsets.js');

  const sentenceText =
    'To control both grassy and broadleaf weeds apply Atlantis 3.6 WDG (mesosulfuron+iodosulfuron) 160 g/acre or Total/Markpower 75 WG (sulfosulfuron + metsulfuron) 16 g/acre or Accord Plus (Fenoxaprop+ Metribuzin) 500ml/acre or Shagun 21-11 @ 200g/acre or ACM-9 @ 240g/acre.';

  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="c"></div></body></html>');
  const doc = dom.window.document;
  const container = doc.getElementById('c');

  // Preceding text up to Total: 0..108
  const p1 = doc.createElement('span');
  p1.setAttribute('data-start', '0');
  p1.setAttribute('data-end', '108');
  p1.textContent = sentenceText.slice(0, 108);
  container.appendChild(p1);

  // Total entity: 108..113
  const totalEnt = doc.createElement('span');
  totalEnt.className = 'group';
  const totalText = doc.createElement('span');
  totalText.setAttribute('data-start', '108');
  totalText.setAttribute('data-end', '113');
  totalText.textContent = sentenceText.slice(108, 113);
  totalEnt.appendChild(totalText);
  const cap = doc.createElement('span');
  cap.setAttribute(CAPTION_ATTR, 'true');
  cap.textContent = 'Chemical ×';
  totalEnt.appendChild(cap);
  container.appendChild(totalEnt);

  // Slash: 113..114
  const slash = doc.createElement('span');
  slash.setAttribute('data-start', '113');
  slash.setAttribute('data-end', '114');
  slash.textContent = '/';
  container.appendChild(slash);

  // Markpower 75 WG text span: 114..129
  const mark = doc.createElement('span');
  mark.setAttribute('data-start', '114');
  mark.setAttribute('data-end', '129');
  mark.textContent = 'Markpower 75 WG';
  container.appendChild(mark);

  // Trailing text: 129..end
  const trail = doc.createElement('span');
  trail.setAttribute('data-start', '129');
  trail.setAttribute('data-end', String(sentenceText.length));
  trail.textContent = sentenceText.slice(129);
  container.appendChild(trail);

  // Select "Markpower 75 WG"
  const range = doc.createRange();
  range.setStart(mark.firstChild, 0);
  range.setEnd(mark.firstChild, 15);

  const measured = offsetsFromRange(container, range, sentenceText);
  assert.ok(measured, 'selection was resolved');
  assert.equal(measured.start, 114, 'start offset is exactly at index 114');
  assert.equal(measured.end, 129, 'end offset is exactly at index 129');
  assert.equal(measured.text, 'Markpower 75 WG', 'selected text matches exactly');
  assert.notEqual(measured.text, 'wer 75 WG (sulf', 'offsets are not shifted forward');
});

test('manual selection of subphrase inside an entity resolves exact offsets', () => {
  const { JSDOM } = require('jsdom');
  const { offsetsFromRange } = require('../frontend/src/utils/selectionOffsets.js');

  const sentenceText =
    'To control both grassy and broadleaf weeds apply Atlantis 3.6 WDG (mesosulfuron+iodosulfuron) 160 g/acre or Total/Markpower 75 WG (sulfosulfuron + metsulfuron) 16 g/acre.';

  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="c"></div></body></html>');
  const doc = dom.window.document;
  const container = doc.getElementById('c');

  const ent = doc.createElement('span');
  ent.className = 'group';
  const entText = doc.createElement('span');
  entText.setAttribute('data-start', '108');
  entText.setAttribute('data-end', '129');
  entText.textContent = 'Total/Markpower 75 WG';
  ent.appendChild(entText);
  container.appendChild(ent);

  // User selects "Markpower 75 WG" inside "Total/Markpower 75 WG" (offset 6 to 21)
  const range = doc.createRange();
  range.setStart(entText.firstChild, 6);
  range.setEnd(entText.firstChild, 21);

  const measured = offsetsFromRange(container, range, sentenceText);
  assert.ok(measured);
  assert.equal(measured.start, 114);
  assert.equal(measured.end, 129);
  assert.equal(measured.text, 'Markpower 75 WG');
});
