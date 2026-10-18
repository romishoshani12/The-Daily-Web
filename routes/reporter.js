const router = require('express').Router();
const { requireRole } = require('../middleware/security');
const staff = requireRole('reporter', 'editor');
router.get('/api/work/articles', staff, require('../controllers/work-list').list);
module.exports = router;
