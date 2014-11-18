var mongoose = require('mongoose'),
	encrypt = require('../utilities/encryption');


var userSchema = mongoose.Schema({
	firstName: {type:String, required:'{PATH} is required!'},
	lastName: {type:String, required:'{PATH} is required!'},
	username: {
		type: String,
		required: '{PATH} is required',
		unique: true
	},
	salt: {type:String, required:'{PATH} is required!'},
	hashed_pwd: {type:String, required:'{PATH} is required!'},
	roles: [String]
});
userSchema.methods = {
	authenticate: function(passwordToMatch) {
		return encrypt.hashPwd(this.salt, passwordToMatch) === this.hashed_pwd;
	},
	hasRole: function(role) {
		return this.roles.indexOf(role) > -1;
	}
};
var User = mongoose.model('User', userSchema);

function createDefaultUsers() {
	User.find({}).exec(function(err, collection) {
		if(collection.length === 0) {
			var salt, hash;
			salt = encrypt.createSalt();
			hash = encrypt.hashPwd(salt, 'marco');
			User.create({firstName:'Marco',lastName:'Lavielle',username:'marco',salt: salt, hashed_pwd: hash, roles: ['admin']});
			salt = encrypt.createSalt();
			hash = encrypt.hashPwd(salt, 'dev');
			User.create({firstName:'Dev',lastName:'Test',username:'dev',salt: salt, hashed_pwd: hash, roles: []});
			salt = encrypt.createSalt();
			hash = encrypt.hashPwd(salt, 'dev2');
			User.create({firstName:'Dev2',lastName:'Test2',username:'dev2',salt: salt, hashed_pwd: hash}); 
		}
	})
};

exports.createDefaultUsers = createDefaultUsers;