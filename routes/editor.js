const router = require('express').Router();
const { requireRole } = require('../middleware/security');
const editor = require('../controllers/editor');
const role = requireRole('editor');
router.get('/editor', role, (req, res) => res.render('workspace', { title: 'דסק העורך', mode: 'editor' }));
router.post('/api/work/articles/:id/review', role, editor.review);
router.delete('/api/work/articles/:id', role, editor.remove);
module.exports = router;
