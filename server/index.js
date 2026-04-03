const fs = require('fs');
const path = require('path');
const os = require('os');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const http = require('http');
const { URL } = require('url');
const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const PORT = Number(process.env.PORT || 4000);
const APP_TOKEN = process.env.APP_TOKEN || 'local-dev-token';
const JWT_SECRET = process.env.JWT_SECRET || APP_TOKEN;
const MONGODB_URI = process.env.MONGODB_URI;
const AUTH_COOKIE = 'auth_token';
const IS_PROD = process.env.NODE_ENV === 'production';

let DATA_DIR = path.join(__dirname, 'data');
let POSTS_FILE = path.join(DATA_DIR, 'posts.json');
let MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
let MEDIA_DIR = path.join(DATA_DIR, 'media');

const ALLOWED_ORIGINS = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

const setDataPaths = (baseDir) => {
  DATA_DIR = baseDir;
  POSTS_FILE = path.join(DATA_DIR, 'posts.json');
  MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
  MEDIA_DIR = path.join(DATA_DIR, 'media');
};

const ensureDataFiles = () => {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(POSTS_FILE)) fs.writeFileSync(POSTS_FILE, JSON.stringify([]), 'utf8');
  if (!fs.existsSync(MESSAGES_FILE)) fs.writeFileSync(MESSAGES_FILE, JSON.stringify([]), 'utf8');
  if (!fs.existsSync(MEDIA_DIR)) fs.mkdirSync(MEDIA_DIR, { recursive: true });
};

const readJson = (filePath) => {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
};

const writeJson = (filePath, value) => {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
};

const readBodyJson = (req) =>
  new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 20_000_000) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        const parsed = data ? JSON.parse(data) : {};
        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });

const sendJson = (res, statusCode, obj) => {
  const body = JSON.stringify(obj);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
};

const addCors = (req, res) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-App-Token');
};

const requireAppToken = (req, res) => {
  const token = req.headers['x-app-token'];
  if (token !== APP_TOKEN) {
    sendJson(res, 401, { error: 'Unauthorized' });
    return false;
  }
  return true;
};

const parseCookies = (cookieHeader = '') =>
  cookieHeader
    .split(';')
    .map(v => v.trim())
    .filter(Boolean)
    .reduce((acc, pair) => {
      const idx = pair.indexOf('=');
      if (idx === -1) return acc;
      const key = pair.slice(0, idx).trim();
      const val = pair.slice(idx + 1).trim();
      acc[key] = decodeURIComponent(val);
      return acc;
    }, {});

const setAuthCookie = (res, token) => {
  const parts = [
    `${AUTH_COOKIE}=${encodeURIComponent(token)}`,
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

const clearAuthCookie = (res) => {
  const parts = [
    `${AUTH_COOKIE}=`,
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

const requireAuth = (req, res) => {
  const auth = req.headers.authorization || '';
  let token = '';
  if (auth.startsWith('Bearer ')) {
    token = auth.slice('Bearer '.length).trim();
  } else {
    const cookies = parseCookies(req.headers.cookie || '');
    token = cookies[AUTH_COOKIE] || '';
  }

  if (!token) {
    sendJson(res, 401, { error: 'Unauthorized' });
    return null;
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return payload;
  } catch {
    sendJson(res, 401, { error: 'Unauthorized' });
    return null;
  }
};

const extFromMime = (mime) => {
  const m = String(mime || '').toLowerCase();
  if (m === 'image/png') return 'png';
  if (m === 'image/jpeg') return 'jpg';
  if (m === 'image/webp') return 'webp';
  if (m === 'image/gif') return 'gif';
  if (m === 'video/mp4') return 'mp4';
  if (m === 'video/webm') return 'webm';
  return null;
};

const createdAtMs = (post) => {
  const v = post && post.createdAt;
  const ms = Date.parse(v);
  return Number.isFinite(ms) ? ms : 0;
};

/** Canonical conv key: always alphabetically sorted */
const convKey = (a, b) => [a, b].sort().join('::');

mongoose.set('strictQuery', true);

const userSchema = new mongoose.Schema({
    profileName: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },
    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' },
    profilePic: { type: String, default: '' },
    bio: { type: String, default: '' },
    nativeLanguage: { type: String, default: '' },
    state: { type: String, default: '' },
  }, { timestamps: true });

const postSchema = new mongoose.Schema({
    description: { type: String, required: true },
    media: {
      type: { type: String, enum: ['image', 'video', null], default: null },
      url: { type: String, default: '' },
    },
    lang: { type: [String], default: [] },
    location: {
      state: { type: String, default: '' },
      stateSlug: { type: String, default: '' },
    },
    author: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      profileName: { type: String, required: true },
      firstName: { type: String, default: '' },
      lastName: { type: String, default: '' },
      profilePic: { type: String, default: '' },
    },
  }, { timestamps: true });

const messageSchema = new mongoose.Schema({
    convKey: { type: String, required: true, index: true },
    from: { type: String, required: true },
    to: { type: String, required: true },
    text: { type: String, required: true },
    ts: { type: Number, required: true },
    readAt: { type: Number, default: null },
  }, { timestamps: true });

const mediaSchema = new mongoose.Schema({
    mime: { type: String, required: true },
    dataBase64: { type: String, required: true },
  }, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Post = mongoose.model('Post', postSchema);
const Message = mongoose.model('Message', messageSchema);
const Media = mongoose.model('Media', mediaSchema);

const toUserResponse = (user) => ({
  id: user._id,
  profileName: user.profileName,
  email: user.email,
  firstName: user.firstName || '',
  lastName: user.lastName || '',
  profilePic: user.profilePic || '',
  bio: user.bio || '',
  nativeLanguage: user.nativeLanguage || '',
  state: user.state || '',
});

try {
  ensureDataFiles();
} catch (err) {
  console.error('Primary data dir unavailable, falling back to temp dir:', err.message);
  setDataPaths(path.join(os.tmpdir(), 'social-data'));
  ensureDataFiles();
}

const connectDb = async () => {
  if (!MONGODB_URI) {
    throw new Error('Missing MONGODB_URI');
  }
  await mongoose.connect(MONGODB_URI, {
    autoIndex: true,
    serverSelectionTimeoutMS: 10000,
  });
};

const server = http.createServer(async (req, res) => {
  try {
    addCors(req, res);

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    if (req.method === 'GET' && pathname.startsWith('/media/')) {
      const id = pathname.replace('/media/', '').trim();
      if (!id) {
        sendJson(res, 404, { error: 'Not found' });
        return;
      }
      const media = await Media.findById(id).lean();
      if (!media) {
        sendJson(res, 404, { error: 'Not found' });
        return;
      }
      const buffer = Buffer.from(media.dataBase64, 'base64');
      res.writeHead(200, { 'Content-Type': media.mime });
      res.end(buffer);
      return;
    }

    if (req.method === 'GET' && pathname === '/') {
      sendJson(res, 200, {
        ok: true,
        message: 'Server is running',
        health: '/health',
        posts: '/api/posts',
        messages: '/api/messages',
        time: new Date().toISOString(),
      });
      return;
    }

    if (req.method === 'GET' && pathname === '/health') {
      sendJson(res, 200, { ok: true, service: 'social-server', time: new Date().toISOString() });
      return;
    }

    if (pathname.startsWith('/api/')) {
      const ok = requireAppToken(req, res);
      if (!ok) return;
    }

    /* ═══════════════════════════════════════════════════════
       AUTH API
       POST /api/auth/register
       POST /api/auth/login
       GET  /api/users/me
       PUT  /api/users/me
       GET  /api/users/:profileName
    ═══════════════════════════════════════════════════════ */

    if (req.method === 'POST' && pathname === '/api/auth/register') {
      const body = await readBodyJson(req);
      const profileName = String(body.profileName || '').trim().toLowerCase();
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      if (!profileName || !email || !password) {
        sendJson(res, 400, { error: 'profileName, email, and password are required' });
        return;
      }
      const existing = await User.findOne({ $or: [{ profileName }, { email }] }).lean();
      if (existing) {
        sendJson(res, 409, { error: 'User already exists' });
        return;
      }
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await User.create({
        profileName,
        email,
        passwordHash,
        firstName: String(body.firstName || '').trim(),
        lastName: String(body.lastName || '').trim(),
        profilePic: String(body.profilePic || ''),
        bio: String(body.bio || ''),
        nativeLanguage: String(body.nativeLanguage || ''),
        state: String(body.state || ''),
      });
      const token = jwt.sign({ userId: user._id, profileName: user.profileName }, JWT_SECRET, { expiresIn: '7d' });
      setAuthCookie(res, token);
      sendJson(res, 201, { token, user: toUserResponse(user) });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/auth/login') {
      const body = await readBodyJson(req);
      const identifier = String(body.identifier || body.email || body.profileName || '').trim().toLowerCase();
      const password = String(body.password || '');
      if (!identifier || !password) {
        sendJson(res, 400, { error: 'identifier and password are required' });
        return;
      }
      const user = await User.findOne({ $or: [{ email: identifier }, { profileName: identifier }] });
      if (!user) {
        sendJson(res, 401, { error: 'Invalid credentials' });
        return;
      }
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) {
        sendJson(res, 401, { error: 'Invalid credentials' });
        return;
      }
      const token = jwt.sign({ userId: user._id, profileName: user.profileName }, JWT_SECRET, { expiresIn: '7d' });
      setAuthCookie(res, token);
      sendJson(res, 200, { token, user: toUserResponse(user) });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/auth/logout') {
      clearAuthCookie(res);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/users/me') {
      const auth = requireAuth(req, res);
      if (!auth) return;
      const user = await User.findById(auth.userId);
      if (!user) { sendJson(res, 404, { error: 'User not found' }); return; }
      sendJson(res, 200, { user: toUserResponse(user) });
      return;
    }

    if (req.method === 'PUT' && pathname === '/api/users/me') {
      const auth = requireAuth(req, res);
      if (!auth) return;
      const existingUser = await User.findById(auth.userId).lean();
      if (!existingUser) { sendJson(res, 404, { error: 'User not found' }); return; }
      const body = await readBodyJson(req);
      const update = {
        firstName: String(body.firstName || '').trim(),
        lastName: String(body.lastName || '').trim(),
        bio: String(body.bio || ''),
        profilePic: String(body.profilePic || ''),
      };
      if (body.profileName) {
        update.profileName = String(body.profileName || '').trim().toLowerCase();
      }
      if (update.profileName) {
        const existing = await User.findOne({ profileName: update.profileName, _id: { $ne: auth.userId } }).lean();
        if (existing) { sendJson(res, 409, { error: 'Profile name already taken' }); return; }
      }
      const user = await User.findByIdAndUpdate(auth.userId, update, { new: true });
      if (!user) { sendJson(res, 404, { error: 'User not found' }); return; }

      // Keep post author info in sync
      await Post.updateMany(
        { 'author.id': user._id },
        {
          $set: {
            'author.profileName': user.profileName,
            'author.firstName': user.firstName || '',
            'author.lastName': user.lastName || '',
            'author.profilePic': user.profilePic || '',
          },
        }
      );

      // If profileName changed, update message usernames and convKey
      const oldName = existingUser.profileName;
      const newName = user.profileName;
      if (oldName && newName && oldName !== newName) {
        const msgs = await Message.find({ $or: [{ from: oldName }, { to: oldName }] });
        await Promise.all(
          msgs.map((m) => {
            const from = m.from === oldName ? newName : m.from;
            const to = m.to === oldName ? newName : m.to;
            m.from = from;
            m.to = to;
            m.convKey = convKey(from, to);
            return m.save();
          })
        );
      }
      sendJson(res, 200, { user: toUserResponse(user) });
      return;
    }

    if (req.method === 'GET' && pathname.startsWith('/api/users/')) {
      const profileName = pathname.replace('/api/users/', '').trim().toLowerCase();
      if (!profileName) { sendJson(res, 404, { error: 'User not found' }); return; }
      const user = await User.findOne({ profileName }).lean();
      if (!user) { sendJson(res, 404, { error: 'User not found' }); return; }
      sendJson(res, 200, { user: toUserResponse(user) });
      return;
    }

    /* ═══════════════════════════════════════════════════════
       MESSAGES API
       GET  /api/messages?user=alice&other=bob   → conversation thread
       GET  /api/messages/unread?user=alice       → unread summary for alice
       POST /api/messages                         → send a message
    ═══════════════════════════════════════════════════════ */

    if (req.method === 'GET' && pathname === '/api/messages') {
      const auth = requireAuth(req, res);
      if (!auth) return;
      const userA = url.searchParams.get('user') || '';
      const userB = url.searchParams.get('other') || '';
      if (!userA || !userB) {
        sendJson(res, 400, { error: 'user and other query params required' });
        return;
      }
      if (auth.profileName !== userA) {
        sendJson(res, 403, { error: 'Forbidden' });
        return;
      }
      const key = convKey(userA, userB);
      const thread = await Message.find({ convKey: key }).sort({ ts: 1 }).lean();
      sendJson(res, 200, { messages: thread });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/messages/conversations') {
      const auth = requireAuth(req, res);
      if (!auth) return;
      const user = url.searchParams.get('user') || '';
      if (!user) {
        sendJson(res, 400, { error: 'user query param required' });
        return;
      }
      if (auth.profileName !== user) {
        sendJson(res, 403, { error: 'Forbidden' });
        return;
      }
      const allMsgs = await Message.find({ $or: [{ from: user }, { to: user }] }).lean();
      const convMap = {};
      allMsgs.forEach(msg => {
        const key = msg.convKey;
        if (!convMap[key] || msg.ts > convMap[key].lastMsg.ts) {
          const other = msg.from === user ? msg.to : msg.from;
          convMap[key] = { key, otherUser: other, lastMsg: msg };
        }
      });
      const convs = Object.values(convMap).sort((a, b) => b.lastMsg.ts - a.lastMsg.ts);
      sendJson(res, 200, { conversations: convs });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/messages/unread') {
      const auth = requireAuth(req, res);
      if (!auth) return;
      const user = url.searchParams.get('user') || '';
      if (!user) {
        sendJson(res, 400, { error: 'user query param required' });
        return;
      }
      if (auth.profileName !== user) {
        sendJson(res, 403, { error: 'Forbidden' });
        return;
      }
      const unreadMsgs = await Message.find({ to: user, readAt: null }).lean();
      const byFrom = {};
      unreadMsgs.forEach(m => {
        if (!byFrom[m.from]) byFrom[m.from] = { count: 0, latest: null };
        byFrom[m.from].count++;
        if (!byFrom[m.from].latest || m.ts > byFrom[m.from].latest.ts) {
          byFrom[m.from].latest = m;
        }
      });
      const summary = Object.entries(byFrom).map(([fromUser, data]) => ({
        fromUser,
        count: data.count,
        lastMsg: data.latest,
      })).sort((a, b) => b.lastMsg.ts - a.lastMsg.ts);
      sendJson(res, 200, { unread: summary, total: unreadMsgs.length });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/messages') {
      const auth = requireAuth(req, res);
      if (!auth) return;
      const body = await readBodyJson(req);
      const from = String(body.from || '').trim();
      const to   = String(body.to   || '').trim();
      const text = String(body.text || '').trim();
      if (!from || !to || !text) {
        sendJson(res, 400, { error: 'from, to, and text are required' });
        return;
      }
      if (from !== auth.profileName) {
        sendJson(res, 403, { error: 'Forbidden' });
        return;
      }
      const newMsg = await Message.create({
        convKey: convKey(from, to),
        from,
        to,
        text,
        ts: Date.now(),
        readAt: null,
      });
      sendJson(res, 201, { message: newMsg });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/messages/read') {
      const auth = requireAuth(req, res);
      if (!auth) return;
      const body = await readBodyJson(req);
      const byUser = String(body.byUser || '').trim();
      const fromUser = String(body.fromUser || '').trim();
      if (!byUser || !fromUser) {
        sendJson(res, 400, { error: 'byUser and fromUser are required' });
        return;
      }
      if (byUser !== auth.profileName) {
        sendJson(res, 403, { error: 'Forbidden' });
        return;
      }
      const result = await Message.updateMany(
        { from: fromUser, to: byUser, readAt: null },
        { $set: { readAt: Date.now() } }
      );
      sendJson(res, 200, { marked: result.modifiedCount || 0 });
      return;
    }

    /* ═══════════════════════════════════════════════════════
       EXISTING ROUTES
    ═══════════════════════════════════════════════════════ */

    if (req.method === 'POST' && pathname === '/api/geocode/reverse') {
      const body = await readBodyJson(req);
      const states = [
        { state: 'Maharashtra', stateSlug: 'maharashtra' },
        { state: 'Karnataka', stateSlug: 'karnataka' },
        { state: 'Tamil Nadu', stateSlug: 'tamil-nadu' },
        { state: 'Delhi', stateSlug: 'delhi' },
        { state: 'West Bengal', stateSlug: 'west-bengal' },
        { state: 'Telangana', stateSlug: 'telangana' },
        { state: 'Rajasthan', stateSlug: 'rajasthan' },
      ];
      const randomState = states[Math.floor(Math.random() * states.length)];
      sendJson(res, 200, randomState);
      return;
    }

    if (req.method === 'POST' && pathname === '/api/ai/score-posts') {
      const body = await readBodyJson(req);
      const postsToScore = body.posts || [];
      if (postsToScore.length === 0) {
        sendJson(res, 200, { scores: [] });
        return;
      }
      try {
        const prompt = `Score the following social media posts based on how well they resemble a "travel experience", "tourism", or "tourist destination" in India. 
        For each post, provide a score from 1 to 10 (10 being highly relevant travel content, 1 being not relevant at all).
        Consider keywords, location tags, and overall context.
        Return only a JSON array of numbers representing the scores in the same order as the input posts.
        
        Posts:
        ${postsToScore.map((p, i) => `${i + 1}. [Location Tag: ${p.hasLocation ? 'Yes' : 'No'}] ${p.description}`).join('\n')}`;

        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You are an AI that scores social media posts for travel and tourism relevance. Output only a JSON array of numbers." },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" }
        });

        const content = response.choices[0].message.content;
        const parsed = JSON.parse(content);
        let scores = [];
        if (Array.isArray(parsed)) {
          scores = parsed;
        } else if (parsed.scores && Array.isArray(parsed.scores)) {
          scores = parsed.scores;
        } else {
          scores = Object.values(parsed).filter(v => typeof v === 'number');
        }
        sendJson(res, 200, { scores });
      } catch (err) {
        console.error('OpenAI API error:', err);
        const travelKeywords = ['trip', 'visit', 'travel', 'vacation', 'tour', 'explore', 'beautiful', 'scenery', 'temple', 'mountains', 'beach', 'journey', 'nature', 'adventure', 'monument', 'historical', 'landscape', 'roadtrip', 'destination', 'tourist', 'sightseeing'];
        const scores = postsToScore.map((p) => {
          const desc = String(p.description || '').toLowerCase();
          let score = Math.floor(Math.random() * 3) + 1;
          const matchCount = travelKeywords.filter(k => desc.includes(k)).length;
          score += Math.min(matchCount * 2, 4);
          if (p.hasLocation) score += 3;
          return Math.min(Math.round(score), 10);
        });
        sendJson(res, 200, { scores });
      }
      return;
    }

    if (req.method === 'POST' && pathname === '/api/media') {
      const auth = requireAuth(req, res);
      if (!auth) return;
      const body = await readBodyJson(req);
      const mime = String(body.mime || '');
      const dataUrl = String(body.dataUrl || '');
      const ext = extFromMime(mime);
      if (!ext) { sendJson(res, 400, { error: 'Unsupported media type' }); return; }
      if (!dataUrl.startsWith('data:') || !dataUrl.includes(',')) { sendJson(res, 400, { error: 'Invalid dataUrl' }); return; }
      const base64 = dataUrl.split(',')[1];
      if (!base64) { sendJson(res, 400, { error: 'Empty media' }); return; }
      const media = await Media.create({ mime, dataBase64: base64 });
      sendJson(res, 201, { url: `/media/${media._id}` });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/posts') {
      const posts = await Post.find().sort({ createdAt: -1 }).lean();
      sendJson(res, 200, { posts });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/posts') {
      const auth = requireAuth(req, res);
      if (!auth) return;
      const body = await readBodyJson(req);
      const description = String(body.description || '').trim();
      const mediaType = body.mediaType === 'image' || body.mediaType === 'video' ? body.mediaType : null;
      const mediaUrl = typeof body.mediaUrl === 'string' ? body.mediaUrl : '';
      const lang = Array.isArray(body.lang) ? body.lang : [];
      const location = body && typeof body.location === 'object' && body.location !== null ? body.location : null;

      if (!description) { sendJson(res, 400, { error: 'Description is required' }); return; }
      if (mediaType && !mediaUrl) { sendJson(res, 400, { error: 'mediaUrl is required when mediaType is provided' }); return; }

      const user = await User.findById(auth.userId);
      if (!user) { sendJson(res, 401, { error: 'Unauthorized' }); return; }

      const newPost = await Post.create({
        description,
        media: mediaType ? { type: mediaType, url: mediaUrl } : null,
        lang,
        location: location ? { state: location.state || '', stateSlug: location.stateSlug || '' } : { state: '', stateSlug: '' },
        author: {
          id: user._id,
          profileName: user.profileName,
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          profilePic: user.profilePic || '',
        },
      });
      sendJson(res, 201, { post: newPost });
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (err) {
    console.error('Server error:', err);
    sendJson(res, 500, { error: 'Server error' });
  }
});

connectDb()
  .then(() => {
    console.log('MongoDB connected');
    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Health: http://localhost:${PORT}/health`);
      console.log(`Messages API: GET/POST http://localhost:${PORT}/api/messages`);
      console.log(`Posts API: GET/POST http://localhost:${PORT}/api/posts`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  });
