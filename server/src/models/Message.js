const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationKey: { type: String, required: true, index: true },
  fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  toUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fromUsername: { type: String, required: true },
  toUsername: { type: String, required: true },
  text: { type: String, required: true },
  readAt: { type: Date, default: null },
}, { timestamps: true });

messageSchema.index({ conversationKey: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
