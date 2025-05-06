const mongoose = require('mongoose');

const surveySchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [{ type: String, required: true }],
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Survey', surveySchema);