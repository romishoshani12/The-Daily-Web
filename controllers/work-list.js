const Article = require('../models/Article');
const { fail, escapeRegex } = require('../services/validation');
exports.list = async (req, res) => {
  const filter = req.user.role === 'editor' && req.query.mine !== 'true' ? {} : { author: req.user._id };
  if (req.query.status) {
    if (!require('../config/constants').STATES.includes(req.query.status)) fail('מצב כתבה לא תקין.');
    filter.status = req.query.status;
  }
  if (req.query.q) filter['draft.title'] = { $regex: escapeRegex(String(req.query.q).slice(0, 100)), $options: 'i' };
  const page = Number(req.query.page || 1);
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000) fail('מספר עמוד לא תקין.');
  const [items, count] = await Promise.all([
    Article.find(filter).select('draft.title draft.category draft.image publishedAt status author updatedAt').populate('author', 'name').sort({ updatedAt: -1, _id: -1 }).skip((page - 1) * 20).limit(20).lean(),
    Article.countDocuments(filter)
  ]);
  res.json({ items, count, page, hasMore: page * 20 < count });
};
