var mongoose = require('mongoose');

var clientSchema = mongoose.Schema({
	name: {type:String, required:'{PATH} is required!'},
	featured: {type:Boolean, required:'{PATH} is required!'},
	published: {type:Date, required:'{PATH} is required!'},
	tags: [String]
});

var Client = mongoose.model('Client', clientSchema);

function createDefaultClients() {
	Client.find({}).exec(function(err, collection) {
		if(collection.length === 0) {
			Client.create({name: 'Commercial Real Estate', featured: true, published: new Date('10/5/2013'), tags: ['KnockoutJS']});
		    Client.create({name: 'LawPath', featured: true, published: new Date('10/12/2013'), tags: ['Ruby On Rails']});
		    Client.create({name: 'A-lift', featured: false, published: new Date('10/1/2013'), tags: ['Wordpress']});
		    Client.create({name: 'Ad-Roller', featured: false, published: new Date('7/12/2013'), tags: ['Wordpress']});
		}
	})
}

exports.createDefaultClients = createDefaultClients;