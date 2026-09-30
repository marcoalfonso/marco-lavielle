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

exports.deleteClientById = function(req, res) {
	Client.findByIdAndRemove(req.params.id, function(err, client) {
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

// Updates an existing client. It used to never reply on success (so saves
// hung in the browser) and would create a client for an unknown id.
exports.updateClient = function(req, res) {
	var obj = req.body;
	var id = obj._id;
	delete obj._id;
	if (!id) {
		res.status(400);
		return res.send({reason:'Missing _id'});
	}
	Client.updateOne({_id: id}, obj, function(err, result) {
		if(err) {
			res.status(400);
			return res.send({reason:err.toString()});
		}
		if (!result.matchedCount) {
			res.status(404);
			return res.send({reason:'Not found'});
		}
		res.send({success:true});
	});
};
