const express = require('express');
const router = express.Router();
const { getMessages, sendMessage, getConversations, startConversation } = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');

router.get('/conversations', protect, getConversations);        // Must be BEFORE /:userId
router.post('/conversations/start', protect, startConversation);
router.get('/:userId', protect, getMessages);
router.post('/', protect, sendMessage);

module.exports = router;
