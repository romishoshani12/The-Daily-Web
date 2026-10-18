const Article = require('../models/Article');
const { fail, content } = require('./validation');
async function owned(id, user) {
  const article = await Article.findById(id);
  if (!article) fail('הכתבה לא נמצאה.', 404);
  if (user.role !== 'editor' && !article.author.equals(user._id)) fail('אין הרשאה לערוך כתבה זו.', 403);
  return article;
}
function canEdit(article, user) {
  if (article.status === 'pending' && user.role !== 'editor') fail('כתבה שממתינה לאישור אינה פתוחה לעריכת כתב.', 409);
}
module.exports = { owned, canEdit, ...require('./submit'), ...require('./review') };
