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

// Requests (yêu cầu tư vấn công khai từ trang chủ)
router.post('/requests', featureController.createLead);            // PUBLIC — không cần đăng nhập
router.get('/requests', authMiddleware, featureController.getLeads); // ADMIN
router.put('/requests/:id/status', authMiddleware, featureController.updateLeadStatus); // ADMIN

module.exports = router;
