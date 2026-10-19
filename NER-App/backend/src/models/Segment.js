const mongoose = require('mongoose');
const entitySchema = require('./Entity');

const segmentSchema = new mongoose.Schema({
  index: Number,
  page: Number,
  paragraph: Number,
  path: String,
  section: String,
  heading: String,

  // The original record from the uploaded file, kept verbatim so an export can
  // hand it back with annotations appended and nothing else altered.
  sourceRecord: mongoose.Schema.Types.Mixed,

  // Advisory passage metadata, when the source file carries it.
  passageId: String,
  passageTag: String,
  crops: [String],
  stages: [String],
  subjects: [String],

  // The model runs on demand, a few passages ahead of wherever the annotator
  // is working, so a large file is ready to annotate immediately.
  // pending -> not predicted yet | done | skipped (annotating from scratch) | error
  nerStatus: {
    type: String,
    enum: ['pending', 'done', 'skipped', 'error'],
    default: 'pending',
  },

  text: String,
  entities: [entitySchema],
  originalEntities: [entitySchema],
});

module.exports = segmentSchema;
