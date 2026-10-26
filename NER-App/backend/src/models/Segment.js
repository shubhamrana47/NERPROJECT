const mongoose = require('mongoose');
const entitySchema = require('./Entity');

/*
 * minimize is off here as well as on the parent: Mongoose strips empty objects
 * when saving, and sourceRecord lives on this schema. Without it a pipeline
 * record's `hybrid.per_source: {}` disappeared from the export.
 */
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
  // pending  -> not predicted yet
  // done     -> the model has read it
  // skipped  -> annotating from scratch, no prediction wanted
  // provided -> entities came with the file; the model is never run on these
  // error    -> the model service could not be reached
  nerStatus: {
    type: String,
    enum: ['pending', 'done', 'skipped', 'provided', 'error'],
    default: 'pending',
  },

  // Validation workflow: a passage carrying no entities still has to be
  // acknowledged, so an unopened passage is never mistaken for a checked one.
  nothingToValidate: Boolean,

  text: String,
  entities: [entitySchema],
  originalEntities: [entitySchema],
}, { minimize: false });

module.exports = segmentSchema;
