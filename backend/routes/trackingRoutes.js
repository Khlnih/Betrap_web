const express = require('express');
const router = express.Router();
const trackingController = require('../controllers/trackingController');

// Route for recording a visit (public)
router.post('/visit', trackingController.recordVisit);

module.exports = router;
