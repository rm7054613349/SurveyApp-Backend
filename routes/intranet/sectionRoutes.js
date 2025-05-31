const express = require('express');
const router = express.Router();
const DocumentSection = require('../../models/Intranet/DocumentSection');
const sanitize = require('mongo-sanitize'); // Install mongo-sanitize for sanitization

router.get('/', async (req, res) => {
  try {
    const sections = await DocumentSection.find();
    res.json(sections);
  } catch (err) {
    res.status(500).json({ message: 'Server error while fetching sections' });
  }
});

router.post('/', async (req, res) => {
  const { name } = req.body;
  const sanitizedName = sanitize(name.trim());
  if (!sanitizedName || sanitizedName.length < 3 || sanitizedName.length > 50) {
    return res.status(400).json({ message: 'Section name must be between 3 and 50 characters' });
  }
  try {
    const existingSection = await DocumentSection.findOne({ name: { $regex: `^${sanitizedName}$`, $options: 'i' } });
    if (existingSection) {
      return res.status(400).json({ message: 'Section name already exists' });
    }
    const section = new DocumentSection({ name: sanitizedName });
    const newSection = await section.save();
    res.status(201).json(newSection);
  } catch (err) {
    res.status(400).json({ message: 'Failed to create section' });
  }
});

module.exports = router;