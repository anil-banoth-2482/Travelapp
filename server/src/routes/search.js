const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Post = require('../models/Post');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  const q = String(req.query.q || '').trim();
  const type = String(req.query.type || 'all');
  if (!q) return res.json({ users: [], posts: [] });

  const regex = new RegExp(q, 'i');
  const users = (type === 'all' || type === 'users')
    ? await User.find({ $or: [{ name: regex }, { username: regex }] }).limit(10).lean()
    : [];
  const posts = (type === 'all' || type === 'posts')
    ? await Post.find({ $or: [{ description: regex }, { state: regex }] }).limit(10).lean()
    : [];

  res.json({
    users: users.map(u => ({
      id: u._id,
      name: u.name,
      username: u.username,
      avatarUrl: u.avatarUrl,
      state: u.state,
    })),
    posts,
  });
});

module.exports = router;
