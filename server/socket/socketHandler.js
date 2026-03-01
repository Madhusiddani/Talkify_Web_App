const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const { detectLang, translateText } = require('../utils/translate');

// Map userId → socketId for direct delivery
const onlineUsers = new Map();

module.exports = (io) => {

  // Authenticate socket connection via token in handshake
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication error'));
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user.id;
    console.log(`🟢 Connected: ${socket.user.username} (${socket.id})`);

    // Register user as online
    onlineUsers.set(userId, socket.id);
    await prisma.user.update({ where: { id: userId }, data: { isOnline: true } });
    io.emit('user:status', { userId, isOnline: true });

    // ── SEND PRIVATE MESSAGE ──────────────────────────────────────────────
    socket.on('message:send', async ({ receiverId, content, roomId }) => {
      try {
        const originalLang = detectLang(content);

        // Persist message
        const message = await prisma.message.create({
          data: { content, originalLang, senderId: userId, receiverId, roomId },
          include: { sender: { select: { id: true, username: true, avatar: true } } },
        });

        // Deliver to sender (original)
        socket.emit('message:new', { ...message, displayContent: content, conversationId: receiverId });

        // Deliver to receiver translated into their preferred language
        if (receiverId) {
          const receiver = await prisma.user.findUnique({ where: { id: receiverId } });
          const targetLang = receiver?.preferredLang || 'en';

          let displayContent = content;
          if (targetLang !== originalLang) {
            try {
              displayContent = await translateText(content, targetLang, originalLang);

              // Cache using upsert to avoid P2002 race condition
              await prisma.translation.upsert({
                where: { messageId_lang: { messageId: message.id, lang: targetLang } },
                create: { messageId: message.id, lang: targetLang, translated: displayContent },
                update: { translated: displayContent },
              });
            } catch (err) {
              console.error(`Socket translation failed (${originalLang}→${targetLang}):`, err.message);
              displayContent = content; // fallback: deliver original
            }
          }

          const receiverSocketId = onlineUsers.get(receiverId);
          if (receiverSocketId) {
            io.to(receiverSocketId).emit('message:new', { ...message, displayContent, conversationId: userId });
          }
        }

        // Room broadcast
        if (roomId) {
          socket.to(roomId).emit('message:new', { ...message, displayContent: content });
        }

      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // ── TYPING INDICATORS ────────────────────────────────────────────────
    socket.on('typing:start', ({ receiverId }) => {
      const receiverSocket = onlineUsers.get(receiverId);
      if (receiverSocket) io.to(receiverSocket).emit('typing:start', { userId, conversationId: userId });
    });

    socket.on('typing:stop', ({ receiverId }) => {
      const receiverSocket = onlineUsers.get(receiverId);
      if (receiverSocket) io.to(receiverSocket).emit('typing:stop', { userId, conversationId: userId });
    });

    // ── JOIN ROOM ────────────────────────────────────────────────────────
    socket.on('room:join', (roomId) => {
      socket.join(roomId);
      socket.to(roomId).emit('room:user_joined', { userId, username: socket.user.username });
    });

    // ── DISCONNECT ───────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      console.log(`🔴 Disconnected: ${socket.user.username}`);
      onlineUsers.delete(userId);
      await prisma.user.update({
        where: { id: userId },
        data: { isOnline: false, lastSeen: new Date() },
      });
      io.emit('user:status', { userId, isOnline: false });
    });
  });
};
