const mongoose = require('mongoose');
const segmentSchema = require('./Segment');
const entitySchema = require('./Entity');

const documentSchema = new mongoose.Schema(
  {
    filename: String,
    threshold: Number,

    // Which workflow this document belongs to.
    // annotate: text to be annotated, the model predicting on demand.
    // validate: entities already produced by the hybrid pipeline, for a person
    //           to confirm, reject or relabel. The model is never run on these.
    kind: { type: String, enum: ['annotate', 'validate'], default: 'annotate' },

    segments: [segmentSchema],
    stats: {
      totalEntities: Number,
      autoAccepted: Number,
      needsReview: Number,
      avgConfidence: Number,
    },
  },
  {
    timestamps: true,
    /*
     * Mongoose removes empty objects when saving unless told otherwise, which
     * silently dropped `hybrid.per_source: {}` from a pipeline record whose
     * passage had no entities. An export has to hand the file back exactly as
     * it arrived, so minimisation is off.
     */
    minimize: false,
  }
);

const Document = mongoose.model('Document', documentSchema);

module.exports = Document;
module.exports.Document = Document;
module.exports.documentSchema = documentSchema;
module.exports.segmentSchema = segmentSchema;
module.exports.entitySchema = entitySchema;
