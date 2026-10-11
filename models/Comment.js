const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  article: { type: mongoose.Schema.Types.ObjectId, ref: 'Article', required: true, index: true },
  name: { type: String, required: true, maxlength: 60 },
  body: { type: String, required: true, maxlength: 1200 }
}, { timestamps: true });
schema.index({ article: 1, createdAt: -1 });
module.exports = mongoose.model('Comment', schema);
