/**
 * On-demand inference.
 *
 * Running the model over a whole file before anything can be annotated costs
 * minutes on a large one. Instead the client asks for a small window of
 * passages — the one on screen plus the next few — and keeps asking as the
 * annotator moves forward, so the model is always a little ahead of them.
 */

const Document = require('../models/Document');
const { runNER, routeEntity, computeStats } = require('../services/nerService');

// A window is a handful of passages; this only bounds a careless caller.
const MAX_PER_REQUEST = 25;

function resolveIndexes(body, doc) {
  const total = doc.segments.length;

  if (Array.isArray(body.indexes)) {
    const unique = new Set(
      body.indexes.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n >= 0 && n < total)
    );
    return [...unique].slice(0, MAX_PER_REQUEST);
  }

  const from = Number.isInteger(Number(body.from)) ? Number(body.from) : 0;
  const count = Math.min(Number(body.count) || 10, MAX_PER_REQUEST);
  const indexes = [];
  for (let i = from; i < Math.min(from + count, total); i++) indexes.push(i);
  return indexes;
}

const countPending = (doc) =>
  doc.segments.filter((s) => s.nerStatus === 'pending').length;

// POST /api/documents/:id/predict   { indexes: [...] } or { from, count }
exports.predictSegments = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const wanted = resolveIndexes(req.body || {}, doc);
    const candidates = wanted
      .map((i) => doc.segments.find((s) => s.index === i))
      .filter(Boolean);

    /*
     * A passage that already holds spans has been read, whatever its status
     * says. Documents stored before nerStatus existed take the schema default
     * of 'pending' when loaded, and re-predicting them would overwrite
     * annotations that are already there; mark them done instead.
     */
    let adopted = 0;
    candidates.forEach((seg) => {
      if ((seg.entities || []).length > 0 && seg.nerStatus !== 'done') {
        seg.nerStatus = 'done';
        adopted += 1;
      }
    });

    // 'error' is retryable: a passage the model service failed on must be
    // askable again, or a transient outage would leave a permanent hole.
    const targets = candidates.filter(
      (seg) =>
        (seg.entities || []).length === 0 &&
        (seg.nerStatus === 'pending' || seg.nerStatus === 'error')
    );

    if (targets.length === 0) {
      // Nothing to run. Persist any status corrected above and say so plainly.
      if (adopted > 0) await doc.save();
      return res.json({
        ok: true,
        predicted: [],
        adopted,
        stats: doc.stats,
        pending: countPending(doc),
      });
    }

    const threshold = doc.threshold || Number(process.env.CONFIDENCE_THRESHOLD || 0.75);

    let results;
    try {
      results = await runNER(targets.map((seg) => ({ index: seg.index, text: seg.text })));
    } catch (err) {
      // Mark the window so the client can offer a retry rather than spinning.
      targets.forEach((seg) => {
        seg.nerStatus = 'error';
      });
      await doc.save();
      return res.status(502).json({
        error: `The model service did not answer: ${err.message}`,
        predicted: targets.map((seg) => ({ index: seg.index, nerStatus: 'error', entities: [] })),
        pending: countPending(doc),
      });
    }

    const byIndex = Object.fromEntries(results.map((r) => [r.id, r.entities]));

    targets.forEach((seg) => {
      // Never overwrite a person's work: if anything here was annotated by
      // hand, keep it and simply mark the passage as done.
      const touchedByHand = (seg.entities || []).some(
        (e) => e.source === 'human' || e.status === 'approved' || e.status === 'edited'
      );
      if (!touchedByHand) {
        const routed = (byIndex[seg.index] || []).map((e) => routeEntity(e, threshold));
        seg.entities = routed;
        seg.originalEntities = JSON.parse(JSON.stringify(routed));
      }
      seg.nerStatus = 'done';
    });

    doc.stats = computeStats(
      doc.segments.map((s) => ({ entities: s.entities.filter((e) => e.status !== 'deleted') }))
    );
    await doc.save();

    res.json({
      ok: true,
      // Only the predicted passages travel back, never the whole document.
      predicted: targets.map((seg) => ({
        index: seg.index,
        nerStatus: seg.nerStatus,
        entities: seg.entities,
        originalEntities: seg.originalEntities,
      })),
      stats: doc.stats,
      pending: countPending(doc),
    });
  } catch (err) {
    next(err);
  }
};
