const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');

router.post('/event', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  const { type, title, content, date } = req.body;

  if (!type || !title || !content || !date) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    // Validate date as a valid ISO string with time
    const parsedDate = new Date(date);
    if (isNaN(parsedDate)) {
      return res.status(400).json({ message: 'Invalid date format' });
    }

    const message = new Event({
      type,
      title,
      content,
      date: parsedDate,
      createdBy: req.user.id, // Set from JWT
    });
    await message.save();
    res.status(201).json({ message: 'Event created successfully' });
  } catch (error) {
    console.error('Create event error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;