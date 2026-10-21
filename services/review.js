const { fail, content } = require('./validation');
function review(article, action, note) {
  if (article.status !== 'pending') fail('אפשר לבדוק רק כתבה שממתינה לאישור.', 409);
  if (action === 'publish') {
    content(article.draft.toObject ? article.draft.toObject() : article.draft, true);
    const now = new Date();
    article.published = article.draft.toObject ? article.draft.toObject() : { ...article.draft };
    article.publishedAt = now;
    article.publicationEvents.push({ at: now, title: article.draft.title });
    article.status = 'published'; article.editorNote = '';
  } else if (action === 'return') {
    if (typeof note !== 'string' || !note.trim() || note.length > 2000) fail('צרפו הערת תיקונים באורך של עד 2,000 תווים.');
    article.status = 'returned'; article.editorNote = note.trim();
  } else fail('פעולה לא מוכרת.');
}
module.exports = { review };
