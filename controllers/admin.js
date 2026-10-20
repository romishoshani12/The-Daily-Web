const User = require('../models/User');
const Session = require('../models/Session');
const Article = require('../models/Article');
const { passwordHash } = require('../services/security');
const { text, fail, escapeRegex } = require('../services/validation');
exports.users = async (req, res) => {
  const q = escapeRegex(String(req.query.q || '').slice(0, 80));
  res.json(await User.find({ $or: [{ name: { $regex: q, $options: 'i' } }, { username: { $regex: q, $options: 'i' } }] }).sort({ name: 1 }).limit(100).lean());
};
exports.createUser = async (req, res) => {
  const username = text(req.body.username, 80).toLowerCase();
  if (!/^[a-z0-9._-]{3,80}$/.test(username)) fail('שם המשתמש צריך להכיל לפחות 3 תווים באנגלית או ספרות.');
  if (!['reporter', 'editor'].includes(req.body.role)) fail('תפקיד לא תקין.');
  const password = text(req.body.password, 256);
  if (password.length < 10) fail('הסיסמה חייבת להכיל לפחות 10 תווים.');
  const user = await User.create({ username, name: text(req.body.name, 80), role: req.body.role, passwordHash: await passwordHash(password) });
  res.status(201).json({ id: user.id });
};
exports.updateUser = async (req, res) => {
  const user = await User.findById(req.params.id); if (!user) fail('המשתמש לא נמצא.', 404);
  if (user.id === req.user.id && (req.body.role !== 'editor' || req.body.active === false)) fail('לא ניתן לשלול את ההרשאה של עצמך.');
  if (!['reporter', 'editor'].includes(req.body.role) || typeof req.body.active !== 'boolean') fail('פרטי משתמש לא תקינים.');
  user.name = text(req.body.name, 80); user.role = req.body.role; user.active = req.body.active;
  if (req.body.password) {
    const password = text(req.body.password, 256); if (password.length < 10) fail('נדרשים לפחות 10 תווים לסיסמה.');
    user.passwordHash = await passwordHash(password);
    await Session.deleteMany({ user: user._id });
  }
  await user.save(); res.json({ ok: true });
};
exports.deleteUser = async (req, res) => {
  if (req.params.id === req.user.id) fail('לא ניתן למחוק את המשתמש שלך.');
  if (await Article.exists({ author: req.params.id })) fail('למשתמש יש כתבות. אפשר להשבית אותו במקום למחוק.', 409);
  const user = await User.findByIdAndDelete(req.params.id); if (!user) fail('המשתמש לא נמצא.', 404);
  await Session.deleteMany({ user: req.params.id }); res.json({ ok: true });
};
