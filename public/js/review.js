'use strict';
(() => {
  const { action, pump, form, id, main, message } = DW.writer;
  document.getElementById('publish-article')?.addEventListener('click', () => {
    if (form.reportValidity()) action('/review', { action: 'publish' });
  });
  document.getElementById('return-article')?.addEventListener('click', () => action('/review', { action: 'return', note: document.getElementById('editor-note').value }));
  document.getElementById('delete-article')?.addEventListener('click', async () => {
    if (!confirm('למחוק לצמיתות את הכתבה, התגובות ונתוני הצפייה שלה?')) return;
    try { await pump(); await DW.api('/api/work/articles/' + id, { method: 'DELETE' }); DW.writer.clearDirty(); location.href = '/editor'; }
    catch (error) { message.textContent = error.message; }
  });
})();
