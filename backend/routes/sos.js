const express = require('express');
const router = express.Router();
const sosController = require('../controllers/sosController');

router.post('/trigger', sosController.triggerSOS);

module.exports = router;
