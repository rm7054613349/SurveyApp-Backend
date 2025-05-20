const express = require('express');
const router = express.Router();
const Section = require('../models/Section');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');

// Get all sections
router.get('/', authMiddleware, async (req, res) => {
  try {
    const sections = await Section.find();
    console.log('Fetched sections:', sections);
    res.json(sections);
  } catch (err) {
    console.error('Error fetching sections:', err);
    res.status(500).json({ message: err.message });
  }
});



// Create a new section (Admin only)
router.post('/', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  const { name } = req.body;
  console.log('POST /section called with body:', req.body);
  try {
    if (!name) {
      return res.status(400).json({ message: 'Section name is required' });
    }
    const section = new Section({ name });
    await section.save();
    console.log('Section created:', section);
    res.status(201).json(section);
  } catch (err) {
    console.error('Error creating section:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;