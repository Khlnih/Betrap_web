const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authMiddleware, adminOnly } = require('../middlewares/authMiddleware');
const { providerOnly } = require('./serviceRoutes');

// Admin Routes
router.put('/admin/providers/:id/verify', authMiddleware, adminOnly, adminController.verifyProvider);

// Stats Routes
router.get('/stats/global', adminController.getGlobalStats);
router.get('/stats/customer', authMiddleware, adminController.getCustomerStats);
router.get('/stats/provider', authMiddleware, providerOnly, adminController.getProviderStats);
router.get('/stats/admin', authMiddleware, adminOnly, adminController.getAdminStats);

module.exports = router;
