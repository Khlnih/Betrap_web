const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { authMiddleware } = require('../middlewares/authMiddleware');

router.post('/', authMiddleware, transactionController.create);

router.get('/:id', authMiddleware, (req, res) => {
    if (req.params.id.startsWith('U_')) {
        req.params.userId = req.params.id;
        return transactionController.getByUserId(req, res);
    }
    return transactionController.getById(req, res);
});

router.put('/:id/status', authMiddleware, transactionController.updateStatus);

module.exports = router;
