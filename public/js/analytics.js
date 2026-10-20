'use strict';
(() => {
  const select = document.getElementById('analytics-article'); const canvas = document.getElementById('impact-chart');
  let chart = null, generation = 0, searchGeneration = 0;
  async function articles() {
    const current = ++searchGeneration; ++generation;
    try {
      const data = await DW.api('/api/work/articles?q=' + encodeURIComponent(document.getElementById('analytics-search').value));
      if (current !== searchGeneration) return;
      select.replaceChildren();
      data.items.forEach(article => { const option = DW.node('option', '', article.draft.title || 'ללא כותרת'); option.value = article._id; select.append(option); });
      if (select.value) load(); else {
        chart = null; draw(); document.getElementById('analytics-message').textContent = 'לא נמצאו כתבות. נסו חיפוש אחר.';
        ['range-total', 'all-total', 'updates-total'].forEach(id => { document.getElementById(id).textContent = '—'; });
        document.getElementById('stats-table').replaceChildren(); document.getElementById('publication-events').replaceChildren();
      }
    } catch (error) { DW.toast(error.message); }
  }
})();
