const mongoose = require('mongoose');

const entitySchema = new mongoose.Schema({
  text: String,
  label: String,
  start: Number,
  end: Number,
  confidence: Number,
  // accepted: auto (>= threshold) | review: low confidence, awaiting LLM/human
  // approved / edited / deleted: human decisions
  status: {
    type: String,
    enum: ['accepted', 'review', 'approved', 'edited', 'deleted'],
    default: 'review',
  },
  source: { type: String, enum: ['model', 'llm', 'human'], default: 'model' },

  /*
   * Validation workflow only, and deliberately a separate axis from `status`
   * above so the annotation workflow is untouched.
   *
   * unreviewed -> nobody has judged it yet (exports omit the validation block)
   * confirmed  -> a person says the pipeline got it right
   * rejected   -> a person says it is wrong. Kept, never deleted: "the pipeline
   *               tagged this and a human disagreed" is the point of the file.
   * relabelled -> kept, with a different type; originalLabel holds what the
   *               pipeline said.
   */
  validationStatus: {
    type: String,
    enum: ['unreviewed', 'confirmed', 'rejected', 'relabelled'],
  },
  originalLabel: String,
});

module.exports = entitySchema;
