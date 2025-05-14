
const mongoose = require('mongoose');

const subsectionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true },
  order: { type: Number, default: 1 }, // New field for ordering subsections
});

module.exports = mongoose.model('Subsection', subsectionSchema);
