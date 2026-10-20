const Article = require('../models/Article');
const { escapeRegex, fail } = require('../services/validation');
const { record } = require('../services/views');
exports.article = async (req, res) => {
  const article = await Article.findOne({ _id: req.params.id, published: { $ne: null } }).populate('author', 'name').lean();
  if (!article) fail('הכתבה לא נמצאה.', 404);
  await record(article._id, req.visitor);
  res.render('article', { title: article.published.title, article });
};
