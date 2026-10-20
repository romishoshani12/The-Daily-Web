const router = require('express').Router();
const { requireRole } = require('../middleware/security');
const reporter = require('../controllers/reporter');
const staff = requireRole('reporter', 'editor');
router.get('/reporter', staff, (req, res) => res.render('workspace', { title: 'סביבת הכתב', mode: 'reporter' }));
router.get('/write/:id', staff, async (req, res) => {
  const article = await require('../services/workflow').owned(req.params.id, req.user);
  res.render('write', { title: 'עריכת כתבה', article });
});
router.get('/api/work/articles', staff, require('../controllers/work-list').list);
router.post('/api/work/articles', staff, reporter.create);
router.get('/api/work/articles/:id', staff, reporter.get);
router.patch('/api/work/articles/:id', staff, reporter.save);
router.post('/api/work/articles/:id/submit', staff, reporter.submit);
module.exports = router;
