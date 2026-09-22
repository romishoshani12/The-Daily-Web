const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  tokenHash: { type: String, unique: true, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date, required: true, expires: 0 }
});
module.exports = mongoose.model('Session', schema);