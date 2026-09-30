var net = require('net');
var passport = require('passport');

// Simple in-memory login throttles, both counting failed logins in a
// 15-minute window (enough for a single-dyno personal site; they reset on
// restart):
//  - per client IP, 10 failures: stops one source hammering the form
//  - per username, 20 failures from any IPs: stops a guesser spreading
//    attempts over many IPs. The trade-off: 20 bad attempts at a username
//    also lock its owner out until the window ends.
var WINDOW_MS = 15 * 60 * 1000;

function createThrottle(maxFailures) {
	var failures = {};
	return {
		blocked: function(key) {
			var entry = failures[key];
			if (!entry) return false;
			if (Date.now() > entry.resetAt) {
				delete failures[key];
				return false;
			}
			return entry.count >= maxFailures;
		},
		fail: function(key) {
			// keep the map bounded if many different keys are tried
			var keys = Object.keys(failures);
			if (keys.length > 5000) {
				var now = Date.now();
				keys.forEach(function(k) {
					if (now > failures[k].resetAt) delete failures[k];
				});
			}
			var entry = failures[key];
			if (!entry || Date.now() > entry.resetAt) {
				entry = failures[key] = { count: 0, resetAt: Date.now() + WINDOW_MS };
			}
			entry.count++;
		},
		clear: function(key) {
			delete failures[key];
		}
	};
}

var byIp = createThrottle(10);
var byUsername = createThrottle(20);

// Cloudflare's edge ranges (https://www.cloudflare.com/ips/, September 2026).
// Traffic to www.marcolavielle.com reaches Heroku through Cloudflare, so the
// address Heroku sees is a Cloudflare edge shared by many visitors; the
// visitor's own address is in the CF-Connecting-IP header. That header is
// only believed when the request really came from one of these ranges, since
// anyone reaching the app directly could send it too.
var cloudflare = new net.BlockList();
[
	'173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22',
	'141.101.64.0/18', '108.162.192.0/18', '190.93.240.0/20', '188.114.96.0/20',
	'197.234.240.0/22', '198.41.128.0/17', '162.158.0.0/15', '104.16.0.0/13',
	'104.24.0.0/14', '172.64.0.0/13', '131.0.72.0/22'
].forEach(function(range) {
	var parts = range.split('/');
	cloudflare.addSubnet(parts[0], Number(parts[1]), 'ipv4');
});
[
	'2400:cb00::/32', '2606:4700::/32', '2803:f800::/32', '2405:b500::/32',
	'2405:8100::/32', '2a06:98c0::/29', '2c0f:f248::/32'
].forEach(function(range) {
	var parts = range.split('/');
	cloudflare.addSubnet(parts[0], Number(parts[1]), 'ipv6');
});

function fromCloudflare(ip) {
	var type = net.isIP(ip);
	return type !== 0 && cloudflare.check(ip, type === 4 ? 'ipv4' : 'ipv6');
}

// The visitor's address. req.ip is the address that connected to Heroku's
// router ('trust proxy' is 1); behind Cloudflare that's an edge server.
function clientIp(req) {
	var peer = (req.ip || '').replace(/^::ffff:/, '');
	if (fromCloudflare(peer)) {
		var visitor = req.get('CF-Connecting-IP');
		if (visitor && net.isIP(visitor)) return visitor;
	}
	return peer;
}

exports.authenticate = function(req, res, next) {
	var ip = clientIp(req);
	var username = typeof req.body.username === 'string' ? req.body.username.toLowerCase() : null;
	if (byIp.blocked(ip) || (username && byUsername.blocked(username))) {
		res.status(429);
		return res.send({success:false, reason:'Too many login attempts, try again later'});
	}
	if (!username || typeof req.body.password !== 'string') {
		byIp.fail(ip);
		return res.send({success:false});
	}
	req.body.username = username;
	var auth = passport.authenticate('local', function(err, user) {
		if(err) {return next(err);}
		if(!user) {
			byIp.fail(ip);
			byUsername.fail(username);
			return res.send({success:false});
		}
		byIp.clear(ip);
		byUsername.clear(username);
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
