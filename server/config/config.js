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
		db: 'mongodb://marco_lavielle:Z3JEZm15czBGVFRLRnJVN1A0NkNrNlFBNUNySlI1aUcxMkRvcTJ0V2RuQT0K@172.17.0.14:27017/marco_lavielle-production',
		port: process.env.PORT || 80
	}
};
