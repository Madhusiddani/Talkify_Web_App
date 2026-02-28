const prisma = require('../config/db');

const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.json({ users: [] });
    }

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: req.user.id } },
          { username: { contains: q.trim(), mode: 'insensitive' } },
        ],
      },
      select: {
        id: true, username: true, avatar: true,
        isOnline: true, preferredLanguage: true,
      },
      take: 10,
    });

    res.json({ users });
  } catch (err) {
    console.error('searchUsers error:', err);
    res.status(500).json({ message: 'Search failed' });
  }
};

module.exports = { searchUsers };
