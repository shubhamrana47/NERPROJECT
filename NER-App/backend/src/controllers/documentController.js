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

const CANONICAL_TYPES = [
  'Agri_Method', 'Agri_Pollution', 'Agri_Process', 'Agri_Waste', 'Chemical', 'Citation',
  'Crop', 'Date_and_Time', 'Disease', 'Duration', 'Event', 'Field_Area',
  'Food_Item', 'Fruit', 'Humidity', 'Location', 'ML_Model', 'Money',
  'Natural_Disaster', 'Natural_Resource', 'Nutrient', 'Organism', 'Organization', 'Other',
  'Other_Quantity', 'Person', 'Policy', 'Quantity', 'Rainfall', 'Season',
  'Soil', 'Technology', 'Temp', 'Treatment', 'Vegetable', 'Weather'
];

const CANONICAL_MAP = Object.fromEntries(
  CANONICAL_TYPES.map((t) => [t.toLowerCase().replace(/[\s_-]+/g, ''), t])
);

function normalizeLabel(rawLabel) {
  if (!rawLabel) return 'Other';
  const clean = String(rawLabel).replace(/^[BI]-/i, '').trim();
  const key = clean.toLowerCase().replace(/[\s_-]+/g, '');
  return CANONICAL_MAP[key] || clean;
}

function normalizeAndDeduplicateEntities(entities, segmentText = '') {
  if (!Array.isArray(entities) || entities.length === 0) return [];

  const candidates = [];
  const statusPriority = { edited: 3, approved: 2, accepted: 1, review: 0 };

  for (const ent of entities) {
    if (!ent) continue;
    let text = String(ent.text || '').trim();
    if (!text) continue;

    // Normalize inner whitespace
    text = text.replace(/\s+/g, ' ');

    let label = normalizeLabel(ent.label);
    let start = Number(ent.start ?? 0);
    let end = Number(ent.end ?? (start + text.length));

    // Align with segment text if offsets need calibration
    if (segmentText) {
      if (segmentText.slice(start, end).trim() !== text) {
        const found = segmentText.indexOf(text, Math.max(0, start - 25));
        if (found !== -1 && Math.abs(found - start) <= 30) {
          start = found;
          end = found + text.length;
        }
      }
    }

    if (end <= start) continue;

    candidates.push({
      text,
      label,
      start,
      end,
      confidence: Number(ent.confidence ?? 1.0),
      status: ent.status || 'accepted',
    });
  }

  // Sort: start ascending, then wider span first, then higher status priority, then confidence
  candidates.sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    if (a.end !== b.end) return b.end - a.end;
    const prioDiff = (statusPriority[b.status] || 0) - (statusPriority[a.status] || 0);
    if (prioDiff !== 0) return prioDiff;
    return b.confidence - a.confidence;
  });

  const unique = [];
  const seenSpans = new Set();
  const seenEntities = new Set();

  for (const e of candidates) {
    const spanKey = `${e.start}:${e.end}`;
    const entityKey = `${e.label.toLowerCase()}:${e.start}:${e.end}`;

    // Deduplicate: same span or same entity at that position
    if (seenSpans.has(spanKey) || seenEntities.has(entityKey)) continue;

    seenSpans.add(spanKey);
    seenEntities.add(entityKey);

    unique.push({
      text: e.text,
      label: e.label,
      start: e.start,
      end: e.end,
    });
  }

  // Sort final entities by ascending start offset
  unique.sort((a, b) => a.start - b.start || a.end - b.end);
  return unique;
}

// Training data: all non-deleted entities that are accepted/approved/edited, normalized & deduplicated.
exports.trainingData = async (req, res, next) => {
  try {
    const filter = req.params.id ? { _id: req.params.id } : {};
    const docs = await Document.find(filter);
    const rows = [];
    docs.forEach((d) =>
      d.segments.forEach((s) => {
        const eligible = s.entities.filter((e) =>
          ['accepted', 'approved', 'edited'].includes(e.status)
        );
        const normalizedEntities = normalizeAndDeduplicateEntities(eligible, s.text);
        if (normalizedEntities.length) {
          rows.push({
            document: d.filename,
            text: s.text,
            entities: normalizedEntities,
          });
        }
      })
    );
    res.json(rows);
  } catch (err) { next(err); }
};
