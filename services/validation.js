const { CATEGORIES } = require('../config/constants');
function fail(message, status = 400) {
  const error = new Error(message); error.status = status; throw error;
}
function text(value, max, required = true) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) {
    fail('יש למלא את השדות כנדרש ולשמור על מגבלת האורך.');
  }
  return value.trim();
}
function content(body, complete = false) {
  const result = {
    title: text(body.title, 180, complete), summary: text(body.summary, 450, complete),
    body: text(body.body, 60000, complete), category: text(body.category, 30),
    image: text(body.image || '/images/technology.svg', 1000)
  };
  if (!CATEGORIES.includes(result.category)) fail('קטגוריה לא תקינה.');
  if (!/^\/images\/[a-z-]+\.svg$/.test(result.image)) {
    let url; try { url = new URL(result.image); } catch { fail('כתובת התמונה אינה תקינה.'); }
    if (url.protocol !== 'https:') fail('תמונה חיצונית חייבת להשתמש ב־HTTPS.');
  }
  return result;
}
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
module.exports = { fail, text, content, escapeRegex };
