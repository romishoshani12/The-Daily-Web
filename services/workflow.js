const Article = require('../models/Article');
const { fail, content } = require('./validation');
async function owned(id, user) {
  const article = await Article.findById(id);
  if (!article) fail('הכתבה לא נמצאה.', 404);
  if (user.role !== 'editor' && !article.author.equals(user._id)) fail('אין לכם הרשאה לערוך את הכתבה הזו.', 403);
  return article;
}
function canEdit(article, user) {
  if (article.status === 'pending' && user.role !== 'editor') fail('הכתבה ממתינה לאישור העורך, ולכן אי אפשר לערוך אותה כרגע.', 409);
}
module.exports = { owned, canEdit, ...require('./submit'), ...require('./review') };
