const express = require('express');
const auth = require('../middleware/auth');
const Post = require('../models/Post');
const User = require('../models/User');
const Follow = require('../models/Follow');
const { scoreTourism } = require('../services/openai');

const router = express.Router();

const fallbackScore = (description, state) => {
  const keywords = ['trip', 'travel', 'vacation', 'tour', 'explore', 'beautiful', 'scenery', 'temple', 'mountains', 'beach', 'journey', 'nature', 'adventure', 'monument', 'historical', 'landscape', 'roadtrip', 'destination', 'tourist', 'sightseeing'];
  const text = String(description || '').toLowerCase();
  let score = 10;
  keywords.forEach(k => { if (text.includes(k)) score += 4; });
  if (state) score += 8;
  return Math.min(100, score);
};

router.get('/', auth, async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 20), 50);
  const cursor = req.query.cursor ? new Date(req.query.cursor) : null;
  const language = String(req.query.language || '').trim();
  const onlyFollowing = String(req.query.following || '') === '1';

  const query = {};
  if (cursor && !Number.isNaN(cursor.getTime())) {
    query.createdAt = { $lt: cursor };
  }

  if (language) {
    query.$or = [
      { language },
      { language: '' },
      { language: { $exists: false } },
    ];
  }

  if (onlyFollowing) {
    const following = await Follow.find({ followerId: req.user.userId }).select('followingId');
    const ids = following.map(f => f.followingId);
    query.userId = { $in: ids };
  }

  const posts = await Post.find(query).sort({ createdAt: -1 }).limit(limit + 1).lean();
  const hasMore = posts.length > limit;
  const items = hasMore ? posts.slice(0, limit) : posts;
  const nextCursor = items.length ? items[items.length - 1].createdAt.toISOString() : null;

  res.json({ posts: items, nextCursor, hasMore });
});

router.post('/', auth, async (req, res) => {
  const { description, imageUrl, state, language } = req.body || {};
  if (!description) return res.status(400).json({ error: 'description is required' });

  const user = await User.findById(req.user.userId);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  let tourismScore = null;
  try {
    tourismScore = await scoreTourism({ description, state });
  } catch {
    tourismScore = null;
  }
  if (tourismScore === null) {
    tourismScore = fallbackScore(description, state);
  }

  const post = await Post.create({
    userId: user._id,
    username: user.username,
    name: user.name,
    avatarUrl: user.avatarUrl,
    description: String(description).trim(),
    imageUrl: String(imageUrl || ''),
    state: String(state || ''),
    language: String(language || ''),
    tourismScore,
  });

  res.status(201).json({ post });
});

router.post('/:id/like', auth, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const userId = req.user.userId;
  const hasLiked = post.likes.some(id => String(id) === String(userId));
  if (hasLiked) {
    post.likes = post.likes.filter(id => String(id) !== String(userId));
  } else {
    post.likes.push(userId);
  }
  await post.save();

  res.json({ likes: post.likes.length, liked: !hasLiked });
});

router.post('/:id/comment', auth, async (req, res) => {
  const { text } = req.body || {};
  if (!text) return res.status(400).json({ error: 'text is required' });

  const user = await User.findById(req.user.userId);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  post.comments.push({
    userId: user._id,
    username: user.username,
    text: String(text).trim(),
  });
  await post.save();

  res.status(201).json({ comments: post.comments });
});

module.exports = router;
