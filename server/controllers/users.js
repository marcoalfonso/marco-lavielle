const User = require('../models/User');
const encrypt = require('../utilities/encryption');

const ALLOWED_ROLES = ['admin'];

const passwordError = (password) =>
	typeof password !== 'string' || password.length < encrypt.MIN_PASSWORD_LENGTH
		? `Password must be at least ${encrypt.MIN_PASSWORD_LENGTH} characters`
		: null;

const cleanRoles = (roles) => (Array.isArray(roles) ? roles.filter((r) => ALLOWED_ROLES.includes(r)) : []);

const saveError = (err) => (err && err.code === 11000 ? new Error('Duplicate Username') : err);

exports.getUsers = async (req, res) => {
	res.send(await User.find({}));
};

// Admin only (see routes). Fields are whitelisted so the request body can't
// set salt/hash directly, and the admin's session is not swapped for the new
// user's.
exports.createUser = async (req, res) => {
	const body = req.body || {};
	if (typeof body.username !== 'string' || !body.username.trim()) {
		return res.status(400).send({ reason: 'Username is required' });
	}
	const pwdError = passwordError(body.password);
	if (pwdError) return res.status(400).send({ reason: pwdError });

	const user = new User({
		firstName: body.firstName,
		lastName: body.lastName,
		username: body.username.trim().toLowerCase(),
		roles: cleanRoles(body.roles),
	});
	user.setPassword(body.password);
	try {
		await user.save();
		res.status(201).send(user);
	} catch (err) {
		res.status(400).send({ reason: saveError(err).toString() });
	}
};

// Logged-in users may edit themselves; admins may edit anyone. Only admins
// can change roles.
exports.updateUser = async (req, res) => {
	const body = req.body || {};
	const isAdmin = req.user.hasRole('admin');
	const targetId = body._id ? String(body._id) : String(req.user._id);
	if (targetId !== String(req.user._id) && !isAdmin) return res.status(403).end();

	let user;
	try {
		user = await User.findById(targetId);
	} catch (err) {
		user = null;
	}
	if (!user) return res.status(404).end();

	if (typeof body.firstName === 'string') user.firstName = body.firstName;
	if (typeof body.lastName === 'string') user.lastName = body.lastName;
	if (typeof body.username === 'string' && body.username.trim()) {
		user.username = body.username.trim().toLowerCase();
	}
	if (body.password !== undefined && body.password !== '') {
		const pwdError = passwordError(body.password);
		if (pwdError) return res.status(400).send({ reason: pwdError });
		user.setPassword(body.password);
	}
	if (isAdmin && body.roles !== undefined) user.roles = cleanRoles(body.roles);

	try {
		await user.save();
		res.send(user);
	} catch (err) {
		res.status(400).send({ reason: saveError(err).toString() });
	}
};
