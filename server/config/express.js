//MIDDLEWARE
var crypto = require('crypto'),
	express = require('express'),
	compression = require('compression'),
	logger = require('morgan'),
	bodyParser = require('body-parser'),
	cookieParser = require('cookie-parser'),
	session = require('express-session'),
	passport = require('passport');

module.exports = function(app, config) {
	app.set('views', config.rootPath + '/server/views');
  app.set('view engine', 'ejs');
	app.use(logger('dev'));
	// gzip responses: the JS bundle shrinks to about a quarter
	app.use(compression());
	app.use(cookieParser());
	// Animated links (the homepage cube, the journal): the browser navigates
	// as soon as the link is clicked, so it's an ordinary navigation that
	// Back treats normally, and this holds the page back for the length of
	// the leaving animation, which plays on in the meantime. The page sets a
	// short-lived "nav-delay" cookie of "<ms>|<path>" just before going.
	app.use(function(req, res, next) {
		var cookie = req.cookies && req.cookies['nav-delay'];
		if (!cookie || req.method !== 'GET') return next();
		var parts = String(cookie).split('|');
		var path;
		try {
			path = decodeURIComponent(parts[1] || '');
		} catch (e) {
			return next();
		}
		if (path !== req.path) return next();
		res.clearCookie('nav-delay', { path: '/' });
		var ms = Math.min(2500, Math.max(0, parseInt(parts[0], 10) || 0));
		setTimeout(next, ms);
	});
	app.use(bodyParser.urlencoded({
	  extended: true
	}));
	app.use(bodyParser.json());
	// Heroku's router sits in front of the app; trust it so req.ip is the
	// real client (the login throttle keys on it).
	app.set('trust proxy', 1);

	var sessionSecret = process.env.SESSION_SECRET;
	if (!sessionSecret) {
		// A random secret still keeps sessions unforgeable; they just don't
		// survive a restart. Set SESSION_SECRET to keep people logged in.
		sessionSecret = crypto.randomBytes(32).toString('hex');
		console.warn('SESSION_SECRET is not set; using a random per-process secret.');
	}
	app.use(session({secret: sessionSecret,
					 saveUninitialized: false,
					 resave: false,
					 cookie: {
						 httpOnly: true,
						 // not sent on cross-site POST/PUT/DELETE, which blocks CSRF
						 sameSite: 'lax'
					 }}));
	app.use(passport.initialize());
	app.use(passport.session());
	app.use(express.static(config.rootPath + '/public'));
}
