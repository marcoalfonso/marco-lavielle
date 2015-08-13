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
		db: 'mongodb://marco_lavielle:Q0l4dXV4SHg1dWgwaDltV1dPYWl5Yi9hUTJyWHlrRHJkYzlZNEZlN2ZSQT0K@172.17.0.64:27017/marco_lavielle-production',
		port: process.env.PORT || 80
	}
};
