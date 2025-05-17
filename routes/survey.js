
const express = require('express');
const router = express.Router();
const Survey = require('../models/Survey');
const Section = require('../models/Section'); // Import Section model
const Subsection = require('../models/Subsection'); // Import Subsection model
const Category = require('../models/Category'); // Import Category model
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure Uploads directory exists
const uploadDir = path.join(__dirname, '..', 'Uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('Created Uploads directory:', uploadDir);
}

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
    res.status(500).json({ message: 'Error fetching surveys', error: err.message });
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
      cb(new Error('Unsupported file type. Allowed types: images, videos, audio, documents, archives, and code files.'));
    }
  },
});

// Create a new survey
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const { question, questionType, categoryId, sectionId, subsectionId, maxScore, correctOption } = req.body;

    // Extract options (sent as option1, option2, option3, option4 from frontend)
    const options = [
      req.body.option1,
      req.body.option2,
      req.body.option3,
      req.body.option4,
    ].filter(opt => opt);

    console.log('Received survey data:', {
      question,
      questionType,
      categoryId,
      sectionId,
      subsectionId,
      maxScore,
      options,
      correctOption,
      file: req.file
    });

    // Validate required fields
    if (!question || !questionType || !categoryId || !sectionId || !subsectionId || !maxScore) {
      console.error('Missing required fields:', req.body);
      return res.status(400).json({ message: 'All required fields must be provided' });
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

    // Check if referenced documents exist
    const category = await Category.findById(categoryId);
    if (!category) {
      console.error('Category not found:', categoryId);
      return res.status(404).json({ message: 'Category not found' });
    }

    const section = await Section.findById(sectionId);
    if (!section) {
      console.error('Section not found:', sectionId);
      return res.status(404).json({ message: 'Section not found' });
    }

    const subsection = await Subsection.findById(subsectionId);
    if (!subsection) {
      console.error('Subsection not found:', subsectionId);
      return res.status(404).json({ message: 'Subsection not found' });
    }

    // Validate multiple-choice questions
    if (questionType === 'multiple-choice') {
      if (!options || options.length !== 4) {
        console.error('Multiple-choice questions require exactly 4 options');
        return res.status(400).json({ message: 'Multiple-choice questions require exactly 4 options' });
      }
      if (!correctOption) {
        console.error('Correct option required for multiple-choice survey');
        return res.status(400).json({ message: 'Correct option required for multiple-choice survey' });
      }
      if (!options.includes(correctOption)) {
        console.error('Correct option must be one of the provided options');
        return res.status(400).json({ message: 'Correct option must be one of the provided options' });
      }
    }

    // Validate file-upload questions
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

    // Create the survey with options and correctOption for multiple-choice questions
    const survey = new Survey({
      question,
      questionType,
      categoryId,
      sectionId,
      subsectionId,
      maxScore,
      fileUrl,
      ...(questionType === 'multiple-choice' && {
        options,
        correctOption
      }),
    });

    await survey.save();
    console.log('Survey created:', survey);
    res.status(201).json(survey);
  } catch (err) {
    console.error('Survey creation error:', err);
    res.status(500).json({ message: 'Survey creation failed', error: err.message });
  }
});

// GET /api/survey/subsection/:subsectionId - Get surveys by subsection
router.get('/subsection/:subsectionId', async (req, res) => {
  try {
    const { subsectionId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(subsectionId)) {
      console.error('Invalid subsectionId:', subsectionId);
      return res.status(400).json({ message: 'Invalid subsectionId' });
    }
    const surveys = await Survey.find({ subsectionId })
      .populate('categoryId')
      .populate('sectionId')
      .populate('subsectionId');
    console.log(`Fetched ${surveys.length} surveys for subsection ${subsectionId}`);
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
    // Validate ObjectIds if provided
    if (categoryId && !mongoose.Types.ObjectId.isValid(categoryId)) {
      console.error('Invalid categoryId:', categoryId);
      return res.status(400).json({ message: 'Invalid categoryId' });
    }
    if (sectionId && !mongoose.Types.ObjectId.isValid(sectionId)) {
      console.error('Invalid sectionId:', sectionId);
      return res.status(400).json({ message: 'Invalid sectionId' });
    }
    if (subsectionId && !mongoose.Types.ObjectId.isValid(subsectionId)) {
      console.error('Invalid subsectionId:', subsectionId);
      return res.status(400).json({ message: 'Invalid subsectionId' });
    }

    // Check existence of referenced documents if provided
    if (categoryId) {
      const category = await Category.findById(categoryId);
      if (!category) {
        console.error('Category not found:', categoryId);
        return res.status(404).json({ message: 'Category not found' });
      }
    }
    if (sectionId) {
      const section = await Section.findById(sectionId);
      if (!section) {
        console.error('Section not found:', sectionId);
        return res.status(404).json({ message: 'Section not found' });
      }
    }
    if (subsectionId) {
      const subsection = await Subsection.findById(subsectionId);
      if (!subsection) {
        console.error('Subsection not found:', subsectionId);
        return res.status(404).json({ message: 'Subsection not found' });
      }
    }

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
      updateData.fileUrl = req.file.filename;
    }
    const survey = await Survey.findByIdAndUpdate(id, updateData, { new: true })
      .populate('categoryId')
      .populate('sectionId')
      .populate('subsectionId');
    if (!survey) {
      return res.status(404).json({ message: 'Survey not found' });
    }
    console.log('Survey updated:', survey);
    res.json(survey);
  } catch (err) {
    console.error('Error updating survey:', err);
    res.status(500).json({ message: 'Error updating survey', error: err.message });
  }
});

// Delete a survey (Admin only)
router.delete('/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  const { id } = req.params;
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.error('Invalid survey id:', id);
      return res.status(400).json({ message: 'Invalid survey id' });
    }
    const survey = await Survey.findByIdAndDelete(id);
    if (!survey) {
      return res.status(404).json({ message: 'Survey not found' });
    }
    res.json({ message: 'Survey deleted' });
  } catch (err) {
    console.error('Error deleting survey:', err);
    res.status(500).json({ message: 'Error deleting survey', error: err.message });
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
    res.status(500).json({ message: 'Error fetching surveys', error: err.message });
  }
};

// Get surveys by subsection (exported function)
exports.getSurveysBySubsection = async (req, res) => {
  try {
    const { subsectionId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(subsectionId)) {
      console.error('Invalid subsectionId:', subsectionId);
      return res.status(400).json({ message: 'Invalid subsectionId' });
    }
    const surveys = await Survey.find({ subsectionId })
      .populate('sectionId')
      .populate('subsectionId')
      .populate('categoryId');
    res.json(surveys);
  } catch (err) {
    console.error('Error fetching surveys by subsection:', err);
    res.status(500).json({ message: 'Error fetching surveys by subsection', error: err.message });
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
