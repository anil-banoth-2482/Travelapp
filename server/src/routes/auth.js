const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || process.env.APP_TOKEN || 'dev-secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.APP_TOKEN || 'dev-secret';
const REFRESH_COOKIE = 'refresh_token';
const IS_PROD = process.env.NODE_ENV === 'production';

const createAccessToken = (user) =>
  jwt.sign({ userId: user._id, username: user.username }, ACCESS_SECRET, { expiresIn: '15m' });

const createRefreshToken = (user) =>
  jwt.sign({ userId: user._id }, REFRESH_SECRET, { expiresIn: '7d' });

const setRefreshCookie = (res, token) => {
  const parts = [
    `${REFRESH_COOKIE}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'Path=/',
    `Max-Age=${7 * 24 * 60 * 60}`,
  ];
  if (IS_PROD) {
    parts.push('Secure');
    parts.push('SameSite=None');
  } else {
    parts.push('SameSite=Lax');
  }
  res.setHeader('Set-Cookie', parts.join('; '));
};

const clearRefreshCookie = (res) => {
  const parts = [
    `${REFRESH_COOKIE}=`,
    'HttpOnly',
    'Path=/',
    'Max-Age=0',
  ];
  if (IS_PROD) {
    parts.push('Secure');
    parts.push('SameSite=None');
  } else {
    parts.push('SameSite=Lax');
  }
  res.setHeader('Set-Cookie', parts.join('; '));
};

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, state, preferredLanguage, username, profileName } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    const usernameSeed = username || profileName || normalizedEmail.split('@')[0];
    let normalizedUsername = String(usernameSeed || '').trim().toLowerCase();
    if (!normalizedUsername) normalizedUsername = `user_${Date.now()}`;
    let displayName = String(name || normalizedUsername).trim();
    if (!displayName) displayName = normalizedUsername;

    console.log('Register payload:', { email: normalizedEmail, username: normalizedUsername, name: displayName });

    const existing = await User.findOne({ $or: [{ email: normalizedEmail }, { username: normalizedUsername }] });
    if (existing) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    let user;
    try {
      user = await User.create({
        name: displayName,
        username: normalizedUsername,
        email: normalizedEmail,
        passwordHash,
        state: String(state || '').trim(),
        preferredLanguage: String(preferredLanguage || '').trim(),
      });
    } catch (err) {
      if (err?.name === 'ValidationError') {
        return res.status(400).json({ error: 'Invalid registration data' });
      }
      throw err;
    }

    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);
    user.refreshTokens.push(refreshToken);
    await user.save();
    setRefreshCookie(res, refreshToken);

    return res.status(201).json({
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        state: user.state,
        preferredLanguage: user.preferredLanguage,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        followersCount: user.followersCount,
        followingCount: user.followingCount,
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password, username } = req.body || {};
  const identifier = String(email || username || '').trim().toLowerCase();
  if (!identifier || !password) {
    return res.status(400).json({ error: 'identifier and password are required' });
  }

  const user = await User.findOne({ $or: [{ email: identifier }, { username: identifier }] });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  const accessToken = createAccessToken(user);
  const refreshToken = createRefreshToken(user);
  user.refreshTokens.push(refreshToken);
  await user.save();
  setRefreshCookie(res, refreshToken);

  return res.status(200).json({
    accessToken,
    user: {
      id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      state: user.state,
      preferredLanguage: user.preferredLanguage,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      followersCount: user.followersCount,
      followingCount: user.followingCount,
    },
  });
});

router.post('/refresh', async (req, res) => {
  const cookie = req.headers.cookie || '';
  const token = cookie.split(';').map(v => v.trim()).find(v => v.startsWith(`${REFRESH_COOKIE}=`));
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const refreshToken = decodeURIComponent(token.split('=')[1]);
  try {
    const payload = jwt.verify(refreshToken, REFRESH_SECRET);
    const user = await User.findById(payload.userId);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (!user.refreshTokens.includes(refreshToken)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const accessToken = createAccessToken(user);
    return res.json({ accessToken });
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
});

router.post('/logout', async (req, res) => {
  const cookie = req.headers.cookie || '';
  const tokenPair = cookie.split(';').map(v => v.trim()).find(v => v.startsWith(`${REFRESH_COOKIE}=`));
  if (tokenPair) {
    const refreshToken = decodeURIComponent(tokenPair.split('=')[1]);
    const payload = jwt.decode(refreshToken);
    if (payload?.userId) {
      await User.updateOne({ _id: payload.userId }, { $pull: { refreshTokens: refreshToken } });
    }
  }
  clearRefreshCookie(res);
  return res.json({ ok: true });
});

module.exports = router;
