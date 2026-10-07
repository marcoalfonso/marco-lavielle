const net = require('node:net');
const passport = require('passport');

// Simple in-memory login throttles, both counting failed logins in a
// 15-minute window (enough for a single-dyno personal site; they reset on
// restart):
//  - per client IP, 10 failures: stops one source hammering the form
//  - per username, 20 failures from any IPs: stops a guesser spreading
//    attempts over many IPs. The trade-off: 20 bad attempts at a username
//    also lock its owner out until the window ends.
const WINDOW_MS = 15 * 60 * 1000;

const createThrottle = (maxFailures) => {
	const failures = new Map();
	const live = (key) => {
		const entry = failures.get(key);
		if (entry && Date.now() > entry.resetAt) {
			failures.delete(key);
			return null;
		}
		return entry;
	};
	return {
		blocked: (key) => {
			const entry = live(key);
			return !!entry && entry.count >= maxFailures;
		},
		fail: (key) => {
			// keep the map bounded if many different keys are tried
			if (failures.size > 5000) {
				for (const k of failures.keys()) live(k);
			}
			const entry = live(key) || { count: 0, resetAt: Date.now() + WINDOW_MS };
			entry.count++;
			failures.set(key, entry);
		},
		clear: (key) => failures.delete(key),
	};
};

const byIp = createThrottle(10);
const byUsername = createThrottle(20);

// Cloudflare's edge ranges (https://www.cloudflare.com/ips/, September 2026).
// Traffic to www.marcolavielle.com reaches Heroku through Cloudflare, so the
// address Heroku sees is a Cloudflare edge shared by many visitors; the
// visitor's own address is in the CF-Connecting-IP header. That header is
// only believed when the request really came from one of these ranges, since
// anyone reaching the app directly could send it too.
const cloudflare = new net.BlockList();
const CLOUDFLARE_V4 = [
	'173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22',
	'141.101.64.0/18', '108.162.192.0/18', '190.93.240.0/20', '188.114.96.0/20',
	'197.234.240.0/22', '198.41.128.0/17', '162.158.0.0/15', '104.16.0.0/13',
	'104.24.0.0/14', '172.64.0.0/13', '131.0.72.0/22',
];
const CLOUDFLARE_V6 = [
	'2400:cb00::/32', '2606:4700::/32', '2803:f800::/32', '2405:b500::/32',
	'2405:8100::/32', '2a06:98c0::/29', '2c0f:f248::/32',
];
for (const [ranges, type] of [[CLOUDFLARE_V4, 'ipv4'], [CLOUDFLARE_V6, 'ipv6']]) {
	for (const range of ranges) {
		const [address, prefix] = range.split('/');
		cloudflare.addSubnet(address, Number(prefix), type);
	}
}

const fromCloudflare = (ip) => {
	const type = net.isIP(ip);
	return type !== 0 && cloudflare.check(ip, type === 4 ? 'ipv4' : 'ipv6');
};

// The visitor's address. req.ip is the address that connected to Heroku's
// router ('trust proxy' is 1); behind Cloudflare that's an edge server.
const clientIp = (req) => {
	const peer = (req.ip || '').replace(/^::ffff:/, '');
	if (fromCloudflare(peer)) {
		const visitor = req.get('CF-Connecting-IP');
		if (visitor && net.isIP(visitor)) return visitor;
	}
	return peer;
};

exports.authenticate = (req, res, next) => {
	const ip = clientIp(req);
	const body = req.body || {};
	const username = typeof body.username === 'string' ? body.username.toLowerCase() : null;
	if (byIp.blocked(ip) || (username && byUsername.blocked(username))) {
		return res.status(429).send({ success: false, reason: 'Too many login attempts, try again later' });
	}
	if (!username || typeof body.password !== 'string') {
		byIp.fail(ip);
		return res.send({ success: false });
	}
	body.username = username;
	passport.authenticate('local', (err, user) => {
		if (err) return next(err);
		if (!user) {
			byIp.fail(ip);
			byUsername.fail(username);
			return res.send({ success: false });
		}
		byIp.clear(ip);
		byUsername.clear(username);
		req.logIn(user, (loginErr) => {
			if (loginErr) return next(loginErr);
			res.send({ success: true, user });
		});
	})(req, res, next);
};

exports.requiresApiLogin = (req, res, next) => {
	if (!req.isAuthenticated()) return res.status(403).end();
	next();
};

exports.requiresRole = (role) => (req, res, next) => {
	if (!req.isAuthenticated() || !req.user.hasRole(role)) return res.status(403).end();
	next();
};
