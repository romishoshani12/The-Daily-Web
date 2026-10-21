const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const ejs = require('ejs');
const Article = require('../models/Article');
const { CATEGORIES, STATE_LABELS } = require('../config/constants');
const root = path.join(__dirname, '..');
function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (['node_modules', '.git'].includes(entry.name)) return [];
    const full = path.join(directory, entry.name); return entry.isDirectory() ? files(full) : [full];
  });
}
(async () => {
  const js = files(root).filter(file => file.endsWith('.js'));
  for (const file of js) execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  const user = { _id: '000000000000000000000001', name: 'משתמש בדיקה', role: 'editor' };
  const draft = { title: 'כותרת בדיקה', summary: 'תקציר', body: 'פסקה ראשונה\n\nפסקה שנייה', category: CATEGORIES[0], image: '/images/technology.svg' };
  const article = new Article({ author: user._id, draft, published: draft, publishedAt: new Date(), status: 'pending' });
  await article.validate();
  const base = { csrf: 'test', user, title: 'בדיקה', categories: CATEGORIES, stateLabels: STATE_LABELS, date: value => new Date(value).toLocaleDateString('he-IL'), article, mode: 'editor', message: 'שגיאה לבדיקה', status: 404 };
  let rendered = 0;
  for (const view of ['home', 'article', 'login', 'workspace', 'write', 'analytics', 'users', 'error']) {
    const locals = view === 'article' ? { ...base, article: { ...article.toObject(), author: user } } : base;
    const html = await ejs.renderFile(path.join(root, 'views', view + '.ejs'), locals);
    if (!html.includes('lang="he"') || !html.includes('id="main"')) throw new Error('Missing document structure: ' + view);
    for (const match of html.matchAll(/(?:src|href)="(\/(?:css|js|images)\/[^"?]+)"/g)) {
      if (!fs.existsSync(path.join(root, 'public', match[1]))) throw new Error('Missing asset: ' + match[1]);
    }
    rendered++;
  }
  console.log('PASS: ' + js.length + ' JavaScript files; ' + rendered + ' EJS pages; model validation; local asset references.');
  console.log('This does not replace browser QA or integration tests with MongoDB.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
