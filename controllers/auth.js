const { randomBytes } = require('node:crypto');
const User = require('../models/User');
const Session = require('../models/Session');
const { hash, passwordMatches } = require('../services/security');
const { text, fail } = require('../services/validation');
const { cookieOptions } = require('../middleware/security');
const { take } = require('../services/rate-limit');
exports.login = async (req, res) => {
  if (!await take('login:' + hash(req.ip), 12, 60000)) fail('יותר מדי ניסיונות התחברות. נסו בעוד דקה.', 429);
  const username = text(req.body.username, 80).toLowerCase();
  const password = text(req.body.password, 256);
  const user = await User.findOne({ username, active: true }).select('+passwordHash');
  if (!user || !await passwordMatches(password, user.passwordHash)) fail('שם המשתמש או הסיסמה שגויים.', 401);
  if (req.sessionToken) await Session.deleteOne({ tokenHash: hash(req.sessionToken) });
  const token = randomBytes(32).toString('hex');
  await Session.create({ tokenHash: hash(token), user: user._id, expiresAt: new Date(Date.now() + 7 * 86400000) });
  res.cookie('session', token, { ...cookieOptions(), maxAge: 7 * 86400000 });
  console.info(JSON.stringify({ event: 'login', user: user.id, at: new Date() }));
  res.json({ redirect: user.role === 'editor' ? '/editor' : '/reporter' });
};
exports.logout = async (req, res) => {
  await Session.deleteOne({ tokenHash: hash(req.sessionToken) });
  res.clearCookie('session', cookieOptions()); res.json({ ok: true });
};