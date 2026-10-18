const { randomBytes } = require('node:crypto');
const Session = require('../models/Session');
const { hash, sign } = require('../services/security');
const { fail } = require('../services/validation');
function cookies(header = '') {
  return Object.fromEntries(header.split(';').map(item => item.trim().split(/=(.*)/s).slice(0, 2)).filter(pair => pair.length === 2));
}
const cookieOptions = () => ({ httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/' });
async function identify(req, res, next) {
  const jar = cookies(req.headers.cookie);
  let visitor = jar.visitor || '';
  const [id, signature] = visitor.split('.');
  if (!id || !/^[a-f0-9]{32}$/.test(id) || sign(id) !== signature) {
    const fresh = randomBytes(16).toString('hex'); visitor = fresh + '.' + sign(fresh);
    res.cookie('visitor', visitor, { ...cookieOptions(), maxAge: 365 * 86400000 });
  }
  req.visitor = visitor.split('.')[0];
  req.sessionToken = jar.session || '';
  if (req.sessionToken) {
    const session = await Session.findOne({ tokenHash: hash(req.sessionToken), expiresAt: { $gt: new Date() } }).populate('user');
    if (session?.user?.active) req.user = session.user;
  }
  res.locals.user = req.user || null;
  res.locals.csrf = sign('csrf:' + req.visitor + ':' + req.sessionToken);
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    if (req.get('x-csrf-token') !== res.locals.csrf) fail('הדף פג תוקף. יש לרענן ולנסות שוב.', 403);
  }
  next();
}
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      if (!req.path.startsWith('/api/')) return res.redirect('/login');
      return fail('נדרשת התחברות.', 401);
    }
    if (!roles.includes(req.user.role)) fail('אין הרשאה לפעולה זו.', 403);
    next();
  };
}
module.exports = { identify, requireRole, cookieOptions };
