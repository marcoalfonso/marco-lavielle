//MIDDLEWARE
var express = require('express'),
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
	app.use(session({secret: 'creating apps unicorns',
					 saveUninitialized: true,
					 resave: true}));
	app.use(passport.initialize());
	app.use(passport.session());
	app.use(express.static(config.rootPath + '/public'));
}
