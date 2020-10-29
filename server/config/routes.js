//ROUTES

var auth = require('./auth'),
	users = require('../controllers/users'),
	clients = require('../controllers/clients'),
	posts = require('../controllers/posts'),
	mongoose = require('mongoose'),
	User = mongoose.model('User');

module.exports = function(app) {

	app.get('/api/users', auth.requiresRole('admin'), users.getUsers);

	app.post('/api/users', users.createUser);

	app.put('/api/users', users.updateUser);

	app.get('/api/clients', clients.getClients);

	app.post('/api/clients', clients.createClient);

	app.get('/api/clients/:id', clients.getClientById);

	app.get('/api/clients/:slug', clients.getClientBySlug);

	app.delete('/api/clients/:id', clients.deleteClientById);

	app.post('/api/posts', posts.createPost);

	app.get('/api/posts', posts.getPosts);

	app.get('/api/posts/:id', posts.getPostById);

	app.get('/api/posts/:slug', posts.getPostBySlug);

	app.delete('/api/posts/:id', posts.deletePostById);

	app.put('/api/posts', posts.updatePost);

  app.get('/art', function(req, res) {
		res.render('index-art.ejs');
	});

	app.post('/login', auth.authenticate);

	app.post('/logout', function(req, res) {
		req.logout();
		res.end();
	});

	app.all('/api/*', function(req, res) {
		res.send(404);
	});

	app.get('*', function(req, res) {
		res.render('index-react.ejs', {
			bootstrappedUser: req.user
		});
	});
};
