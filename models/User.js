const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true, maxlength: 80 },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['reporter', 'editor'], required: true },
  active: { type: Boolean, default: true }
}, { timestamps: true });
module.exports = mongoose.model('User', schema);