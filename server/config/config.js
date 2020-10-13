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
		db: process.env.MONGOLAB_URI,
		port: process.env.PORT || 80
	}
};
