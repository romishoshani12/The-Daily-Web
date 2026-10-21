const Article = require('../models/Article');
const ViewStat = require('../models/ViewStat');
const { fail } = require('../services/validation');
exports.analytics = async (req, res) => {
  const article = await Article.findById(req.params.id).lean(); if (!article) fail('הכתבה לא נמצאה.', 404);
  const days = [1, 7, 30].includes(Number(req.query.days)) ? Number(req.query.days) : 7;
  const since = new Date(Date.now() - days * 86400000); since.setUTCMinutes(0, 0, 0);
  const until = new Date();
  const points = await ViewStat.find({ article: article._id, hour: { $gte: since, $lte: until } }).sort({ hour: 1 }).lean();
  res.json({ title: article.published?.title || article.draft.title, points, events: article.publicationEvents, since, until, total: article.views });
};
exports.createStat = async (req, res) => {
  if (!await Article.exists({ _id: req.params.id })) fail('הכתבה לא נמצאה.', 404);
  const count = req.body.count; const hour = new Date(req.body.hour);
  if (!Number.isInteger(count) || count < 0 || !Number.isFinite(+hour)) fail('נתוני צפייה לא תקינים.');
  hour.setUTCMinutes(0, 0, 0);
  const stat = await ViewStat.create({ article: req.params.id, hour, count });
  await Article.updateOne({ _id: req.params.id }, { $inc: { views: count } });
  res.status(201).json(stat);
};
exports.updateStat = async (req, res) => {
  if (!Number.isInteger(req.body.count) || req.body.count < 0) fail('מספר צפיות לא תקין.');
  const old = await ViewStat.findByIdAndUpdate(req.params.id, { count: req.body.count }, { runValidators: true });
  if (!old) fail('רשומת הצפייה לא נמצאה.', 404);
  await Article.updateOne({ _id: old.article }, { $inc: { views: req.body.count - old.count } });
  console.info(JSON.stringify({ event: 'stat.corrected', user: req.user.id, stat: old.id }));
  res.json({ ok: true });
};
exports.deleteStat = async (req, res) => {
  const old = await ViewStat.findByIdAndDelete(req.params.id); if (!old) fail('רשומת הצפייה לא נמצאה.', 404);
  await Article.updateOne({ _id: old.article }, { $inc: { views: -old.count } }); res.json({ ok: true });
};
