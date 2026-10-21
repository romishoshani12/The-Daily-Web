const Article = require('../models/Article');
const { owned, canEdit, submit, review } = require('../services/workflow');
const { content, fail, escapeRegex } = require('../services/validation');
exports.create = async (req, res) => {
  const article = await Article.create({ author: req.user._id });
  res.status(201).json({ id: article.id });
};
exports.get = async (req, res) => {
  const article = (await owned(req.params.id, req.user)).toObject();
  if (req.user.role !== 'editor') delete article.published;
  res.json(article);
};
exports.save = async (req, res) => {
  const article = await owned(req.params.id, req.user); canEdit(article, req.user);
  if (!Number.isInteger(req.body.revision) || article.revision !== req.body.revision) fail('יש גרסה חדשה יותר של הכתבה. רעננו את העמוד לפני שממשיכים לערוך.', 409);
  const draft = content(req.body);
  const updated = await Article.findOneAndUpdate({ _id: article._id, revision: article.revision, status: article.status }, {
    $set: { draft, status: article.status === 'published' ? 'draft' : article.status }, $inc: { revision: 1 }
  }, { new: true, runValidators: true });
  if (!updated) fail('הכתבה השתנתה בינתיים. רעננו את העמוד.', 409);
  res.json({ revision: updated.revision, savedAt: updated.updatedAt, status: updated.status });
};
exports.submit = async (req, res) => {
  const article = await owned(req.params.id, req.user); submit(article);
  article.revision++; await article.save(); res.json({ ok: true });
};
