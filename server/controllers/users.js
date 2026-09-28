var User = require('mongoose').model('User'),
	encrypt = require('../utilities/encryption');

var ALLOWED_ROLES = ['admin'];

function passwordError(password) {
	if (typeof password !== 'string' || password.length < encrypt.MIN_PASSWORD_LENGTH) {
		return 'Password must be at least ' + encrypt.MIN_PASSWORD_LENGTH + ' characters';
	}
	return null;
}

function cleanRoles(roles) {
	return Array.isArray(roles) ? roles.filter(function(r) { return ALLOWED_ROLES.indexOf(r) > -1; }) : [];
}

exports.getUsers = function(req, res) {
	User.find({}).exec(function(err, collection) {
		res.send(collection);
	});
};

// Admin only (see routes). Fields are whitelisted so the request body can't
// set salt/hash directly, and the admin's session is not swapped for the new
// user's.
exports.createUser = function(req, res) {
	var body = req.body || {};
	if (typeof body.username !== 'string' || !body.username.trim()) {
		res.status(400);
		return res.send({reason:'Username is required'});
	}
	var pwdError = passwordError(body.password);
	if (pwdError) {
		res.status(400);
		return res.send({reason:pwdError});
	}
	var user = new User({
		firstName: body.firstName,
		lastName: body.lastName,
		username: body.username.trim().toLowerCase(),
		roles: cleanRoles(body.roles),
	});
	user.setPassword(body.password);
	user.save(function(err) {
		if(err) {
			if(err.toString().indexOf('E11000') > -1) {
				err = new Error('Duplicate Username');
			}
			res.status(400);
			return res.send({reason:err.toString()});
		}
		res.status(201);
		res.send(user);
	});
};

// Logged-in users may edit themselves; admins may edit anyone. Only admins
// can change roles.
exports.updateUser = function(req, res) {
	var body = req.body || {};
	var isAdmin = req.user.hasRole('admin');
	var targetId = body._id ? String(body._id) : String(req.user._id);

	if(targetId !== String(req.user._id) && !isAdmin) {
		res.status(403);
		return res.end();
	}

	User.findById(targetId).exec(function(err, user) {
		if(err || !user) {
			res.status(404);
			return res.end();
		}
		if(typeof body.firstName === 'string') user.firstName = body.firstName;
		if(typeof body.lastName === 'string') user.lastName = body.lastName;
		if(typeof body.username === 'string' && body.username.trim()) {
			user.username = body.username.trim().toLowerCase();
		}
		if(body.password !== undefined && body.password !== '') {
			var pwdError = passwordError(body.password);
			if(pwdError) {
				res.status(400);
				return res.send({reason:pwdError});
			}
			user.setPassword(body.password);
		}
		if(isAdmin && body.roles !== undefined) {
			user.roles = cleanRoles(body.roles);
		}
		user.save(function(err) {
			if(err) { res.status(400); return res.send({reason:err.toString()});}
			res.send(user);
		});
	});
};
