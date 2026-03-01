require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { Server } = require('socket.io');
const prisma = require('./config/db');

// routes
const authRoutes = require('./routes/authRoutes');
const messageRoutes = require('./routes/messageRoutes');
const userRoutes = require('./routes/userRoutes');

// socket
const socketHandler = require('./socket/socketHandler');

const app = express();

prisma.$connect()
  .then(() => console.log('✅ Database Connected via Prisma'))
  .catch((err) => { console.error('❌ Database connection failed:', err.message); process.exit(1); });


app.use(helmet());

app.use(morgan('dev'));

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, curl) and any localhost
      if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json());



app.use('/api/auth', authRoutes);

app.use('/api/messages', messageRoutes);

app.use('/api/users', userRoutes);

app.get('/api/health', (req, res) => {

  res.status(200).json({
    status: 'ok',
    server: 'Talkify Backend Running',
  });

});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  },
});

socketHandler(io);

app.use((err, req, res, next) => {

  console.error(err.stack);

  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });

});
const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {

  console.log(`🚀 Talkify Server running on port ${PORT}`);

});


process.on('uncaughtException', (err) => {

  console.error('Uncaught Exception:', err.message);

});

process.on('unhandledRejection', (err) => {

  console.error('Unhandled Rejection:', err.message);

});