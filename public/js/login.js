'use strict';
const loginForm = document.getElementById('login-form');
loginForm.addEventListener('submit', async event => {
  event.preventDefault(); const button = loginForm.querySelector('button'); button.disabled = true;
  const message = loginForm.querySelector('.form-message'); message.textContent = '';
  try {
    const data = await DW.api('/api/auth/login', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(loginForm))) });
    location.href = data.redirect;
  } catch (error) { message.textContent = error.message; button.disabled = false; }
});
