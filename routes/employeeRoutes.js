const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');

router.get('/messages', authMiddleware, roleMiddleware('employee'), async (req, res) => {
  try {
    const messages = await Message.find()
      .sort({ date: -1 })
      .populate('createdBy', 'username');
    res.status(200).json(messages);
  } catch (error) {
    console.error('Get messages error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;