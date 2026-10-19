'use strict';
(() => {
  const feed = document.getElementById('feed');
  const status = document.getElementById('feed-status');
  const more = document.getElementById('load-more');
  let category = '', page = 1, hasMore = true, loading = false, generation = 0;
  let request;
  function card(item, lead, position) {
    const article = DW.node('article', 'news-card' + (lead ? ' lead' : ''));
    const link = DW.node('a', 'card-link'); link.href = '/articles/' + item.id;
    const image = DW.node('img', 'card-image'); image.src = item.image; image.alt = 'איור מלווה לכתבה'; image.loading = lead ? 'eager' : 'lazy';
    const content = DW.node('div', 'card-content');
    content.append(DW.node('span', 'story-number', (lead ? 'הסיפור הפותח / ' : '') + String(position).padStart(2, '0')));
    const meta = DW.node('div', 'card-meta'); meta.append(DW.node('span', 'tag', item.category), DW.node('span', '', DW.date(item.publishedAt)));
    if (item.seen) meta.append(DW.node('span', 'read-badge', '✓ נקראה'));
    const byline = DW.node('div', 'card-byline'); byline.append(DW.node('span', '', item.author), DW.node('span', '', item.views.toLocaleString('he-IL') + ' צפיות · לקריאה ←'));
    content.append(meta, DW.node('h2', '', item.title), DW.node('p', '', item.summary), byline);
    link.append(image, content); article.append(link); return article;
  }
  async function load(reset = false) {
    if (reset) {
      generation++; request?.abort(); loading = false; page = 1; hasMore = true; feed.replaceChildren();
    }
    if (loading || !hasMore) return;
    const current = generation;
    loading = true; more.disabled = true; status.textContent = 'טוענים עוד סיפורים…';
    request = new AbortController();
    const params = new URLSearchParams({ page, category, q: document.getElementById('search').value, sort: document.getElementById('sort').value, seen: document.getElementById('seen').value });
    try {
      const data = await DW.api('/api/articles?' + params, { signal: request.signal });
      if (current !== generation) return;
      data.items.forEach((item, i) => feed.append(card(item, page === 1 && i === 0, (page - 1) * 20 + i + 1)));
      document.getElementById('result-count').textContent = data.count.toLocaleString('he-IL') + ' סיפורים' + (category ? ' · ' + category : ' מכל הזוויות');
      more.textContent = 'טעינת כתבות נוספות';
      hasMore = data.hasMore; page++; more.hidden = !hasMore;
      status.textContent = hasMore ? '' : data.count ? 'הגעתם לסוף. מחר מחכים כאן סיפורים חדשים.' : '';
      if (!data.count) {
        const empty = DW.node('div', 'empty'); empty.append(DW.node('h2', '', 'הסיפור עוד לא נמצא'), DW.node('p', '', 'נסו חיפוש אחר או שנו את הסינון.')); feed.append(empty);
      }
    } catch (error) {
      if (error.name !== 'AbortError' && current === generation) { status.textContent = error.message; more.hidden = false; more.textContent = 'ניסיון נוסף'; }
    } finally { if (current === generation) { loading = false; more.disabled = false; } }
  }
  document.getElementById('filters').addEventListener('submit', event => { event.preventDefault(); load(true); });
  document.getElementById('search').addEventListener('input', DW.debounce(() => load(true)));
  ['sort', 'seen'].forEach(id => document.getElementById(id).addEventListener('change', () => load(true)));
  document.querySelectorAll('[data-category]').forEach(button => button.addEventListener('click', () => {
    category = button.dataset.category;
    document.querySelectorAll('[data-category]').forEach(b => {
      const active = b.dataset.category === category;
      b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active));
    });
    load(true);
  }));
  more.addEventListener('click', () => load());
  const observer = new IntersectionObserver(entries => { if (entries[0].isIntersecting) load(); }, { rootMargin: '350px' });
  observer.observe(document.getElementById('feed-end'));
  load();
  let weatherExpiry;
})();
