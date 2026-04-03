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

  // Support comma-separated CLIENT_ORIGIN for multiple allowed origins
  const extraOrigins = (process.env.CLIENT_ORIGIN || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

  const allowedOrigins = new Set([
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    ...extraOrigins,
  ]);

  app.use(cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // server-to-server / curl
      if (allowedOrigins.has(origin)) return cb(null, true);
      // Allow any Vercel preview deployment automatically
      if (origin.endsWith('.vercel.app')) return cb(null, true);
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
