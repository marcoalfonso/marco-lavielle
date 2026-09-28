var passport = require('passport');

// Simple in-memory login throttle: MAX_ATTEMPTS failed logins per IP per
// window. Enough for a single-dyno personal site; resets on restart.
var MAX_ATTEMPTS = 10;
var WINDOW_MS = 15 * 60 * 1000;
var failedLogins = {};

function tooManyAttempts(ip) {
	var entry = failedLogins[ip];
	if (!entry) return false;
	if (Date.now() > entry.resetAt) {
		delete failedLogins[ip];
		return false;
	}
	return entry.count >= MAX_ATTEMPTS;
}

function recordFailure(ip) {
	// keep the map bounded if many different IPs try
	var ips = Object.keys(failedLogins);
	if (ips.length > 5000) {
		var now = Date.now();
		ips.forEach(function(key) {
			if (now > failedLogins[key].resetAt) delete failedLogins[key];
		});
	}
	var entry = failedLogins[ip];
	if (!entry || Date.now() > entry.resetAt) {
		entry = failedLogins[ip] = { count: 0, resetAt: Date.now() + WINDOW_MS };
	}
	entry.count++;
}

exports.authenticate = function(req, res, next) {
	var ip = req.ip;
	if (tooManyAttempts(ip)) {
		res.status(429);
		return res.send({success:false, reason:'Too many login attempts, try again later'});
	}
	if (typeof req.body.username !== 'string' || typeof req.body.password !== 'string') {
		recordFailure(ip);
		return res.send({success:false});
	}
	req.body.username = req.body.username.toLowerCase();
	var auth = passport.authenticate('local', function(err, user) {
		if(err) {return next(err);}
		if(!user) {
			recordFailure(ip);
			return res.send({success:false});
		}
		delete failedLogins[ip];
		req.logIn(user, function(err) {
			if(err) {return next(err);}
			res.send({success:true, user: user});
		});
	});
	auth(req, res, next);
};

exports.requiresApiLogin = function(req,res, next) {
	if(!req.isAuthenticated()) {
		res.status(403);
		res.end();
	} else {
		next();
	}
};

exports.requiresRole = function(role) {
	return function(req, res, next) {
		if(!req.isAuthenticated() || req.user.roles.indexOf(role) === -1) {
			res.status(403);
			res.end();
		} else {
			next();
		}
	};
};
