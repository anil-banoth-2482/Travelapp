const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true },
  name: { type: String, default: '' },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const postSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  username: { type: String, required: true },
  name: { type: String, default: '' },
  avatarUrl: { type: String, default: '' },
  description: { type: String, required: true },
  imageUrl: { type: String, default: '' },
  state: { type: String, default: '' },
  language: { type: String, default: '' },
  tourismScore: { type: Number, default: 0 },
  likes: { type: [mongoose.Schema.Types.ObjectId], default: [] },
  comments: { type: [commentSchema], default: [] },
}, { timestamps: true });

postSchema.index({ createdAt: -1 });
postSchema.index({ state: 1, createdAt: -1 });
postSchema.index({ tourismScore: -1 });

module.exports = mongoose.model('Post', postSchema);
