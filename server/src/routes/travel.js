const express = require('express');
const auth = require('../middleware/auth');
const Post = require('../models/Post');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  const state = String(req.query.state || '').trim();
  const sort = String(req.query.sort || 'latest');
  const limit = Math.min(Number(req.query.limit || 20), 50);

  const query = state ? { state } : {};
  const sortQuery = sort === 'score'
    ? { tourismScore: -1, createdAt: -1 }
    : { createdAt: -1 };

  const posts = await Post.find(query).sort(sortQuery).limit(limit).lean();
  res.json({ posts });
});

module.exports = router;
