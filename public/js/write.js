'use strict';
(() => {
  const main = document.getElementById('main'); const id = main.dataset.articleId;
  const form = document.getElementById('write-form'); const saveState = document.getElementById('save-state');
  const message = document.getElementById('write-message'); const retry = document.getElementById('retry-save');
  let revision = Number(main.dataset.revision), dirty = false, running = null, failed = false;
  let lastSaved = JSON.stringify(Object.fromEntries(new FormData(form)));
  function fields() { return Object.fromEntries(new FormData(form)); }
  function count() {
    document.getElementById('word-count').textContent = form.elements.body.value.trim().split(/\s+/).filter(Boolean).length + ' מילים';
  }
  async function pump() {
    if (running) return running;
    running = (async () => {
      while (dirty) {
        dirty = false; const data = fields(); const snapshot = JSON.stringify(data);
        if (snapshot === lastSaved) continue;
        saveState.textContent = 'שומר את השינויים…';
        try {
          const result = await DW.api('/api/work/articles/' + id, { method: 'PATCH', body: JSON.stringify({ ...data, revision }), keepalive: new Blob([JSON.stringify(data)]).size < 60000 });
          revision = result.revision; lastSaved = snapshot; failed = false; retry.hidden = true;
          main.dataset.status = result.status;
          const submit = document.getElementById('submit-article');
          if (submit) { submit.disabled = !['draft', 'returned'].includes(result.status); submit.textContent = (result.status === 'returned' ? 'הגשה מחדש לאחר תיקון' : 'שליחה לאישור עורך') + ' ←'; }
          document.getElementById('submit-hint')?.remove();
          message.textContent = '';
          const badge = document.getElementById('article-status'); badge.textContent = DW.states[result.status]; badge.className = 'status ' + result.status;
          saveState.textContent = '✓ נשמר ב־' + new Date(result.savedAt).toLocaleTimeString('he-IL');
        } catch (error) {
          dirty = true; failed = true; saveState.textContent = 'השינויים עדיין לא נשמרו'; message.textContent = error.message; retry.hidden = false; break;
        }
      }
    })();
    try { await running; } finally { running = null; }
  }
  // Save immediately; additional keystrokes are serialized into the next request.
  form.addEventListener('input', () => { dirty = true; count(); pump(); });
  form.addEventListener('submit', event => event.preventDefault());
  retry.addEventListener('click', () => { message.textContent = ''; pump(); });
  window.addEventListener('online', () => { if (dirty) pump(); });
  window.addEventListener('beforeunload', event => { if (dirty || running || failed) { event.preventDefault(); event.returnValue = ''; } });
  document.addEventListener('visibilitychange', () => { if (document.hidden && dirty) pump(); });
  async function action(path, body) {
    message.textContent = '';
    const buttons = main.querySelectorAll('aside button'); buttons.forEach(b => { b.disabled = true; });
    try {
      await pump();
      if (dirty || failed) throw new Error('יש להשלים את השמירה לפני שליחת הכתבה.');
      await DW.api('/api/work/articles/' + id + path, { method: 'POST', body: JSON.stringify(body) });
      location.href = main.dataset.editor === 'true' ? '/editor' : '/reporter';
    } catch (error) { message.textContent = error.message; buttons.forEach(b => { b.disabled = false; }); }
  }
  document.getElementById('submit-article')?.addEventListener('click', () => {
    if (form.reportValidity()) action('/submit', {});
  });
  window.DW.writer = { action, pump, form, id, main, message, clearDirty: () => { dirty = false; failed = false; } };
  count();
})();
