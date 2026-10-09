const mongoose = require('mongoose');
const { CATEGORIES, STATES } = require('../config/constants');
const content = new mongoose.Schema({
  title: { type: String, default: '', maxlength: 180 },
  summary: { type: String, default: '', maxlength: 450 },
  body: { type: String, default: '', maxlength: 60000 },
  category: { type: String, enum: CATEGORIES, default: CATEGORIES[0] },
  image: { type: String, default: '/images/technology.svg' }
}, { _id: false });
const schema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: STATES, default: 'draft', index: true },
  draft: { type: content, default: () => ({}) },
  published: { type: content, default: null },
  publishedAt: Date,
  publicationEvents: [{ at: Date, title: String }],
  editorNote: { type: String, default: '', maxlength: 2000 },
  views: { type: Number, default: 0, min: 0 },
  revision: { type: Number, default: 0 }
}, { timestamps: true });
schema.index({ publishedAt: -1, _id: -1 });
schema.index({ 'published.category': 1, publishedAt: -1 });
schema.index({ views: -1, _id: -1 });
module.exports = mongoose.model('Article', schema);
