const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const aiController = require('../controllers/aiController');

// Multer storage configuration for PDF medical reports
const reportsDir = path.resolve(__dirname, '../uploads/reports');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, reportsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '.pdf';
    cb(null, `report-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(null, true); // Allow all files for fallback parsing
    }
  }
});

router.post('/predict', aiController.predictDisease);
router.post('/chat', aiController.chat);
router.post('/upload-report', upload.single('file'), aiController.uploadReport);
router.post('/rag-chat', aiController.ragChat);
router.post('/analyze-report', aiController.analyzeReport);

module.exports = router;
