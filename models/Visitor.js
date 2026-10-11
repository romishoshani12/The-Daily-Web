const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  _id: String,
  // Capped recent history; avoids an unbounded document.
  seen: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Article' }],
  expiresAt: { type: Date, expires: 0 }
});
module.exports = mongoose.model('Visitor', schema);
