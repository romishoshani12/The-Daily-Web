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
  function draw() {
    const width = canvas.clientWidth, height = canvas.clientHeight, ratio = window.devicePixelRatio || 1;
    canvas.width = width * ratio; canvas.height = height * ratio;
    const ctx = canvas.getContext('2d'); ctx.scale(ratio, ratio); ctx.clearRect(0, 0, width, height);
    if (!chart) return;
    const left = 48, right = width - 22, top = 28, bottom = height - 45;
    const start = +new Date(chart.since), end = +new Date(chart.until);
    const byHour = new Map(chart.points.map(p => [+new Date(p.hour), p.count]));
    const points = []; for (let t = start; t <= end; t += 3600000) points.push({ t, count: byHour.get(t) || 0 });
    const max = Math.max(4, ...points.map(p => p.count));
    const x = time => left + (time - start) / (end - start) * (right - left);
    const y = count => bottom - count / max * (bottom - top);
    ctx.font = '12px Arial'; ctx.textAlign = 'right'; ctx.fillStyle = '#6a756f';
    for (let i = 0; i <= 4; i++) {
      const value = Math.round(max * i / 4), yy = y(value);
      ctx.strokeStyle = '#e5e8df'; ctx.beginPath(); ctx.moveTo(left, yy); ctx.lineTo(right, yy); ctx.stroke();
      ctx.fillText(value.toString(), left - 8, yy + 4);
    }
    ctx.beginPath(); ctx.moveTo(left, bottom); points.forEach(p => ctx.lineTo(x(p.t), y(p.count))); ctx.lineTo(x(points.at(-1).t), bottom); ctx.closePath();
    const gradient = ctx.createLinearGradient(0, top, 0, bottom); gradient.addColorStop(0, '#bed49b88'); gradient.addColorStop(1, '#bed49b08'); ctx.fillStyle = gradient; ctx.fill();
    ctx.beginPath(); points.forEach((p, i) => i ? ctx.lineTo(x(p.t), y(p.count)) : ctx.moveTo(x(p.t), y(p.count))); ctx.strokeStyle = '#215b45'; ctx.lineWidth = 2; ctx.stroke();
    ctx.lineWidth = 1; ctx.strokeStyle = '#a07835'; ctx.fillStyle = '#8c6529';
    chart.events.map((event, index) => ({ ...event, version: index + 1 })).filter(e => +new Date(e.at) >= start && +new Date(e.at) <= end).forEach((event, index) => {
      const xx = x(+new Date(event.at)); ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(xx, top); ctx.lineTo(xx, bottom); ctx.stroke(); ctx.setLineDash([]);
      ctx.textAlign = 'center'; ctx.fillText('V' + event.version, xx, top - 10);
    });
    ctx.fillStyle = '#6a756f';
    for (let i = 0; i < 5; i++) {
      const time = start + (end - start) * i / 4; ctx.textAlign = i === 0 ? 'left' : i === 4 ? 'right' : 'center';
      ctx.fillText(new Date(time).toLocaleString('he-IL', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }), x(time), height - 14);
    }
  }
})();
