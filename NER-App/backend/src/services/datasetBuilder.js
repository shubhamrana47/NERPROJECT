/**
 * Dataset builder: turns reviewed documents into NER training and benchmark
 * datasets.
 *
 * Three things this is careful about, because a dataset is only as good as its
 * weakest row:
 *
 * 1. Sentences with no entities are kept. They are the negative examples that
 *    teach a model to predict O, and on the corpus in use they are a third of
 *    all sentences. Dropping them both biases training towards over-predicting
 *    entities and makes any precision/recall figure unrepresentative.
 *
 * 2. Model agreement is not ground truth. A span with status 'accepted' only
 *    means the model's confidence cleared the threshold; nobody checked it.
 *    Every row and span therefore carries an explicit `verified` flag, and a
 *    gold export keeps only what a person actually signed off.
 *
 * 3. Offsets are verified, never guessed. A span whose recorded text does not
 *    match the characters at its offsets is realigned only on an exact match,
 *    and otherwise dropped and counted. A span that runs past the end of its
 *    sentence is dropped rather than truncated, because a truncated gold span
 *    is worse than a missing one.
 */

const { CANONICAL_TYPES, normalizeLabel, splitSentencesWithOffsets } = require('../utils/exportUtils');

const SCHEMA_VERSION = '1.1';

/**
 * Labels the checkpoint cannot produce. AgNER-BERTa has a fixed head of 73
 * labels (O plus 36 types x B/I), so a type added to the taxonomy afterwards
 * can only ever come from an annotator. Recorded in the manifest so whoever
 * trains on an export is not left wondering why the model never predicts it.
 */
const ANNOTATOR_ONLY_LABELS = ['Agri_Equipment'];

/** Decisions a person can record against a pipeline entity. */
const VALIDATION_DECISIONS = ['confirmed', 'rejected', 'relabelled'];

/**
 * Decimal numbers, percentages, degrees and ordinals hold together — "28.5",
 * "85%", "30°C", "15th", "50kg" — which matters for the quantity, temperature
 * and date classes. Everything else that is not whitespace is its own token.
 *
 * Hyphens deliberately split. The model tags "December" inside "mid-December",
 * and a span that does not land on token boundaries cannot be expressed in BIO
 * at all; keeping the compound whole would silently widen the tag to the entire
 * word. A compound that genuinely is one entity, like "super-phosphate", simply
 * becomes three tokens tagged B-, I-, I-, which is lossless. Subword
 * tokenizers split these anyway.
 */
const TOKEN_PATTERN =
  /\d+(?:[.,]\d+)*(?:%|°[CF]?|[A-Za-z]+)?|[A-Za-z]+(?:['’][A-Za-z]+)*|[^\s]/gu;

const isDeleted = (e) => e.status === 'deleted';

/** A person signed off: approved it, edited it, or added it by hand. */
const isVerifiedSpan = (e) =>
  e.source === 'human' || e.status === 'approved' || e.status === 'edited';

function tokenize(text) {
  const tokens = [];
  if (!text) return tokens;
  TOKEN_PATTERN.lastIndex = 0;
  let match = TOKEN_PATTERN.exec(text);
  while (match) {
    tokens.push({ text: match[0], start: match.index, end: match.index + match[0].length });
    match = TOKEN_PATTERN.exec(text);
  }
  return tokens;
}

/** Deterministic bucket from a row id, so splits are stable across exports. */
function hashToUnit(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h / 0x100000000;
}

function assignSplit(id, ratios) {
  const r = hashToUnit(id);
  if (r < ratios.train) return 'train';
  if (r < ratios.train + ratios.dev) return 'dev';
  return 'test';
}

/**
 * Rebase a segment's spans onto one sentence, validating every offset.
 * Returns clean spans plus a tally of anything rejected.
 */
function spansForSentence(segmentText, sentence, entities, options, issues) {
  // splitSentencesWithOffsets trims the sentence text but reports offsets into
  // the raw slice, so find where the trimmed text really begins.
  const raw = segmentText.slice(sentence.start, sentence.end);
  const lead = raw.length - raw.trimStart().length;
  const textStart = sentence.start + lead;
  return prepareSpans(sentence.text, textStart, entities, options, issues);
}

/**
 * Validate and clean the spans that belong to one piece of text, where
 * `textStart` is that text's offset inside the stored segment. Offsets in the
 * result are relative to `text`.
 */
function prepareSpans(text, textStart, entities, options, issues) {
  const candidates = [];

  for (const ent of entities) {
    if (!ent || isDeleted(ent)) continue;

    /*
     * A person looked at this span and said it is wrong. It stays in the
     * validated file as feedback, but it must never reach a training or
     * benchmark export — not even one that asks for low-confidence spans.
     * This check sits before every other filter for that reason.
     */
    if (ent.validationStatus === 'rejected') {
      issues.rejected_excluded += 1;
      continue;
    }

    const verified = isVerifiedSpan(ent);
    if (options.verifiedOnly && !verified) {
      issues.unverified_spans_excluded += 1;
      continue;
    }
    if (!verified) {
      // status 'review' means the model itself was below the threshold and
      // nobody has checked it. Such spans are noise in a training set, so they
      // are left out unless asked for explicitly.
      if (ent.status !== 'accepted' && !options.includeLowConfidence) {
        issues.low_confidence_excluded += 1;
        continue;
      }
      if (options.minConfidence > 0 && Number(ent.confidence ?? 0) < options.minConfidence) {
        issues.below_confidence_excluded += 1;
        continue;
      }
    }

    const recorded = String(ent.text || '').trim();
    if (!recorded) {
      issues.empty_text_dropped += 1;
      continue;
    }

    let start = Number(ent.start) - textStart;
    let end = Number(ent.end) - textStart;

    if (end > text.length) {
      // Runs past this sentence. Truncating would corrupt the span.
      issues.crossing_sentence_dropped += 1;
      continue;
    }
    if (start < 0 || end <= start) {
      issues.offset_invalid_dropped += 1;
      continue;
    }

    // Never export padding as part of a span.
    while (start < end && /\s/.test(text[start])) start += 1;
    while (end > start && /\s/.test(text[end - 1])) end -= 1;

    if (text.slice(start, end) !== recorded) {
      // Accept a correction only where the recorded text sits exactly at the
      // nearby position; anything less certain is dropped, not guessed at.
      const near = text.indexOf(recorded, Math.max(0, start - 25));
      if (near !== -1 && Math.abs(near - start) <= 30) {
        start = near;
        end = near + recorded.length;
        issues.offset_realigned += 1;
      } else {
        issues.offset_mismatch_dropped += 1;
        continue;
      }
    }

    candidates.push({
      start,
      end,
      label: normalizeLabel(ent.label),
      text: text.slice(start, end),
      source: ent.source === 'human' ? 'human' : 'model',
      origin: ent.source === 'human' ? 'human' : 'model',
      verified,
      status: ent.status || (verified ? 'approved' : 'accepted'),
      confidence: Number(Number(ent.confidence ?? (verified ? 1 : 0)).toFixed(4)),
    });
  }

  // Strongest first where two spans claim the same characters: verified beats
  // unverified, longer beats shorter, higher confidence breaks ties.
  candidates.sort(
    (a, b) =>
      a.start - b.start ||
      b.end - b.start - (a.end - a.start) ||
      Number(b.verified) - Number(a.verified) ||
      b.confidence - a.confidence
  );

  const spans = [];
  const seen = new Set();
  let lastEnd = -1;

  for (const span of candidates) {
    const key = `${span.start}:${span.end}:${span.label}`;
    if (seen.has(key)) {
      issues.duplicates_removed += 1;
      continue;
    }
    if (options.resolveOverlaps && span.start < lastEnd) {
      issues.overlaps_removed += 1;
      continue;
    }
    seen.add(key);
    spans.push(span);
    lastEnd = Math.max(lastEnd, span.end);
  }

  spans.sort((a, b) => a.start - b.start || a.end - b.end);
  return { text, spans };
}

/** Every validated span of a whole passage, in passage coordinates. */
function spansForPassage(seg, options, issues) {
  return prepareSpans(seg.text || '', 0, seg.entities || [], options, issues);
}

/**
 * The export: the uploaded file, given back with annotations appended.
 *
 * Each record is the original object from the source file, untouched and in its
 * original field order, with two fields added at the end — `entities` and
 * `annotation`. Every record is present, including passages with no entities,
 * and every span says where it came from and whether a person verified it, so
 * one file serves both training and benchmarking without a second export.
 */
function buildAnnotatedRecords(documents, options = {}) {
  const opts = normalizeOptions(options);
  const issues = emptyIssues();
  const records = [];

  documents.forEach((doc) => {
    (doc.segments || []).forEach((seg) => {
      const { spans } = spansForPassage(seg, opts, issues);

      // Prefer the original record; rebuild a sensible one for inputs that had
      // no single record per passage (nested sections, paged documents).
      const base =
        seg.sourceRecord && typeof seg.sourceRecord === 'object' && !Array.isArray(seg.sourceRecord)
          ? { ...seg.sourceRecord }
          : stripUndefined({
              passage_id: seg.passageId || undefined,
              passage_tag: seg.passageTag || undefined,
              crops: seg.crops && seg.crops.length ? [...seg.crops] : undefined,
              stages: seg.stages && seg.stages.length ? [...seg.stages] : undefined,
              subjects: seg.subjects && seg.subjects.length ? [...seg.subjects] : undefined,
              section: seg.section || undefined,
              page: seg.page ?? undefined,
              text: seg.text,
            });

      const human = spans.filter((e) => e.source === 'human').length;
      const verified = spans.filter((e) => e.verified).length;

      records.push({
        ...base,
        entities: spans.map((e) => ({
          start: e.start,
          end: e.end,
          label: e.label,
          text: e.text,
          source: e.source,
          verified: e.verified,
          status: e.status,
          confidence: e.confidence,
        })),
        annotation: {
          spans: spans.length,
          model_spans: spans.length - human,
          human_spans: human,
          verified_spans: verified,
          reviewed: verified > 0,
          // whether the model ever read this passage at all
          ner_status: seg.nerStatus || 'done',
        },
      });
    });
  });

  return { records, issues, options: opts };
}

/**
 * The validation export: the pipeline's own file, returned with the
 * annotator's decisions overlaid.
 *
 * Each entity is rebuilt from the untouched source record, so `score`,
 * `sources`, `mean_logprob` and the rest come back exactly as they arrived;
 * only a `validation` block is added, and only once a person has judged that
 * span. Matching is by offset, which is safe because validation never moves a
 * span and never adds one. `suppressed`, `bio`, `hybrid` and `n_entities` pass
 * through untouched as the historical record of the pipeline run — after a
 * relabel, `bio` no longer agrees with the validated types and is not
 * authoritative.
 */
function buildValidatedRecords(documents) {
  const records = [];
  const totals = { entities: 0, confirmed: 0, rejected: 0, relabelled: 0, unreviewed: 0,
    complete_passages: 0, passages: 0 };

  documents.forEach((doc) => {
    (doc.segments || []).forEach((seg) => {
      const source =
        seg.sourceRecord && typeof seg.sourceRecord === 'object' && !Array.isArray(seg.sourceRecord)
          ? { ...seg.sourceRecord }
          : stripUndefined({
              passage_id: seg.passageId || undefined,
              passage_tag: seg.passageTag || undefined,
              text: seg.text,
              entities: [],
            });

      const decisions = new Map();
      (seg.entities || []).forEach((e) => {
        decisions.set(`${e.start}:${e.end}`, e);
      });

      const original = Array.isArray(source.entities) ? source.entities : [];
      const counts = { confirmed: 0, rejected: 0, relabelled: 0, unreviewed: 0 };

      const entities = original.map((orig) => {
        const decided = decisions.get(`${Number(orig.start)}:${Number(orig.end)}`);
        const status = decided?.validationStatus || 'unreviewed';

        if (status === 'unreviewed' || !VALIDATION_DECISIONS.includes(status)) {
          counts.unreviewed += 1;
          // No block at all: an unreviewed entity is left exactly as it came.
          const { validation, ...untouched } = orig;
          return untouched;
        }

        counts[status] += 1;

        if (status === 'relabelled') {
          return {
            ...orig,
            // The corrected type is what a consumer reads; what the pipeline
            // said is preserved beside it. The stored originalLabel wins over
            // the record's own type, because after one round trip the record
            // already carries the correction and would otherwise report it as
            // the original.
            type: decided.label,
            validation: { status, original_type: decided.originalLabel || orig.type },
          };
        }

        return { ...orig, validation: { status } };
      });

      const hasEntities = entities.length > 0;
      const complete = hasEntities ? counts.unreviewed === 0 : seg.nothingToValidate === true;

      totals.passages += 1;
      if (complete) totals.complete_passages += 1;
      totals.entities += entities.length;
      totals.confirmed += counts.confirmed;
      totals.rejected += counts.rejected;
      totals.relabelled += counts.relabelled;
      totals.unreviewed += counts.unreviewed;

      records.push({
        ...source,
        entities,
        validation_summary: {
          entities: entities.length,
          ...counts,
          complete,
          ...(hasEntities ? {} : { nothing_to_validate: seg.nothingToValidate === true }),
        },
      });
    });
  });

  return { records, totals };
}

function stripUndefined(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

/** BIO tags aligned to tokens, with any boundary disagreement counted. */
function toBIO(text, spans, issues) {
  const tokens = tokenize(text);
  const tags = new Array(tokens.length).fill('O');

  for (const span of spans) {
    const covered = [];
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (t.start < span.end && t.end > span.start) covered.push(i);
    }
    if (covered.length === 0) {
      if (issues) issues.spans_without_tokens += 1;
      continue;
    }
    const first = tokens[covered[0]];
    const last = tokens[covered[covered.length - 1]];
    if (issues && (first.start !== span.start || last.end !== span.end)) {
      issues.token_boundary_mismatch += 1;
    }
    covered.forEach((idx, n) => {
      tags[idx] = `${n === 0 ? 'B' : 'I'}-${span.label}`;
    });
  }

  return { tokens, tags };
}

function emptyIssues() {
  return {
    unverified_spans_excluded: 0,
    rejected_excluded: 0,
    low_confidence_excluded: 0,
    below_confidence_excluded: 0,
    empty_text_dropped: 0,
    crossing_sentence_dropped: 0,
    offset_invalid_dropped: 0,
    offset_mismatch_dropped: 0,
    offset_realigned: 0,
    duplicates_removed: 0,
    overlaps_removed: 0,
    token_boundary_mismatch: 0,
    spans_without_tokens: 0,
  };
}

function normalizeOptions(options = {}) {
  const ratios = options.splitRatios || { train: 0.8, dev: 0.1, test: 0.1 };
  return {
    verifiedOnly: Boolean(options.verifiedOnly),
    includeLowConfidence: Boolean(options.includeLowConfidence),
    includeEmpty: options.includeEmpty !== false,
    resolveOverlaps: options.resolveOverlaps !== false,
    minConfidence: Number(options.minConfidence || 0),
    split: Boolean(options.split),
    splitRatios: ratios,
    withTokens: Boolean(options.withTokens),
  };
}

/**
 * One row per sentence, in document order.
 *
 * A row's `review.verified` is true when at least one span on it was signed
 * off by a person. An empty sentence carries no such evidence, so a gold
 * export cannot confirm it was read — those are counted separately in the
 * manifest as `empty_rows_unverifiable` rather than quietly included.
 */
function buildRows(documents, options = {}) {
  const opts = normalizeOptions(options);
  const issues = emptyIssues();
  const rows = [];

  let emptyUnverifiable = 0;

  documents.forEach((doc) => {
    const docId = String(doc._id || '');
    (doc.segments || []).forEach((seg) => {
      const segmentText = seg.text || '';
      const sentences = splitSentencesWithOffsets(segmentText);
      const entities = seg.entities || [];

      sentences.forEach((sentence, lineIndex) => {
        const inSentence = entities.filter(
          (e) => e.start >= sentence.start && e.start < sentence.end
        );
        const { text, spans } = spansForSentence(
          segmentText,
          sentence,
          inSentence,
          opts,
          issues
        );

        if (!text) return;

        const verifiedSpans = spans.filter((s) => s.verified).length;
        const rowVerified = verifiedSpans > 0;

        if (spans.length === 0) {
          if (!opts.includeEmpty) return;
          if (opts.verifiedOnly) {
            // No signed-off span means no evidence anyone read this sentence.
            emptyUnverifiable += 1;
            return;
          }
        }

        const id = `${docId || doc.filename}:${seg.index}:${lineIndex}`;
        const row = {
          id,
          document: doc.filename,
          document_id: docId || undefined,
          segment_index: seg.index,
          line_index: lineIndex,
          page: seg.page || 1,
          section: seg.section || seg.heading || `Section ${seg.index + 1}`,
          text,
          entities: spans,
          review: {
            verified: rowVerified,
            verified_spans: verifiedSpans,
            model_spans: spans.filter((s) => s.origin === 'model').length,
            human_spans: spans.filter((s) => s.origin === 'human').length,
            total_spans: spans.length,
          },
        };

        if (opts.withTokens) {
          const { tokens, tags } = toBIO(text, spans, issues);
          row.tokens = tokens.map((t) => t.text);
          row.token_offsets = tokens.map((t) => [t.start, t.end]);
          row.ner_tags = tags;
        }

        if (opts.split) row.split = assignSplit(id, opts.splitRatios);

        rows.push(row);
      });
    });
  });

  return { rows, issues, emptyUnverifiable, options: opts };
}

function bioLabelList() {
  const labels = ['O'];
  CANONICAL_TYPES.forEach((t) => {
    labels.push(`B-${t}`);
    labels.push(`I-${t}`);
  });
  return labels;
}

function buildManifest(documents, built, extra = {}) {
  const { rows, issues, emptyUnverifiable, options } = built;

  const byLabel = {};
  let entities = 0;
  let verifiedEntities = 0;
  let humanEntities = 0;
  let rowsWithEntities = 0;
  const splits = {};

  rows.forEach((row) => {
    if (row.entities.length > 0) rowsWithEntities += 1;
    if (row.split) splits[row.split] = (splits[row.split] || 0) + 1;
    row.entities.forEach((e) => {
      entities += 1;
      if (e.verified) verifiedEntities += 1;
      if (e.origin === 'human') humanEntities += 1;
      byLabel[e.label] = (byLabel[e.label] || 0) + 1;
    });
  });

  const bioLabels = bioLabelList();

  return {
    schema_version: SCHEMA_VERSION,
    created_at: new Date().toISOString(),
    purpose: options.verifiedOnly
      ? 'gold benchmark: human-verified spans only'
      : options.includeLowConfidence
        ? 'pre-annotation dump: every span the model proposed, reviewed or not'
        : 'training data: human-verified spans plus model spans that cleared the confidence threshold',
    source: {
      documents: documents.map((d) => ({
        id: String(d._id || ''),
        filename: d.filename,
        confidence_threshold: d.threshold,
        segments: (d.segments || []).length,
      })),
      model: 'AgNER-BERTa',
      base_model: 'roberta-base',
    },
    selection: {
      verified_only: options.verifiedOnly,
      include_low_confidence_spans: options.includeLowConfidence,
      include_empty_sentences: options.includeEmpty,
      resolve_overlaps: options.resolveOverlaps,
      min_confidence: options.minConfidence,
    },
    counts: {
      rows: rows.length,
      rows_with_entities: rowsWithEntities,
      rows_without_entities: rows.length - rowsWithEntities,
      entities,
      verified_entities: verifiedEntities,
      model_entities: entities - humanEntities,
      human_entities: humanEntities,
      by_label: byLabel,
    },
    // A sentence a person read and found empty leaves no trace in the current
    // schema, so a gold export cannot vouch for these and leaves them out.
    empty_rows_unverifiable: emptyUnverifiable,
    quality: issues,
    labels: CANONICAL_TYPES.slice(),
    model_labels: CANONICAL_TYPES.filter((t) => !ANNOTATOR_ONLY_LABELS.includes(t)),
    annotator_only_labels: ANNOTATOR_ONLY_LABELS.slice(),
    bio_labels: bioLabels,
    bio_label_to_id: Object.fromEntries(bioLabels.map((l, i) => [l, i])),
    splits: Object.keys(splits).length ? splits : undefined,
    ...extra,
  };
}

/* ---------------------------------- writers --------------------------------- */

const toJsonl = (rows) => rows.map((r) => JSON.stringify(r)).join('\n');

/** Hugging Face token-classification shape: tokens plus integer tag ids. */
function toHuggingFace(rows) {
  const labels = bioLabelList();
  const ids = Object.fromEntries(labels.map((l, i) => [l, i]));
  return rows
    .map((row) => {
      const tags = row.ner_tags || [];
      return JSON.stringify({
        id: row.id,
        tokens: row.tokens || [],
        ner_tags: tags.map((t) => ids[t] ?? 0),
        ner_tags_text: tags,
        split: row.split,
      });
    })
    .join('\n');
}

/** CoNLL-2003 style: one token per line, blank line between sentences. */
function toCoNLL(rows) {
  const blocks = rows.map((row) => {
    const header = `# id = ${row.id}`;
    const lines = (row.tokens || []).map((tok, i) => `${tok}\t${(row.ner_tags || [])[i] || 'O'}`);
    return [header, ...lines].join('\n');
  });
  return `${blocks.join('\n\n')}\n`;
}

/** spaCy's JSONL shape, ready for srsly + DocBin conversion. */
function toSpacy(rows) {
  return rows
    .map((row) =>
      JSON.stringify({
        text: row.text,
        entities: row.entities.map((e) => [e.start, e.end, e.label]),
        meta: { id: row.id, verified: row.review.verified, split: row.split },
      })
    )
    .join('\n');
}

module.exports = {
  SCHEMA_VERSION,
  ANNOTATOR_ONLY_LABELS,
  VALIDATION_DECISIONS,
  buildAnnotatedRecords,
  buildValidatedRecords,
  buildRows,
  buildManifest,
  bioLabelList,
  tokenize,
  toBIO,
  isVerifiedSpan,
  assignSplit,
  toJsonl,
  toHuggingFace,
  toCoNLL,
  toSpacy,
};
