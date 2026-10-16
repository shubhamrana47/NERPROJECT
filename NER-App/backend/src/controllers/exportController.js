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
        .filter((e) => e.source === 'model')
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
        }));

      const annotations = active.map((e, aIdx) => ({
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
      }));

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
      `attachment; filename="${doc.filename.replace(/\.json$/i, '')}_label_studio.json"`
    );
    res.json(tasks);
  } catch (err) {
    next(err);
  }
};

// GET /api/documents/training-data or GET /api/documents/:id/training-data
// Training data: all non-deleted entities that are accepted/approved/edited, normalized & deduplicated.
// Supports query parameter format=lines to export sentence-by-sentence training dataset.
exports.trainingData = async (req, res, next) => {
  try {
    const filter = req.params.id ? { _id: req.params.id } : {};
    const docs = await Document.find(filter);
    const format = req.query.format;
    const rows = [];

    docs.forEach((d) =>
      d.segments.forEach((s) => {
        const eligible = s.entities.filter((e) =>
          ['accepted', 'approved', 'edited'].includes(e.status)
        );

        if (format === 'lines') {
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
                rows.push({
                  document: d.filename,
                  segmentIndex: s.index,
                  lineIndex: sIdx,
                  text: sent.text,
                  entities: normalized,
                });
              }
            }
          });
        } else {
          const normalizedEntities = normalizeAndDeduplicateEntities(eligible, s.text);
          if (normalizedEntities.length) {
            rows.push({
              document: d.filename,
              text: s.text,
              entities: normalizedEntities,
            });
          }
        }
      })
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};
