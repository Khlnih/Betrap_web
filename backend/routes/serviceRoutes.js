const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const { authMiddleware } = require('../middlewares/authMiddleware');

const providerOnly = (req, res, next) => {
    if (req.user.role !== 'provider') return res.status(403).json({ error: 'Access denied. Providers only.' });
    next();
};

router.get('/', serviceController.getAll);
router.get('/:id', serviceController.getById);
router.post('/', authMiddleware, providerOnly, serviceController.create);
router.put('/:id', authMiddleware, providerOnly, serviceController.update);
router.patch('/:id/toggle', authMiddleware, providerOnly, serviceController.toggleActive);
router.delete('/:id', authMiddleware, providerOnly, serviceController.delete);

module.exports = { router, providerOnly };
