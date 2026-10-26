/**
 * Test helpers.
 *
 * The suites run with `node --test` and touch no database: the Mongoose model
 * is stubbed, and the model service is stubbed through global.fetch. Fixtures
 * live beside these files so the tests are portable and do not depend on
 * anything outside the repository.
 */

const fs = require('node:fs');
const path = require('node:path');

const SRC = path.join(__dirname, '..', 'backend', 'src');

const readFixture = (name) =>
  fs
    .readFileSync(path.join(__dirname, 'fixtures', name), 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));

const fixtureText = (name) => fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');

/** A stand-in for a Mongoose document: records saves, supports toObject(). */
function fakeDoc(fields) {
  const doc = {
    ...fields,
    saves: 0,
    async save() {
      this.saves += 1;
    },
    toObject() {
      const { save, toObject, saves, ...rest } = this;
      return rest;
    },
  };
  return doc;
}

/** Captures what a controller sent, the way a test can read it back. */
function fakeRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(k, v) {
      this.headers[String(k).toLowerCase()] = v;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    send(body) {
      this.body = body;
      return this;
    },
  };
}

/** Runs a controller and returns the response, failing loudly on next(err). */
async function invoke(handler, req) {
  const res = fakeRes();
  await handler(req, res, (err) => {
    throw err;
  });
  return res;
}

/** A model service that tags a few words, so predictions have real offsets. */
function stubModelService({ fail = false } = {}) {
  const calls = [];
  const lexicon = [
    ['wheat', 'Crop', 0.97],
    ['cotton', 'Crop', 0.95],
    ['urea', 'Chemical', 0.93],
    ['DAP', 'Chemical', 0.9],
    ['acre', 'Field_Area', 0.64],
  ];

  global.fetch = async (_url, opts) => {
    const { segments } = JSON.parse(opts.body);
    calls.push(segments.map((s) => s.id));
    if (fail) throw new Error('connect ECONNREFUSED');
    return {
      ok: true,
      json: async () => ({
        results: segments.map((s) => {
          const entities = [];
          for (const [word, label, score] of lexicon) {
            const re = new RegExp(`\\b${word}\\b`, 'gi');
            let m = re.exec(s.text);
            while (m) {
              const start = m.index;
              const end = start + m[0].length;
              if (!entities.some((e) => start < e.end && end > e.start)) {
                entities.push({ text: m[0], label, start, end, confidence: score });
              }
              m = re.exec(s.text);
            }
          }
          return { id: s.id, entities: entities.sort((a, b) => a.start - b.start) };
        }),
      }),
    };
  };

  return calls;
}

/** An upload request carrying one of the fixtures. */
const uploadRequest = (name, query = {}) => ({
  file: { originalname: name, buffer: Buffer.from(fixtureText(name), 'utf8') },
  query,
  body: {},
});

/**
 * Deep comparison that treats -0 and 0 as equal.
 *
 * JSON has no negative zero: JSON.stringify(-0) emits "0". The pipeline writes
 * mean_logprob as -0.0 for a confident entity, so a round trip through any JSON
 * writer returns 0. The value is numerically identical; only its sign bit is
 * lost, and nothing can preserve it short of writing the file by hand.
 */
function sameRecord(actual, expected, pathSoFar = '') {
  const differences = [];
  const walk = (a, b, p) => {
    const bothObjects =
      typeof a === 'object' && a !== null && typeof b === 'object' && b !== null;
    if (!bothObjects) {
      // == rather than Object.is, so -0 and 0 compare equal
      if (!(a === b || (typeof a === 'number' && typeof b === 'number' && a === b))) {
        differences.push(`${p}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`);
      }
      return;
    }
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) walk(a[k], b[k], p ? `${p}.${k}` : k);
  };
  walk(actual, expected, pathSoFar);
  return differences;
}

module.exports = {
  SRC,
  sameRecord,
  readFixture,
  fixtureText,
  fakeDoc,
  fakeRes,
  invoke,
  stubModelService,
  uploadRequest,
};
