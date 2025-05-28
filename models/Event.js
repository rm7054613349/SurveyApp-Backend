const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  type: { type: String, enum: ['event', 'workshop', 'seminar'], required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  date: { type: Date, required: true }, // Stores date and time (e.g., ISO string: 2025-05-28T10:00:00Z)
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Event', messageSchema);