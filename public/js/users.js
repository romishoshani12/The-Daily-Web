'use strict';
(() => {
  const list = document.getElementById('users-list'); const form = document.getElementById('user-form');
  function reset() {
    form.reset(); form.elements.id.value = ''; form.elements.username.disabled = false; form.elements.password.required = true;
    document.getElementById('user-form-title').textContent = 'צירוף איש צוות';
  }
  let generation = 0;
  async function load() {
    const current = ++generation;
    try {
      const users = await DW.api('/api/users?q=' + encodeURIComponent(document.getElementById('user-search').value));
      if (current !== generation) return; list.replaceChildren();
      users.forEach(user => {
        const row = DW.node('article', 'user-row'); const details = DW.node('div');
        const info = DW.node('p'); info.append(DW.node('bdi', '', user.username), ' · ' + (user.role === 'editor' ? 'עורך' : 'כתב') + (user.active ? '' : ' · מושבת'));
        details.append(DW.node('h2', '', user.name), info);
        const controls = DW.node('div'); const edit = DW.node('button', 'text-button', 'עריכה'); const remove = DW.node('button', 'text-button danger', 'מחיקה');
        edit.addEventListener('click', () => {
          form.elements.id.value = user._id; form.elements.name.value = user.name; form.elements.username.value = user.username;
          form.elements.username.disabled = true; form.elements.role.value = user.role; form.elements.active.checked = user.active;
          form.elements.password.value = ''; form.elements.password.required = false;
          document.getElementById('user-form-title').textContent = 'עריכת איש צוות'; form.elements.name.focus();
        });
        remove.addEventListener('click', async () => {
          if (!confirm('למחוק את המשתמש ' + user.name + '?')) return;
          try { await DW.api('/api/users/' + user._id, { method: 'DELETE' }); load(); }
          catch (error) { DW.toast(error.message); }
        });
        controls.append(edit, remove); row.append(DW.node('span', 'avatar', user.name.slice(0, 1)), details, controls); list.append(row);
      });
      if (!users.length) list.append(DW.node('p', 'empty', 'לא נמצאו משתמשים.'));
    } catch (error) { DW.toast(error.message); }
  }
  form.addEventListener('submit', async event => {
    event.preventDefault(); const submit = form.querySelector('[type=submit]'); submit.disabled = true;
    const data = Object.fromEntries(new FormData(form)); data.active = form.elements.active.checked;
    try {
      await DW.api('/api/users' + (data.id ? '/' + data.id : ''), { method: data.id ? 'PATCH' : 'POST', body: JSON.stringify(data) });
      reset(); form.querySelector('.form-message').textContent = ''; DW.toast('המשתמש נשמר'); await load();
    } catch (error) { form.querySelector('.form-message').textContent = error.message; }
    finally { submit.disabled = false; }
  });
  document.getElementById('reset-user').addEventListener('click', reset);
  document.getElementById('user-search').addEventListener('input', DW.debounce(load)); load();
})();
