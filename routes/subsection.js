const express = require('express');
const router = express.Router();
const Subsection = require('../models/Subsection');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');

// Get all subsections
router.get('/', authMiddleware, async (req, res) => {
  try {
    const subsections = await Subsection.find().populate('sectionId');
    res.json(subsections);
  } catch (err) {
    console.error('Error fetching subsections:', err);
    res.status(500).json({ message: err.message });
  }
});

// Create a new subsection (Admin only)
router.post('/', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  const { name, sectionId } = req.body;
  console.log('POST /subsection called with body:', req.body);
  try {
    if (!name || !sectionId) {
      return res.status(400).json({ message: 'Name and sectionId are required' });
    }
    const subsection = new Subsection({ name, sectionId });
    await subsection.save();
    console.log('Subsection created:', subsection);
    res.status(201).json(subsection);
  } catch (err) {
    console.error('Error creating subsection:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;