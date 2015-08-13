var path = require('path');

var rootPath = path.normalize(__dirname +'/../../');

module.exports = {
	development: {
		db: 'mongodb://localhost/marco_lavielle',
		rootPath: rootPath,
		port: process.env.PORT || 3030,
	},
	production: {
		rootPath: rootPath,
		db: process.env.MONGO_URL,
		port: process.env.PORT || 80
	}
};
