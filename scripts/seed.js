const mongoose = require('mongoose');
const { passwordHash } = require('../services/security');
const User = require('../models/User');
const Article = require('../models/Article');
const Comment = require('../models/Comment');
const ViewStat = require('../models/ViewStat');
const { CATEGORIES } = require('../config/constants');
const titles = [
  'העיר של מחר כבר כאן: כשחדשנות פוגשת את הרחוב',
  'מה אפשר ללמוד כשמביטים בשמיים קצת אחרת?',
  'בין קירות העיר: המקומות שבהם התרבות מתחילה',
  'הדרך הירוקה הביתה: שינוי קטן, השפעה גדולה',
  'מעבר לתוצאה: האנשים שהופכים קבוצה לקהילה',
  'חלון לעולם: הרעיונות שמחברים בין ערים רחוקות',
  'פחות מסכים, יותר אפשרויות: טכנולוגיה בקצב שלנו',
  'הסקרנות היא רק ההתחלה: יום אחד במעבדת המחקר',
  'יוצרים מרחב: מפגש חדש בין אמנות לחיי היום־יום',
  'לא רק נוף: הסיפור שמאחורי השטחים הפתוחים',
  'קו הזינוק של כולם: ספורט שחוזר לשכונה',
  'ללמוד מעבר לגבול: איך רעיון מקומי מגיע רחוק'
];
const images = ['technology', 'science', 'culture', 'environment', 'sport', 'world'];
async function seed() {
  const password = process.env.SEED_PASSWORD;
  if (!password || password.length < 10) throw new Error('Set SEED_PASSWORD to at least 10 characters in .env before seeding.');
  if (await User.exists({}) || await Article.exists({})) throw new Error('Seed requires an empty database. Existing data was not changed.');
  const digest = await passwordHash(password);
  const names = [['romi', 'רומי'], ['nofar', 'נופר'], ['bar', 'בר'], ['roy', 'רועי'], ['ben', 'בן']];
  const users = await User.insertMany(names.map(([username, name], i) => ({ username, name, role: i === 4 ? 'editor' : 'reporter', passwordHash: digest })));
  const now = Date.now();
  const articles = [];
  for (let i = 0; i < 600; i++) {
    const category = i % 6;
    const draft = {
      title: titles[i % titles.length] + (i >= 12 ? ' — מבט ' + (Math.floor(i / 12) + 1) : ''),
      summary: 'מה קורה כשנותנים לרעיון חדש מקום בחיי היום־יום? יצאנו להסתכל מקרוב על האנשים, השאלות והאפשרויות שמעצבים את המחר.',
      body: 'זוהי כתבת הדגמה מקורית לאתר החדשות, ואינה דיווח חדשותי אמיתי. הנתונים, התיאורים והאירועים נועדו להציג את יכולות המערכת.\n\nלפעמים השינוי מתחיל דווקא בפרטים הקטנים: שיחה ברחוב, שאלה שאיש עדיין לא שאל או מקום שמזמין אותנו לעצור. במרכז הסיפור שלנו עומדים אנשים שמבקשים להבין איך אפשר לעשות את הדברים מעט אחרת.\n\nהדרך מרעיון לתוצאה איננה תמיד ישירה. היא כוללת ניסיונות, הקשבה ובחינה של אפשרויות שונות. מה שנראה פשוט במבט ראשון מתגלה כמערכת של החלטות קטנות, שלכל אחת מהן השפעה על התמונה הגדולה.\n\nכשמסתכלים מקרוב, מגלים שאין תשובה אחת שמתאימה לכולם. ההקשר המקומי, הניסיון של המשתתפים והצרכים המשתנים מחייבים גמישות. לכן השאלה המעניינת איננה רק מה נעשה, אלא גם מי שותף לתהליך ואיך בודקים את התוצאות.\n\nזהו מקום טוב להתחיל בו שיחה. יש עוד הרבה ללמוד, והסיפור הבא עשוי להגיע דווקא מזווית שלא חשבנו עליה.',
      category: CATEGORIES[category], image: '/images/' + images[category] + '.svg'
    };
    const isPublic = i < 510;
    const status = i < 480 ? 'published' : ['draft', 'pending', 'returned'][i % 3];
    const publicationAt = new Date(now - (i + 2) * 3600000);
    const events = isPublic ? [{ at: i < 15 ? new Date(now - 8 * 86400000) : publicationAt, title: draft.title }] : [];
    if (i < 15) events.push({ at: new Date(now - 24 * 3600000 - i * 60000), title: draft.title }, { at: publicationAt, title: draft.title });
    articles.push({ author: users[i % 4]._id, draft, published: isPublic ? { ...draft } : null,
      publishedAt: isPublic ? publicationAt : undefined, status, publicationEvents: events,
      editorNote: status === 'returned' ? 'נא להרחיב את ההסבר בפסקה השנייה ולחדד את התקציר לפני הגשה מחדש.' : '',
      createdAt: new Date(now - (i + 72) * 3600000), updatedAt: new Date(now - i * 120000)
    });
  }
  for (const article of articles) {
    if (article.published && article.status !== 'published') {
      article.draft = { ...article.draft, title: article.draft.title + ' — עדכון בבדיקה', summary: 'תקציר מעודכן שממתין לאישור המערכת.', body: article.draft.body + '\n\nעדכון חדש: הפסקה הזו תופיע לקוראים רק לאחר אישור עורך.' };
    }
  }
  const saved = await Article.insertMany(articles);
  const points = [], comments = [];
  for (let i = 0; i < 40; i++) {
    let total = 0;
    for (let h = 0; h < 168; h++) {
      const hour = new Date(now - h * 3600000); hour.setUTCMinutes(0, 0, 0);
      const count = +hour < +saved[i].publicationEvents[0].at ? 0 : Math.max(0, Math.round(12 + 9 * Math.sin(h / 5 + i) + (h < 24 ? 16 : 0) + (i % 6) * 3));
      points.push({ article: saved[i]._id, hour, count }); total += count;
    }
    await Article.updateOne({ _id: saved[i]._id }, { views: total });
    comments.push({ article: saved[i]._id, name: 'קוראת סקרנית', body: 'נקודת מבט מעניינת. אשמח לקרוא עוד על הנושא.' }, { article: saved[i]._id, name: 'איתי', body: 'תודה על הסיפור ועל ההסבר הנגיש.' });
  }
  await ViewStat.insertMany(points); await Comment.insertMany(comments);
  console.info('Seeded 600 articles, 5 users, 80 comments and 6,720 hourly view records.');
  console.info('Reporters: romi / nofar / bar / roy. Editor: ben. Password: the SEED_PASSWORD you configured.');
}
if (require.main === module) {
  mongoose.connect(process.env.MONGODB_URI).then(seed).then(() => mongoose.disconnect()).catch(error => { console.error(error.message); process.exitCode = 1; return mongoose.disconnect(); });
}
module.exports = { seed, titles, images };
