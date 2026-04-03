const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Message = require('./models/Message');

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || process.env.APP_TOKEN || 'dev-secret';

const convKey = (a, b) => [a, b].sort().join('::');

const initSockets = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        process.env.CLIENT_ORIGIN,
      ].filter(Boolean),
      credentials: true,
    },
  });

  const onlineUsers = new Map();

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Unauthorized'));
    try {
      const payload = jwt.verify(token, ACCESS_SECRET);
      socket.user = payload;
      return next();
    } catch {
      return next(new Error('Unauthorized'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user.userId;
    onlineUsers.set(userId, socket.id);
    io.emit('presence', { userId, status: 'online' });

    socket.on('send_message', async ({ toUsername, text }) => {
      if (!toUsername || !text) return;
      const fromUser = await User.findById(userId).lean();
      const toUser = await User.findOne({ username: String(toUsername).trim().toLowerCase() }).lean();
      if (!fromUser || !toUser) return;

      const message = await Message.create({
        conversationKey: convKey(fromUser.username, toUser.username),
        fromUserId: fromUser._id,
        toUserId: toUser._id,
        fromUsername: fromUser.username,
        toUsername: toUser.username,
        text: String(text).trim(),
      });

      const toSocketId = onlineUsers.get(String(toUser._id));
      if (toSocketId) {
        io.to(toSocketId).emit('new_message', message);
      }
      socket.emit('new_message', message);
    });

    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
      io.emit('presence', { userId, status: 'offline' });
    });
  });
};

module.exports = { initSockets };
