const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  surveyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Survey', required: true },
  answer: { type: String, required: true },
  score: { type: Number, required: true },
  isReattempt: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Response', responseSchema);