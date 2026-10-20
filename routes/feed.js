const router = require('express').Router();
const feed = require('../controllers/feed');
const { weather } = require('../services/weather');
router.get('/', (req, res) => res.render('home', { title: 'חדשות עם נקודת מבט' }));
router.get('/api/articles', feed.feed);
router.get('/api/weather', async (req, res) => res.json(await weather()));
module.exports = router;
