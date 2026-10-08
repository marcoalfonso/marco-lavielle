const express = require('express');
const auth = require('./auth');
const users = require('../controllers/users');
const clients = require('../controllers/clients');
const posts = require('../controllers/posts');

const router = express.Router();
const admin = auth.requiresRole('admin');

router.get('/api/users', admin, users.getUsers);
router.post('/api/users', admin, users.createUser);
router.put('/api/users', auth.requiresApiLogin, users.updateUser);

router.get('/api/clients', clients.getClients);
router.post('/api/clients', admin, clients.createClient);
router.put('/api/clients', admin, clients.updateClient);
router.get('/api/clients/:id', clients.getClientById);
router.delete('/api/clients/:id', admin, clients.deleteClientById);

router.get('/api/posts', posts.getPosts);
router.post('/api/posts', admin, posts.createPost);
router.put('/api/posts', admin, posts.updatePost);
router.get('/api/posts/slug/:slug', posts.getPostBySlug);
router.get('/api/posts/:id', posts.getPostById);
router.delete('/api/posts/:id', admin, posts.deletePostById);

router.post('/login', auth.authenticate);
router.post('/logout', (req, res, next) => {
	req.logout((err) => (err ? next(err) : res.end()));
});

router.all('/api/{*rest}', (req, res) => res.sendStatus(404));

// Pages are the same for every visitor (the app fetches anything personal
// itself), so Cloudflare may keep a copy for a minute, and keep serving it
// for a day if this server is down.
const PAGE_CACHE = 'public, max-age=0, s-maxage=60, stale-while-revalidate=600, stale-if-error=86400';
const page = (template) => (req, res) => {
	res.set('Cache-Control', PAGE_CACHE);
	res.render(template);
};

// pages: Art has its own template; everything else is the React app
router.get('/art', page('index-art.ejs'));
router.get('/{*rest}', page('index-react.ejs'));

// anything that throws (or rejects) ends up here
router.use((err, req, res, next) => {
	console.error(err);
	if (res.headersSent) return next(err);
	res.status(500).send({ reason: 'Something went wrong' });
});

module.exports = router;
