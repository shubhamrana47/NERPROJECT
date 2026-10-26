/**
 * Training-shaped exports and rejected entities.
 *
 * A rejected entity stays in the validated file as feedback, and must never
 * appear as a label in anything a model trains or is measured on — including
 * the export that deliberately asks for low-confidence spans.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { SRC, readFixture, fakeDoc, invoke } = require('./helpers');

const {
  buildRows,
  buildManifest,
  buildValidatedRecords,
  toCoNLL,
  toHuggingFace,
  toSpacy,
} = require(path.join(SRC, 'services/datasetBuilder'));
const Document = require(path.join(SRC, 'models/Document'));
const documentController = require(path.join(SRC, 'controllers/documentController'));
const exportController = require(path.join(SRC, 'controllers/exportController'));

const SOURCE = readFixture('validate-entities.jsonl');

/** A validation document with one of each decision recorded. */
async function decidedDoc() {
  let created;
  Document.create = async (fields) => {
    created = fakeDoc({ _id: 'v1', ...fields });
    return created;
  };
  await invoke(documentController.upload, {
    file: {
      originalname: 'validate-entities.jsonl',
      buffer: Buffer.from(SOURCE.map((r) => JSON.stringify(r)).join('\n'), 'utf8'),
    },
    query: {},
    body: {},
  });

  const seg = created.segments[0];
  const set = (text, status, label) => {
    const e = seg.entities.find((x) => x.text === text);
    e.validationStatus = status;
    if (status === 'confirmed') {
      e.status = 'approved';
      e.source = 'human';
    } else if (status === 'relabelled') {
      e.originalLabel = e.label;
      e.label = label;
      e.status = 'edited';
      e.source = 'human';
    }
  };
  set('wheat', 'confirmed');
  set('acre', 'rejected');
  set('mid-December', 'relabelled', 'Date_and_Time');
  // 'DAP', '55 kg' and 'sowing' stay unreviewed
  return created;
}

test('a rejected entity never reaches a training export', async () => {
  const doc = await decidedDoc();
  const built = buildRows([doc], { includeEmpty: true });
  const texts = built.rows.flatMap((r) => r.entities.map((e) => e.text));

  assert.ok(!texts.includes('acre'), 'the rejected span is gone');
  assert.ok(texts.includes('wheat'), 'the confirmed one is there');
  assert.equal(built.issues.rejected_excluded, 1, 'and its exclusion is counted, not silent');
});

test('asking for low-confidence spans does not bring a rejected one back', async () => {
  const doc = await decidedDoc();
  for (const options of [
    { includeLowConfidence: true },
    { includeLowConfidence: true, includeEmpty: true },
    { minConfidence: 0 },
    { verifiedOnly: false, includeLowConfidence: true },
  ]) {
    const built = buildRows([doc], options);
    const texts = built.rows.flatMap((r) => r.entities.map((e) => e.text));
    assert.ok(
      !texts.includes('acre'),
      `rejected span leaked with options ${JSON.stringify(options)}`
    );
    assert.equal(built.issues.rejected_excluded, 1);
  }
});

test('a rejected entity is absent from every serialised format', async () => {
  const doc = await decidedDoc();
  const built = buildRows([doc], { includeEmpty: true, withTokens: true, includeLowConfidence: true });

  // CoNLL prints every token, so the word "acre" is still there — what must be
  // gone is any tag on it. It was the only Field_Area in the fixture.
  const conll = toCoNLL(built.rows);
  assert.ok(conll.includes('acre\tO'), 'the token is present and untagged');
  assert.ok(!conll.includes('Field_Area'), 'no tag survives for the rejected span');
  assert.ok(!toSpacy(built.rows).includes('"Field_Area"'), 'the rejected span was the only Field_Area');
  const hf = toHuggingFace(built.rows)
    .trim()
    .split('\n')
    .map((l) => JSON.parse(l));
  assert.ok(hf.every((r) => !r.ner_tags_text.some((t) => t.endsWith('Field_Area'))));
});

test('confirmed and relabelled entities count as human-verified', async () => {
  const doc = await decidedDoc();
  const built = buildRows([doc], { includeEmpty: true });
  const manifest = buildManifest([doc], built);

  const all = built.rows.flatMap((r) => r.entities);
  const wheat = all.find((e) => e.text === 'wheat');
  const december = all.find((e) => e.text === 'mid-December');

  assert.equal(wheat.verified, true);
  assert.equal(december.verified, true);
  assert.equal(december.label, 'Date_and_Time', 'the corrected label is what gets trained on');
  assert.equal(manifest.counts.verified_entities, 2);
});

test('an unreviewed pipeline entity is not treated as verified', async () => {
  const doc = await decidedDoc();
  const built = buildRows([doc], { includeEmpty: true });
  const dap = built.rows.flatMap((r) => r.entities).find((e) => e.text === 'DAP');
  assert.equal(dap.verified, false, 'nobody has checked it');
  assert.equal(dap.source, 'model', 'it is pipeline output, not a human judgement');
});

test('a gold export of a part-validated file keeps only what a person confirmed', async () => {
  const doc = await decidedDoc();
  const built = buildRows([doc], { verifiedOnly: true });
  const texts = built.rows.flatMap((r) => r.entities.map((e) => e.text));

  assert.deepEqual(texts.sort(), ['mid-December', 'wheat']);
  assert.ok(!texts.includes('acre'));
  assert.ok(!texts.includes('DAP'));
});

test('the validated file still carries the rejection the training export dropped', async () => {
  const doc = await decidedDoc();
  const { records } = buildValidatedRecords([doc]);
  const acre = records[0].entities.find((e) => e.text === 'acre');
  assert.deepEqual(acre.validation, { status: 'rejected' });
  assert.equal(records[0].entities.length, 6, 'nothing removed from the file itself');
});

test('training formats are still available for a validation document by name', async () => {
  const doc = await decidedDoc();
  Document.find = async () => [doc];

  const res = await invoke(exportController.datasetExport, {
    params: { id: 'v1' },
    query: { format: 'jsonl', include_empty: '1' },
  });

  assert.equal(res.statusCode, 200);
  const rows = res.body.trim().split('\n').map((l) => JSON.parse(l));
  const texts = rows.flatMap((r) => r.entities.map((e) => e.text));
  assert.ok(texts.includes('wheat'));
  assert.ok(!texts.includes('acre'), 'the rejection is honoured here too');
});

test('an annotation document is unaffected by the rejection rule', async () => {
  const doc = fakeDoc({
    _id: 'a1',
    kind: 'annotate',
    filename: 'annotate.jsonl',
    segments: [
      {
        index: 0,
        text: 'Apply urea to wheat now.',
        sourceRecord: { text: 'Apply urea to wheat now.' },
        nerStatus: 'done',
        entities: [
          { text: 'urea', label: 'Chemical', start: 6, end: 10, confidence: 0.9, status: 'accepted', source: 'model' },
          { text: 'wheat', label: 'Crop', start: 14, end: 19, confidence: 1, status: 'approved', source: 'human' },
        ],
        originalEntities: [],
      },
    ],
  });

  const built = buildRows([doc], { includeEmpty: true });
  const texts = built.rows.flatMap((r) => r.entities.map((e) => e.text));
  assert.deepEqual(texts.sort(), ['urea', 'wheat']);
  assert.equal(built.issues.rejected_excluded, 0);
});

/** Puts a span of the annotator's own on the first passage. */
function addSpan(doc, phrase, label) {
  const seg = doc.segments[0];
  const start = seg.text.indexOf(phrase);
  assert.ok(start >= 0, `"${phrase}" is not in the passage`);
  seg.entities.push({
    text: phrase,
    label,
    start,
    end: start + phrase.length,
    confidence: 1,
    status: 'approved',
    source: 'human',
    validationStatus: 'added',
  });
  seg.entities.sort((a, b) => a.start - b.start || a.end - b.end);
}

test('a span the annotator added reaches the training export as verified', async () => {
  const doc = await decidedDoc();
  // 'apply' is a word the pipeline tagged nothing on
  addSpan(doc, 'apply', 'Agri_Method');

  const built = buildRows([doc], { includeEmpty: true });
  const all = built.rows.flatMap((r) => r.entities);
  const added = all.find((e) => e.text === 'apply');

  assert.ok(added, 'the addition is a label like any other');
  assert.equal(added.label, 'Agri_Method');
  assert.equal(added.verified, true, 'and a person stands behind it');
  const unreviewed = all.find((e) => e.text === 'DAP');
  assert.equal(unreviewed.verified, false, 'unlike one nobody has looked at');

  const manifest = buildManifest([doc], built);
  assert.equal(manifest.counts.by_label.Agri_Method, 1);
  assert.ok(manifest.counts.human_entities >= 1, 'counted as a human span in the manifest');
});

test('where an addition overlaps a pipeline span, the training export keeps the human one', async () => {
  const doc = await decidedDoc();
  // '55 kg DAP' covers the pipeline's unreviewed '55 kg' and 'DAP'
  addSpan(doc, '55 kg DAP', 'Chemical');

  const built = buildRows([doc], { includeEmpty: true, includeLowConfidence: true });
  const texts = built.rows.flatMap((r) => r.entities.map((e) => e.text));

  assert.ok(texts.includes('55 kg DAP'), 'the reading a person vouched for survives');
  assert.ok(!texts.includes('55 kg'), 'the pipeline guesses underneath it do not');
  assert.ok(!texts.includes('DAP'));
  assert.ok(built.issues.overlaps_removed >= 1, 'and the removal is counted, not silent');

  // the validated file, by contrast, keeps every one of them
  const { records } = buildValidatedRecords([doc]);
  const kept = records[0].entities.map((e) => e.text);
  assert.ok(kept.includes('55 kg') && kept.includes('DAP') && kept.includes('55 kg DAP'));
});
