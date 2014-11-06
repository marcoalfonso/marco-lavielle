var mongoose = require('mongoose');

module.exports = function(config) {
	mongoose.connect(config.db);
	var db = mongoose.connection;
	db.on('error', console.error.bind(console, 'connection error..'));
	db.once('open', function callback() {
		console.log('creating apps db opened');
	});

	var userSchema = mongoose.Schema({
		firstName: String,
		lastName: String,
		username: String
	});

	var User = mongoose.model('User', userSchema);

	User.find({}).exec(function(err, collection) {
		if(collection.length === 0) {
			User.create({firstName:'Marco',lastName:'Lavielle',username:'marco'});
			User.create({firstName:'Dev',lastName:'Test',username:'dev'});
			User.create({firstName:'Dev2',lastName:'Test2',username:'dev2'});
		}
	})
}