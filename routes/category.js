const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');

// Get all categories
router.get('/', authMiddleware, async (req, res) => {
  try {
    const categories = await Category.find().populate('subsectionId');
    res.json(categories);
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ message: err.message });
  }
});

// Create a new category (Admin only)
router.post('/', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  const { name, subsectionId } = req.body;
  console.log('POST /category called with body:', req.body);
  try {
    if (!name || !subsectionId) {
      return res.status(400).json({ message: 'Name and subsectionId are required' });
    }
    const category = new Category({ name, subsectionId });
    await category.save();
    console.log('Category created:', category);
    res.status(201).json(category);
  } catch (err) {
    console.error('Error creating category:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;