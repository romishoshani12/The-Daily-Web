const Article = require('../models/Article');
const Visitor = require('../models/Visitor');
const { escapeRegex, fail } = require('../services/validation');
const { CATEGORIES } = require('../config/constants');
exports.feed = async (req, res) => {
  const filter = { published: { $ne: null } };
  const visitor = await Visitor.findById(req.visitor).lean();
  const seen = visitor?.seen || [];
  const query = String(req.query.q || '').trim().slice(0, 100);
  if (query) filter['published.title'] = { $regex: escapeRegex(query), $options: 'i' };
  if (req.query.category) {
    if (!CATEGORIES.includes(req.query.category)) fail('קטגוריה לא תקינה.');
    filter['published.category'] = req.query.category;
  }
  if (req.query.seen === 'yes') filter._id = { $in: seen };
  if (req.query.seen === 'no') filter._id = { $nin: seen };
  const page = Math.max(1, Math.min(100000, parseInt(req.query.page, 10) || 1));
  const sort = req.query.sort === 'popular' ? { views: -1, _id: -1 } : { publishedAt: -1, _id: -1 };
  const [rows, count] = await Promise.all([
    Article.find(filter).select('published.title published.summary published.image published.category publishedAt author views').populate('author', 'name').sort(sort).skip((page - 1) * 20).limit(20).lean(),
    Article.countDocuments(filter)
  ]);
  const visited = new Set(seen.map(String));
  res.json({ items: rows.map(a => ({ id: a._id, ...a.published, publishedAt: a.publishedAt, author: a.author?.name || 'המערכת', views: a.views, seen: visited.has(String(a._id)) })), count, hasMore: page * 20 < count });
};
