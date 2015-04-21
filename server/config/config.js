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
		db: 'mongodb://marco_lavielle:Vy9icjlzcjIrR1VoZ3FyOHRpd3ZNcVE4UWgzSjBucFFlR3FtVTRCZXNsQT0K@172.17.0.33:27017/marco_lavielle-production',
		port: process.env.PORT || 80
	}
}