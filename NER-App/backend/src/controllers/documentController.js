/**
 * Document Controller
 * Handles document upload, listing, retrieval, and deletion
 */

const Document = require('../models/Document');
const { parseDocument } = require('../services/jsonParser');
const { computeStats } = require('../services/nerService');

// POST /api/documents
// Upload JSON or JSONL document, run model inference, and store in MongoDB
exports.upload = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No JSON or JSONL file uploaded' });

    const rawContent = req.file.buffer.toString('utf-8').trim();
    if (!rawContent) return res.status(400).json({ error: 'Uploaded file is empty' });

    let json;
    const isJsonlExt = req.file.originalname.toLowerCase().endsWith('.jsonl');

    if (isJsonlExt) {
      // Parse as JSON Lines (one JSON object per line)
      const lines = rawContent
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !l.startsWith('//') && !l.startsWith('#'));

      const records = [];
      for (let i = 0; i < lines.length; i++) {
        try {
          records.push(JSON.parse(lines[i]));
        } catch (err) {
          return res.status(400).json({
            error: `Invalid JSONL format at line ${i + 1}: ${err.message}`,
          });
        }
      }
      if (records.length === 0) {
        return res.status(400).json({ error: 'No valid JSON records found in JSONL file' });
      }
      json = records;
    } else {
      // First attempt standard single JSON.parse
      try {
        json = JSON.parse(rawContent);
      } catch (jsonErr) {
        // Auto-fallback: attempt JSON Lines parsing in case user uploaded a .jsonl with .json or other extension
        const lines = rawContent
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l.length > 0 && !l.startsWith('//') && !l.startsWith('#'));

        let fallbackSuccess = true;
        const records = [];
        for (const line of lines) {
          try {
            records.push(JSON.parse(line));
          } catch (_) {
            fallbackSuccess = false;
            break;
          }
        }

        if (fallbackSuccess && records.length > 0) {
          json = records;
        } else {
          return res.status(400).json({
            error: 'Invalid file format: unable to parse as JSON or JSONL.',
          });
        }
      }
    }

    const threshold = Number(process.env.CONFIDENCE_THRESHOLD || 0.75);
    const parsed = parseDocument(json);
    if (!parsed.length) return res.status(400).json({ error: 'No text found in JSON or JSONL file' });

    const skipNer = req.query.skipNer === 'true' || req.body.skipNer === 'true';

    /*
     * Inference is deliberately not run here. On a large file it is minutes of
     * work before a single passage can be looked at, and the annotator only
     * ever needs the passage in front of them plus the next few. The client
     * asks for a window through POST /:id/predict as it moves, so annotation
     * can start the moment the file is parsed.
     */
    const segments = parsed.map((seg) => {
      const { importedEntities, ...rest } = seg;

      // Re-uploading an exported file resumes it: its annotations come back and
      // the model is not asked to read those passages again.
      if (Array.isArray(importedEntities) && importedEntities.length > 0) {
        const restored = importedEntities
          .map((e) => ({
            text: String(e.text ?? '').trim(),
            label: String(e.label ?? '').trim(),
            start: Number(e.start),
            end: Number(e.end),
            confidence: e.confidence !== undefined ? Number(e.confidence) : 1,
            status: e.status || (e.source === 'human' ? 'approved' : 'accepted'),
            source: e.source === 'human' ? 'human' : 'model',
          }))
          .filter(
            (e) =>
              e.text &&
              e.label &&
              Number.isFinite(e.start) &&
              Number.isFinite(e.end) &&
              e.end > e.start &&
              e.end <= rest.text.length &&
              rest.text.slice(e.start, e.end) === e.text
          )
          .sort((a, b) => a.start - b.start || a.end - b.end);

        return {
          ...rest,
          entities: restored,
          originalEntities: restored.filter((e) => e.source === 'model'),
          nerStatus: restored.length > 0 ? 'done' : skipNer ? 'skipped' : 'pending',
        };
      }

      return {
        ...rest,
        entities: [],
        originalEntities: [],
        nerStatus: skipNer ? 'skipped' : 'pending',
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
