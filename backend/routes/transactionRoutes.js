const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { authMiddleware } = require('../middlewares/authMiddleware');

router.post('/', authMiddleware, transactionController.create);
router.get('/user/:userId', authMiddleware, transactionController.getByUserId);
router.get('/:id', authMiddleware, transactionController.getById);
router.put('/:id/status', authMiddleware, transactionController.updateStatus);

module.exports = router;
