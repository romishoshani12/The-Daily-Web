'use strict';
(() => {
  let page = 1, status = '', generation = 0;
  const list = document.getElementById('work-list');
  async function load() {
    const current = ++generation;
    const params = new URLSearchParams({ page, status, q: document.getElementById('work-search').value });
    // Editor's "my articles" screen must also be scoped to the current user.
    if (document.getElementById('main').dataset.mode === 'reporter') params.set('mine', 'true');
    try {
      const data = await DW.api('/api/work/articles?' + params); if (current !== generation) return;
      list.replaceChildren();
      document.getElementById('work-count').textContent = data.count + ' כתבות';
      data.items.forEach(article => {
        const row = DW.node('article', 'work-row');
        const image = DW.node('img', 'work-thumbnail'); image.src = article.draft.image; image.alt = ''; image.loading = 'lazy';
        const details = DW.node('div', 'work-details');
        details.append(DW.node('span', 'tag', article.draft.category), DW.node('h2', '', article.draft.title || 'כתבה ללא כותרת'), DW.node('p', '', (article.author?.name || 'מערכת') + ' · עודכן ' + DW.time(article.updatedAt) + (article.publishedAt && article.status !== 'published' ? ' · גרסה קודמת באוויר' : '')));
        const actions = DW.node('div', 'work-actions');
        const link = DW.node('a', 'button outline', article.status === 'pending' ? 'פתיחת כתבה ←' : 'המשך עריכה ←'); link.href = '/write/' + article._id;
        actions.append(DW.node('span', 'status ' + article.status, DW.states[article.status]), link);
        row.append(image, details, actions); list.append(row);
      });
      if (!data.items.length) list.append(DW.node('div', 'empty', 'אין כתבות בתצוגה הזו. אפשר לשנות את הסינון או ליצור סיפור חדש.'));
      document.getElementById('previous').disabled = page === 1;
      document.getElementById('next').disabled = !data.hasMore;
      document.getElementById('page-label').textContent = 'עמוד ' + page;
    } catch (error) { DW.toast(error.message); }
  }
  document.querySelectorAll('[data-status]').forEach(button => button.addEventListener('click', () => {
    status = button.dataset.status; page = 1;
    document.querySelectorAll('[data-status]').forEach(b => b.classList.toggle('active', b === button)); load();
  }));
  document.getElementById('work-search').addEventListener('input', DW.debounce(() => { page = 1; load(); }));
  document.getElementById('previous').addEventListener('click', () => { page--; load(); });
  document.getElementById('next').addEventListener('click', () => { page++; load(); });
  document.getElementById('new-article').addEventListener('click', async event => {
    event.currentTarget.disabled = true;
    try { const data = await DW.api('/api/work/articles', { method: 'POST', body: '{}' }); location.href = '/write/' + data.id; }
    catch (error) { DW.toast(error.message); document.getElementById('new-article').disabled = false; }
  });
  load();
})();
