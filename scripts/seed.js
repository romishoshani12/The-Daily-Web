const mongoose = require('mongoose');
const { passwordHash } = require('../services/security');
const User = require('../models/User');
const Article = require('../models/Article');
const Comment = require('../models/Comment');
const ViewStat = require('../models/ViewStat');
const { CATEGORIES } = require('../config/constants');
const { sampleArticle, images } = require('./sample-content');
const sampleComments = [
  { name: 'קוראת סקרנית', body: 'נקודת מבט מעניינת מאוד. אשמח לקרוא כתבת המשך בנושא הזה.' },
  { name: 'איתי', body: 'תודה על הסיפור ועל ההסבר הנגיש והברור.' },
  { name: 'מיכל', body: 'נושא חשוב שנוגע לרבים מאיתנו. מעורר מחשבה על האופן שבו הדברים מתפתחים.' },
  { name: 'דניאל', body: 'ניתוח מעמיק ומדויק. טוב לראות עיתונות איכותית שמתמקדת בפרטים.' },
  { name: 'שירה ל.', body: 'מפתיע לגלות איך צעד קטן יכול להוביל לשינוי כל כך משמעותי.' },
  { name: 'יוסי כהן', body: 'מסכים עם רוב הדברים, אך יש עוד זווית שכדאי לקחת בחשבון בתחום הזה.' },
  { name: 'תמר', body: 'הדוגמאות שהבאתם ממחישות מצוין את המורכבות של הסוגיה.' },
  { name: 'עומר ר.', body: 'מרתק. במיוחד אהבתי את החיבור שבין הנתונים למציאות היומיומית בשטח.' },
  { name: 'נועה ברק', body: 'כתבה מצוינת! שתפתי עם עמיתים לעבודה, עורר אצלנו דיון פורה.' },
  { name: 'אלון', body: 'יופי של סקירה. האם מתוכננים מחקרים נוספים בתחום בקרוב?' },
  { name: 'מאיה ש.', body: 'כל הכבוד על הבאת הקולות המקומיים, זה מה שבאמת יוצר את ההבדל.' },
  { name: 'גיא', body: 'הסבר בהיר ומאיר עיניים על נושא שלא מרבים לעסוק בו בעומק כזה.' }
];
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
    const draft = sampleArticle(i);
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
      article.draft = { ...article.draft, title: article.draft.title + ' — עדכון בבדיקה', summary: 'תקציר מעודכן שממתין לאישור העורך.', body: article.draft.body + '\n\nעדכון חדש: הפסקה הזו תופיע לקוראים רק לאחר אישור עורך.' };
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
    const pubTime = +saved[i].publishedAt || (+now - (i + 2) * 3600000);
    const countForArticle = (i % 3 === 0) ? 3 : 2;
    for (let c = 0; c < countForArticle; c++) {
      const template = sampleComments[(i * 2 + c) % sampleComments.length];
      const offsetMin = 20 + c * 50 + ((i * 7 + c * 13) % 35);
      const cTime = new Date(Math.min(+now - (countForArticle - c) * 120000, pubTime + offsetMin * 60000));
      comments.push({
        article: saved[i]._id,
        name: template.name,
        body: template.body,
        createdAt: cTime,
        updatedAt: cTime
      });
    }
  }
  await ViewStat.insertMany(points); await Comment.insertMany(comments);
  console.info('Seeded 600 articles, 5 users, ' + comments.length + ' comments and 6,720 hourly view records.');
  console.info('Reporters: romi / nofar / bar / roy. Editor: ben. Password: the SEED_PASSWORD you configured.');
}
if (require.main === module) {
  mongoose.connect(process.env.MONGODB_URI).then(seed).then(() => mongoose.disconnect()).catch(error => { console.error(error.message); process.exitCode = 1; return mongoose.disconnect(); });
}
module.exports = { seed, images };
