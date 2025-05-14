const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  surveyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Survey',
    required: true,
  },
  answer: {
    type: String,
    default: '',
  },
  fileUrl: {
    type: String,
    default: '',
  },
});

module.exports = mongoose.model('Response', responseSchema);