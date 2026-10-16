/**
 * Document Controller
 * Handles document upload, listing, retrieval, and deletion
 */

const Document = require('../models/Document');
const { parseDocument } = require('../services/jsonParser');
const { runNER, routeEntity, computeStats } = require('../services/nerService');

// POST /api/documents
// Upload JSON document, run model inference, and store in MongoDB
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
    const segments = parsed.map((s) => {
      const routed = (byId[s.index] || []).map((e) => routeEntity(e, threshold));
      return {
        ...s,
        entities: routed,
        originalEntities: JSON.parse(JSON.stringify(routed)),
      };
    });

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

// GET /api/documents
// List all documents (metadata only, excluding large segment payloads)
exports.list = async (_req, res, next) => {
  try {
    res.json(await Document.find({}, '-segments').sort({ createdAt: -1 }));
  } catch (err) {
    next(err);
  }
};

// GET /api/documents/:id
// Get full document by ID
exports.get = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json(doc);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/documents/:id
// Delete document and all annotations by ID
exports.remove = async (req, res, next) => {
  try {
    await Document.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

// Re-export methods from specialized controllers for backward compatibility
const entityController = require('./entityController');
const lineController = require('./lineController');
const exportController = require('./exportController');

Object.assign(exports, entityController, lineController, exportController);
