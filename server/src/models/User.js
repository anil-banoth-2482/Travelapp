const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  state: { type: String, default: '' },
  preferredLanguage: { type: String, default: '' },
  bio: { type: String, default: '' },
  avatarUrl: { type: String, default: '' },
  followersCount: { type: Number, default: 0 },
  followingCount: { type: Number, default: 0 },
  refreshTokens: { type: [String], default: [] },
}, { timestamps: true });

// indexes are covered by unique fields

userSchema.pre('validate', function preValidate(next) {
  if (!this.username) {
    const emailSeed = String(this.email || '').split('@')[0];
    this.username = emailSeed || `user_${Date.now()}`;
  }
  if (!this.name) {
    this.name = this.username;
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
