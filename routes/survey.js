const express = require('express');
const router = express.Router();
const Survey = require('../models/Survey');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');

// Get all surveys
router.get('/', authMiddleware, async (req, res) => {
  try {
    const surveys = await Survey.find().populate('categoryId', 'name');
    res.json(surveys);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a survey (Admin only)
router.post('/', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  const { question, options, categoryId, correctOption } = req.body;
  try {
    if (!question || !options || !categoryId || !correctOption) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    if (!options.includes(correctOption)) {
      return res.status(400).json({ message: 'Correct option must be one of the provided options' });
    }
    const survey = new Survey({ question, options, categoryId, correctOption });
    await survey.save();
    res.status(201).json(survey);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update a survey (Admin only)
router.put('/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  const { question, options, categoryId } = req.body;
  try {
    const survey = await Survey.findById(req.params.id);
    if (!survey) {
      return res.status(404).json({ message: 'Survey not found' });
    }
    survey.question = question || survey.question;
    survey.options = options || survey.options;
    survey.categoryId = categoryId || survey.categoryId;
    await survey.save();
    const populatedSurvey = await Survey.findById(survey._id).populate('categoryId', 'name');
    res.json(populatedSurvey);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete a survey (Admin only)
router.delete('/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const survey = await Survey.findById(req.params.id);
    if (!survey) {
      return res.status(404).json({ message: 'Survey not found' });
    }
    await Survey.deleteOne({ _id: req.params.id });
    res.json({ message: 'Survey deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;