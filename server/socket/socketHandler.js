const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const { detectLanguage } = require('../services/translationService');
const { formatMessageForUser } = require('../controllers/messageController');

const socketHandler = (io) => {

  // ─── Socket Auth Middleware ──────────────────────────────────────────────
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication error'));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, username: true, preferredLanguage: true, avatar: true },
      });
      if (!user) return next(new Error('User not found'));
      socket.user = user;
      next();
    } catch {
      next(new Error('Authentication error'));
    }
  });

  // ─── Connection ──────────────────────────────────────────────────────────
  io.on('connection', async (socket) => {
    const userId = socket.user.id;

    // Join personal room for targeted event delivery
    socket.join(userId);

    await prisma.user.update({
      where: { id: userId },
      data: { isOnline: true },
    });

    io.emit('user:status', { userId, isOnline: true });

    console.log(`✅ ${socket.user.username} connected (${socket.id})`);

    // ─── Send Message ────────────────────────────────────────────────────
    socket.on('message:send', async (data, callback) => {
      try {
        const { conversationId, text } = data;

        if (!text?.trim()) {
          return callback?.({ error: 'Message cannot be empty' });
        }

        // Confirm sender is a participant
        const senderParticipant = await prisma.conversationParticipant.findUnique({
          where: { conversationId_userId: { conversationId, userId } },
        });

        if (!senderParticipant) {
          return callback?.({ error: 'Conversation not found' });
        }

        const detectedLanguage = detectLanguage(text.trim());

        // Fetch all participants for unread tracking and delivery
        const allParticipants = await prisma.conversationParticipant.findMany({
          where: { conversationId },
          include: {
            user: { select: { id: true, preferredLanguage: true } },
          },
        });

        const otherParticipants = allParticipants.filter((p) => p.userId !== userId);

        // Atomic: create message + update conversation + increment unread counts
        const message = await prisma.$transaction(async (tx) => {
          const msg = await tx.message.create({
            data: {
              conversationId,
              senderId: userId,
              originalText: text.trim(),
              detectedLanguage,
              translations: [],
            },
            include: {
              sender: {
                select: { id: true, username: true, avatar: true, preferredLanguage: true },
              },
            },
          });

          await tx.conversation.update({
            where: { id: conversationId },
            data: { lastMessageId: msg.id, updatedAt: new Date() },
          });

          await Promise.all(
            otherParticipants.map((p) =>
              tx.conversationParticipant.update({
                where: { conversationId_userId: { conversationId, userId: p.userId } },
                data: { unreadCount: { increment: 1 } },
              })
            )
          );

          return msg;
        });

        // Deliver to each participant with their own language translation
        for (const p of allParticipants) {
          const formatted = await formatMessageForUser(
            message,
            p.userId,
            p.user.preferredLanguage
          );
          io.to(p.userId).emit('message:new', formatted);
        }

        callback?.({ success: true, messageId: message.id });
      } catch (err) {
        console.error('message:send error:', err);
        callback?.({ error: 'Failed to send message' });
      }
    });

    // ─── Typing Indicators ───────────────────────────────────────────────
    socket.on('typing:start', ({ conversationId, recipientId }) => {
      io.to(recipientId).emit('typing:start', {
        conversationId,
        userId,
        username: socket.user.username,
      });
    });

    socket.on('typing:stop', ({ conversationId, recipientId }) => {
      io.to(recipientId).emit('typing:stop', { conversationId, userId });
    });

    // ─── Read Receipts ───────────────────────────────────────────────────
    socket.on('message:read', async ({ conversationId, messageId, senderId }) => {
      try {
        await prisma.$transaction([
          prisma.message.update({
            where: { id: messageId },
            data: { status: 'READ' },
          }),
          prisma.conversationParticipant.update({
            where: { conversationId_userId: { conversationId, userId } },
            data: { unreadCount: 0 },
          }),
        ]);

        io.to(senderId).emit('message:read', { messageId, conversationId, readBy: userId });
      } catch (err) {
        console.error('message:read error:', err);
      }
    });

    // ─── Disconnect ──────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      const lastSeen = new Date();
      await prisma.user.update({
        where: { id: userId },
        data: { isOnline: false, lastSeen },
      });
      io.emit('user:status', { userId, isOnline: false, lastSeen });
      console.log(`❌ ${socket.user.username} disconnected`);
    });
  });
};

module.exports = socketHandler;
