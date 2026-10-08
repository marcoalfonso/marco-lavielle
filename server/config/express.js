const crypto = require('node:crypto');
const path = require('node:path');
const express = require('express');
const compression = require('compression');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('passport');
const assetUrls = require('./assets');

module.exports = (app, config) => {
	app.set('views', path.join(config.rootPath, 'server', 'views'));
	app.set('view engine', 'ejs');
	// Heroku's router sits in front of the app; trust it so req.ip is the
	// real client (the login throttle keys on it).
	app.set('trust proxy', 1);

	// Heroku's router already logs every request in production
	if (process.env.NODE_ENV !== 'production') app.use(logger('dev'));
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
	// Static files, with caching that lets Cloudflare serve them from its edge
	// instead of asking this server on every request:
	//  - versioned URLs (?v=..., see assets.js) never change: a year
	//  - images, fonts, icons: a week (new artwork gets a new file name)
	//  - anything else: five minutes
	const publicDir = path.join(config.rootPath, 'public');
	app.locals.asset = assetUrls(publicDir);
	const production = process.env.NODE_ENV === 'production';
	const IMAGE = /\.(jpe?g|png|gif|webp|avif|svg|ico|woff2?|webmanifest)$/i;
	app.use(
		express.static(publicDir, {
			cacheControl: false,
			// only files served from public/ get these (never the API or pages)
			setHeaders: (res, filePath) => {
				// development: always check for a fresh copy (with no header at all,
				// browsers guess, and can keep showing an old bundle)
				if (!production) return res.set('Cache-Control', 'no-cache');
				if (res.req.query.v) {
					res.set('Cache-Control', 'public, max-age=31536000, immutable');
				} else if (IMAGE.test(filePath)) {
					res.set('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400, stale-if-error=604800');
				} else {
					res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600, stale-if-error=86400');
				}
			},
		}),
	);
};
