const Comment = require('../models/Comment');
const Article = require('../models/Article');
const { text, fail, escapeRegex } = require('../services/validation');
const { take } = require('../services/rate-limit');
async function publicArticle(id) {
  if (!await Article.exists({ _id: id, published: { $ne: null } })) fail('הכתבה אינה זמינה.', 404);
}
exports.list = async (req, res) => {
  await publicArticle(req.params.id);
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const filter = { article: req.params.id };
  if (req.query.before) {
    const [time, id] = String(req.query.before).split('_');
    const createdAt = new Date(Number(time));
    if (!Number.isFinite(+createdAt) || !/^[a-f0-9]{24}$/.test(id || '')) fail('מיקום תגובות לא תקין.');
    filter.$or = [{ createdAt: { $lt: createdAt } }, { createdAt, _id: { $lt: id } }];
  }
  if (req.query.q) filter.body = { $regex: escapeRegex(String(req.query.q).slice(0, 100)), $options: 'i' };
  const rows = await Comment.find(filter).sort({ createdAt: -1, _id: -1 }).skip(req.query.before ? 0 : (page - 1) * 20).limit(21).lean();
  const items = rows.slice(0, 20); const last = items.at(-1);
  res.json({ items, hasMore: rows.length > 20, nextCursor: rows.length > 20 ? +last.createdAt + '_' + last._id : null });
};
exports.create = async (req, res) => {
  await publicArticle(req.params.id);
  const name = text(req.body.name, 60); const body = text(req.body.body, 1200);
  if (!await take('comment:' + req.visitor, 3, 60000)) {
    res.set('Retry-After', '60'); fail('ניתן לשלוח עד 3 תגובות בדקה. נסו שוב בעוד דקה.', 429);
  }
  res.status(201).json(await Comment.create({ article: req.params.id, name, body }));
};
exports.update = async (req, res) => {
  const row = await Comment.findByIdAndUpdate(req.params.id, { body: text(req.body.body, 1200) }, { new: true, runValidators: true });
  if (!row) fail('התגובה לא נמצאה.', 404); res.json(row);
};
exports.remove = async (req, res) => {
  const row = await Comment.findByIdAndDelete(req.params.id);
  if (!row) fail('התגובה לא נמצאה.', 404); res.json({ ok: true });
};
