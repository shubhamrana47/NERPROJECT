const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const SRC = path.join(__dirname, '..', 'backend', 'src');
const Document = require(path.join(SRC, 'models/Document'));
const predictController = require(path.join(SRC, 'controllers/predictController'));
const entityController = require(path.join(SRC, 'controllers/entityController'));
const { fakeDoc, fakeRes } = require('./helpers');

test('predictSegments does not overwrite concurrent saveSegmentEntities on previous passages', async () => {
  // Setup a fake database document with 2 passages
  let currentDoc = fakeDoc({
    _id: 'doc123',
    filename: 'test.jsonl',
    kind: 'annotate',
    threshold: 0.75,
    segments: [
      {
        index: 0,
        text: 'Wheat needs fertilizer.',
        nerStatus: 'pending',
        entities: [],
        originalEntities: [],
      },
      {
        index: 1,
        text: 'Cotton needs water.',
        nerStatus: 'pending',
        entities: [],
        originalEntities: [],
      },
    ],
    stats: {},
  });

  // Mock Document.findById
  Document.findById = async (id) => {
    // Return a clone simulating MongoDB findById
    const cloned = JSON.parse(JSON.stringify(currentDoc));
    return {
      ...cloned,
      async save() {
        // Simulating MongoDB save: updates currentDoc in DB
        currentDoc = JSON.parse(JSON.stringify(this));
      },
    };
  };

  // Mock global.fetch for runNER
  global.fetch = async (_url, opts) => {
    // Simulate delay where user marks passage 0 and saves
    const req = JSON.parse(opts.body);
    await new Promise((r) => setTimeout(r, 50));
    return {
      ok: true,
      json: async () => ({
        results: req.segments.map((s) => ({
          id: s.id,
          entities: [{ text: 'Cotton', label: 'Crop', start: 0, end: 6, score: 0.95 }],
        })),
      }),
    };
  };

  // Step 1: User moves to passage 1, which triggers predictSegments for passage 1
  const predictPromise = predictController.predictSegments(
    { params: { id: 'doc123' }, body: { indexes: [1] } },
    fakeRes(),
    () => {}
  );

  // Step 2: Meanwhile, user's save for passage 0 finishes saving to DB
  await entityController.saveSegmentEntities(
    {
      params: { id: 'doc123', segmentIndex: 0 },
      body: {
        entities: [
          {
            text: 'Wheat',
            label: 'Crop',
            start: 0,
            end: 5,
            confidence: 1.0,
            source: 'human',
            status: 'approved',
          },
        ],
      },
      query: { lean: '1' },
    },
    fakeRes(),
    () => {}
  );

  // Verify passage 0 is saved in currentDoc
  console.log('After saveSegmentEntities, seg 0 entities in DB:', currentDoc.segments[0].entities);
  assert.equal(currentDoc.segments[0].entities.length, 1, 'passage 0 was saved');

  // Step 3: Now predictSegments finishes
  await predictPromise;

  // Verify passage 0 is STILL in currentDoc!
  console.log('After predictSegments finishes, seg 0 entities in DB:', currentDoc.segments[0].entities);
  assert.equal(
    currentDoc.segments[0].entities.length,
    1,
    'passage 0 MUST NOT be wiped out by predictSegments!'
  );
  assert.equal(currentDoc.segments[0].entities[0].text, 'Wheat');
});
