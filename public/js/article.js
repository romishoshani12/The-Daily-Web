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
    header.append(DW.node('span', 'avatar', comment.name.slice(0, 1)), DW.node('strong', '', comment.name), time);
    const body = DW.node('p', '', comment.body); block.append(header, body);
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
})();
