const express = require('express');
const router = express.Router();
const featureController = require('../controllers/featureController');
const { authMiddleware } = require('../middlewares/authMiddleware');

// Favorites
router.get('/favorites', authMiddleware, featureController.getFavorites);
router.post('/favorites/:serviceId', authMiddleware, featureController.toggleFavorite);
router.get('/favorites/check/:serviceId', authMiddleware, featureController.checkFavorite);

// Consultations
router.post('/consultations', authMiddleware, featureController.createConsultation);

module.exports = router;
