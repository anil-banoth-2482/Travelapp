const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const messageRoutes = require('./routes/messages');
const travelRoutes = require('./routes/travel');
const searchRoutes = require('./routes/search');

const createApp = () => {
  const app = express();

  const allowedOrigins = new Set([
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    process.env.CLIENT_ORIGIN,
  ].filter(Boolean));

  app.use(cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.has(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
  }));

  app.use(express.json({ limit: '20mb' }));
  app.use(cookieParser());

  app.get('/', (req, res) => {
    res.json({ ok: true, message: 'API running' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/posts', postRoutes);
  app.use('/api/messages', messageRoutes);
  app.use('/api/travel', travelRoutes);
  app.use('/api/search', searchRoutes);

  app.use((err, req, res, next) => {
    console.error('API error:', err);
    res.status(500).json({ error: 'Server error' });
  });

  return app;
};

module.exports = createApp;
