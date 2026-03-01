const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);

// PATCH /api/auth/language  (client calls this for preferred language update)
router.patch('/language', protect, async (req, res) => {
  const { preferredLanguage } = req.body;
  const prisma = require('../config/db');
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { preferredLang: preferredLanguage },
  });
  const { password, ...rest } = user;
  res.json({ user: rest });
});

module.exports = router;
