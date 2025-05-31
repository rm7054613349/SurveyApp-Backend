const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 3
  }
}, { timestamps: true });

module.exports = mongoose.model('DocumentSection', sectionSchema);