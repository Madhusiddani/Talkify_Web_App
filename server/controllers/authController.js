const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

const publicUserSelect = {
  id: true, username: true, email: true,
  preferredLanguage: true, avatar: true,
  isOnline: true, lastSeen: true, createdAt: true,
};

const VALID_LANGUAGES = ['en', 'hi', 'te', 'ta', 'bn', 'gu', 'kn', 'ml', 'mr', 'pa', 'ur'];

const register = async (req, res) => {
  try {
    const { username, email, password, preferredLanguage } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email and password are required' });
    }
    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ message: 'Username must be 3–20 characters' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: email.toLowerCase() }, { username }] },
      select: { email: true, username: true },
    });

    if (existing) {
      return res.status(400).json({
        message: existing.email === email.toLowerCase()
          ? 'Email already registered'
          : 'Username already taken',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        username,
        email: email.toLowerCase(),
        password: hashedPassword,
        preferredLanguage: VALID_LANGUAGES.includes(preferredLanguage) ? preferredLanguage : 'en',
      },
      select: publicUserSelect,
    });

    res.status(201).json({ user, token: generateToken(user.id) });
  } catch (err) {
    console.error('register error:', err);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const { password: _, ...publicUser } = user;
    res.json({ user: publicUser, token: generateToken(user.id) });
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
};

const getMe = async (req, res) => {
  res.json({ user: req.user });
};

const updateLanguage = async (req, res) => {
  try {
    const { preferredLanguage } = req.body;

    if (!VALID_LANGUAGES.includes(preferredLanguage)) {
      return res.status(400).json({ message: 'Invalid language code' });
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { preferredLanguage },
      select: publicUserSelect,
    });

    res.json({ user });
  } catch (err) {
    console.error('updateLanguage error:', err);
    res.status(500).json({ message: 'Failed to update language preference' });
  }
};

module.exports = { register, login, getMe, updateLanguage };
