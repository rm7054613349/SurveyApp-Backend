const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const surveyRoutes = require('./routes/survey');
const responseRoutes = require('./routes/response');
const categoryRoutes = require('./routes/category');
const sectionRoutes = require('./routes/section');
const subsectionRoutes = require('./routes/subsection');
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const path = require('path');

dotenv.config();
const app = express();

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// GridFS setup for file storage
let gfs;
const conn = mongoose.connection;
conn.once('open', () => {
  gfs = new mongoose.mongo.GridFSBucket(conn.db, { bucketName: 'uploads' });
});

// Multer storage for file uploads
const storage = new GridFsStorage({
  url: process.env.MONGO_URI,
  file: (req, file) => ({
    bucketName: 'uploads',
    filename: `${Date.now()}_${file.originalname}`,
  }),
});
const upload = multer({ storage });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/auth', authRoutes);
app.use('/api/survey', surveyRoutes);
app.use('/api/response', responseRoutes);
app.use('/api/category', categoryRoutes);
app.use('/api/section', sectionRoutes);
app.use('/api/subsection', subsectionRoutes);

// File download endpoint
app.get('/api/files/:filename', (req, res) => {
  gfs.find({ filename: req.params.filename }).toArray((err, files) => {
    if (!files || files.length === 0) return res.status(404).json({ message: 'File not found' });
    gfs.openDownloadStreamByName(req.params.filename).pipe(res);
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));