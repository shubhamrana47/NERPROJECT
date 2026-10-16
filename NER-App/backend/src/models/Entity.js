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
});

module.exports = entitySchema;
