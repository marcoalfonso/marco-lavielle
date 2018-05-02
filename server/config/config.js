var path = require('path');

var rootPath = path.normalize(__dirname +'/../../');

module.exports = {
	development: {
		db: 'mongodb://localhost/marco_lavielle',
		rootPath: rootPath,
		port: process.env.PORT || 4030,
	},
	production: {
		rootPath: rootPath,
		db: 'mongodb://heroku_x76h987r:fe6lefsp2an82ag43go39j4nfh@ds033143.mongolab.com:33143/heroku_x76h987r',
		port: process.env.PORT || 80
	}
};
