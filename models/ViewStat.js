const mongoose = require('mongoose');
// One document per article per hour, not one document per visit.
const schema = new mongoose.Schema({
  article: { type: mongoose.Schema.Types.ObjectId, ref: 'Article', required: true },
  hour: { type: Date, required: true },
  count: { type: Number, required: true, min: 0 }
}, { timestamps: true });
schema.index({ article: 1, hour: 1 }, { unique: true });
module.exports = mongoose.model('ViewStat', schema);
