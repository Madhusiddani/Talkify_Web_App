const prisma = require('../config/db');
const { detectLang, translateText } = require('../utils/translate');

// GET /api/messages/:userId   → conversation with a user, translated to caller's lang
const getMessages = async (req, res) => {
  const myId = req.user.id;
  const { userId } = req.params;
  const me = await prisma.user.findUnique({ where: { id: myId } });

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: myId, receiverId: userId },
        { senderId: userId, receiverId: myId },
      ],
    },
    include: { sender: { select: { id: true, username: true, avatar: true } },
               translations: true },
    orderBy: { createdAt: 'asc' },
  });

  // attach translated content for caller's preferred lang
  const result = await Promise.all(messages.map(async (msg) => {
    const targetLang = me.preferredLang || 'en';

    // If message is already in the target language, no translation needed
    if (msg.originalLang === targetLang) {
      return { ...msg, displayContent: msg.content };
    }

    try {
      // Check cache first
      let translation = msg.translations.find(t => t.lang === targetLang);

      if (!translation) {
        const translated = await translateText(msg.content, targetLang, msg.originalLang);

        // upsert prevents P2002 crash if two requests arrive simultaneously
        translation = await prisma.translation.upsert({
          where: { messageId_lang: { messageId: msg.id, lang: targetLang } },
          create: { messageId: msg.id, lang: targetLang, translated },
          update: { translated }, // update in case of a previously failed translation
        });
      }

      return { ...msg, displayContent: translation.translated };
    } catch (err) {
      console.error(`Failed to translate message ${msg.id}:`, err.message);
      // Graceful fallback: show original content, never crash the response
      return { ...msg, displayContent: msg.content };
    }
  }));

  res.json(result);
};

// POST /api/messages         → send a new message (REST fallback; primary path is socket)
const sendMessage = async (req, res) => {
  const { receiverId, content, roomId } = req.body;
  const originalLang = detectLang(content);

  const message = await prisma.message.create({
    data: { content, originalLang, senderId: req.user.id, receiverId, roomId },
    include: { sender: { select: { id: true, username: true, avatar: true } } },
  });

  res.status(201).json(message);
};

// GET /api/messages/conversations  → list all users this user has chatted with
const getConversations = async (req, res) => {
  const myId = req.user.id;
  const me = await prisma.user.findUnique({ where: { id: myId } });
  const targetLang = me.preferredLang || 'en';

  const sentTo = await prisma.message.findMany({
    where: { senderId: myId, receiverId: { not: null } },
    select: { receiverId: true },
    distinct: ['receiverId'],
  });
  const receivedFrom = await prisma.message.findMany({
    where: { receiverId: myId },
    select: { senderId: true },
    distinct: ['senderId'],
  });

  const partnerIds = [
    ...new Set([
      ...sentTo.map(m => m.receiverId),
      ...receivedFrom.map(m => m.senderId),
    ]),
  ];

  const conversations = await Promise.all(partnerIds.map(async (partnerId) => {
    const partner = await prisma.user.findUnique({
      where: { id: partnerId },
      select: { id: true, username: true, avatar: true, isOnline: true, preferredLang: true },
    });

    const lastMsg = await prisma.message.findFirst({
      where: {
        OR: [
          { senderId: myId, receiverId: partnerId },
          { senderId: partnerId, receiverId: myId },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: { translations: true },
    });

    let displayContent = lastMsg?.content || '';
    if (lastMsg && lastMsg.originalLang !== targetLang) {
      const cached = lastMsg.translations.find(t => t.lang === targetLang);
      if (cached) displayContent = cached.translated;
    }

    return {
      id: partnerId,
      partner,
      lastMessage: lastMsg ? { ...lastMsg, displayContent } : null,
    };
  }));

  conversations.sort((a, b) => {
    if (!a.lastMessage) return 1;
    if (!b.lastMessage) return -1;
    return new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt);
  });

  res.json(conversations);
};

// POST /api/messages/conversations/start  → start or retrieve conversation with a user
const startConversation = async (req, res) => {
  const { recipientId } = req.body;
  const partner = await prisma.user.findUnique({
    where: { id: recipientId },
    select: { id: true, username: true, avatar: true, isOnline: true },
  });
  if (!partner) return res.status(404).json({ error: 'User not found' });
  res.json({ conversationId: recipientId, partner });
};

module.exports = { getMessages, sendMessage, getConversations, startConversation };
