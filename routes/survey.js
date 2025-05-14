const express = require('express');
const router = express.Router();
const Survey = require('../models/Survey');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');
const mongoose = require('mongoose'); // Added import
const multer = require('multer');
const path = require('path');

// Get all surveys
router.get('/', authMiddleware, async (req, res) => {
  try {
    const surveys = await Survey.find()
      .populate('categoryId')
      .populate('sectionId')
      .populate('subsectionId');
    res.json(surveys);
  } catch (err) {
    console.error('Error fetching surveys:', err);
    res.status(500).json({ message: err.message });
  }
});

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'Uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'text/plain'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, PDF, or TXT files are allowed'));
    }
  },
});

// Create a new survey
router.post('/', authMiddleware, roleMiddleware('admin'), upload.single('file'), async (req, res) => {
  try {
    const { question, options, categoryId, sectionId, subsectionId, questionType, correctOption, scoringType, maxScore } = req.body;
    console.log('POST /api/survey called with body:', req.body, 'file:', req.file);

    // Validate required fields
    const missingFields = [];
    if (!question) missingFields.push('question');
    if (!categoryId) missingFields.push('categoryId');
    if (!sectionId) missingFields.push('sectionId');
    if (!subsectionId) missingFields.push('subsectionId');
    if (!questionType) missingFields.push('questionType');
    if (!maxScore) missingFields.push('maxScore');

    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields);
      return res.status(400).json({ message: `Required fields are missing: ${missingFields.join(', ')}` });
    }

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      console.error('Invalid categoryId:', categoryId);
      return res.status(400).json({ message: 'Invalid categoryId' });
    }
    if (!mongoose.Types.ObjectId.isValid(sectionId)) {
      console.error('Invalid sectionId:', sectionId);
      return res.status(400).json({ message: 'Invalid sectionId' });
    }
    if (!mongoose.Types.ObjectId.isValid(subsectionId)) {
      console.error('Invalid subsectionId:', subsectionId);
      return res.status(400).json({ message: 'Invalid subsectionId' });
    }

    // Validate file for file-upload
    if (questionType === 'file-upload' && !req.file) {
      console.error('File is required for file-upload question type');
      return res.status(400).json({ message: 'File is required for file-upload question type' });
    }

    // Validate maxScore
    const parsedMaxScore = parseInt(maxScore, 10);
    if (isNaN(parsedMaxScore) || parsedMaxScore <= 0) {
      console.error('Invalid maxScore:', maxScore);
      return res.status(400).json({ message: 'Max score must be a positive number' });
    }

    const survey = new Survey({
      question,
      options: options ? JSON.parse(options) : undefined,
      categoryId,
      sectionId,
      subsectionId,
      questionType,
      correctOption,
      scoringType,
      maxScore: parsedMaxScore,
      fileUrl: req.file ? req.file.path : undefined,
    });

    await survey.save();
    console.log('Survey saved:', survey);
    res.status(201).json(survey);
  } catch (err) {
    console.error('Error in survey creation:', {
      message: err.message,
      stack: err.stack,
    });
    res.status(500).json({ message: err.message || 'Server error during survey creation' });
  }
});

// Update a survey (Admin only)
router.put('/:id', authMiddleware, roleMiddleware('admin'), upload.single('file'), async (req, res) => {
  const { id } = req.params;
  const { question, options, categoryId, sectionId, subsectionId, questionType, correctOption, scoringType, maxScore } = req.body;
  console.log('PUT /survey/:id called with body:', req.body, 'file:', req.file);
  try {
    const updateData = {
      question,
      options: options ? JSON.parse(options) : undefined,
      categoryId,
      sectionId,
      subsectionId,
      questionType,
      correctOption,
      scoringType,
      maxScore,
    };
    if (req.file) {
      updateData.fileUrl = req.file.path;
    }
    const survey = await Survey.findByIdAndUpdate(id, updateData, { new: true });
    if (!survey) {
      return res.status(404).json({ message: 'Survey not found' });
    }
    console.log('Survey updated:', survey);
    res.json(survey);
  } catch (err) {
    console.error('Error updating survey:', err);
    res.status(500).json({ message: err.message });
  }
});

// Delete a survey (Admin only)
router.delete('/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  const { id } = req.params;
  try {
    const survey = await Survey.findByIdAndDelete(id);
    if (!survey) {
      return res.status(404).json({ message: 'Survey not found' });
    }
    res.json({ message: 'Survey deleted' });
  } catch (err) {
    console.error('Error deleting survey:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get surveys (exported function)
exports.getSurveys = async (req, res) => {
  try {
    const surveys = await Survey.find()
      .populate('sectionId')
      .populate('subsectionId')
      .populate('categoryId');
    res.json(surveys);
  } catch (err) {
    console.error('Error fetching surveys:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get surveys by subsection (exported function)
exports.getSurveysBySubsection = async (req, res) => {
  try {
    const surveys = await Survey.find({ subsectionId: req.params.subsectionId })
      .populate('sectionId')
      .populate('subsectionId')
      .populate('categoryId');
    res.json(surveys);
  } catch (err) {
    console.error('Error fetching surveys by subsection:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Serve uploaded files
router.get('/files/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, '..', 'Uploads', filename);
  res.sendFile(filePath, err => {
    if (err) {
      console.error('Error serving file:', err);
      res.status(404).json({ message: 'File not found' });
    }
  });
});

module.exports = router;