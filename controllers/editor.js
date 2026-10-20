const Article = require('../models/Article');
const Comment = require('../models/Comment');
const ViewStat = require('../models/ViewStat');
const { owned, canEdit, submit, review } = require('../services/workflow');
exports.review = async (req, res) => {
  const article = await owned(req.params.id, req.user); review(article, req.body.action, req.body.note);
  article.revision++; await article.save();
  console.info(JSON.stringify({ event: req.body.action, article: article.id, user: req.user.id, at: new Date() }));
  res.json({ ok: true });
};
exports.remove = async (req, res) => {
  const article = await owned(req.params.id, req.user);
  await Article.deleteOne({ _id: article._id });
  await Promise.all([Comment.deleteMany({ article: article._id }), ViewStat.deleteMany({ article: article._id })]);
  console.info(JSON.stringify({ event: 'article.deleted', article: article.id, user: req.user.id }));
  res.json({ ok: true });
};
