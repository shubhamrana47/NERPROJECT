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

const segmentSchema = new mongoose.Schema({
  index: Number,
  page: Number,
  paragraph: Number,
  path: String,
  section: String,
  heading: String,
  text: String,
  entities: [entitySchema],
});

const documentSchema = new mongoose.Schema(
  {
    filename: String,
    threshold: Number,
    segments: [segmentSchema],
    stats: {
      totalEntities: Number,
      autoAccepted: Number,
      needsReview: Number,
      avgConfidence: Number,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Document', documentSchema);
