const prisma = require('../config/db');

// GET /api/users          → list all users (except self)
const getUsers = async (req, res) => {
  const users = await prisma.user.findMany({
    where: { id: { not: req.user.id } },
    select: { id: true, username: true, avatar: true, isOnline: true,
               lastSeen: true, preferredLang: true },
    orderBy: { username: 'asc' },
  });
  res.json(users);
};

// PATCH /api/users/preferences   → update preferredLang or avatar
const updatePreferences = async (req, res) => {
  const { preferredLang, avatar } = req.body;
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { ...(preferredLang && { preferredLang }), ...(avatar && { avatar }) },
  });
  const { password, ...rest } = user;
  res.json(rest);
};

// GET /api/users/search?q=username
const searchUsers = async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json([]);

  const users = await prisma.user.findMany({
    where: {
      AND: [
        { id: { not: req.user.id } },
        { username: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: { id: true, username: true, avatar: true, isOnline: true, preferredLang: true },
  });
  res.json(users);
};

module.exports = { getUsers, updatePreferences, searchUsers };
