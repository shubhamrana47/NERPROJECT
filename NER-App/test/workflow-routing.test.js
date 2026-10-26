/**
 * Which workflow a file lands in, and the guarantee that the two stay apart.
 *
 * The acceptance criterion for the validation feature was that an ordinary
 * annotation file behaves exactly as it did before, so most of this file is
 * about the annotation workflow being untouched.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { SRC, readFixture, fakeDoc, invoke, stubModelService, uploadRequest } = require('./helpers');

const { classifyEntities, parseDocument } = require(path.join(SRC, 'services/jsonParser'));
const Document = require(path.join(SRC, 'models/Document'));
const documentController = require(path.join(SRC, 'controllers/documentController'));
const predictController = require(path.join(SRC, 'controllers/predictController'));

/** Captures the document the controller tried to create. */
function captureCreate() {
  const captured = {};
  Document.create = async (fields) => {
    Object.assign(captured, fields);
    return fakeDoc({ _id: 'doc1', ...fields });
  };
  return captured;
}

test('entities are classified by the key they use, not by file name', () => {
  assert.deepEqual(Object.keys(classifyEntities([{ type: 'Crop', start: 0, end: 5, text: 'wheat' }])), [
    'providedEntities',
  ]);
  assert.deepEqual(
    Object.keys(classifyEntities([{ label: 'Crop', start: 0, end: 5, text: 'wheat' }])),
    ['importedEntities']
  );
  assert.deepEqual(Object.keys(classifyEntities([])), []);
  assert.deepEqual(Object.keys(classifyEntities(undefined)), []);
  assert.deepEqual(Object.keys(classifyEntities('nonsense')), []);
  // A file carrying both shapes is treated as annotation, never as validation,
  // so an annotated export can never be misread.
  assert.deepEqual(
    Object.keys(classifyEntities([{ label: 'Crop' }, { type: 'Crop', start: 0, end: 1 }])),
    ['importedEntities']
  );
});

test('an annotation file is unchanged: parsed, nothing predicted, model pending', async () => {
  const captured = captureCreate();
  const res = await invoke(documentController.upload, uploadRequest('annotate-passages.jsonl'));

  assert.equal(res.statusCode, 201);
  assert.equal(captured.kind, 'annotate');
  assert.equal(captured.segments.length, 3);
  assert.ok(captured.segments.every((s) => s.entities.length === 0));
  assert.ok(captured.segments.every((s) => s.nerStatus === 'pending'));
  // passage metadata still carried through
  assert.equal(captured.segments[0].passageTag, 'PUN-0001');
  assert.deepEqual(captured.segments[0].crops, ['WHEAT']);
  assert.deepEqual(captured.segments[0].stages, ['Sowing']);
  assert.ok(captured.segments[0].sourceRecord, 'the original record is kept for export');
});

test('annotating from scratch still marks every passage skipped', async () => {
  const captured = captureCreate();
  await invoke(
    documentController.upload,
    uploadRequest('annotate-passages.jsonl', { skipNer: 'true' })
  );
  assert.ok(captured.segments.every((s) => s.nerStatus === 'skipped'));
});

test('a pipeline file becomes a validation document with its entities loaded', async () => {
  const captured = captureCreate();
  const res = await invoke(documentController.upload, uploadRequest('validate-entities.jsonl'));

  assert.equal(res.statusCode, 201);
  assert.equal(captured.kind, 'validate');
  assert.equal(captured.segments.length, 3);

  const [first, , empty] = captured.segments;
  assert.equal(first.entities.length, 6, 'all six pipeline entities loaded');
  assert.equal(first.nerStatus, 'provided', 'never queued for the model');
  assert.ok(captured.segments.every((s) => s.nerStatus === 'provided'));

  // loaded as they are, with the pipeline's own score and type
  const wheat = first.entities.find((e) => e.text === 'wheat');
  assert.equal(wheat.label, 'Crop');
  assert.equal(wheat.confidence, 1);
  assert.equal(wheat.source, 'llm');
  assert.equal(wheat.validationStatus, 'unreviewed');
  assert.equal(wheat.originalLabel, 'Crop');

  // offsets point at the right characters
  for (const e of first.entities) {
    assert.equal(first.text.slice(e.start, e.end), e.text);
  }

  // the baseline is kept so the annotator can compare and restore
  assert.equal(first.originalEntities.length, 6);

  // the passage with no entities is still a passage, awaiting acknowledgement
  assert.equal(empty.entities.length, 0);
  assert.notEqual(empty.nothingToValidate, true);

  assert.equal(res.body.ingest.provided, 10);
  assert.equal(res.body.ingest.skippedOffsets, 0);
});

test('a pipeline entity whose offsets do not match its text is refused, not loaded', async () => {
  const captured = captureCreate();
  const records = readFixture('validate-entities.jsonl');
  records[0].entities.push({
    text: 'ghost',
    type: 'Crop',
    start: 2,
    end: 7,
    score: 0.9,
    sources: ['llm'],
  });
  const res = await invoke(documentController.upload, {
    file: {
      originalname: 'tampered.jsonl',
      buffer: Buffer.from(records.map((r) => JSON.stringify(r)).join('\n'), 'utf8'),
    },
    query: {},
    body: {},
  });

  assert.equal(res.body.ingest.skippedOffsets, 1);
  assert.equal(captured.segments[0].entities.length, 6, 'the good six still load');
  assert.ok(!captured.segments[0].entities.some((e) => e.text === 'ghost'));
});

test('the model is never run on a validation document, however it is asked', async () => {
  const calls = stubModelService();
  Document.findById = async () =>
    fakeDoc({
      _id: 'v1',
      kind: 'validate',
      threshold: 0.75,
      stats: {},
      segments: [
        {
          index: 0,
          text: 'For wheat sown after mid-December.',
          entities: [],
          originalEntities: [],
          nerStatus: 'provided',
        },
      ],
    });

  const res = await invoke(predictController.predictSegments, {
    params: { id: 'v1' },
    body: { from: 0, count: 10 },
  });

  assert.equal(res.statusCode, 409);
  assert.equal(res.body.kind, 'validate');
  assert.deepEqual(res.body.predicted, []);
  assert.equal(calls.length, 0, 'the model service was not called at all');
});

test('the model still runs on an annotation document', async () => {
  const calls = stubModelService();
  const doc = fakeDoc({
    _id: 'a1',
    kind: 'annotate',
    threshold: 0.75,
    stats: {},
    segments: [
      {
        index: 0,
        text: 'Apply urea to wheat per acre.',
        entities: [],
        originalEntities: [],
        nerStatus: 'pending',
      },
    ],
  });
  Document.findById = async () => doc;

  const res = await invoke(predictController.predictSegments, {
    params: { id: 'a1' },
    body: { from: 0, count: 10 },
  });

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.predicted.length, 1);
  assert.ok(res.body.predicted[0].entities.length > 0);
  assert.equal(calls.length, 1);
  assert.equal(doc.segments[0].nerStatus, 'done');
});

test('skip-inference marks pending passages skipped, and refuses validation documents', async () => {
  const annotate = fakeDoc({
    _id: 'a2',
    kind: 'annotate',
    segments: [
      { index: 0, nerStatus: 'pending' },
      { index: 1, nerStatus: 'done' },
      { index: 2, nerStatus: 'pending' },
    ],
  });
  Document.findById = async () => annotate;
  let res = await invoke(documentController.skipInference, { params: { id: 'a2' } });
  assert.equal(res.body.skipped, 2);
  assert.deepEqual(
    annotate.segments.map((s) => s.nerStatus),
    ['skipped', 'done', 'skipped']
  );

  Document.findById = async () => fakeDoc({ _id: 'v2', kind: 'validate', segments: [] });
  res = await invoke(documentController.skipInference, { params: { id: 'v2' } });
  assert.equal(res.statusCode, 409);
});

test('earlier file shapes still parse', () => {
  assert.equal(parseDocument({ pages: [{ page: 4, paragraphs: ['Wheat needs nitrogen.'] }] }).length, 1);
  assert.equal(
    parseDocument([{ sections: [{ heading: 'Crop Specific Advisory', text_blocks: ['Spray now please.'] }] }])
      .length,
    1
  );
  assert.equal(parseDocument({ test_cases: [{ id: 'T1', text: 'Aphids attack maize.' }] }).length, 1);
  assert.equal(parseDocument([{ text: 'Apply urea now.' }]).length, 1);
});
