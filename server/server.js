require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const messageRoutes = require('./routes/messageRoutes');
const userRoutes = require('./routes/userRoutes');
const socketHandler = require('./socket/socketHandler');
const prisma = require('./config/db');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);
app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', timestamp: new Date(), db: 'neon-postgres' })
);

socketHandler(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Talkify server running on port ${PORT}`);
  console.log(`📦 Database: Neon PostgreSQL via Prisma`);
  console.log(`🌐 Translation: LibreTranslate at ${process.env.LIBRETRANSLATE_URL}`);
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
