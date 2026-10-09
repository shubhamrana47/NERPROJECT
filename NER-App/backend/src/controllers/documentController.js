const Document = require('../models/Document');
const { parseDocument } = require('../services/jsonParser');
const { runNER, routeEntity, computeStats } = require('../services/nerService');

exports.upload = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No JSON file uploaded' });
    let json;
    try {
      json = JSON.parse(req.file.buffer.toString('utf-8'));
    } catch {
      return res.status(400).json({ error: 'Invalid JSON file' });
    }
    const threshold = Number(process.env.CONFIDENCE_THRESHOLD || 0.85);
    const parsed = parseDocument(json);
    if (!parsed.length) return res.status(400).json({ error: 'No text found in JSON' });

    const results = await runNER(parsed);
    const byId = Object.fromEntries(results.map((r) => [r.id, r.entities]));
    const segments = parsed.map((s) => ({
      ...s,
      entities: (byId[s.index] || []).map((e) => routeEntity(e, threshold)),
    }));

    const doc = await Document.create({
      filename: req.file.originalname,
      threshold,
      segments,
      stats: computeStats(segments),
    });
    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
};

exports.list = async (_req, res, next) => {
  try {
    res.json(await Document.find({}, '-segments').sort({ createdAt: -1 }));
  } catch (err) { next(err); }
};

exports.get = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json(doc);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    await Document.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
};

// PATCH body: { action: 'accept' | 'edit' | 'delete', label?, text?, start?, end? }
exports.reviewEntity = async (req, res, next) => {
  try {
    const { id, segmentIndex, entityId } = req.params;
    const { action, label, text, start, end } = req.body;
    const doc = await Document.findById(id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    const seg = doc.segments.find((s) => s.index === Number(segmentIndex));
    const ent = seg && seg.entities.id(entityId);
    if (!ent) return res.status(404).json({ error: 'Entity not found' });

    if (action === 'accept') ent.status = 'approved';
    else if (action === 'delete') ent.status = 'deleted';
    else if (action === 'edit') {
      if (label !== undefined) ent.label = label;
      if (text !== undefined) ent.text = text;
      if (start !== undefined) ent.start = start;
      if (end !== undefined) ent.end = end;
      ent.status = 'edited';
    } else return res.status(400).json({ error: 'Invalid action' });
    ent.source = 'human';

    doc.stats = computeStats(
      doc.segments.map((s) => ({ entities: s.entities.filter((e) => e.status !== 'deleted') }))
    );
    await doc.save();
    res.json(doc);
  } catch (err) { next(err); }
};

// Training data: all non-deleted entities that are accepted/approved/edited.
exports.trainingData = async (req, res, next) => {
  try {
    const filter = req.params.id ? { _id: req.params.id } : {};
    const docs = await Document.find(filter);
    const rows = [];
    docs.forEach((d) =>
      d.segments.forEach((s) => {
        const entities = s.entities
          .filter((e) => ['accepted', 'approved', 'edited'].includes(e.status))
          .map(({ text, label, start, end }) => ({ text, label, start, end }));
        if (entities.length) rows.push({ document: d.filename, text: s.text, entities });
      })
    );
    res.json(rows);
  } catch (err) { next(err); }
};
