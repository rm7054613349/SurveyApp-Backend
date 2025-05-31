const express = require('express');
const router = express.Router();
const DocumentSubsection = require('../../models/Intranet/DocumentSubsection');

router.get('/', async (req, res) => {
  try {
    const subsections = await DocumentSubsection.find().populate('sectionId');
    console.log('Subsections Sent:', subsections); // Debug log
    res.json(subsections);
  } catch (err) {
    console.error('Error fetching subsections:', err);
    res.status(500).json({ message: err.message || 'Server error while fetching subsections' });
  }
});

router.post('/', async (req, res) => {
  const { name, sectionId } = req.body;
  if (!name || name.trim().length < 3) {
    return res.status(400).json({ message: 'Subsection name must be at least 3 characters long' });
  }
  if (!sectionId) {
    return res.status(400).json({ message: 'Section ID is required' });
  }
  try {
    const subsection = new DocumentSubsection({ name, sectionId });
    const newSubsection = await subsection.save();
    res.status(201).json(newSubsection);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;