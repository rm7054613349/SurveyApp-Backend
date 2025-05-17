
const mongoose = require('mongoose');

const surveySchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [{ type: String }], // Removed required: true for array elements
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true },
  subsectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subsection', required: true },
  questionType: { type: String, enum: ['multiple-choice', 'descriptive', 'file-upload'], required: true },
  correctOption: { type: String },
  scoringType: { type: String, enum: ['basic', 'hard'], default: 'basic' },
  maxScore: { type: Number, required: true },
  fileUrl: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Survey', surveySchema);
