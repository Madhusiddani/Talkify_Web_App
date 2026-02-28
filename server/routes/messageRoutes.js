const express = require('express');
const router = express.Router();
const {
  getConversations,
  getMessages,
  startConversation,
} = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');

router.get('/conversations', protect, getConversations);
router.post('/conversations/start', protect, startConversation);
router.get('/conversations/:conversationId/messages', protect, getMessages);

module.exports = router;
