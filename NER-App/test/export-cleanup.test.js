const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const Document = require(path.join(__dirname, '..', 'backend', 'src', 'models', 'Document'));
const exportController = require(path.join(
  __dirname,
  '..',
  'backend',
  'src',
  'controllers',
  'exportController'
));
const entityController = require(path.join(
  __dirname,
  '..',
  'backend',
  'src',
  'controllers',
  'entityController'
));
const {
  getExportCleanupDelayMs,
  clearAllPendingCleanups,
} = require(path.join(__dirname, '..', 'backend', 'src', 'services', 'exportCleanup'));

function makeStore(initialDocs) {
  const map = new Map();
  for (const d of initialDocs) {
    const rec = {
      ...d,
      exportedAt: null,
      expireAt: null,
      async save() {
        map.set(String(this._id), this);
        return this;
      },
    };
    map.set(String(d._id), rec);
  }
  return map;
}

function makeRes() {
  const headers = {};
  return {
    statusCode: 200,
    body: null,
    headers,
    setHeader(k, v) {
      headers[k.toLowerCase()] = v;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    send(payload) {
      this.body = payload;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function makeDoc(id) {
  return {
    _id: id,
    filename: 'sample.jsonl',
    kind: 'annotate',
    threshold: 0.75,
    segments: [
      {
        index: 0,
        text: 'Sow wheat in November.',
        nerStatus: 'done',
        sourceRecord: { text: 'Sow wheat in November.' },
        entities: [
          {
            text: 'wheat',
            label: 'Crop',
            start: 4,
            end: 9,
            confidence: 1,
            status: 'approved',
            source: 'human',
            isManual: true,
          },
        ],
        originalEntities: [],
      },
    ],
  };
}

test('Document schema defines TTL index on expireAt with expireAfterSeconds: 0', () => {
  const expirePath = Document.schema.path('expireAt');
  assert.ok(expirePath, 'expireAt path must exist on Document schema');
  assert.equal(expirePath.options.index?.expireAfterSeconds, 0);
});

test('default cleanup delay is 5 minutes and respects env overrides', () => {
  const prevMs = process.env.EXPORT_CLEANUP_DELAY_MS;
  const prevMin = process.env.EXPORT_CLEANUP_DELAY_MINUTES;
  try {
    delete process.env.EXPORT_CLEANUP_DELAY_MS;
    delete process.env.EXPORT_CLEANUP_DELAY_MINUTES;
    assert.equal(getExportCleanupDelayMs(), 5 * 60 * 1000);

    process.env.EXPORT_CLEANUP_DELAY_MINUTES = '3';
    assert.equal(getExportCleanupDelayMs(), 3 * 60 * 1000);

    process.env.EXPORT_CLEANUP_DELAY_MINUTES = '0';
    assert.equal(getExportCleanupDelayMs(), 0);
  } finally {
    if (prevMs === undefined) delete process.env.EXPORT_CLEANUP_DELAY_MS;
    else process.env.EXPORT_CLEANUP_DELAY_MS = prevMs;
    if (prevMin === undefined) delete process.env.EXPORT_CLEANUP_DELAY_MINUTES;
    else process.env.EXPORT_CLEANUP_DELAY_MINUTES = prevMin;
  }
});

test('exporting a document sets expireAt, emits headers, and auto-deletes after delay', async (t) => {
  const store = makeStore([makeDoc('doc-1')]);
  const origFind = Document.find;
  const origUpdateMany = Document.updateMany;
  const origDeleteOne = Document.deleteOne;
  const prevMs = process.env.EXPORT_CLEANUP_DELAY_MS;

  process.env.EXPORT_CLEANUP_DELAY_MS = '60';
  Document.find = async (filter) => {
    if (filter && filter._id) {
      const hit = store.get(String(filter._id));
      return hit ? [hit] : [];
    }
    return [...store.values()];
  };
  Document.updateMany = async (filter, update) => {
    const ids = (filter._id?.$in || []).map(String);
    for (const id of ids) {
      const rec = store.get(id);
      if (rec && update.$set) Object.assign(rec, update.$set);
    }
    return { modifiedCount: ids.length };
  };
  Document.deleteOne = async (filter) => {
    const rec = store.get(String(filter._id));
    if (!rec || !rec.expireAt) return { deletedCount: 0 };
    if (filter.expireAt?.$lte && rec.expireAt > filter.expireAt.$lte) return { deletedCount: 0 };
    store.delete(String(filter._id));
    return { deletedCount: 1 };
  };

  t.after(() => {
    clearAllPendingCleanups();
    Document.find = origFind;
    Document.updateMany = origUpdateMany;
    Document.deleteOne = origDeleteOne;
    if (prevMs === undefined) delete process.env.EXPORT_CLEANUP_DELAY_MS;
    else process.env.EXPORT_CLEANUP_DELAY_MS = prevMs;
  });

  // 1. Preview export (download=false) must NOT schedule deletion
  const previewRes = makeRes();
  await exportController.datasetExport(
    { params: { id: 'doc-1' }, query: { download: 'false' } },
    previewRes,
    (err) => {
      throw err;
    }
  );
  assert.equal(previewRes.headers['x-auto-delete-at'], undefined);
  assert.equal(store.get('doc-1').expireAt, null);

  // 2. Real download export schedules deletion and deletes after delay
  const dlRes = makeRes();
  await exportController.datasetExport(
    { params: { id: 'doc-1' }, query: {} },
    dlRes,
    (err) => {
      throw err;
    }
  );
  assert.ok(dlRes.headers['x-auto-delete-at'], 'X-Auto-Delete-At header must be set');
  assert.ok(store.get('doc-1').expireAt instanceof Date, 'expireAt must be persisted on doc');

  await new Promise((r) => setTimeout(r, 110));
  assert.equal(store.has('doc-1'), false, 'Exported document must be auto-deleted after delay');
});

test('editing a document after export cancels its scheduled auto-deletion', async (t) => {
  const store = makeStore([makeDoc('doc-2')]);
  const origFind = Document.find;
  const origFindById = Document.findById;
  const origUpdateMany = Document.updateMany;
  const origDeleteOne = Document.deleteOne;
  const prevMs = process.env.EXPORT_CLEANUP_DELAY_MS;

  process.env.EXPORT_CLEANUP_DELAY_MS = '80';
  Document.find = async (filter) => {
    const hit = store.get(String(filter._id));
    return hit ? [hit] : [];
  };
  Document.findById = async (id) => store.get(String(id)) || null;
  Document.updateMany = async (filter, update) => {
    const ids = (filter._id?.$in || []).map(String);
    for (const id of ids) {
      const rec = store.get(id);
      if (rec && update.$set) Object.assign(rec, update.$set);
    }
    return { modifiedCount: ids.length };
  };
  Document.deleteOne = async (filter) => {
    const rec = store.get(String(filter._id));
    if (!rec || !rec.expireAt) return { deletedCount: 0 };
    store.delete(String(filter._id));
    return { deletedCount: 1 };
  };

  t.after(() => {
    clearAllPendingCleanups();
    Document.find = origFind;
    Document.findById = origFindById;
    Document.updateMany = origUpdateMany;
    Document.deleteOne = origDeleteOne;
    if (prevMs === undefined) delete process.env.EXPORT_CLEANUP_DELAY_MS;
    else process.env.EXPORT_CLEANUP_DELAY_MS = prevMs;
  });

  const dlRes = makeRes();
  await exportController.datasetExport(
    { params: { id: 'doc-2' }, query: {} },
    dlRes,
    (err) => {
      throw err;
    }
  );
  assert.ok(store.get('doc-2').expireAt instanceof Date);

  // User saves a new edit before the grace period expires
  const saveRes = makeRes();
  await entityController.saveSegmentEntities(
    {
      params: { id: 'doc-2', segmentIndex: '0' },
      query: { lean: '1' },
      body: {
        entities: [
          { text: 'wheat', label: 'Crop', start: 4, end: 9, status: 'approved', source: 'human' },
        ],
      },
    },
    saveRes,
    (err) => {
      throw err;
    }
  );
  assert.equal(store.get('doc-2').expireAt, null, 'Saving edits must clear expireAt');

  // Wait past the original delay and verify the document was NOT deleted
  await new Promise((r) => setTimeout(r, 120));
  assert.equal(store.has('doc-2'), true, 'Edited document must survive past the old delay');
});
