const mongoose = require('mongoose');
const entitySchema = require('./Entity');

const segmentSchema = new mongoose.Schema({
  index: Number,
  page: Number,
  paragraph: Number,
  path: String,
  section: String,
  heading: String,
  text: String,
  entities: [entitySchema],
  originalEntities: [entitySchema],
});

module.exports = segmentSchema;
