// Visual review only. The production app NEVER imports this server.
// No authentication is bypassed in app.js, and no database behavior is simulated as real.
const express = require('express');
const path = require('node:path');
const Article = require('../models/Article');
const { CATEGORIES, STATE_LABELS } = require('../config/constants');
const { titles, images } = require('./seed');
const app = express();
app.set('view engine', 'ejs'); app.set('views', path.join(__dirname, '../views'));
app.locals.categories = CATEGORIES; app.locals.stateLabels = STATE_LABELS;
app.locals.date = value => new Date(value).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
const users = ['רומי', 'נופר', 'בר', 'רועי', 'בן'].map((name, i) => ({ _id: String(i + 1).padStart(24, '0'), name, username: ['romi', 'nofar', 'bar', 'roy', 'ben'][i], role: i === 4 ? 'editor' : 'reporter', active: true }));
const articles = Array.from({ length: 60 }, (_, i) => {
  const draft = { title: titles[i % 12] + (i > 11 ? ' — מבט ' + (Math.floor(i / 12) + 1) : ''), category: CATEGORIES[i % 6], image: '/images/' + images[i % 6] + '.svg',
    summary: 'מה קורה כשנותנים לרעיון חדש מקום בחיי היום־יום? יצאנו להסתכל מקרוב על האנשים, השאלות והאפשרויות שמעצבים את המחר.',
    body: 'זוהי כתבת הדגמה מקורית לאתר החדשות. הסיפורים והנתונים בתצוגה הזו נועדו להמחיש את עיצוב המערכת.\n\nלפעמים השינוי מתחיל דווקא בפרטים הקטנים: שיחה ברחוב, שאלה שאיש עדיין לא שאל או מקום שמזמין אותנו לעצור. במרכז הסיפור עומדים אנשים שמבקשים להבין איך אפשר לעשות את הדברים מעט אחרת.\n\nהדרך מרעיון לתוצאה כוללת ניסיונות, הקשבה ובחינה של אפשרויות שונות. כשמסתכלים מקרוב, מגלים שאין תשובה אחת שמתאימה לכולם. ההקשר המקומי והצרכים המשתנים מחייבים גמישות.\n\nזהו מקום טוב להתחיל בו שיחה. הסיפור הבא עשוי להגיע דווקא מזווית שלא חשבנו עליה.' };
  const a = new Article({ _id: String(i + 100).padStart(24, '0'), author: users[i % 4]._id, draft, published: { ...draft }, publishedAt: new Date(Date.now() - i * 3600000), status: i < 12 ? 'published' : ['draft', 'pending', 'returned'][i % 3], revision: 0, views: 2840 - i * 25, publicationEvents: [{ at: new Date(Date.now() - 48 * 3600000), title: draft.title }, { at: new Date(Date.now() - 24 * 3600000), title: draft.title }], updatedAt: new Date(Date.now() - i * 3600000) });
  if (a.status === 'returned') a.editorNote = 'נא להרחיב את ההסבר בפסקה השנייה ולחדד את התקציר.';
  return a;
});
app.use(express.static(path.join(__dirname, '../public')));
app.use((req, res, next) => {
  res.locals.csrf = 'visual-preview'; res.locals.preview = true; res.locals.user = null;
  next();
});
app.get('/', (req, res) => res.render('home', { title: 'חדשות עם נקודת מבט' }));
app.get('/login', (req, res) => res.render('login', { title: 'כניסה למערכת' }));
app.get('/articles/:id', (req, res) => {
  const a = articles.find(a => a.id === req.params.id); if (!a) return res.sendStatus(404);
  res.render('article', { title: a.published.title, article: { ...a.toObject(), author: users[Number(a.author.toString()) - 1] } });
});
// Staff workflows are available only in the real app with authenticated MongoDB sessions.
app.get(['/reporter', '/editor', '/write/:id', '/analytics', '/users'], (req, res) => res.redirect('/login'));
app.get('/api/articles', (req, res) => {
  let rows = articles.filter(a => (!req.query.q || a.published.title.includes(req.query.q)) && (!req.query.category || a.published.category === req.query.category));
  if (req.query.seen === 'yes') rows = [];
  if (req.query.sort === 'popular') rows.sort((a, b) => b.views - a.views);
  const page = Number(req.query.page) || 1;
  res.json({ items: rows.slice((page - 1) * 20, page * 20).map(a => ({ id: a.id, ...a.published.toObject(), author: users[Number(a.author.toString()) - 1].name, publishedAt: a.publishedAt, views: a.views, seen: false })), count: rows.length, hasMore: page * 20 < rows.length });
});
const previewCommentsPool = [
  { name: 'קוראת סקרנית', body: 'נקודת מבט מעניינת מאוד. אשמח לקרוא כתבת המשך בנושא הזה.' },
  { name: 'איתי', body: 'תודה על הסיפור ועל ההסבר הנגיש והברור.' },
  { name: 'מיכל', body: 'נושא חשוב שנוגע לרבים מאיתנו. מעורר מחשבה על האופן שבו הדברים מתפתחים.' },
  { name: 'דניאל', body: 'ניתוח מעמיק ומדויק. טוב לראות עיתונות איכותית שמתמקדת בפרטים.' },
  { name: 'שירה ל.', body: 'מפתיע לגלות איך צעד קטן יכול להוביל לשינוי כל כך משמעותי.' },
  { name: 'תמר', body: 'הדוגמאות שהבאתם ממחישות מצוין את המורכבות של הסוגיה.' }
];
app.get('/api/articles/:id/comments', (req, res) => {
  const hash = String(req.params.id).split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const c1 = previewCommentsPool[hash % previewCommentsPool.length];
  const c2 = previewCommentsPool[(hash + 1) % previewCommentsPool.length];
  res.json({ items: [
    { _id: 'preview-comment-2', name: c2.name, body: c2.body, createdAt: new Date(Date.now() - 35 * 60000) },
    { _id: 'preview-comment-1', name: c1.name, body: c1.body, createdAt: new Date(Date.now() - 110 * 60000) }
  ], hasMore: false });
});
app.get('/api/weather', (req, res) => res.status(503).json({ error: 'בתצוגת העיצוב אין נתוני מזג אוויר חיים.' }));
app.use('/api', (req, res) => res.status(503).json({ error: 'זו תצוגת עיצוב בלבד. לשמירה ולהתחברות הפעילו את המערכת המלאה עם MongoDB לפי README.' }));
app.listen(process.env.PREVIEW_PORT || 3001, '0.0.0.0', () => console.log('Visual preview at http://localhost:' + (process.env.PREVIEW_PORT || 3001)));
