/**
 * Line Entity Controller
 * Handles line-level / sentence-level annotation saves and resets
 */

const mongoose = require('mongoose');
const Document = require('../models/Document');
const { computeStats } = require('../services/nerService');

// PUT /api/documents/:id/segments/:segmentIndex/line-entities
// Save / replace entities for a SINGLE sentence line within a segment
exports.saveLineEntities = async (req, res, next) => {
  try {
    const { id, segmentIndex } = req.params;
    const { sentenceStart, sentenceEnd, entities } = req.body;

    if (sentenceStart == null || sentenceEnd == null) {
      return res.status(400).json({ error: 'sentenceStart and sentenceEnd are required' });
    }
    if (!Array.isArray(entities)) {
      return res.status(400).json({ error: 'entities array is required' });
    }

    const doc = await Document.findById(id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    const seg = doc.segments.find((s) => s.index === Number(segmentIndex));
    if (!seg) return res.status(404).json({ error: 'Segment not found' });

    const sStart = Number(sentenceStart);
    const sEnd = Number(sentenceEnd);

    // Keep entities belonging to other sentences in this segment
    const otherEntities = (seg.entities || []).filter(
      (e) => e.start < sStart || e.start >= sEnd
    );

    // Normalize and sanitize incoming line entities
    const normalizedLineEntities = entities.map((e) => {
      const ent = {
        text: String(e.text || '').trim(),
        label: String(e.label || '').trim(),
        start: Number(e.start),
        end: Number(e.end),
        confidence: e.confidence !== undefined ? Number(e.confidence) : 1.0,
        status: e.status || 'approved',
        source: e.source || 'human',
      };
      if (e._id && mongoose.Types.ObjectId.isValid(e._id) && !String(e._id).startsWith('temp_')) {
        ent._id = e._id;
      }
      return ent;
    });

    // Merge other sentences' entities with this line's entities
    seg.entities = [...otherEntities, ...normalizedLineEntities].sort(
      (a, b) => a.start - b.start || a.end - b.end
    );

    // Recompute document statistics
    doc.stats = computeStats(
      doc.segments.map((s) => ({ entities: s.entities.filter((e) => e.status !== 'deleted') }))
    );

    await doc.save();

    res.json({
      ok: true,
      doc,
      savedCount: normalizedLineEntities.length,
      lineSummary: {
        segIndex: Number(segmentIndex),
        sentenceStart: sStart,
        sentenceEnd: sEnd,
        entitiesCount: normalizedLineEntities.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/documents/:id/segments/:segmentIndex/reset-line
// Reset a single line's entities back to original model output
exports.resetLine = async (req, res, next) => {
  try {
    const { id, segmentIndex } = req.params;
    const { sentenceStart, sentenceEnd } = req.body;

    if (sentenceStart == null || sentenceEnd == null) {
      return res.status(400).json({ error: 'sentenceStart and sentenceEnd are required' });
    }

    const doc = await Document.findById(id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    const seg = doc.segments.find((s) => s.index === Number(segmentIndex));
    if (!seg) return res.status(404).json({ error: 'Segment not found' });

    const sStart = Number(sentenceStart);
    const sEnd = Number(sentenceEnd);

    // Keep other sentences' entities
    const otherEntities = (seg.entities || []).filter(
      (e) => e.start < sStart || e.start >= sEnd
    );

    // Extract original entities for this line from originalEntities
    const origSource =
      Array.isArray(seg.originalEntities) && seg.originalEntities.length > 0
        ? seg.originalEntities
        : (seg.entities || []).filter((e) => e.source !== 'human');

    const origLineEntities = origSource
      .filter((e) => e.start >= sStart && e.start < sEnd)
      .map((e) => ({
        text: e.text,
        label: e.label,
        start: e.start,
        end: e.end,
        confidence: e.confidence !== undefined ? Number(e.confidence) : 1.0,
        status: Number(e.confidence ?? 1.0) >= (doc.threshold || 0.75) ? 'accepted' : 'review',
        source: 'model',
      }));

    seg.entities = [...otherEntities, ...origLineEntities].sort(
      (a, b) => a.start - b.start || a.end - b.end
    );

    doc.stats = computeStats(
      doc.segments.map((s) => ({ entities: s.entities.filter((e) => e.status !== 'deleted') }))
    );

    await doc.save();

    res.json({
      ok: true,
      doc,
      resetCount: origLineEntities.length,
      lineSummary: {
        segIndex: Number(segmentIndex),
        sentenceStart: sStart,
        sentenceEnd: sEnd,
        entitiesCount: origLineEntities.length,
      },
    });
  } catch (err) {
    next(err);
  }
};
