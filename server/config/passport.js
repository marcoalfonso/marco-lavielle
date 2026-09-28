var passport = require('passport'),
	mongoose = require('mongoose'),
	LocalStrategy = require('passport-local').Strategy,
	User = mongoose.model('User');

module.exports = function() {
	var User = mongoose.model('User');
	passport.use(new LocalStrategy(
		function(username, password, done) {
			// Only plain strings: an object like {"$gt": ""} would otherwise
			// be passed straight into the Mongo query.
			if (typeof username !== 'string' || typeof password !== 'string') {
				return done(null, false);
			}
			User.findOne({username:username}).exec(function(err, user) {
				if(err) { return done(err); }
				if(!user || !user.authenticate(password)) {
					return done(null, false);
				}
				// Transparently move old SHA1 hashes to scrypt.
				if(user.needsRehash()) {
					user.setPassword(password);
					return user.save(function(saveErr) {
						done(saveErr || null, saveErr ? false : user);
					});
				}
				return done(null, user);
			})
		}
	));

	passport.serializeUser(function(user, done){
		if(user) {
			done(null, user._id);
		}  
	});

	passport.deserializeUser(function(id, done) {
		User.findOne({_id:id}).exec(function(err, user) {
			if(user) {
				return done(null, user);
			} else {
				return done(null, false);
			}
		})
	});
}