const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Document = require('../../models/Intranet/Document');
const DocumentSection = require('../../models/Intranet/DocumentSection');
const DocumentSubsection = require('../../models/Intranet/DocumentSubsection');
const sanitize = require('mongo-sanitize');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${sanitize(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      // Images
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp', 'image/tiff', 'image/heic', 'image/heif',
      // Videos
      'video/mp4', 'video/mpeg', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska',
      // Audio
      'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/webm', 'audio/aac', 'audio/x-wav',
      // Documents
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain', 'text/csv', 'text/html', 'application/json', 'application/rtf', 'application/xml',
      // Archives
      'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed', 'application/x-tar', 'application/gzip',
      // Code files
      'application/javascript', 'application/x-python-code', 'application/x-java', 'text/css', 'text/markdown',
      'text/x-c', 'text/x-c++', 'text/x-java-source'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

router.post('/', upload.single('file'), async (req, res) => {
  const { name, sectionId, subsectionId } = req.body;
  const sanitizedName = sanitize(name.trim());
  if (!sanitizedName || sanitizedName.length < 3 || sanitizedName.length > 100) {
    return res.status(400).json({ message: 'Document name must be between 3 and 100 characters' });
  }
  if (!sectionId || !subsectionId || !req.file) {
    return res.status(400).json({ message: 'All fields and file are required' });
  }
  try {
    const section = await DocumentSection.findById(sectionId);
    if (!section) {
      return res.status(400).json({ message: 'Invalid section ID' });
    }
    const subsection = await DocumentSubsection.findById(subsectionId);
    if (!subsection) {
      return res.status(400).json({ message: 'Invalid subsection ID' });
    }
    const existingDocument = await Document.findOne({
      name: { $regex: `^${sanitizedName}$`, $options: 'i' },
      subsectionId,
    });
    if (existingDocument) {
      return res.status(400).json({ message: 'Document name already exists in this subsection' });
    }
    const document = new Document({
      name: sanitizedName,
      filePath: req.file.path,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      sectionId,
      subsectionId
    });
    const newDocument = await document.save();
    res.status(201).json(newDocument);
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to upload document' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { subsectionId } = req.query;
    const query = subsectionId ? { subsectionId } : {};
    const documents = await Document.find(query).populate('sectionId').populate('subsectionId');
    res.json(documents);
  } catch (err) {
    res.status(500).json({ message: 'Server error while fetching documents' });
  }
});

router.get('/download/:id', async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    res.download(document.filePath, document.name);
  } catch (err) {
    res.status(500).json({ message: 'Server error while downloading document' });
  }
});

module.exports = router;