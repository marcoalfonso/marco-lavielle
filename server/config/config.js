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
		db: 'mongodb://marco_lavielle:@172.17.0.64:27017/lavielle-production',
		port: process.env.PORT || 80
	}
};
