const { fail, content } = require('./validation');
function submit(article) {
  if (!['draft', 'returned'].includes(article.status)) fail('לא ניתן להגיש כתבה במצב הנוכחי.', 409);
  content(article.draft.toObject ? article.draft.toObject() : article.draft, true);
  article.status = 'pending';
}
module.exports = { submit };
