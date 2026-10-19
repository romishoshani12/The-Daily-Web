const router = require('express').Router();
const auth = require('../controllers/auth');
router.get('/login', (req, res) => {
  if (req.user) return res.redirect(req.user.role === 'editor' ? '/editor' : '/reporter');
  res.render('login', { title: 'כניסה למערכת' });
});
router.post('/api/auth/login', auth.login);
router.post('/api/auth/logout', auth.logout);
module.exports = router;