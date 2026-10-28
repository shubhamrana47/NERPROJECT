/**
 * The validation export: the pipeline's own file back, with decisions overlaid
 * and its metadata untouched. Plus the round trip, so a part-finished file can
 * be picked up again.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { SRC, readFixture, fakeDoc, invoke, sameRecord } = require('./helpers');

const { buildValidatedRecords } = require(path.join(SRC, 'services/datasetBuilder'));
const Document = require(path.join(SRC, 'models/Document'));
const documentController = require(path.join(SRC, 'controllers/documentController'));
const exportController = require(path.join(SRC, 'controllers/exportController'));
const entityController = require(path.join(SRC, 'controllers/entityController'));

const SOURCE = readFixture('validate-entities.jsonl');

/** Uploads the validation fixture and hands back the stored document. */
async function loadValidationDoc(records = SOURCE) {
  let created;
  Document.create = async (fields) => {
    created = fakeDoc({ _id: 'v1', ...fields });
    return created;
  };
  await invoke(documentController.upload, {
    file: {
      originalname: 'validate-entities.jsonl',
      buffer: Buffer.from(records.map((r) => JSON.stringify(r)).join('\n'), 'utf8'),
    },
    query: {},
    body: {},
  });
  return created;
}

const decide = (seg, text, status, newLabel) => {
  const ent = seg.entities.find((e) => e.text === text);
  assert.ok(ent, `no entity "${text}" to decide on`);
  ent.validationStatus = status;
  if (status === 'relabelled') {
    ent.originalLabel = ent.originalLabel || ent.label;
    ent.runnerUp = ent.originalLabel;
    ent.isManual = true;
    ent.label = newLabel;
    ent.status = 'edited';
    ent.source = 'human';
  } else if (status === 'confirmed') {
    ent.status = 'approved';
    ent.source = 'human';
  }
  return ent;
};

test('an untouched validation document exports byte-identical records', async () => {
  const doc = await loadValidationDoc();
  const { records } = buildValidatedRecords([doc]);

  assert.equal(records.length, SOURCE.length);
  records.forEach((row, i) => {
    const { validation_summary, ...rest } = row;
    assert.deepEqual(
      sameRecord(rest, SOURCE[i]),
      [],
      'every original field and value survives untouched'
    );
  });

  // field order preserved, summary appended last
  assert.deepEqual(Object.keys(records[0]), [...Object.keys(SOURCE[0]), 'validation_summary']);

  // nothing judged yet, so no entity carries a validation block
  assert.ok(records.every((r) => r.entities.every((e) => !('validation' in e))));
  assert.equal(records[0].validation_summary.unreviewed, 6);
  assert.equal(records[0].validation_summary.complete, false);
});

test('pipeline metadata survives the round trip exactly', async () => {
  const doc = await loadValidationDoc();
  decide(doc.segments[0], 'wheat', 'confirmed');
  const { records } = buildValidatedRecords([doc]);

  const wheat = records[0].entities.find((e) => e.text === 'wheat');
  const original = SOURCE[0].entities.find((e) => e.text === 'wheat');
  for (const key of ['score', 'score_kind', 'mean_logprob', 'runner_up_token', 'n_words', 'extension', 'sources', 'n_sources']) {
    assert.deepEqual(
      sameRecord(wheat[key], original[key]),
      [],
      `${key} must come back as it arrived`
    );
  }

  // historical pipeline output passes through
  assert.deepEqual(records[0].bio, SOURCE[0].bio);
  assert.deepEqual(records[0].hybrid, SOURCE[0].hybrid);
  assert.deepEqual(records[0].suppressed, SOURCE[0].suppressed);
  assert.equal(records[0].n_entities, SOURCE[0].n_entities);
});

test('each decision is recorded in the shape agreed', async () => {
  const doc = await loadValidationDoc();
  const seg = doc.segments[0];
  decide(seg, 'wheat', 'confirmed');
  decide(seg, 'acre', 'rejected');
  decide(seg, 'mid-December', 'relabelled', 'Date_and_Time');

  const { records } = buildValidatedRecords([doc]);
  const by = (t) => records[0].entities.find((e) => e.text === t);

  assert.deepEqual(by('wheat').validation, { status: 'confirmed' });
  assert.equal(by('wheat').type, 'Crop');

  assert.deepEqual(by('acre').validation, { status: 'rejected' });
  assert.equal(by('acre').type, 'Field_Area', 'a rejected entity keeps the type the pipeline gave it');

  assert.deepEqual(by('mid-December').validation, {
    status: 'relabelled',
    original_type: 'Duration',
  });
  assert.equal(by('mid-December').type, 'Date_and_Time', 'the corrected type is what a consumer reads');

  // untouched ones still carry no block
  assert.ok(!('validation' in by('DAP')));

  assert.deepEqual(records[0].validation_summary, {
    entities: 6,
    confirmed: 1,
    rejected: 1,
    relabelled: 1,
    added: 0,
    unreviewed: 3,
    complete: false,
  });
});

test('a rejected entity is kept, never dropped', async () => {
  const doc = await loadValidationDoc();
  decide(doc.segments[0], 'acre', 'rejected');
  const { records } = buildValidatedRecords([doc]);
  assert.equal(records[0].entities.length, 6, 'the array length never changes');
  assert.ok(records[0].entities.some((e) => e.text === 'acre' && e.validation.status === 'rejected'));
});

test('a passage is complete when every entity is decided', async () => {
  const doc = await loadValidationDoc();
  const seg = doc.segments[1];
  ['imidacloprid', 'cotton', 'whitefly'].forEach((t) => decide(seg, t, 'confirmed'));
  let { records } = buildValidatedRecords([doc]);
  assert.equal(records[1].validation_summary.complete, false, 'one still unreviewed');

  decide(seg, 'flowering', 'rejected');
  ({ records } = buildValidatedRecords([doc]));
  assert.equal(records[1].validation_summary.complete, true);
  assert.equal(records[1].validation_summary.unreviewed, 0);
});

test('an empty passage needs acknowledging before it counts as complete', async () => {
  const doc = await loadValidationDoc();
  const empty = doc.segments[2];
  assert.equal(empty.entities.length, 0);

  let { records } = buildValidatedRecords([doc]);
  assert.equal(records[2].validation_summary.complete, false);
  assert.equal(records[2].validation_summary.nothing_to_validate, false);

  Document.findById = async () => doc;
  const res = await invoke(require(path.join(SRC, 'controllers/lineController')).acknowledgeEmptyPassage, {
    params: { id: 'v1', segmentIndex: '2' },
    body: {},
  });
  assert.equal(res.body.nothingToValidate, true);

  ({ records } = buildValidatedRecords([doc]));
  assert.equal(records[2].validation_summary.complete, true);
  assert.equal(records[2].validation_summary.nothing_to_validate, true);
});

test('acknowledging a passage that has entities is refused', async () => {
  const doc = await loadValidationDoc();
  Document.findById = async () => doc;
  const res = await invoke(require(path.join(SRC, 'controllers/lineController')).acknowledgeEmptyPassage, {
    params: { id: 'v1', segmentIndex: '0' },
    body: {},
  });
  assert.equal(res.statusCode, 409);
});

test('the export endpoint serves a validation document as _validated.jsonl', async () => {
  const doc = await loadValidationDoc();
  decide(doc.segments[0], 'wheat', 'confirmed');
  decide(doc.segments[0], 'acre', 'rejected');
  Document.find = async () => [doc];

  const res = await invoke(exportController.datasetExport, { params: { id: 'v1' }, query: {} });

  assert.equal(res.statusCode, 200);
  // the compact timestamped naming both exports use
  assert.match(res.headers['content-disposition'], /validated_\d{4}-\d{2}-\d{2}_[\d-]+\.jsonl/);
  assert.match(res.headers['content-type'], /x-jsonlines/);
  assert.equal(res.headers['x-dataset-rows'], '3');
  const totals = JSON.parse(res.headers['x-validation-totals']);
  assert.equal(totals.confirmed, 1);
  assert.equal(totals.rejected, 1);

  const lines = res.body.trim().split('\n').map((l) => JSON.parse(l));
  assert.equal(lines.length, 3);
  assert.ok(lines.every((r) => 'validation_summary' in r));
});

test('a validated file can be uploaded again to carry on', async () => {
  const doc = await loadValidationDoc();
  const seg = doc.segments[0];
  decide(seg, 'wheat', 'confirmed');
  decide(seg, 'acre', 'rejected');
  decide(seg, 'mid-December', 'relabelled', 'Date_and_Time');

  const { records } = buildValidatedRecords([doc]);
  const resumed = await loadValidationDoc(records);

  assert.equal(resumed.kind, 'validate');
  const back = resumed.segments[0];
  assert.equal(back.entities.length, 6, 'nothing lost or added');
  assert.ok(back.nerStatus === 'provided', 'still never queued for the model');

  const find = (t) => back.entities.find((e) => e.text === t);
  assert.equal(find('wheat').validationStatus, 'confirmed');
  assert.equal(find('acre').validationStatus, 'rejected');
  assert.equal(find('mid-December').validationStatus, 'relabelled');
  assert.equal(find('mid-December').label, 'Date_and_Time', 'the correction came back');
  assert.equal(find('mid-December').originalLabel, 'Duration', 'and what the pipeline said');
  assert.equal(find('DAP').validationStatus, 'unreviewed');

  // exporting the resumed document reproduces the same decisions
  const again = buildValidatedRecords([resumed]).records;
  assert.deepEqual(again[0].validation_summary, {
    entities: 6,
    confirmed: 1,
    rejected: 1,
    relabelled: 1,
    added: 0,
    unreviewed: 3,
    complete: false,
  });
  assert.deepEqual(
    sameRecord(again[0].entities, records[0].entities),
    [],
    'a second round trip changes nothing'
  );
});

/** Saves a passage, sending its current spans plus whatever is added. */
async function save(doc, segmentIndex, extra = []) {
  Document.findById = async () => doc;
  const seg = doc.segments.find((x) => x.index === segmentIndex);
  const payload = [
    ...seg.entities.map((e) => ({
      text: e.text,
      label: e.label,
      start: e.start,
      end: e.end,
      confidence: e.confidence,
      status: e.status,
      source: e.source,
      validationStatus: e.validationStatus,
      originalLabel: e.originalLabel,
    })),
    ...extra,
  ];
  return invoke(entityController.saveSegmentEntities, {
    params: { id: 'v1', segmentIndex: String(segmentIndex) },
    query: { lean: '1' },
    body: { entities: payload },
  });
}

/** A span of one's own, measured against the passage text. */
function addition(seg, phrase, label) {
  const start = seg.text.indexOf(phrase);
  assert.ok(start >= 0, `"${phrase}" is not in the passage`);
  return { text: phrase, label, start, end: start + phrase.length, confidence: 1, source: 'human' };
}

test('a span the pipeline missed is accepted, and marked as added', async () => {
  const doc = await loadValidationDoc();
  const seg = doc.segments[2];

  const res = await save(doc, 2, [addition(seg, 'extension office', 'Organization')]);

  assert.equal(res.body.refused, 0);
  assert.equal(res.body.savedCount, 1);
  const stored = doc.segments[2].entities[0];
  assert.equal(stored.text, 'extension office');
  assert.equal(stored.validationStatus, 'added', 'not unreviewed: there is nothing to review');
  assert.equal(stored.source, 'human');
  assert.equal(stored.confidence, 1);
  assert.equal(stored.originalLabel, undefined, 'the pipeline never proposed it');
});

test('a span whose offsets do not describe its text is refused', async () => {
  const doc = await loadValidationDoc();

  const res = await save(doc, 0, [
    // "For whe" is what 0:7 actually covers
    { text: 'Farmers', label: 'Person', start: 0, end: 7, confidence: 1, source: 'human' },
    { text: 'sowing', label: 'Agri_Process', start: 63, end: 400, confidence: 1, source: 'human' },
    // no label at all
    { ...addition(doc.segments[0], 'apply', 'Agri_Method'), label: '' },
  ]);

  assert.equal(res.body.refused, 3);
  assert.equal(res.body.savedCount, 6, 'the six the pipeline supplied are untouched');
  assert.ok(!doc.segments[0].entities.some((e) => e.text === 'Farmers'));
});

test('decisions on pipeline spans are still recorded when saving alongside an addition', async () => {
  const doc = await loadValidationDoc();
  const seg = doc.segments[1];
  decide(seg, 'cotton', 'confirmed');

  const res = await save(doc, 1, [addition(seg, 'Spray', 'Agri_Method')]);

  assert.equal(res.body.refused, 0);
  assert.equal(res.body.savedCount, 5);
  const stored = doc.segments[1].entities;
  assert.equal(stored.find((e) => e.text === 'cotton').validationStatus, 'confirmed');
  assert.equal(stored.find((e) => e.text === 'Spray').validationStatus, 'added');
  // stored in document order, so the list reads with the passage
  assert.deepEqual(
    stored.map((e) => e.text),
    ['Spray', 'imidacloprid', 'cotton', 'whitefly', 'flowering']
  );
});

test('an added span is appended to the exported record, with the pipeline count left alone', async () => {
  const doc = await loadValidationDoc();
  const seg = doc.segments[1];
  await save(doc, 1, [addition(seg, 'Spray', 'Agri_Method')]);

  const { records, totals } = buildValidatedRecords([doc]);
  const row = records[1];

  assert.equal(row.entities.length, 5);
  // the pipeline's own four keep their order and their shape at the front
  assert.deepEqual(
    row.entities.slice(0, 4).map((e) => e.text),
    SOURCE[1].entities.map((e) => e.text)
  );
  assert.deepEqual(
    sameRecord(row.entities.slice(0, 4), SOURCE[1].entities),
    [],
    'nothing the pipeline wrote is disturbed by the addition'
  );

  const added = row.entities[4];
  assert.deepEqual(added, {
    text: 'Spray',
    type: 'Agri_Method',
    start: 0,
    end: 5,
    score: 1.0,
    sources: ['human'],
    validation: { status: 'added' },
  });
  assert.ok(!('mean_logprob' in added), 'no model uncertainty is invented for a human span');

  assert.equal(row.n_entities, SOURCE[1].n_entities, "the pipeline's own count is history");
  assert.equal(row.validation_summary.entities, 5, 'the current total lives in the summary');
  assert.equal(row.validation_summary.added, 1);
  assert.equal(row.validation_summary.unreviewed, 4);
  assert.equal(totals.added, 1);
});

test('a re-imported addition stays an addition, and never joins the pipeline baseline', async () => {
  const doc = await loadValidationDoc();
  await save(doc, 1, [addition(doc.segments[1], 'Spray', 'Agri_Method')]);
  const { records } = buildValidatedRecords([doc]);

  const resumed = await loadValidationDoc(records);
  const seg = resumed.segments[1];

  assert.equal(seg.entities.length, 5);
  const spray = seg.entities.find((e) => e.text === 'Spray');
  assert.equal(spray.validationStatus, 'added');
  assert.equal(spray.source, 'human', 'and so still counts as verified downstream');
  assert.equal(
    seg.originalEntities.length,
    4,
    'the baseline is what the pipeline proposed, which was four'
  );
  assert.ok(!seg.originalEntities.some((e) => e.text === 'Spray'));

  // and a second round trip changes nothing
  const { records: again } = buildValidatedRecords([resumed]);
  assert.deepEqual(sameRecord(again[1], records[1]), []);
});

test('adding to an acknowledged empty passage withdraws the acknowledgement', async () => {
  const doc = await loadValidationDoc();
  const seg = doc.segments[2];
  seg.nothingToValidate = true;

  await save(doc, 2, [addition(seg, 'extension office', 'Organization')]);

  assert.equal(doc.segments[2].nothingToValidate, false, 'the claim is stale, so it is dropped');
  const { records } = buildValidatedRecords([doc]);
  assert.ok(
    !('nothing_to_validate' in records[2].validation_summary),
    'and the exported record cannot say both'
  );
  assert.equal(records[2].validation_summary.complete, true);
  assert.equal(records[2].validation_summary.added, 1);
});

test('an added span may overlap a pipeline one, and both stay in the file', async () => {
  const doc = await loadValidationDoc();
  const seg = doc.segments[0];
  // "55 kg DAP" covers the pipeline's "55 kg" and its "DAP"
  await save(doc, 0, [addition(seg, '55 kg DAP', 'Chemical')]);

  const { records } = buildValidatedRecords([doc]);
  assert.equal(records[0].entities.length, 7);
  assert.ok(records[0].entities.some((e) => e.text === '55 kg'));
  assert.ok(records[0].entities.some((e) => e.text === 'DAP'));
  assert.ok(
    records[0].entities.some((e) => e.text === '55 kg DAP' && e.validation.status === 'added'),
    'the annotator reading is kept beside the pipeline one, not merged with it'
  );
});

test('saving an annotation passage still accepts new spans', async () => {
  const doc = fakeDoc({
    _id: 'a1',
    kind: 'annotate',
    stats: {},
    segments: [
      {
        index: 0,
        text: 'Apply urea to wheat now.',
        entities: [],
        originalEntities: [],
        nerStatus: 'pending',
      },
    ],
  });
  Document.findById = async () => doc;

  const res = await invoke(entityController.saveSegmentEntities, {
    params: { id: 'a1', segmentIndex: '0' },
    query: { lean: '1' },
    body: {
      entities: [{ text: 'wheat', label: 'Crop', start: 14, end: 19, confidence: 1, source: 'human' }],
    },
  });

  assert.equal(res.body.savedCount, 1);
  assert.equal(res.body.refused, 0);
  assert.equal(doc.segments[0].entities[0].text, 'wheat');
});

test('negative zero comes back as zero, which is all JSON can carry', async () => {
  const doc = await loadValidationDoc();
  const { records } = buildValidatedRecords([doc]);
  const exported = records[0].entities[0].mean_logprob;

  // the pipeline writes -0.0; JSON.stringify(-0) is "0"
  assert.equal(JSON.stringify(-0), '0');
  assert.equal(exported, 0, 'numerically unchanged');
  assert.equal(exported === SOURCE[0].entities[0].mean_logprob, true, 'and equal to the source');
  // the sign bit is the only thing lost, and no JSON writer can keep it
  assert.equal(Object.is(exported, -0), false);
});

test('an acknowledged empty passage stays acknowledged after re-import', async () => {
  const doc = await loadValidationDoc();
  const empty = doc.segments[2];
  empty.nothingToValidate = true;

  const { records } = buildValidatedRecords([doc]);
  assert.equal(records[2].validation_summary.nothing_to_validate, true);

  const resumed = await loadValidationDoc(records);
  assert.equal(
    resumed.segments[2].nothingToValidate,
    true,
    'otherwise finished work looks unfinished on resume'
  );

  // and it is still reported as complete on the next export
  const again = buildValidatedRecords([resumed]).records;
  assert.equal(again[2].validation_summary.complete, true);
  // the summary is replaced, never accumulated
  assert.deepEqual(Object.keys(again[2]), Object.keys(records[2]));
});

test('empty objects in the source record are not stripped', () => {
  // Mongoose removes empty objects on save unless minimize is off, which once
  // dropped `hybrid.per_source: {}` from an exported record. The schemas must
  // keep it switched off; a database is needed to exercise the save itself.
  const documentSchema = require(path.join(SRC, 'models/Document')).documentSchema;
  const segmentSchema = require(path.join(SRC, 'models/Segment'));
  assert.equal(documentSchema.options.minimize, false);
  assert.equal(segmentSchema.options.minimize, false);
  // the fixture carries the shape that caught it
  assert.deepEqual(SOURCE[2].hybrid.per_source, {});
});
