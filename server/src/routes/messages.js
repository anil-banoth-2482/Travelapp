const express = require('express');
const auth = require('../middleware/auth');
const Message = require('../models/Message');
const User = require('../models/User');

const router = express.Router();

const convKey = (a, b) => [a, b].sort().join('::');

router.get('/conversations', auth, async (req, res) => {
  const user = await User.findById(req.user.userId).lean();
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const all = await Message.find({ $or: [{ fromUserId: user._id }, { toUserId: user._id }] }).lean();
  const map = {};
  all.forEach((m) => {
    const key = m.conversationKey;
    if (!map[key] || new Date(m.createdAt) > new Date(map[key].lastMsg.createdAt)) {
      const otherUser = String(m.fromUserId) === String(user._id) ? m.toUsername : m.fromUsername;
      map[key] = { key, otherUser, lastMsg: m };
    }
  });
  const conversations = Object.values(map).sort((a, b) => new Date(b.lastMsg.createdAt) - new Date(a.lastMsg.createdAt));
  res.json({ conversations });
});

router.get('/unread', auth, async (req, res) => {
  const user = await User.findById(req.user.userId).lean();
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const unread = await Message.find({ toUserId: user._id, readAt: null }).lean();
  const byFrom = {};
  unread.forEach((m) => {
    if (!byFrom[m.fromUsername]) byFrom[m.fromUsername] = { count: 0, latest: null };
    byFrom[m.fromUsername].count += 1;
    if (!byFrom[m.fromUsername].latest || new Date(m.createdAt) > new Date(byFrom[m.fromUsername].latest.createdAt)) {
      byFrom[m.fromUsername].latest = m;
    }
  });
  const summary = Object.entries(byFrom).map(([fromUser, data]) => ({
    fromUser,
    count: data.count,
    lastMsg: data.latest,
  })).sort((a, b) => new Date(b.lastMsg.createdAt) - new Date(a.lastMsg.createdAt));

  res.json({ unread: summary, total: unread.length });
});

router.get('/', auth, async (req, res) => {
  const otherUsername = String(req.query.other || '').trim().toLowerCase();
  if (!otherUsername) return res.status(400).json({ error: 'other is required' });

  const me = await User.findById(req.user.userId).lean();
  const other = await User.findOne({ username: otherUsername }).lean();
  if (!me || !other) return res.status(404).json({ error: 'User not found' });

  const key = convKey(me.username, other.username);
  const messages = await Message.find({ conversationKey: key }).sort({ createdAt: 1 }).lean();
  res.json({ messages });
});

router.post('/', auth, async (req, res) => {
  const { toUsername, text } = req.body || {};
  if (!toUsername || !text) return res.status(400).json({ error: 'toUsername and text are required' });

  const fromUser = await User.findById(req.user.userId).lean();
  const toUser = await User.findOne({ username: String(toUsername).trim().toLowerCase() }).lean();
  if (!fromUser || !toUser) return res.status(404).json({ error: 'User not found' });

  const message = await Message.create({
    conversationKey: convKey(fromUser.username, toUser.username),
    fromUserId: fromUser._id,
    toUserId: toUser._id,
    fromUsername: fromUser.username,
    toUsername: toUser.username,
    text: String(text).trim(),
  });

  res.status(201).json({ message });
});

router.post('/read', auth, async (req, res) => {
  const { fromUsername } = req.body || {};
  if (!fromUsername) return res.status(400).json({ error: 'fromUsername is required' });

  const user = await User.findById(req.user.userId).lean();
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const result = await Message.updateMany(
    { fromUsername: String(fromUsername).trim().toLowerCase(), toUserId: user._id, readAt: null },
    { $set: { readAt: new Date() } }
  );

  res.json({ marked: result.modifiedCount || 0 });
});

module.exports = router;
