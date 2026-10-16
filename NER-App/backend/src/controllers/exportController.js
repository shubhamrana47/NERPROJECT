/**
 * Export Controller
 * Handles dataset exports (training data, Label Studio format)
 */

const Document = require('../models/Document');
const {
  splitSentencesWithOffsets,
  normalizeAndDeduplicateEntities,
} = require('../utils/exportUtils');

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
