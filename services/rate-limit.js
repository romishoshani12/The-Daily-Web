const RateLimit = require('../models/RateLimit');
// The conditional update is atomic, including concurrent requests.
async function take(key, maximum, windowMs) {
  const now = new Date();
  const cutoff = new Date(now - windowMs);
  try { await RateLimit.create({ _id: key, attempts: [], expiresAt: new Date(+now + windowMs) }); }
  catch (error) { if (error.code !== 11000) throw error; }
  const recent = { $filter: { input: '$attempts', as: 'attempt', cond: { $gt: ['$$attempt', cutoff] } } };
  const result = await RateLimit.findOneAndUpdate({
    _id: key, $expr: { $lt: [{ $size: recent }, maximum] }
  }, [{ $set: { attempts: { $concatArrays: [recent, [now]] }, expiresAt: new Date(+now + windowMs) } }]);
  return Boolean(result);
}
module.exports = { take };
