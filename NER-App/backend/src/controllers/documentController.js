/**
 * Document Controller
 * Handles document upload, listing, retrieval, and deletion
 */

const Document = require('../models/Document');
const { CANONICAL_TYPES, normalizeLabel } = require('../utils/exportUtils');
const { parseDocument } = require('../services/jsonParser');
const { computeStats } = require('../services/nerService');

const VALIDATION_STATUSES = ['unreviewed', 'confirmed', 'rejected', 'relabelled'];

/**
 * Entities that arrived with a pipeline file, loaded as they are.
 *
 * Nothing is invented and nothing is re-predicted: the type becomes the label,
 * the pipeline's score becomes the confidence, and every offset is checked
 * against the passage text so a span can never point at the wrong characters.
 * The entity's own metadata is not copied here — the untouched record is kept
 * in sourceRecord, and the export rebuilds from that.
 *
 * A validated file uploaded again brings its decisions back through each
 * entity's `validation` block.
 */
function buildProvidedEntities(provided, text, ingest) {
  const out = [];

  for (const raw of provided) {
    if (!raw || typeof raw !== 'object') continue;

    const entityText = String(raw.text ?? '').trim();
    const type = String(raw.type ?? '').trim();
    const start = Number(raw.start);
    const end = Number(raw.end);

    const usable =
      entityText &&
      type &&
      Number.isFinite(start) &&
      Number.isFinite(end) &&
      end > start &&
      end <= text.length &&
      text.slice(start, end) === entityText;

    if (!usable) {
      ingest.skippedOffsets += 1;
      continue;
    }

    const label = CANONICAL_TYPES.includes(type) ? type : normalizeLabel(type);
    const block = raw.validation && typeof raw.validation === 'object' ? raw.validation : null;
    const restored =
      block && VALIDATION_STATUSES.includes(block.status) ? block.status : 'unreviewed';
    if (block && restored !== 'unreviewed') ingest.restoredDecisions += 1;

    // The annotation-axis status mirrors the decision, so a confirmed or
    // relabelled span counts as human-verified in the dataset exports and an
    // unreviewed one does not.
    const statusFor = {
      unreviewed: 'accepted',
      confirmed: 'approved',
      rejected: 'accepted',
      relabelled: 'edited',
    };

    out.push({
      text: entityText,
      label: restored === 'relabelled' && block.type ? String(block.type).trim() || label : label,
      start,
      end,
      confidence: Number.isFinite(Number(raw.score)) ? Number(raw.score) : 1,
      status: statusFor[restored],
      source: restored === 'unreviewed' || restored === 'rejected' ? 'llm' : 'human',
      validationStatus: restored,
      originalLabel: String(block?.original_type || label),
    });
    ingest.provided += 1;
  }

  return out.sort((a, b) => a.start - b.start || a.end - b.end);
}

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
     * Which workflow this file belongs to is decided here, from the file's own
     * structure, and never from its name. A file whose entities carry a `type`
     * came from the hybrid pipeline and is for validation: its entities are
     * loaded as they are and the model is never run on it. Everything else is
     * the annotation workflow, unchanged.
     */
    const isValidation = parsed.some(
      (seg) => Array.isArray(seg.providedEntities) && seg.providedEntities.length > 0
    );
    const ingest = { provided: 0, skippedOffsets: 0, restoredDecisions: 0 };

    if (isValidation) {
      const segments = parsed.map((seg) => {
        const { providedEntities = [], importedEntities, ...rest } = seg;
        const entities = buildProvidedEntities(providedEntities, rest.text, ingest);

        /*
         * A validated file carries its own progress: a passage someone read and
         * found empty says so in its summary, and that has to come back or the
         * work would look unfinished on resume.
         */
        const acknowledged =
          rest.sourceRecord?.validation_summary?.nothing_to_validate === true;
        if (acknowledged) ingest.restoredDecisions += 1;

        return {
          ...rest,
          entities,
          // The pipeline's own output, kept as the baseline to compare against.
          originalEntities: entities.map((e) => ({ ...e })),
          nerStatus: 'provided',
          ...(acknowledged ? { nothingToValidate: true } : {}),
        };
      });

      const doc = await Document.create({
        filename: req.file.originalname,
        threshold,
        kind: 'validate',
        segments,
        stats: computeStats(segments),
      });
      return res.status(201).json({ ...doc.toObject(), ingest });
    }

    /*
     * Inference is deliberately not run here. On a large file it is minutes of
     * work before a single passage can be looked at, and the annotator only
     * ever needs the passage in front of them plus the next few. The client
     * asks for a window through POST /:id/predict as it moves, so annotation
     * can start the moment the file is parsed.
     */
    const segments = parsed.map((seg) => {
      const { importedEntities, providedEntities, ...rest } = seg;

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
      kind: 'annotate',
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

// POST /api/documents/:id/skip-inference
// The upload dialog is answered after the file is classified, so the choice to
// annotate from scratch arrives here rather than as an upload parameter.
exports.skipInference = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    if (doc.kind === 'validate') {
      return res.status(409).json({ error: 'A validation document does not use the model.' });
    }

    let changed = 0;
    doc.segments.forEach((seg) => {
      if (seg.nerStatus === 'pending') {
        seg.nerStatus = 'skipped';
        changed += 1;
      }
    });
    if (changed > 0) await doc.save();

    res.json({ ok: true, skipped: changed });
  } catch (err) {
    next(err);
  }
};
