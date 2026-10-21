// Requires a local MongoDB. Uses and removes only its own uniquely named test database.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const User = require('../models/User');
const Article = require('../models/Article');
const { passwordHash } = require('../services/security');

test('real MongoDB and HTTP acceptance flow', { skip: !process.env.TEST_MONGODB_URI, timeout: 90000 }, async t => {
  const database = 'daily_web_test_' + randomBytes(6).toString('hex');
  const uri = new URL(process.env.TEST_MONGODB_URI);
  uri.pathname = '/' + database;
  await mongoose.connect(uri.toString());
  const digest = await passwordHash('Test-only-password-123');
  const [reporter, other, editor] = await User.create([
    { username: 'reporter', name: 'כתב', role: 'reporter', passwordHash: digest },
    { username: 'other', name: 'כתב נוסף', role: 'reporter', passwordHash: digest },
    { username: 'editor', name: 'עורך', role: 'editor', passwordHash: digest }
  ]);
  // The child uses the same secret on restart, just as a real .env does.
  const env = { ...process.env, PORT: '0', MONGODB_URI: uri.toString(), SESSION_SECRET: randomBytes(32).toString('hex') };
  let child, origin;
  async function start() {
    child = spawn(process.execPath, ['server.js'], { cwd: path.join(__dirname, '..'), env, stdio: ['ignore', 'pipe', 'pipe'] });
    origin = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Server startup timed out')), 15000);
      let output = '';
      child.stdout.on('data', chunk => {
        output += chunk.toString();
        for (const line of output.split('\n')) {
          try { const event = JSON.parse(line); if (event.event === 'server.started') { clearTimeout(timer); resolve('http://127.0.0.1:' + event.port); } } catch {}
        }
      });
      child.once('exit', code => { clearTimeout(timer); reject(new Error('Server exited: ' + code)); });
    });
  }
  async function stop() { if (child && child.exitCode === null) { child.kill('SIGTERM'); await once(child, 'exit'); } }
  t.after(async () => { await stop(); await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });
  await start();
  function client() {
    const jar = new Map(); let csrf = '';
    return {
      async request(route, method = 'GET', body) {
        const response = await fetch(origin + route, { method, redirect: 'manual', headers: {
          Cookie: [...jar].map(([key, value]) => key + '=' + value).join('; '), 'Content-Type': 'application/json', 'X-CSRF-Token': csrf
        }, body: body === undefined ? undefined : JSON.stringify(body) });
        for (const cookie of response.headers.getSetCookie()) { const pair = cookie.split(';')[0]; const split = pair.indexOf('='); jar.set(pair.slice(0, split), pair.slice(split + 1)); }
        const raw = await response.text(); const match = raw.match(/name="csrf-token" content="([^"]+)"/); if (match) csrf = match[1];
        let data; try { data = JSON.parse(raw); } catch { data = raw; }
        return { status: response.status, data, raw };
      },
      async login(username) {
        await this.request('/login'); const result = await this.request('/api/auth/login', 'POST', { username, password: 'Test-only-password-123' });
        assert.equal(result.status, 200); await this.request('/' + (username === 'editor' ? 'editor' : 'reporter'));
      }
    };
  }
  const writer = client(), outsider = client(), desk = client(), guest = client();
  await writer.login('reporter'); await outsider.login('other'); await desk.login('editor'); await guest.request('/');
  let id;
  const draft = { title: 'כותרת בדיקה מיוחדת', summary: 'תקציר מלא', body: 'טקסט ציבורי <script>alert(1)</script>', category: 'מדע', image: '/images/science.svg' };
  await t.test('guest cannot reach staff APIs; missing CSRF is rejected', async () => {
    assert.equal((await guest.request('/api/work/articles')).status, 401);
    const response = await fetch(origin + '/api/work/articles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(response.status, 403);
  });
  await t.test('draft ownership, autosave and private visibility', async () => {
    const created = await writer.request('/api/work/articles', 'POST', {}); assert.equal(created.status, 201); id = created.data.id;
    assert.equal((await outsider.request('/api/work/articles/' + id)).status, 403);
    assert.equal((await writer.request('/api/work/articles/' + id, 'PATCH', { ...draft, revision: 0 })).status, 200);
    assert.equal((await guest.request('/articles/' + id)).status, 404);
    assert.equal((await writer.request('/api/work/articles/' + id, 'PATCH', { ...draft, revision: 0 })).status, 409);
  });
  await t.test('reporter cannot publish; editor can return and approve', async () => {
    assert.equal((await writer.request('/api/work/articles/' + id + '/submit', 'POST', {})).status, 200);
    assert.equal((await writer.request('/api/work/articles/' + id + '/review', 'POST', { action: 'publish' })).status, 403);
    assert.equal((await desk.request('/api/work/articles/' + id + '/review', 'POST', { action: 'return', note: '' })).status, 400);
    assert.equal((await desk.request('/api/work/articles/' + id + '/review', 'POST', { action: 'return', note: 'לתקן' })).status, 200);
    const returned = await writer.request('/write/' + id);
    assert.ok(returned.raw.includes('הגשה מחדש לאחר תיקון'));
    assert.equal((await writer.request('/api/work/articles/' + id + '/submit', 'POST', {})).status, 200);
    assert.equal((await desk.request('/api/work/articles/' + id + '/review', 'POST', { action: 'publish' })).status, 200);
  });
  await t.test('role-specific editing preserves the editor identity and author', async () => {
    const writerPage = await writer.request('/write/' + id);
    assert.ok(!writerPage.raw.includes('published-comparison'));
    assert.match(writerPage.raw, /id="submit-article" disabled/);
    const editorPage = await desk.request('/write/' + id);
    assert.ok(editorPage.raw.includes('published-comparison'));
    assert.ok(editorPage.raw.includes('data-editor="true"'));
    assert.ok(editorPage.raw.includes('שלום, עורך'));
    assert.equal((await writer.request('/api/work/articles/' + id)).data.published, undefined);
    const article = (await desk.request('/api/work/articles/' + id)).data;
    assert.equal((await desk.request('/api/work/articles/' + id, 'PATCH', { ...draft, title: 'עדכון העורך', revision: article.revision })).status, 200);
    const resumed = await desk.request('/write/' + id);
    assert.ok(resumed.raw.includes('שלום, עורך')); assert.ok(resumed.raw.includes('data-editor="true"'));
    assert.equal((await desk.request('/api/work/articles/' + id)).data.author, reporter.id);
    assert.equal((await desk.request('/login')).status, 302);
    for (const page of ['Infinity', '-1', '1.5']) assert.equal((await desk.request('/api/work/articles?page=' + page)).status, 400);
    assert.equal((await desk.request('/api/work/articles?status=invalid')).status, 400);
    assert.equal((await guest.request('/api/does-not-exist')).status, 404);
    const list = await desk.request('/api/work/articles');
    assert.equal(list.data.items[0].draft.body, undefined);
  });
  await t.test('public HTML includes content without executing submitted markup', async () => {
    const response = await guest.request('/articles/' + id); assert.equal(response.status, 200);
    assert.ok(response.raw.includes('טקסט ציבורי &lt;script&gt;')); assert.ok(!response.raw.includes('<script>alert(1)</script>'));
    const seen = await guest.request('/api/articles?seen=yes'); assert.equal(seen.data.items[0].id, id);
    assert.equal((await guest.request('/api/articles?seen=no')).data.items.length, 0);
  });
  await t.test('public version survives draft edits and a real server process restart', async () => {
    const article = (await writer.request('/api/work/articles/' + id)).data;
    assert.equal((await writer.request('/api/work/articles/' + id, 'PATCH', { ...draft, title: 'טיוטה סודית', revision: article.revision })).status, 200);
    await stop(); await start();
    const resumed = await writer.request('/api/work/articles/' + id);
    assert.equal(resumed.status, 200); assert.equal(resumed.data.draft.title, 'טיוטה סודית');
    const publicPage = await guest.request('/articles/' + id); assert.ok(publicPage.raw.includes(draft.title)); assert.ok(!publicPage.raw.includes('טיוטה סודית'));
  });
  await t.test('exactly three concurrent comments are accepted per browser in one minute', async () => {
    const results = await Promise.all(Array.from({ length: 6 }, () => guest.request('/api/articles/' + id + '/comments', 'POST', { name: 'בדיקה', body: 'תגובה' })));
    assert.equal(results.filter(r => r.status === 201).length, 3); assert.equal(results.filter(r => r.status === 429).length, 3);
    const comments = (await guest.request('/api/articles/' + id + '/comments')).data;
    const commentId = comments.items[0]._id;
    assert.equal((await desk.request('/api/comments/' + commentId, 'PATCH', { body: 'תיקון תגובה' })).status, 200);
    assert.equal((await desk.request('/api/comments/' + commentId, 'DELETE')).status, 200);
  });
  await t.test('comment cursor survives deleting earlier rows', async () => {
    const Comment = require('../models/Comment');
    await Comment.insertMany(Array.from({ length: 25 }, (_, i) => ({ article: id, name: 'קורא', body: 'דפדוף ' + i, createdAt: new Date(Date.now() + i * 1000) })));
    const first = (await guest.request('/api/articles/' + id + '/comments')).data;
    assert.equal(first.items.length, 20); assert.ok(first.nextCursor);
    await desk.request('/api/comments/' + first.items[0]._id, 'DELETE');
    const second = (await guest.request('/api/articles/' + id + '/comments?before=' + encodeURIComponent(first.nextCursor))).data;
    assert.equal(first.items.filter(a => second.items.some(b => a._id === b._id)).length, 0);
    assert.equal(first.items.length + second.items.length, 27);
    assert.equal((await guest.request('/api/articles/' + id + '/comments?before=bad')).status, 400);
  });
  await t.test('each concurrent visit counts and unpublished updates stay out of the feed', async () => {
    const freshGuest = client(); await freshGuest.request('/');
    const before = await Article.findById(id);
    const responses = await Promise.all(Array.from({ length: 10 }, () => freshGuest.request('/articles/' + id)));
    assert.ok(responses.every(r => r.status === 200));
    assert.equal((await Article.findById(id)).views, before.views + 10);
    assert.equal((await guest.request('/api/articles?q=' + encodeURIComponent('טיוטה סודית'))).data.count, 0);
  });
  await t.test('600 records: search, category, sorting and disjoint 20-item pages', async () => {
    await Article.insertMany(Array.from({ length: 600 }, (_, i) => ({ author: reporter._id, draft, published: { ...draft, title: 'ארכיון ' + i }, status: 'published', publishedAt: new Date(Date.now() - i * 1000), views: i })));
    const first = (await guest.request('/api/articles?page=1')).data;
    const second = (await guest.request('/api/articles?page=2')).data;
    assert.equal(first.items.length, 20); assert.equal(second.items.length, 20);
    assert.equal(first.items.filter(a => second.items.some(b => a.id === b.id)).length, 0);
    assert.equal((await guest.request('/api/articles?q=' + encodeURIComponent('[a].*'))).data.count, 0);
    const popular = (await guest.request('/api/articles?sort=popular')).data.items;
    assert.equal(popular[0].views, 599);
    assert.equal((await guest.request('/api/articles?category=' + encodeURIComponent('תרבות'))).data.count, 0);
  });
  await t.test('editor user CRUD; password not returned; own account protected', async () => {
    const result = await desk.request('/api/users', 'POST', { name: 'חדש', username: 'new-user', password: 'New-password-123', role: 'reporter' }); assert.equal(result.status, 201);
    const uid = result.data.id;
    assert.equal((await desk.request('/api/users/' + uid, 'PATCH', { name: 'שם מתוקן', role: 'reporter', active: false })).status, 200);
    const users = (await desk.request('/api/users?q=new-user')).data; assert.equal(users.length, 1); assert.equal(users[0].passwordHash, undefined);
    assert.equal((await desk.request('/api/users/' + editor.id, 'DELETE')).status, 400);
    assert.equal((await desk.request('/api/users/' + uid, 'DELETE')).status, 200);
  });
  await t.test('view data CRUD, publication markers and article deletion', async () => {
    const stat = await desk.request('/api/analytics/' + id, 'POST', { hour: '2020-01-01T10:00:00Z', count: 8 }); assert.equal(stat.status, 201);
    assert.equal((await desk.request('/api/stats/' + stat.data._id, 'PATCH', { count: 9 })).status, 200);
    assert.equal((await desk.request('/api/stats/' + stat.data._id, 'DELETE')).status, 200);
    const chart = (await desk.request('/api/analytics/' + id)).data; assert.equal(chart.events.length, 1); assert.ok(chart.points.length > 0);
    assert.equal((await desk.request('/api/work/articles/' + id, 'DELETE')).status, 200);
    assert.equal((await guest.request('/articles/' + id)).status, 404);
  });
});
