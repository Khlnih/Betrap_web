const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { authMiddleware } = require('../middlewares/authMiddleware');

router.get('/conversations', authMiddleware, messageController.getConversations);
router.post('/conversations', authMiddleware, messageController.createConversation);
router.get('/:convId', authMiddleware, messageController.getMessages);
router.post('/', authMiddleware, messageController.sendMessage);

module.exports = router;
