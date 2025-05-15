const express = require('express');
const router = express.Router();
const Survey = require('../models/Survey');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');
const mongoose = require('mongoose'); // Added import
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
  fileFilter: (req, file, cb) => {
    // const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'text/plain'];
    const allowedTypes = [
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp',
  'image/tiff',
  'image/heic',
  'image/heif',

  // Videos
  'video/mp4',
  'video/mpeg',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',

  // Audio
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/mp4',
  'audio/webm',
  'audio/aac',
  'audio/x-wav',

  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',       // .xlsx
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'text/plain',
  'text/csv',
  'text/html',
  'application/json',
  'application/rtf',
  'application/xml',

  // Archives
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  'application/x-tar',
  'application/gzip',

  // Code files
  'application/javascript',
  'application/x-python-code',
  'application/x-java',
  'text/css',
  'text/markdown',
  'text/x-c',
  'text/x-c++',
  'text/x-java-source'
];


    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, PDF, or TXT files are allowed'));
    }
  },
});

// Create a new survey
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const { question, questionType, categoryId, sectionId, subsectionId, maxScore } = req.body;
    
    console.log('Received survey data:', { question, questionType, categoryId, sectionId, subsectionId, maxScore, file: req.file });

    if (!question || !questionType || !categoryId || !sectionId || !subsectionId || !maxScore) {
      console.error('Missing required fields:', req.body);
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    if (questionType === 'file-upload' && !req.file) {
      console.error('File required for file-upload survey');
      return res.status(400).json({ message: 'File required for file-upload survey' });
    }

    let fileUrl = null;
    if (questionType === 'file-upload' && req.file) {
      fileUrl = req.file.filename;
      console.log('File uploaded:', {
        originalName: req.file.originalname,
        savedAs: fileUrl,
        path: req.file.path,
        size: req.file.size,
      });
      // Verify file exists
      if (!fs.existsSync(req.file.path)) {
        console.error('Uploaded file not found on disk:', req.file.path);
        return res.status(500).json({ message: 'File upload failed' });
      }
    }

    const survey = new Survey({
      question,
      questionType,
      categoryId,
      sectionId,
      subsectionId,
      maxScore,
      fileUrl,
    });

    await survey.save();
    console.log('Survey created:', survey);
    res.status(201).json(survey);
  } catch (err) {
    console.error('Survey creation error:', err);
    res.status(400).json({ message: 'Survey creation failed', error: err.message });
  }
});

// GET /api/survey/subsection/:subsectionId - Get surveys by subsection
router.get('/subsection/:subsectionId', async (req, res) => {
  try {
    const surveys = await Survey.find({ subsectionId: req.params.subsectionId });
    console.log(`Fetched ${surveys.length} surveys for subsection ${req.params.subsectionId}`);
    res.json(surveys);
  } catch (err) {
    console.error('Error fetching surveys:', err);
    res.status(500).json({ message: 'Error fetching surveys', error: err.message });
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