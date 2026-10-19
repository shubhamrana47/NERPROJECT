/**
 * Export Controller
 * Handles dataset exports (training data, Label Studio format)
 */

const Document = require('../models/Document');
const {
  splitSentencesWithOffsets,
  normalizeAndDeduplicateEntities,
} = require('../utils/exportUtils');
const {
  buildAnnotatedRecords,
  buildRows,
  buildManifest,
  toJsonl,
  toHuggingFace,
  toCoNLL,
  toSpacy,
} = require('../services/datasetBuilder');

// GET /api/documents/:id/label-studio
// Export in standard Label Studio tasks + annotations JSON format
exports.labelStudioExport = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });

    const tasks = doc.segments.map((s, idx) => {
      const active = s.entities.filter((e) => e.status !== 'deleted');
      const predictions = active
        .filter((e) => e.source === 'model' && e.status !== 'edited')
        .map((e, pIdx) => ({
          id: `pred_${s.index}_${pIdx}`,
          from_name: 'label',
          to_name: 'text',
          type: 'labels',
          value: {
            start: e.start,
            end: e.end,
            text: e.text,
            labels: [e.label],
          },
          score: e.confidence,
          tag: 'NER_LABELLED',
          labelled_by: 'NER Model',
          source: 'model',
        }));

      const annotations = active.map((e, aIdx) => {
        const isManual = e.source === 'human' || e.status === 'edited';
        return {
          id: `ann_${s.index}_${aIdx}`,
          from_name: 'label',
          to_name: 'text',
          type: 'labels',
          value: {
            start: e.start,
            end: e.end,
            text: e.text,
            labels: [e.label],
          },
          score: e.confidence,
          tag: isManual ? 'MANUALLY_LABELLED' : 'NER_LABELLED',
          labelled_by: isManual ? 'Manual Annotator' : 'NER Model',
          source: isManual ? 'human' : 'model',
          status: e.status,
        };
      });

      return {
        id: idx + 1,
        data: {
          text: s.text,
          segment_index: s.index,
          page: s.page || 1,
          section: s.section || s.heading || `Section ${s.index + 1}`,
          filename: doc.filename,
        },
        predictions: predictions.length ? [{ model_version: 'AgNER-BERTa', result: predictions }] : [],
        annotations: [{ result: annotations }],
      };
    });

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${doc.filename.replace(/\.(json|jsonl)$/i, '')}_label_studio.json"`
    );
    res.json(tasks);
  } catch (err) {
    next(err);
  }
};

// GET /api/documents/training-data or GET /api/documents/:id/training-data
// Training data: all non-deleted entities that are accepted/approved/edited, normalized & deduplicated.
// Supports format=lines (sentence-level) and as=jsonl (JSON Lines format).
// Automatically attaches download header for direct file saving.
exports.trainingData = async (req, res, next) => {
  try {
    const filter = req.params.id ? { _id: req.params.id } : {};
    const docs = await Document.find(filter);
    const format = req.query.format;
    const asJsonl = req.query.as === 'jsonl' || req.query.format === 'jsonl' || req.query.jsonl === 'true';
    const isDownload = req.query.download !== 'false';
    const rows = [];

    docs.forEach((d) =>
      d.segments.forEach((s) => {
        const eligible = s.entities.filter((e) =>
          ['accepted', 'approved', 'edited'].includes(e.status)
        );

        if (format === 'lines' || asJsonl) {
          const sentences = splitSentencesWithOffsets(s.text);
          sentences.forEach((sent, sIdx) => {
            const lineEnts = eligible.filter(
              (e) => e.start >= sent.start && e.start < sent.end
            );
            if (lineEnts.length > 0) {
              const relativeEnts = lineEnts.map((e) => ({
                text: e.text,
                label: e.label,
                start: Math.max(0, e.start - sent.start),
                end: Math.min(sent.text.length, e.end - sent.start),
                confidence: e.confidence,
                source: e.source,
                status: e.status,
              }));
              const normalized = normalizeAndDeduplicateEntities(relativeEnts, sent.text);
              if (normalized.length) {
                const nerCount = normalized.filter((e) => e.tag === 'NER_LABELLED').length;
                const manualCount = normalized.filter((e) => e.tag === 'MANUALLY_LABELLED').length;
                rows.push({
                  document: d.filename,
                  segmentIndex: s.index,
                  lineIndex: sIdx,
                  text: sent.text,
                  entities: normalized,
                  labelled_summary: {
                    ner_labelled_count: nerCount,
                    manually_labelled_count: manualCount,
                    total_entities: normalized.length,
                  },
                });
              }
            }
          });
        } else {
          const normalizedEntities = normalizeAndDeduplicateEntities(eligible, s.text);
          if (normalizedEntities.length) {
            const nerCount = normalizedEntities.filter((e) => e.tag === 'NER_LABELLED').length;
            const manualCount = normalizedEntities.filter((e) => e.tag === 'MANUALLY_LABELLED').length;
            rows.push({
              document: d.filename,
              section: s.section || s.heading || `Section ${s.index + 1}`,
              segmentIndex: s.index,
              text: s.text,
              entities: normalizedEntities,
              labelled_summary: {
                ner_labelled_count: nerCount,
                manually_labelled_count: manualCount,
                total_entities: normalizedEntities.length,
              },
            });
          }
        }
      })
    );

    const filenameBase = docs.length === 1
      ? docs[0].filename.replace(/\.(json|jsonl)$/i, '')
      : 'dataset';

    if (asJsonl) {
      res.setHeader('Content-Type', 'application/x-jsonlines; charset=utf-8');
      if (isDownload) {
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${filenameBase}_training_data.jsonl"`
        );
      }
      const jsonlText = rows.map((r) => JSON.stringify(r)).join('\n');
      return res.send(jsonlText);
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    if (isDownload) {
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filenameBase}_training_data.json"`
      );
    }
    return res.json(rows);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/documents/:id/dataset  (and /api/documents/dataset for every document)
 *
 * The uploaded file, handed back with annotations appended: one line per record
 * exactly as it arrived, in its original field order, with `entities` and
 * `annotation` added at the end. Every record is included, and every span
 * states its source and whether a person verified it, so the single file serves
 * both training and benchmarking.
 *
 * Query parameters:
 *   format=annotated (default) — the source file plus annotations
 *   format=jsonl|json|conll|hf|spacy|manifest — sentence-level derivatives,
 *     available for pipelines that want them; not surfaced in the interface
 *   verified=1          only spans a person signed off (gold benchmark)
 *   include_empty=0     drop sentences with no entities (default: keep them)
 *   low_confidence=1    also include unreviewed spans below the threshold
 *   min_confidence=0.9  floor for unverified model spans
 *   overlaps=keep       leave overlapping spans in place (default: resolve)
 *   split=1             add a deterministic train/dev/test assignment
 *   download=false      render in the browser instead of saving to a file
 */
exports.datasetExport = async (req, res, next) => {
  try {
    const filter = req.params.id ? { _id: req.params.id } : {};
    const docs = await Document.find(filter);
    if (req.params.id && docs.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }

    const format = String(req.query.format || 'annotated').toLowerCase();
    const isTruthy = (v) => v === '1' || v === 'true';
    const needsTokens = format === 'conll' || format === 'hf';

    const selection = {
      verifiedOnly: isTruthy(req.query.verified),
      includeLowConfidence: req.query.low_confidence !== '0' && req.query.low_confidence !== 'false',
      minConfidence: Number(req.query.min_confidence || 0),
      resolveOverlaps: req.query.overlaps !== 'keep',
    };

    if (format === 'annotated') {
      // Every span the annotation holds travels, flagged, so the consumer can
      // filter rather than needing a second export.
      const { records, issues } = buildAnnotatedRecords(docs, selection);
      const spans = records.reduce((n, r) => n + r.entities.length, 0);
      const verified = records.reduce((n, r) => n + r.annotation.verified_spans, 0);
      const base = docs.length === 1
        ? docs[0].filename.replace(/\.(json|jsonl)$/i, '')
        : 'dataset';

      res.setHeader('Content-Type', 'application/x-jsonlines; charset=utf-8');
      if (req.query.download !== 'false') {
        res.setHeader('Content-Disposition', `attachment; filename="${base}_annotated.jsonl"`);
      }
      res.setHeader('X-Dataset-Rows', String(records.length));
      res.setHeader('X-Dataset-Entities', String(spans));
      res.setHeader('X-Dataset-Verified-Entities', String(verified));
      res.setHeader('X-Dataset-Quality', JSON.stringify(issues));
      return res.send(records.map((r) => JSON.stringify(r)).join('\n'));
    }

    const built = buildRows(docs, {
      verifiedOnly: isTruthy(req.query.verified),
      includeEmpty: req.query.include_empty !== '0' && req.query.include_empty !== 'false',
      includeLowConfidence: isTruthy(req.query.low_confidence),
      minConfidence: Number(req.query.min_confidence || 0),
      resolveOverlaps: req.query.overlaps !== 'keep',
      split: isTruthy(req.query.split),
      withTokens: needsTokens,
    });

    const manifest = buildManifest(docs, built);
    const base = docs.length === 1
      ? docs[0].filename.replace(/\.(json|jsonl)$/i, '')
      : 'dataset';
    const kind = built.options.verifiedOnly ? 'gold' : 'train';
    const isDownload = req.query.download !== 'false';

    const send = (body, contentType, extension) => {
      res.setHeader('Content-Type', `${contentType}; charset=utf-8`);
      if (isDownload) {
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${base}_${kind}.${extension}"`
        );
      }
      // The manifest travels in a header too, so a downloaded file can always
      // be traced back to the selection that produced it.
      res.setHeader('X-Dataset-Rows', String(manifest.counts.rows));
      res.setHeader('X-Dataset-Entities', String(manifest.counts.entities));
      res.setHeader('X-Dataset-Verified-Entities', String(manifest.counts.verified_entities));
      return res.send(body);
    };

    switch (format) {
      case 'manifest':
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        if (isDownload) {
          res.setHeader(
            'Content-Disposition',
            `attachment; filename="${base}_${kind}_manifest.json"`
          );
        }
        return res.send(JSON.stringify(manifest, null, 2));
      case 'json':
        return send(
          JSON.stringify({ manifest, rows: built.rows }, null, 2),
          'application/json',
          'json'
        );
      case 'conll':
        return send(toCoNLL(built.rows), 'text/plain', 'conll');
      case 'hf':
        return send(toHuggingFace(built.rows), 'application/x-jsonlines', 'jsonl');
      case 'spacy':
        return send(toSpacy(built.rows), 'application/x-jsonlines', 'jsonl');
      case 'jsonl':
      default:
        return send(toJsonl(built.rows), 'application/x-jsonlines', 'jsonl');
    }
  } catch (err) {
    next(err);
  }
};
