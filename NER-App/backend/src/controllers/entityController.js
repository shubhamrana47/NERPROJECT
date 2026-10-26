

const mongoose = require('mongoose');
const Document = require('../models/Document');
const { computeStats } = require('../services/nerService');

/** With ?lean=1 the reply carries counts instead of the whole document. */
const isLean = (req) => req.query.lean === '1' || req.query.lean === 'true';


exports.reviewEntity = async (req, res, next) => {
  try {
    const { id, segmentIndex, entityId } = req.params;
    const { action, label, text, start, end } = req.body;
    const doc = await Document.findById(id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    const seg = doc.segments.find((s) => s.index === Number(segmentIndex));
    const ent = seg && seg.entities.id(entityId);
    if (!ent) return res.status(404).json({ error: 'Entity not found' });

    if (action === 'accept') {
      ent.status = 'approved';
    } else if (action === 'delete') {
      ent.status = 'deleted';
    } else if (action === 'edit') {
      if (label !== undefined) ent.label = label;
      if (text !== undefined) ent.text = text;
      if (start !== undefined) ent.start = start;
      if (end !== undefined) ent.end = end;
      ent.status = 'edited';
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }
    ent.source = 'human';

    doc.stats = computeStats(
      doc.segments.map((s) => ({ entities: s.entities.filter((e) => e.status !== 'deleted') }))
    );
    await doc.save();
    if (isLean(req)) {
      return res.json({ ok: true, stats: doc.stats, savedEntities: seg.entities });
    }
    res.json(doc);
  } catch (err) {
    next(err);
  }
};


exports.addEntity = async (req, res, next) => {
  try {
    const { id, segmentIndex } = req.params;
    const { text, label, start, end } = req.body;
    if (!text || !label || start == null || end == null) {
      return res.status(400).json({ error: 'text, label, start, and end are required' });
    }
    const doc = await Document.findById(id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    const seg = doc.segments.find((s) => s.index === Number(segmentIndex));
    if (!seg) return res.status(404).json({ error: 'Segment not found' });

    seg.entities.push({
      text: String(text).trim(),
      label: String(label).trim(),
      start: Number(start),
      end: Number(end),
      confidence: 1.0,
      status: 'approved',
      source: 'human',
    });

    doc.stats = computeStats(
      doc.segments.map((s) => ({ entities: s.entities.filter((e) => e.status !== 'deleted') }))
    );
    await doc.save();
    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
};

exports.saveSegmentEntities = async (req, res, next) => {
  try {
    const { id, segmentIndex } = req.params;
    const { entities } = req.body;
    if (!Array.isArray(entities)) {
      return res.status(400).json({ error: 'entities array is required' });
    }
    const doc = await Document.findById(id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    const seg = doc.segments.find((s) => s.index === Number(segmentIndex));
    if (!seg) return res.status(404).json({ error: 'Segment not found' });

    const isValidation = doc.kind === 'validate';

    /*
     * In a validation document the set of entities is fixed: they came from the
     * pipeline and the job is to judge them, not to add or move any. Spans that
     * do not match one the file supplied are refused here as well as in the
     * interface, so the rule holds however the API is called.
     */
    const allowed = isValidation
      ? new Set((seg.originalEntities || []).map((e) => `${e.start}:${e.end}`))
      : null;
    let refused = 0;

    const kept = [];
    for (const e of entities) {
      const ent = {
        text: String(e.text || '').trim(),
        label: String(e.label || '').trim(),
        start: Number(e.start),
        end: Number(e.end),
        confidence: e.confidence !== undefined ? Number(e.confidence) : 1.0,
        status: e.status || 'approved',
        source: e.source || 'human',
      };

      if (isValidation) {
        if (!allowed.has(`${ent.start}:${ent.end}`)) {
          refused += 1;
          continue;
        }
        // Carry the decision, and remember what the pipeline originally said.
        const baseline = (seg.originalEntities || []).find(
          (o) => o.start === ent.start && o.end === ent.end
        );
        if (e.validationStatus) ent.validationStatus = e.validationStatus;
        ent.originalLabel = e.originalLabel || baseline?.originalLabel || baseline?.label;
      } else if (e.validationStatus) {
        // Harmless on an annotation document, but kept so a mixed client cannot
        // silently lose it.
        ent.validationStatus = e.validationStatus;
        if (e.originalLabel) ent.originalLabel = e.originalLabel;
      }

      if (e._id && mongoose.Types.ObjectId.isValid(e._id) && !String(e._id).startsWith('temp_')) {
        ent._id = e._id;
      }
      kept.push(ent);
    }

    seg.entities = kept.sort((a, b) => a.start - b.start || a.end - b.end);

    doc.stats = computeStats(
      doc.segments.map((s) => ({ entities: s.entities.filter((e) => e.status !== 'deleted') }))
    );
    await doc.save();
    if (isLean(req)) {
      return res.json({
        ok: true,
        stats: doc.stats,
        savedCount: seg.entities.length,
        refused,
        // The segment's stored spans, so the client can pick up real ids.
        savedEntities: seg.entities,
      });
    }
    res.json(doc);
  } catch (err) {
    next(err);
  }
};


exports.resetSegment = async (req, res, next) => {
  try {
    const { id, segmentIndex } = req.params;
    const doc = await Document.findById(id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    const seg = doc.segments.find((s) => s.index === Number(segmentIndex));
    if (!seg) return res.status(404).json({ error: 'Segment not found' });

    if (Array.isArray(seg.originalEntities) && seg.originalEntities.length > 0) {
      seg.entities = JSON.parse(JSON.stringify(seg.originalEntities));
    } else {
      // Graceful fallback for legacy documents
      seg.entities = seg.entities
        .filter((e) => e.source !== 'human')
        .map((e) => ({
          ...e.toObject(),
          status: e.confidence >= (doc.threshold || 0.75) ? 'accepted' : 'review',
        }));
    }

    doc.stats = computeStats(
      doc.segments.map((s) => ({ entities: s.entities.filter((e) => e.status !== 'deleted') }))
    );
    await doc.save();
    res.json(doc);
  } catch (err) {
    next(err);
  }
};
