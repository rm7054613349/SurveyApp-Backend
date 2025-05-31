const mongoose = require('mongoose');
const subsectionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 3
  },
  sectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DocumentSection', // Must match model name
    required: true
  }
}, { timestamps: true });
module.exports = mongoose.model('DocumentSubsection', subsectionSchema);