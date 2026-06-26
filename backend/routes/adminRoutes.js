const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authMiddleware, adminOnly } = require('../middlewares/authMiddleware');
const { providerOnly } = require('./serviceRoutes');

// Admin Routes
router.get('/admin/users', authMiddleware, adminOnly, adminController.getUsers);
router.post('/admin/providers', authMiddleware, adminOnly, adminController.createProvider);
router.patch('/admin/users/:id/toggle', authMiddleware, adminOnly, adminController.toggleUser);
router.get('/admin/services', authMiddleware, adminOnly, adminController.getServices);
router.patch('/admin/services/:id/toggle', authMiddleware, adminOnly, adminController.toggleService);
router.put('/admin/providers/:id/verify', authMiddleware, adminOnly, adminController.verifyProvider);
    router.get('/admin/transactions', authMiddleware, adminOnly, adminController.getTransactions);

    // Tracking Routes for Admin
    const trackingController = require('../controllers/trackingController');
    router.get('/admin/tracking-links', authMiddleware, adminOnly, trackingController.getLinksAdmin);
    router.post('/admin/tracking-links', authMiddleware, adminOnly, trackingController.createLink);
    router.delete('/admin/tracking-links/:id', authMiddleware, adminOnly, trackingController.deleteLink);

    // Stats Routes
router.get('/stats/global', adminController.getGlobalStats);
router.get('/stats/customer', authMiddleware, adminController.getCustomerStats);
router.get('/stats/provider', authMiddleware, providerOnly, adminController.getProviderStats);
router.get('/stats/admin', authMiddleware, adminOnly, adminController.getAdminStats);

module.exports = router;
