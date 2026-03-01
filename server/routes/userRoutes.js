const express = require('express');
const router = express.Router();
const { getUsers, updatePreferences, searchUsers } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.get('/search', protect, searchUsers);   // Must be before any /:id route
router.get('/', protect, getUsers);
router.patch('/preferences', protect, updatePreferences);

module.exports = router;
