const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');

router.post('/messages', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  const { type, title, content, date } = req.body;

  if (!type || !title || !content || !date) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const message = new Message({
      type,
      title,
      content,
      date,
      createdBy: req.user.id, // Set from JWT
    });
    await message.save();
    res.status(201).json({ message: 'Message created successfully' });
  } catch (error) {
    console.error('Create message error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;