const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { providerOnly } = require('./serviceRoutes');

router.get('/service/:id', reviewController.getByServiceId);
router.post('/', authMiddleware, reviewController.create);
router.get('/check/:transactionId', authMiddleware, reviewController.checkExists);
router.get('/provider/:providerId', authMiddleware, reviewController.getByProvider);
router.put('/:id/reply', authMiddleware, providerOnly, reviewController.reply);

module.exports = router;
