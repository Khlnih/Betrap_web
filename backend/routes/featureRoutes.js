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

// Leads (yêu cầu tư vấn công khai từ trang chủ)
router.post('/leads', featureController.createLead);            // PUBLIC — không cần đăng nhập
router.get('/leads', authMiddleware, featureController.getLeads); // ADMIN (controller kiểm tra role)
router.put('/leads/:id/status', authMiddleware, featureController.updateLeadStatus); // ADMIN

module.exports = router;
