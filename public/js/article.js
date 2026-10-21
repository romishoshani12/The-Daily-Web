'use strict';
(() => {
  const main = document.getElementById('main'); const id = main.dataset.articleId;
  const list = document.getElementById('comments-list');
  const form = document.getElementById('comment-form');
  const more = document.getElementById('more-comments'); let cursor = '', loading = false;
  const shown = new Set();
  const articleBody = document.getElementById('article-body');
  const progress = document.getElementById('reading-progress');
  function readingProgress() {
    const box = articleBody.getBoundingClientRect();
    const available = box.height + window.innerHeight;
    progress.value = Math.max(0, Math.min(100, (window.innerHeight - box.top) / available * 100));
  }
  window.addEventListener('scroll', readingProgress, { passive: true });
  window.addEventListener('resize', readingProgress);
  new ResizeObserver(readingProgress).observe(articleBody);
  readingProgress();
  function row(comment) {
    const block = DW.node('article', 'comment');
    const header = DW.node('header'); const time = DW.node('time', '', DW.time(comment.createdAt)); time.dateTime = comment.createdAt;
    // Readers may write in any language, so names and text pick their own direction.
    const name = DW.node('strong', '', comment.name); name.dir = 'auto';
    header.append(DW.node('span', 'avatar', comment.name.slice(0, 1)), name, time);
    const body = DW.node('p', '', comment.body); body.dir = 'auto'; block.append(header, body);
    if (main.dataset.editor === 'true') {
      const controls = DW.node('div', 'comment-actions');
      const edit = DW.node('button', 'text-button', 'עריכה'); const remove = DW.node('button', 'text-button danger', 'מחיקה');
      edit.addEventListener('click', async () => {
        const value = prompt('תוכן התגובה:', body.textContent); if (value === null) return;
        try { await DW.api('/api/comments/' + comment._id, { method: 'PATCH', body: JSON.stringify({ body: value }) }); body.textContent = value; }
        catch (error) { DW.toast(error.message); }
      });
      remove.addEventListener('click', async () => {
        if (!confirm('למחוק את התגובה?')) return;
        try { await DW.api('/api/comments/' + comment._id, { method: 'DELETE' }); block.remove(); }
        catch (error) { DW.toast(error.message); }
      });
      controls.append(edit, remove); block.append(controls);
    }
    return block;
  }
  async function load() {
    if (loading) return;
    loading = true; more.disabled = true;
    try {
      const data = await DW.api('/api/articles/' + id + '/comments?before=' + encodeURIComponent(cursor));
      data.items.forEach(comment => { if (!shown.has(comment._id)) { list.append(row(comment)); shown.add(comment._id); } });
      cursor = data.nextCursor || ''; more.hidden = !data.hasMore;
      if (!shown.size) list.append(DW.node('p', 'empty-comments muted', 'עדיין אין תגובות. מוזמנים לפתוח את השיחה.'));
    } catch (error) { DW.toast(error.message); more.hidden = false; }
    finally { loading = false; more.disabled = false; }
  }
  form.addEventListener('submit', async event => {
    event.preventDefault(); const button = form.querySelector('button'); button.disabled = true;
    const message = form.querySelector('.form-message'); message.textContent = '';
    try {
      const comment = await DW.api('/api/articles/' + id + '/comments', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(form))) });
      list.querySelector('.empty-comments')?.remove(); list.prepend(row(comment)); shown.add(comment._id);
      form.elements.body.value = ''; message.textContent = 'התגובה פורסמה. תודה שהצטרפתם לשיחה.';
    } catch (error) { message.textContent = error.message; }
    finally { button.disabled = false; }
  });
  more.addEventListener('click', load); load();
  document.getElementById('copy-link').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(location.href); DW.toast('הקישור הועתק'); }
    catch { DW.toast('אפשר להעתיק את הקישור משורת הכתובת.'); }
  });
})();
