var Client = require('mongoose').model('Client');

exports.getClients = function(req, res) {
	Client.find({}).exec(function(err, collection) {
		res.send(collection);
	})
};

exports.getClientById = function(req, res) {
	Client.findOne({_id:req.params.id}).exec(function(err, course) {
		res.send(course);
	})
}