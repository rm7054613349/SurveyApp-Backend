const mongoose = require('mongoose');

const surveySchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [{ type: String, required: true }],
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  correctOption: { type: String, required: true }, // New field for correct option
});

module.exports = mongoose.model('Survey', surveySchema);