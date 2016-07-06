var Client = require('mongoose').model('Client');

exports.getClients = function(req, res) {
	Client.find({}).exec(function(err, collection) {
		res.send(collection);
	});
};

exports.getClientById = function(req, res) {
	Client.findOne({_id:req.params.id}).exec(function(err, client) {
		res.send(client);
	});
};

exports.getClientBySlug = function(req, res) {
	Client.findOne({slug:req.params.slug}).exec(function(err, client) {
		res.send(client);
	});
};

exports.createClient = function(req, res, next) {
	var clientData = req.body;
	Client.create(clientData, function(err, client) {
		if(err) {
			if(err.toString().indexOf('E11000') > -1) {
				err = new Error('Duplicate Client');
			}
			res.status(400);
			return res.send({reason:err.toString()});
		} else {
			res.send(client);
		}		
	});
};