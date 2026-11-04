const mongoose = require('mongoose');
const Document = require('../models/Document');
const { computeStats } = require('../services/nerService');

/** With ?lean=1 the reply carries counts instead of the whole document. */
const isLean = (req) => req.query.lean === '1' || req.query.lean === 'true';

/** Builds a structured record of a rejected pipeline annotation and its sources. */
function buildRejectedRecord(baseline, rawSourceEnt) {
  if (!baseline && !rawSourceEnt) return undefined;
  const text = String(baseline?.originalText || rawSourceEnt?.text || baseline?.text || '').trim();
  const label = String(baseline?.originalLabel || rawSourceEnt?.type || baseline?.label || '').trim();
  const start =
    baseline?.originalStart !== undefined
      ? Number(baseline.originalStart)
      : rawSourceEnt?.start !== undefined
      ? Number(rawSourceEnt.start)
      : Number(baseline?.start);
  const end =
    baseline?.originalEnd !== undefined
      ? Number(baseline.originalEnd)
      : rawSourceEnt?.end !== undefined
      ? Number(rawSourceEnt.end)
      : Number(baseline?.end);

  const rawSources =
    (Array.isArray(baseline?.originalSources) && baseline.originalSources.length > 0 && baseline.originalSources) ||
    (Array.isArray(rawSourceEnt?.sources) && rawSourceEnt.sources.length > 0 && rawSourceEnt.sources) ||
    (Array.isArray(baseline?.sources) && baseline.sources.length > 0 && baseline.sources) ||
    (baseline?.source && baseline.source !== 'human' && baseline.source !== 'manual' ? [baseline.source] : ['llm']);

  const sources = rawSources.map(String);
  const source = sources[0] || 'llm';
  const confidence = Number.isFinite(Number(rawSourceEnt?.score ?? baseline?.confidence))
    ? Number(rawSourceEnt?.score ?? baseline?.confidence)
    : 1.0;

  return {
    text,
    label,
    type: label,
    start,
    end,
    sources,
    source,
    confidence,
  };
}

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
      const prevFirstPlace = ent.originalLabel || ent.label;
      const prevText = ent.originalText || ent.text;
      const prevStart = ent.originalStart !== undefined ? ent.originalStart : ent.start;
      const prevEnd = ent.originalEnd !== undefined ? ent.originalEnd : ent.end;
      const rawSourceEnt = (seg.sourceRecord?.entities || []).find(
        (o) => Number(o.start) === Number(prevStart) && Number(o.end) === Number(prevEnd)
      );

      if (label !== undefined && label !== ent.label) {
        ent.originalLabel = prevFirstPlace;
        if (!ent.originalRunnerUp) ent.originalRunnerUp = ent.runnerUp;
        ent.runnerUp = prevFirstPlace;
        ent.label = label;
        ent.isManual = true;
      }
      if (text !== undefined && text !== ent.text) {
        ent.originalText = prevText;
        ent.text = text;
      }
      if (start !== undefined && Number(start) !== Number(ent.start)) {
        ent.originalStart = prevStart;
        ent.start = Number(start);
      }
      if (end !== undefined && Number(end) !== Number(ent.end)) {
        ent.originalEnd = prevEnd;
        ent.end = Number(end);
      }
      if (!ent.rejectedAnnotation) {
        ent.rejectedAnnotation = buildRejectedRecord(
          {
            originalText: prevText,
            originalLabel: prevFirstPlace,
            originalStart: prevStart,
            originalEnd: prevEnd,
            originalSources: ent.originalSources,
            sources: ent.sources,
            source: ent.source,
            confidence: ent.confidence,
          },
          rawSourceEnt
        );
      }
      ent.status = 'edited';
      ent.isManual = true;
      ent.sources = ['manual'];
      if (doc.kind === 'validate') {
        ent.validationStatus = 'relabelled';
      }
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
      sources: ['manual'],
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
    const rawSourceEntities = Array.isArray(seg.sourceRecord?.entities)
      ? seg.sourceRecord.entities
      : [];
    const rawByOffset = new Map(
      rawSourceEntities.map((o) => [`${Number(o.start)}:${Number(o.end)}`, o])
    );

    const baselineList = Array.isArray(seg.originalEntities) ? seg.originalEntities : [];
    const baselineOf = new Map(
      baselineList.map((b) => [
        `${Number(b.originalStart !== undefined ? b.originalStart : b.start)}:${Number(
          b.originalEnd !== undefined ? b.originalEnd : b.end
        )}`,
        b,
      ])
    );

    // Pre-scan incoming entities to identify which baseline entities are still active at their original offsets
    // vs which ones were removed/rejected.
    const activeIncomingExactKeys = new Set();
    const rejectedIncomingByKey = new Map();
    for (const e of entities) {
      const k = `${Number(e.start)}:${Number(e.end)}`;
      const isRej = e.status === 'deleted' || e.validationStatus === 'rejected';
      if (isRej) {
        rejectedIncomingByKey.set(k, e);
      } else {
        activeIncomingExactKeys.add(k);
      }
    }

    // Track which baseline keys have been claimed by an overwriting span
    const claimedBaselineKeys = new Set();
    let refused = 0;
    const rawKept = [];

    for (const e of entities) {
      const incomingRej = e.rejectedAnnotation || e.rejected_annotation;
      const ent = {
        text: String(e.text || '').trim(),
        label: String(e.label || '').trim(),
        start: Number(e.start),
        end: Number(e.end),
        confidence: e.confidence !== undefined ? Number(e.confidence) : 1.0,
        status: e.status || 'approved',
        source: e.source || 'human',
        sources: Array.isArray(e.sources) ? e.sources.map(String) : undefined,
        originalLabel: e.originalLabel,
        originalText: e.originalText,
        originalStart: e.originalStart !== undefined ? Number(e.originalStart) : undefined,
        originalEnd: e.originalEnd !== undefined ? Number(e.originalEnd) : undefined,
        originalSources: Array.isArray(e.originalSources) ? e.originalSources.map(String) : undefined,
        rejectedAnnotation: incomingRej || undefined,
        runnerUp: e.runnerUp !== undefined ? e.runnerUp : (e.runner_up !== undefined ? e.runner_up : undefined),
        originalRunnerUp: e.originalRunnerUp !== undefined ? e.originalRunnerUp : (e.original_runner_up !== undefined ? e.original_runner_up : undefined),
        isManual: Boolean(
          e.isManual ||
          e.validationStatus === 'relabelled' ||
          e.validationStatus === 'added' ||
          incomingRej ||
          ((e.source === 'human' || e.source === 'manual') && (e.status === 'edited' || e.status === 'approved'))
        ),
      };

      const exactKey = `${ent.start}:${ent.end}`;
      const origKey =
        ent.originalStart !== undefined && ent.originalEnd !== undefined
          ? `${ent.originalStart}:${ent.originalEnd}`
          : incomingRej && incomingRej.start !== undefined && incomingRej.end !== undefined
          ? `${Number(incomingRej.start)}:${Number(incomingRej.end)}`
          : null;

      let baseline = baselineOf.get(exactKey) || (origKey ? baselineOf.get(origKey) : null);

      // Check if this span is a manual replacement for an overlapping baseline span that was removed/rejected
      let isSpanModifiedReplacement = Boolean(
        baseline &&
          origKey &&
          origKey !== exactKey
      );

      if (!baseline && ent.status !== 'deleted' && ent.validationStatus !== 'rejected') {
        // Find overlapping baseline entities that are NOT active in the incoming payload (i.e. were removed/rejected)
        const overlappingRemovedBaselines = baselineList.filter((b) => {
          const bStart = Number(b.originalStart !== undefined ? b.originalStart : b.start);
          const bEnd = Number(b.originalEnd !== undefined ? b.originalEnd : b.end);
          const bKey = `${bStart}:${bEnd}`;
          if (claimedBaselineKeys.has(bKey)) return false;
          if (activeIncomingExactKeys.has(bKey)) return false;
          return ent.start < bEnd && ent.end > bStart;
        });

        if (overlappingRemovedBaselines.length === 1) {
          baseline = overlappingRemovedBaselines[0];
          isSpanModifiedReplacement = true;
        }
      }

      if (isValidation) {
        if (baseline) {
          const bStart = Number(baseline.originalStart !== undefined ? baseline.originalStart : baseline.start);
          const bEnd = Number(baseline.originalEnd !== undefined ? baseline.originalEnd : baseline.end);
          const bKey = `${bStart}:${bEnd}`;
          const rawSourceEnt = rawByOffset.get(bKey);

          if (isSpanModifiedReplacement) {
            // Validate new offsets against passage text
            const text = seg.text || '';
            let s = Number(ent.start);
            let eEnd = Number(ent.end);
            while (s < eEnd && /\s/.test(text[s])) s += 1;
            while (eEnd > s && /\s/.test(text[eEnd - 1])) eEnd -= 1;
            const slice = text.slice(s, eEnd);
            const rawText = String(ent.text || '').trim();
            const describesItsText =
              Number.isInteger(s) &&
              Number.isInteger(eEnd) &&
              s >= 0 &&
              eEnd > s &&
              eEnd <= text.length &&
              (slice.trim() === rawText || slice.trim().toLowerCase() === rawText.toLowerCase());
            if (!describesItsText || !ent.label) {
              refused += 1;
              continue;
            }
            ent.start = s;
            ent.end = eEnd;
            ent.text = slice.trim();

            claimedBaselineKeys.add(bKey);
            const rejRec = ent.rejectedAnnotation || buildRejectedRecord(baseline, rawSourceEnt);
            ent.rejectedAnnotation = rejRec;
            ent.originalText = rejRec?.text || baseline.text;
            ent.originalLabel = rejRec?.label || baseline.originalLabel || baseline.label;
            ent.originalStart = bStart;
            ent.originalEnd = bEnd;
            ent.originalSources = rejRec?.sources || baseline.originalSources || baseline.sources;
            if (!ent.originalRunnerUp) {
              ent.originalRunnerUp = baseline.originalRunnerUp || baseline.runnerUp;
            }
            if (ent.label !== ent.originalLabel) {
              ent.runnerUp = ent.originalLabel;
            } else {
              ent.runnerUp = ent.originalRunnerUp || baseline.runnerUp;
            }
            ent.isManual = true;
            ent.source = 'human';
            ent.sources = ['manual'];
            ent.status = 'edited';
            ent.validationStatus = 'relabelled';
            if (!ent._id && baseline._id) ent._id = baseline._id;
          } else {
            // Exact offset match with baseline
            if (!ent.label) ent.label = baseline.label;
            if (e.validationStatus) ent.validationStatus = e.validationStatus;
            ent.originalLabel = e.originalLabel || baseline.originalLabel || baseline.label;
            ent.originalText = e.originalText || baseline.originalText || baseline.text;
            ent.originalStart = bStart;
            ent.originalEnd = bEnd;
            ent.originalSources =
              e.originalSources ||
              baseline.originalSources ||
              rawSourceEnt?.sources ||
              baseline.sources;
            if (!ent.originalRunnerUp) {
              ent.originalRunnerUp = baseline.originalRunnerUp || baseline.runnerUp;
            }

            const isRejected = ent.validationStatus === 'rejected' || ent.status === 'deleted';
            const wasManuallyChanged =
              !isRejected &&
              (ent.validationStatus === 'relabelled' ||
                (ent.label &&
                  baseline.label &&
                  ent.label !== (baseline.originalLabel || baseline.label)) ||
                (ent.isManual && ent.label !== (baseline.originalLabel || baseline.label)));

            if (isRejected) {
              ent.validationStatus = 'rejected';
              ent.status = 'deleted';
              ent.runnerUp = ent.originalRunnerUp || baseline.runnerUp;
              ent.rejectedAnnotation =
                ent.rejectedAnnotation || buildRejectedRecord(baseline, rawSourceEnt);
            } else if (wasManuallyChanged) {
              ent.isManual = true;
              ent.source = 'human';
              ent.sources = ['manual'];
              ent.validationStatus = 'relabelled';
              const rejectedFirstPlace = ent.originalLabel || baseline.label;
              ent.runnerUp = rejectedFirstPlace;
              ent.rejectedAnnotation =
                ent.rejectedAnnotation || buildRejectedRecord(baseline, rawSourceEnt);
            } else if (ent.validationStatus === 'unreviewed') {
              ent.isManual = false;
              ent.runnerUp = ent.originalRunnerUp || baseline.runnerUp;
              ent.sources = ent.originalSources;
              ent.rejectedAnnotation = undefined;
            } else {
              if (!ent.runnerUp && baseline.runnerUp) {
                ent.runnerUp = baseline.runnerUp;
              }
              if (!ent.sources && ent.originalSources) {
                ent.sources = ent.originalSources;
              }
            }
          }
        } else {
          // Pure addition (or overlapped multiple active pipeline spans without removing them)
          const text = seg.text || '';
          let s = Number(ent.start);
          let eEnd = Number(ent.end);
          while (s < eEnd && /\s/.test(text[s])) s += 1;
          while (eEnd > s && /\s/.test(text[eEnd - 1])) eEnd -= 1;
          const slice = text.slice(s, eEnd);
          const rawText = String(ent.text || '').trim();
          const describesItsText =
            Number.isInteger(s) &&
            Number.isInteger(eEnd) &&
            s >= 0 &&
            eEnd > s &&
            eEnd <= text.length &&
            (slice.trim() === rawText || slice.trim().toLowerCase() === rawText.toLowerCase());
          if (!describesItsText || !ent.label) {
            refused += 1;
            continue;
          }
          ent.start = s;
          ent.end = eEnd;
          ent.text = slice.trim();
          ent.validationStatus = 'added';
          ent.source = 'human';
          ent.sources = ['manual'];
          ent.isManual = true;
          ent.confidence = 1.0;
          ent.originalLabel = undefined;
        }
      } else {
        // Annotation workflow: check if it replaced an overlapping model baseline span
        if (baseline && isSpanModifiedReplacement) {
          const bStart = Number(baseline.originalStart !== undefined ? baseline.originalStart : baseline.start);
          const bEnd = Number(baseline.originalEnd !== undefined ? baseline.originalEnd : baseline.end);
          const bKey = `${bStart}:${bEnd}`;
          claimedBaselineKeys.add(bKey);
          const rejRec = ent.rejectedAnnotation || buildRejectedRecord(baseline, null);
          ent.rejectedAnnotation = rejRec;
          ent.originalText = rejRec?.text || baseline.text;
          ent.originalLabel = rejRec?.label || baseline.originalLabel || baseline.label;
          ent.originalStart = bStart;
          ent.originalEnd = bEnd;
          ent.originalSources = rejRec?.sources || baseline.originalSources || ['model'];
          ent.isManual = true;
          ent.source = 'human';
          ent.sources = ['manual'];
          ent.status = 'edited';
          if (!ent._id && baseline._id) ent._id = baseline._id;
        } else if (e.validationStatus) {
          ent.validationStatus = e.validationStatus;
          if (e.originalLabel) ent.originalLabel = e.originalLabel;
        }
      }

      if (e._id && mongoose.Types.ObjectId.isValid(e._id) && !String(e._id).startsWith('temp_')) {
        ent._id = e._id;
      } else if (ent._id && mongoose.Types.ObjectId.isValid(ent._id) && !String(ent._id).startsWith('temp_')) {
        // preserved from baseline
      } else {
        delete ent._id;
      }
      rawKept.push(ent);
    }

    // Filter out any separate deleted/rejected entry whose baseline key was claimed and overwritten in-place
    const kept = rawKept.filter((ent) => {
      const isRej = ent.status === 'deleted' || ent.validationStatus === 'rejected';
      if (isRej) {
        const key = `${ent.originalStart !== undefined ? ent.originalStart : ent.start}:${
          ent.originalEnd !== undefined ? ent.originalEnd : ent.end
        }`;
        if (claimedBaselineKeys.has(key)) {
          return false;
        }
      }
      return true;
    });

    // Update segment-level rejectedAnnotations log with all rejected / overwritten pipeline annotations
    const rejectedList = [];
    for (const ent of kept) {
      if (ent.rejectedAnnotation && ent.rejectedAnnotation.text) {
        rejectedList.push(ent.rejectedAnnotation);
      }
    }
    seg.rejectedAnnotations = rejectedList;

    seg.entities = kept.sort((a, b) => a.start - b.start || a.end - b.end);
    seg.nerStatus = 'done';

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
    seg.rejectedAnnotations = [];

    doc.stats = computeStats(
      doc.segments.map((s) => ({ entities: s.entities.filter((e) => e.status !== 'deleted') }))
    );
    await doc.save();
    res.json(doc);
  } catch (err) {
    next(err);
  }
};
