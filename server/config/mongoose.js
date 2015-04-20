var mongoose = require('mongoose'),
	userModel = require('../models/User')
	clientModel = require('../models/Client');

module.exports = function(config) {
	mongoose.connect(config.db);
	var db = mongoose.connection;
	db.on('error', console.error.bind(console, 'connection error..'));
	db.once('open', function callback() {
		console.log('marco lavielle db opened');
	});

	userModel.createDefaultUsers();
	clientModel.createDefaultClients();
	console.log(mongoose.connection.readyState);
};

