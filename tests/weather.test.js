const { test } = require('node:test');
const assert = require('node:assert/strict');
function freshModule() { delete require.cache[require.resolve('../services/weather')]; return require('../services/weather'); }
test('weather coalesces simultaneous requests and reuses fresh observations', async t => {
  const previous = global.fetch; t.after(() => { global.fetch = previous; });
  let requests = 0;
  global.fetch = async () => { requests++; return { ok: true, json: async () => ({ current: { temperature_2m: 24, weather_code: 1, time: new Date().toISOString().slice(0, 16) } }) }; };
  const { weather } = freshModule();
  const results = await Promise.all(Array.from({ length: 50 }, () => weather()));
  assert.equal(requests, 1); assert.equal(results[0].temperature, 24);
  await weather(); assert.equal(requests, 1);
});
test('weather rejects provider observations older than fifteen minutes', async t => {
  const previous = global.fetch; t.after(() => { global.fetch = previous; });
  global.fetch = async () => ({ ok: true, json: async () => ({ current: { temperature_2m: 24, weather_code: 1, time: new Date(Date.now() - 20 * 60000).toISOString().slice(0, 16) } }) });
  const { weather } = freshModule();
  await assert.rejects(weather(), error => error.status === 503);
});

test('weather backs off provider failures instead of retrying for every reader', async t => {
  const previous = global.fetch; t.after(() => { global.fetch = previous; });
  let requests = 0;
  global.fetch = async () => { requests++; throw new Error('offline'); };
  const { weather } = freshModule();
  for (let i = 0; i < 20; i++) await assert.rejects(weather(), error => error.status === 503);
  assert.equal(requests, 1);
});
test('future provider timestamps are rejected', async t => {
  const previous = global.fetch; t.after(() => { global.fetch = previous; });
  global.fetch = async () => ({ ok: true, json: async () => ({ current: { temperature_2m: 24, weather_code: 1, time: new Date(Date.now() + 60000).toISOString() } }) });
  await assert.rejects(freshModule().weather(), error => error.status === 503);
});
