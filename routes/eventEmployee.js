const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');

router.get('/event', authMiddleware, roleMiddleware('employee'), async (req, res) => {
  try {
    // Fetch events, including date-time values, sorted by date descending
    const messages = await Event.find()
      .sort({ date: -1 })
      .populate('createdBy', 'username');
    res.status(200).json(messages);
  } catch (error) {
    console.error('Get events error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;