const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

router.post('/predict', aiController.predictDisease);
router.post('/chat', aiController.chat);
router.post('/analyze-report', aiController.analyzeReport);

module.exports = router;
