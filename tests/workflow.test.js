const { test } = require('node:test');
const assert = require('node:assert/strict');
const { submit, review } = require('../services/workflow');
const { content, escapeRegex } = require('../services/validation');
function article(status = 'draft') {
  return { status, draft: { title: 'כותרת', summary: 'תקציר', body: 'תוכן', category: 'מדע', image: '/images/science.svg' }, publicationEvents: [] };
}
test('only draft and returned articles can be submitted', () => {
  for (const state of ['draft', 'returned']) { const a = article(state); submit(a); assert.equal(a.status, 'pending'); }
  for (const state of ['pending', 'published']) assert.throws(() => submit(article(state)));
});
test('publishing creates a separate approved snapshot and records publication', () => {
  const a = article('pending'); review(a, 'publish'); a.draft.title = 'שינוי פרטי';
  assert.equal(a.published.title, 'כותרת'); assert.equal(a.publicationEvents.length, 1); assert.equal(a.status, 'published');
});
test('returning an update keeps the previous public content', () => {
  const a = article('pending'); a.published = { title: 'גרסה קודמת' };
  assert.throws(() => review(a, 'return', ''));
  review(a, 'return', 'להרחיב'); assert.equal(a.published.title, 'גרסה קודמת'); assert.equal(a.status, 'returned');
});
test('invalid transitions and injected image protocols are rejected', () => {
  assert.throws(() => review(article('draft'), 'publish'));
  assert.throws(() => content({ ...article().draft, image: 'javascript:alert(1)' }, true));
  assert.throws(() => content({ ...article().draft, category: 'unknown' }, true));
});
test('search treats regular-expression syntax as literal text', () => {
  assert.equal(escapeRegex('[a].*'), '\\[a\\]\\.\\*');
});
