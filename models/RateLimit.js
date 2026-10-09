const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  _id: String,
  attempts: [Date],
  expiresAt: { type: Date, expires: 0 }
});
module.exports = mongoose.model('RateLimit', schema);
