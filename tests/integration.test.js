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
});
