const mongoose = require('mongoose');
const segmentSchema = require('./Segment');
const entitySchema = require('./Entity');

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

const Document = mongoose.model('Document', documentSchema);

module.exports = Document;
module.exports.Document = Document;
module.exports.documentSchema = documentSchema;
module.exports.segmentSchema = segmentSchema;
module.exports.entitySchema = entitySchema;
