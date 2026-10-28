

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
      if (label !== undefined && label !== ent.label) {
        const prevFirstPlace = ent.originalLabel || ent.label;
        ent.originalLabel = prevFirstPlace;
        if (!ent.originalRunnerUp) ent.originalRunnerUp = ent.runnerUp;
        ent.runnerUp = prevFirstPlace;
        ent.label = label;
        ent.isManual = true;
      }
      if (text !== undefined) ent.text = text;
      if (start !== undefined) ent.start = start;
      if (end !== undefined) ent.end = end;
      ent.status = 'edited';
      ent.isManual = true;
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
     * In a validation document each span is either one the pipeline proposed —
     * matched by its offsets, and judged — or one a person added because the
     * pipeline missed it. An addition is accepted only if its offsets really
     * describe its text in this passage, so a stale or miscomputed selection is
     * refused here as well as in the interface.
     */
    const baselineOf = isValidation
      ? new Map((seg.originalEntities || []).map((e) => [`${e.start}:${e.end}`, e]))
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
        runnerUp: e.runnerUp !== undefined ? e.runnerUp : (e.runner_up !== undefined ? e.runner_up : undefined),
        originalRunnerUp: e.originalRunnerUp !== undefined ? e.originalRunnerUp : (e.original_runner_up !== undefined ? e.original_runner_up : undefined),
        isManual: Boolean(e.isManual || e.validationStatus === 'relabelled' || (e.source === 'human' && e.status === 'edited')),
      };

      if (isValidation) {
        const baseline = baselineOf.get(`${ent.start}:${ent.end}`);
        if (baseline) {
          // Carry the decision, and remember what the pipeline originally said.
          if (!ent.label) ent.label = baseline.label;
          if (e.validationStatus) ent.validationStatus = e.validationStatus;
          ent.originalLabel = e.originalLabel || baseline.originalLabel || baseline.label;
          if (!ent.originalRunnerUp) {
            ent.originalRunnerUp = baseline.originalRunnerUp || baseline.runnerUp;
          }

          const wasManuallyChanged =
            ent.validationStatus === 'relabelled' ||
            (ent.label && baseline.label && ent.label !== (baseline.originalLabel || baseline.label)) ||
            ent.isManual;

          if (wasManuallyChanged) {
            ent.isManual = true;
            // The rejected entity that was predicted by the pipeline that was earlier at first place
            // moves to second place / runner up, and the previous runner up entity disappears:
            const rejectedFirstPlace = ent.originalLabel || baseline.label;
            ent.runnerUp = rejectedFirstPlace;
          } else if (ent.validationStatus === 'unreviewed') {
            ent.isManual = false;
            ent.runnerUp = ent.originalRunnerUp || baseline.runnerUp;
          } else if (!ent.runnerUp && baseline.runnerUp) {
            ent.runnerUp = baseline.runnerUp;
          }
        } else {
          const text = seg.text || '';
          const describesItsText =
            Number.isInteger(ent.start) &&
            Number.isInteger(ent.end) &&
            ent.start >= 0 &&
            ent.end > ent.start &&
            ent.end <= text.length &&
            text.slice(ent.start, ent.end).trim() === ent.text;
          if (!describesItsText || !ent.label) {
            refused += 1;
            continue;
          }
          // A person's own span: not something to confirm or reject, so it
          // carries no baseline label and no model score.
          ent.validationStatus = 'added';
          ent.source = 'human';
          ent.confidence = 1.0;
          ent.originalLabel = undefined;
        }
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

    // "Nothing to validate" was true of an empty passage; adding a span to it
    // makes that claim stale, so it is withdrawn rather than left behind.
    if (seg.nothingToValidate && seg.entities.length > 0) seg.nothingToValidate = false;

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
