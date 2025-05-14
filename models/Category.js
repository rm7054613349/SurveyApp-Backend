const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  subsectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subsection',
    required: true,
  },
});

module.exports = mongoose.model('Category', categorySchema);