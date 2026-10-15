const router = require('express').Router();
router.use(require('./feed'));
router.use(require('./article'));
router.use(require('./reporter'));
router.use(require('./editor'));
router.use(require('./auth'));
router.use(require('./admin'));
router.use(require('./analytics'));
module.exports = router;