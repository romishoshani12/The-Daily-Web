'use strict';
window.DW = {
  async api(url, options = {}) {
    const response = await fetch(url, { ...options, headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content,
      ...options.headers
    }});
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'לא הצלחנו להשלים את הפעולה.');
    return data;
  },
  node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  },
  date(value) { return new Date(value).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' }); },
  time(value) { return new Date(value).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' }); },
  toast(message) {
    const box = document.getElementById('toast'); box.textContent = message; box.hidden = false;
    clearTimeout(this.toastTimer); this.toastTimer = setTimeout(() => { box.hidden = true; }, 4500);
  },
  debounce(fn, ms = 250) { let timer; return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); }; },
  states: { draft: 'בהכנה', pending: 'ממתינה לאישור', published: 'פורסמה', returned: 'הוחזרה לתיקונים' }
};
document.getElementById('logout')?.addEventListener('click', async () => {
  try { await DW.api('/api/auth/logout', { method: 'POST', body: '{}' }); location.href = '/'; }
  catch (error) { DW.toast(error.message); }
});
// A failed external image never leaves a broken card.
document.addEventListener('error', event => {
  if (event.target.tagName === 'IMG' && !event.target.src.endsWith('/images/technology.svg')) event.target.src = '/images/technology.svg';
}, true);
