const passport = require('passport');
const { Strategy: LocalStrategy } = require('passport-local');
const User = require('../models/User');

module.exports = () => {
	passport.use(
		new LocalStrategy(async (username, password, done) => {
			// Only plain strings: an object like {"$gt": ""} would otherwise be
			// passed straight into the Mongo query.
			if (typeof username !== 'string' || typeof password !== 'string') return done(null, false);
			try {
				const user = await User.findOne({ username });
				if (!user || !user.authenticate(password)) return done(null, false);
				// Transparently move old SHA1 hashes to scrypt.
				if (user.needsRehash()) {
					user.setPassword(password);
					await user.save();
				}
				return done(null, user);
			} catch (err) {
				return done(err);
			}
		}),
	);

	passport.serializeUser((user, done) => done(null, String(user._id)));

	passport.deserializeUser(async (id, done) => {
		try {
			done(null, (await User.findById(id)) || false);
		} catch (err) {
			done(err);
		}
	});
};
