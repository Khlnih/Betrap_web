const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blogController');
const { authMiddleware, adminOnly } = require('../middlewares/authMiddleware');

router.get('/', blogController.getAll);
router.get('/months', blogController.getMonths);
router.get('/:id', blogController.getById);

router.post('/', authMiddleware, adminOnly, blogController.create);
router.put('/:id', authMiddleware, adminOnly, blogController.update);
router.delete('/:id', authMiddleware, adminOnly, blogController.delete);

router.post('/:id/blocks', authMiddleware, adminOnly, blogController.addBlock);
router.put('/:id/blocks/reorder', authMiddleware, adminOnly, blogController.reorderBlocks);
router.put('/:id/blocks/:blockId', authMiddleware, adminOnly, blogController.updateBlock);
router.delete('/:id/blocks/:blockId', authMiddleware, adminOnly, blogController.deleteBlock);

module.exports = router;
