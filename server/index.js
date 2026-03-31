const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const http = require('http');
const { URL } = require('url');
const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const PORT = Number(process.env.PORT || 4000);
const APP_TOKEN = process.env.APP_TOKEN || 'local-dev-token';

const DATA_DIR = path.join(__dirname, 'data');
const POSTS_FILE = path.join(DATA_DIR, 'posts.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
const MEDIA_DIR = path.join(DATA_DIR, 'media');

const ALLOWED_ORIGINS = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

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
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
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

ensureDataFiles();

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
      const fileName = pathname.replace('/media/', '');
      const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '');
      const filePath = path.join(MEDIA_DIR, safeName);
      if (!safeName || !fs.existsSync(filePath)) {
        sendJson(res, 404, { error: 'Not found' });
        return;
      }

      const ext = path.extname(safeName).toLowerCase();
      const contentType =
        ext === '.png' ? 'image/png'
          : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
            : ext === '.webp' ? 'image/webp'
              : ext === '.gif' ? 'image/gif'
                : ext === '.mp4' ? 'video/mp4'
                  : ext === '.webm' ? 'video/webm'
                    : 'application/octet-stream';

      res.writeHead(200, { 'Content-Type': contentType });
      fs.createReadStream(filePath).pipe(res);
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
       MESSAGES API
       GET  /api/messages?user=alice&other=bob   → conversation thread
       GET  /api/messages/unread?user=alice       → unread summary for alice
       POST /api/messages                         → send a message
    ═══════════════════════════════════════════════════════ */

    if (req.method === 'GET' && pathname === '/api/messages') {
      const userA = url.searchParams.get('user') || '';
      const userB = url.searchParams.get('other') || '';
      if (!userA || !userB) {
        sendJson(res, 400, { error: 'user and other query params required' });
        return;
      }
      const allMsgs = readJson(MESSAGES_FILE);
      const key = convKey(userA, userB);
      const thread = allMsgs
        .filter(m => m.convKey === key)
        .sort((a, b) => a.ts - b.ts);
      sendJson(res, 200, { messages: thread });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/messages/conversations') {
      const user = url.searchParams.get('user') || '';
      if (!user) {
        sendJson(res, 400, { error: 'user query param required' });
        return;
      }
      const allMsgs = readJson(MESSAGES_FILE);
      // Group by convKey for this user, pick last message per conversation
      const convMap = {};
      allMsgs.forEach(msg => {
        if (msg.from !== user && msg.to !== user) return;
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
      const user = url.searchParams.get('user') || '';
      if (!user) {
        sendJson(res, 400, { error: 'user query param required' });
        return;
      }
      const allMsgs = readJson(MESSAGES_FILE);
      // Find unread messages addressed to this user
      const unreadMsgs = allMsgs.filter(m => m.to === user && !m.readAt);
      // Group by sender
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
      const body = await readBodyJson(req);
      const from = String(body.from || '').trim();
      const to   = String(body.to   || '').trim();
      const text = String(body.text || '').trim();
      if (!from || !to || !text) {
        sendJson(res, 400, { error: 'from, to, and text are required' });
        return;
      }
      const allMsgs = readJson(MESSAGES_FILE);
      const newMsg = {
        id:      `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        convKey: convKey(from, to),
        from,
        to,
        text,
        ts:     Date.now(),
        readAt: null,
      };
      allMsgs.push(newMsg);
      writeJson(MESSAGES_FILE, allMsgs);
      sendJson(res, 201, { message: newMsg });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/messages/read') {
      // Mark all messages from `from` to `to` as read
      const body = await readBodyJson(req);
      const byUser = String(body.byUser || '').trim();
      const fromUser = String(body.fromUser || '').trim();
      if (!byUser || !fromUser) {
        sendJson(res, 400, { error: 'byUser and fromUser are required' });
        return;
      }
      const allMsgs = readJson(MESSAGES_FILE);
      let changed = 0;
      allMsgs.forEach(m => {
        if (m.from === fromUser && m.to === byUser && !m.readAt) {
          m.readAt = Date.now();
          changed++;
        }
      });
      writeJson(MESSAGES_FILE, allMsgs);
      sendJson(res, 200, { marked: changed });
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
      const body = await readBodyJson(req);
      const mime = String(body.mime || '');
      const dataUrl = String(body.dataUrl || '');
      const ext = extFromMime(mime);
      if (!ext) { sendJson(res, 400, { error: 'Unsupported media type' }); return; }
      if (!dataUrl.startsWith('data:') || !dataUrl.includes(',')) { sendJson(res, 400, { error: 'Invalid dataUrl' }); return; }
      const base64 = dataUrl.split(',')[1];
      const buffer = Buffer.from(base64, 'base64');
      if (buffer.length === 0) { sendJson(res, 400, { error: 'Empty media' }); return; }
      const fileName = `${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;
      const filePath = path.join(MEDIA_DIR, fileName);
      fs.writeFileSync(filePath, buffer);
      sendJson(res, 201, { url: `/media/${fileName}` });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/posts') {
      const posts = readJson(POSTS_FILE);
      posts.sort((a, b) => createdAtMs(b) - createdAtMs(a));
      sendJson(res, 200, { posts });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/posts') {
      const body = await readBodyJson(req);
      const description = String(body.description || '').trim();
      const mediaType = body.mediaType === 'image' || body.mediaType === 'video' ? body.mediaType : null;
      const mediaUrl = typeof body.mediaUrl === 'string' ? body.mediaUrl : null;
      const lang = Array.isArray(body.lang) ? body.lang : [];
      const author = body && typeof body.author === 'object' && body.author !== null ? body.author : null;
      const authorProfileName = author && typeof author.profileName === 'string' ? author.profileName.trim() : '';
      const authorFirstName = author && typeof author.firstName === 'string' ? author.firstName.trim() : '';
      const authorLastName = author && typeof author.lastName === 'string' ? author.lastName.trim() : '';
      const authorProfilePic = author && typeof author.profilePic === 'string' ? author.profilePic : '';

      if (!description) { sendJson(res, 400, { error: 'Description is required' }); return; }
      if (mediaType && !mediaUrl) { sendJson(res, 400, { error: 'mediaUrl is required when mediaType is provided' }); return; }
      if (!authorProfileName) { sendJson(res, 400, { error: 'Author is required' }); return; }

      const posts = readJson(POSTS_FILE);
      const newPost = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        createdAt: new Date().toISOString(),
        description,
        media: mediaType ? { type: mediaType, url: mediaUrl } : null,
        lang,
        author: { profileName: authorProfileName, firstName: authorFirstName, lastName: authorLastName, profilePic: authorProfilePic },
      };
      posts.unshift(newPost);
      writeJson(POSTS_FILE, posts);
      sendJson(res, 201, { post: newPost });
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (err) {
    console.error('Server error:', err);
    sendJson(res, 500, { error: 'Server error' });
  }
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
  console.log(`Messages API: GET/POST http://localhost:${PORT}/api/messages`);
  console.log(`Posts API: GET/POST http://localhost:${PORT}/api/posts`);
});
