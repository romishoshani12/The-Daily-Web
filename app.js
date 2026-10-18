const express = require('express');
const path = require('node:path');
const { identify } = require('./middleware/security');
const { CATEGORIES, STATE_LABELS } = require('./config/constants');
function createApp() {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32 || process.env.SESSION_SECRET.startsWith('replace-')) throw new Error('Set a random SESSION_SECRET with at least 32 characters.');
  const app = express();
  app.disable('x-powered-by');
  app.set('view engine', 'ejs'); app.set('views', path.join(__dirname, 'views'));
  app.locals.user = null; app.locals.csrf = '';
  app.locals.categories = CATEGORIES; app.locals.stateLabels = STATE_LABELS;
  app.locals.date = value => new Date(value).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
  app.use((req, res, next) => {
    res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' https:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" });
    next();
  });
  app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));
  app.use(express.json({ limit: '100kb' }));
  app.use(identify);
  app.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.use(require('./routes'));
  app.use((req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'הנתיב לא נמצא.' });
    res.status(404).render('error', { title: 'העמוד לא נמצא', message: 'נראה שהסיפור הזה נמצא במקום אחר.', status: 404 });
  });
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status = error.status || (error.name === 'CastError' || error.name === 'ValidationError' ? 400 : error.code === 11000 ? 409 : 500);
    const message = status === 500 ? 'משהו השתבש. נסו שוב בעוד רגע.' : error.code === 11000 ? 'הרשומה כבר קיימת.' : error.message;
    console.error(JSON.stringify({ event: 'request.error', status, path: req.path, message: error.message, at: new Date() }));
    if (req.path.startsWith('/api/')) return res.status(status).json({ error: message });
    res.status(status).render('error', { title: 'לא הצלחנו להשלים את הבקשה', message, status });
  });
  return app;
}
module.exports = { createApp };
