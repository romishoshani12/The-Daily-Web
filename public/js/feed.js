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
})();
