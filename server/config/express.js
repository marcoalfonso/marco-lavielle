const crypto = require('node:crypto');
const path = require('node:path');
const express = require('express');
const compression = require('compression');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('passport');

module.exports = (app, config) => {
	app.set('views', path.join(config.rootPath, 'server', 'views'));
	app.set('view engine', 'ejs');
	// Heroku's router sits in front of the app; trust it so req.ip is the
	// real client (the login throttle keys on it).
	app.set('trust proxy', 1);

	app.use(logger('dev'));
	// gzip responses: the JS bundle shrinks to about a quarter
	app.use(compression());
	app.use(cookieParser());
	app.use(express.urlencoded({ extended: true }));
	app.use(express.json());

	let sessionSecret = process.env.SESSION_SECRET;
	if (!sessionSecret) {
		// A random secret still keeps sessions unforgeable; they just don't
		// survive a restart. Set SESSION_SECRET to keep people logged in.
		sessionSecret = crypto.randomBytes(32).toString('hex');
		console.warn('SESSION_SECRET is not set; using a random per-process secret.');
	}
	app.use(
		session({
			secret: sessionSecret,
			saveUninitialized: false,
			resave: false,
			cookie: {
				httpOnly: true,
				// not sent on cross-site POST/PUT/DELETE, which blocks CSRF
				sameSite: 'lax',
			},
		}),
	);
	app.use(passport.initialize());
	app.use(passport.session());
	app.use(express.static(path.join(config.rootPath, 'public')));
};
