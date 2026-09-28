//MIDDLEWARE
var crypto = require('crypto'),
	express = require('express'),
	logger = require('morgan'),
	bodyParser = require('body-parser'),
	cookieParser = require('cookie-parser'),
	session = require('express-session'),
	passport = require('passport'),
  engines = require('consolidate');

module.exports = function(app, config) {
	app.set('views', config.rootPath + '/server/views');
  app.set('view engine', 'ejs');
	app.use(logger('dev'));
	app.use(cookieParser());
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
