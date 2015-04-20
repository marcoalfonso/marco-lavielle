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
		db: 'mongodb://marco_lavielle:ZWxuL1NzdHF1cXpIL3hZeUhiK3NJbXBmUTdSQ3Q2VHp6V0xzTXpkalVSMD0K@172.17.0.14:27017/marco_lavielle-production',
		port: process.env.PORT || 80
	}
}

