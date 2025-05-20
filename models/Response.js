


const mongoose = require('mongoose');
const responseSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  survey: { type: mongoose.Schema.Types.ObjectId, ref: 'Survey', required: true },
  subsection: { type: mongoose.Schema.Types.ObjectId, ref: 'Subsection', required: true },
  answer: { type: String, required: true },
  score: { type: Number, default: 0 },
  badge: { type: String },
 
}, { timestamps: true });

module.exports = mongoose.model('Response', responseSchema);




