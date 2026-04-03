const express = require('express');
const User = require('../models/User');
const Follow = require('../models/Follow');
const Post = require('../models/Post');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.user.userId).lean();
  if (!user) return res.status(404).json({ error: 'User not found' });
  const postsCount = await Post.countDocuments({ userId: user._id });
  return res.json({
    user: {
      id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      state: user.state,
      preferredLanguage: user.preferredLanguage,
      followersCount: user.followersCount,
      followingCount: user.followingCount,
      postsCount,
    },
  });
});

router.put('/me', auth, async (req, res) => {
  const { name, username, bio, avatarUrl, state, preferredLanguage } = req.body || {};
  if (username) {
    const existing = await User.findOne({ username: String(username).trim().toLowerCase(), _id: { $ne: req.user.userId } });
    if (existing) return res.status(409).json({ error: 'Username already taken' });
  }

  const user = await User.findByIdAndUpdate(
    req.user.userId,
    {
      ...(name ? { name: String(name).trim() } : {}),
      ...(username ? { username: String(username).trim().toLowerCase() } : {}),
      ...(bio !== undefined ? { bio: String(bio) } : {}),
      ...(avatarUrl !== undefined ? { avatarUrl: String(avatarUrl) } : {}),
      ...(state !== undefined ? { state: String(state) } : {}),
      ...(preferredLanguage !== undefined ? { preferredLanguage: String(preferredLanguage) } : {}),
    },
    { new: true }
  );

  if (!user) return res.status(404).json({ error: 'User not found' });

  await Post.updateMany(
    { userId: user._id },
    { $set: { username: user.username, avatarUrl: user.avatarUrl, name: user.name } }
  );

  const postsCount = await Post.countDocuments({ userId: user._id });

  return res.json({
    user: {
      id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      state: user.state,
      preferredLanguage: user.preferredLanguage,
      followersCount: user.followersCount,
      followingCount: user.followingCount,
      postsCount,
    },
  });
});

router.get('/:username', auth, async (req, res) => {
  const username = String(req.params.username).trim().toLowerCase();
  const user = await User.findOne({ username }).lean();
  if (!user) return res.status(404).json({ error: 'User not found' });
  const postsCount = await Post.countDocuments({ userId: user._id });
  const isFollowing = await Follow.exists({ followerId: req.user.userId, followingId: user._id });

  return res.json({
    user: {
      id: user._id,
      name: user.name,
      username: user.username,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      state: user.state,
      preferredLanguage: user.preferredLanguage,
      followersCount: user.followersCount,
      followingCount: user.followingCount,
      postsCount,
      isFollowing: !!isFollowing,
    },
  });
});

router.post('/:username/follow', auth, async (req, res) => {
  const username = String(req.params.username).trim().toLowerCase();
  const target = await User.findOne({ username });
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (String(target._id) === String(req.user.userId)) return res.status(400).json({ error: 'Cannot follow yourself' });

  const exists = await Follow.findOne({ followerId: req.user.userId, followingId: target._id });
  if (exists) return res.json({ ok: true });

  await Follow.create({ followerId: req.user.userId, followingId: target._id });
  await User.updateOne({ _id: req.user.userId }, { $inc: { followingCount: 1 } });
  await User.updateOne({ _id: target._id }, { $inc: { followersCount: 1 } });

  return res.json({ ok: true });
});

router.post('/:username/unfollow', auth, async (req, res) => {
  const username = String(req.params.username).trim().toLowerCase();
  const target = await User.findOne({ username });
  if (!target) return res.status(404).json({ error: 'User not found' });

  const result = await Follow.deleteOne({ followerId: req.user.userId, followingId: target._id });
  if (result.deletedCount > 0) {
    await User.updateOne({ _id: req.user.userId }, { $inc: { followingCount: -1 } });
    await User.updateOne({ _id: target._id }, { $inc: { followersCount: -1 } });
  }

  return res.json({ ok: true });
});

module.exports = router;
