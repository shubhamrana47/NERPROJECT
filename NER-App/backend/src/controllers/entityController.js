

const mongoose = require('mongoose');
const Document = require('../models/Document');
const { computeStats } = require('../services/nerService');


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

    seg.entities = entities.map((e) => {
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

    doc.stats = computeStats(
      doc.segments.map((s) => ({ entities: s.entities.filter((e) => e.status !== 'deleted') }))
    );
    await doc.save();
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
