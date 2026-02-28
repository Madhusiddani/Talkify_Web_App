const prisma = require('../config/db');
const { getOrTranslate } = require('../services/translationService');

// Reusable include shape for participants + their user data
const participantInclude = {
  participants: {
    include: {
      user: {
        select: {
          id: true, username: true, avatar: true,
          isOnline: true, lastSeen: true, preferredLanguage: true,
        },
      },
    },
  },
};

/**
 * Format a Prisma message record for a specific recipient.
 * Applies translation if needed and writes the cache back (fire-and-forget).
 */
const formatMessageForUser = async (message, recipientId, recipientLang) => {
  const { text, isTranslated, updatedCache } = await getOrTranslate(
    message.originalText,
    message.detectedLanguage,
    message.translations,
    recipientLang
  );

  // Persist new translation to JSONB cache — don't block the response
  if (updatedCache) {
    prisma.message
      .update({ where: { id: message.id }, data: { translations: updatedCache } })
      .catch((err) => console.error('Translation cache update failed:', err));
  }

  return {
    id: message.id,
    conversationId: message.conversationId,
    sender: message.sender,
    originalText: message.originalText,
    displayText: text,
    isTranslated,
    detectedLanguage: message.detectedLanguage,
    status: message.status,
    type: message.type,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  };
};

// GET /api/messages/conversations
const getConversations = async (req, res) => {
  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        participants: { some: { userId: req.user.id } },
      },
      include: {
        ...participantInclude,
        lastMessage: {
          include: {
            sender: { select: { id: true, username: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const formatted = await Promise.all(
      conversations.map(async (conv) => {
        const myParticipant = conv.participants.find((p) => p.userId === req.user.id);

        let lastMessageFormatted = null;
        if (conv.lastMessage) {
          lastMessageFormatted = await formatMessageForUser(
            conv.lastMessage,
            req.user.id,
            req.user.preferredLanguage
          );
        }

        return {
          id: conv.id,
          participants: conv.participants.map((p) => p.user),
          lastMessage: lastMessageFormatted,
          unreadCount: myParticipant?.unreadCount || 0,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
        };
      })
    );

    res.json({ conversations: formatted });
  } catch (err) {
    console.error('getConversations error:', err);
    res.status(500).json({ message: 'Failed to fetch conversations' });
  }
};

// GET /api/messages/conversations/:conversationId/messages?page=1&limit=40
const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 40, 100);

    // Verify current user is a participant
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: { conversationId, userId: req.user.id },
      },
    });

    if (!participant) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { conversationId },
        include: {
          sender: {
            select: { id: true, username: true, avatar: true, preferredLanguage: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.message.count({ where: { conversationId } }),
    ]);

    // Reverse to chronological (oldest first) then format for this user
    const formatted = await Promise.all(
      messages.reverse().map((msg) =>
        formatMessageForUser(msg, req.user.id, req.user.preferredLanguage)
      )
    );

    // Reset this user's unread count for this conversation
    await prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId: req.user.id } },
      data: { unreadCount: 0 },
    });

    res.json({ messages: formatted, page, totalPages: Math.ceil(total / limit), total });
  } catch (err) {
    console.error('getMessages error:', err);
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
};

// POST /api/messages/conversations/start
const startConversation = async (req, res) => {
  try {
    const { recipientId } = req.body;

    if (!recipientId) {
      return res.status(400).json({ message: 'recipientId is required' });
    }
    if (recipientId === req.user.id) {
      return res.status(400).json({ message: 'Cannot start a conversation with yourself' });
    }

    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      select: { id: true, username: true, avatar: true, isOnline: true, preferredLanguage: true },
    });

    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' });
    }

    // Find an existing DM between exactly these two users
    const existing = await prisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { userId: req.user.id } } },
          { participants: { some: { userId: recipientId } } },
          {
            participants: {
              every: { userId: { in: [req.user.id, recipientId] } },
            },
          },
        ],
      },
      include: { ...participantInclude, lastMessage: true },
    });

    if (existing) {
      const myParticipant = existing.participants.find((p) => p.userId === req.user.id);
      return res.json({
        conversation: {
          id: existing.id,
          participants: existing.participants.map((p) => p.user),
          lastMessage: existing.lastMessage,
          unreadCount: myParticipant?.unreadCount || 0,
          createdAt: existing.createdAt,
          updatedAt: existing.updatedAt,
        },
      });
    }

    // Create new conversation + both participants in a single transaction
    const conversation = await prisma.$transaction(async (tx) => {
      const conv = await tx.conversation.create({ data: {} });

      await tx.conversationParticipant.createMany({
        data: [
          { conversationId: conv.id, userId: req.user.id },
          { conversationId: conv.id, userId: recipientId },
        ],
      });

      return tx.conversation.findUnique({
        where: { id: conv.id },
        include: participantInclude,
      });
    });

    res.status(201).json({
      conversation: {
        id: conversation.id,
        participants: conversation.participants.map((p) => p.user),
        lastMessage: null,
        unreadCount: 0,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      },
    });
  } catch (err) {
    console.error('startConversation error:', err);
    res.status(500).json({ message: 'Failed to start conversation' });
  }
};

module.exports = { getConversations, getMessages, startConversation, formatMessageForUser };
