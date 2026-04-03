const http = require('http');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const createApp = require('./app');
const { initSockets } = require('./socket');

const PORT = Number(process.env.PORT || 4000);
const MONGODB_URI = process.env.MONGODB_URI;

const start = async () => {
  if (!MONGODB_URI) {
    throw new Error('Missing MONGODB_URI');
  }

  await mongoose.connect(MONGODB_URI, {
    autoIndex: true,
    serverSelectionTimeoutMS: 10000,
  });

  console.log('MongoDB connected');

  const app = createApp();
  const server = http.createServer(app);
  initSockets(server);

  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});
