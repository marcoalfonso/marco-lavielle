const path = require('node:path');

const rootPath = path.normalize(path.join(__dirname, '..', '..'));

module.exports = {
	development: {
		db: process.env.DB_URI || 'mongodb://localhost/marco_lavielle',
		rootPath,
		port: process.env.PORT || 4030,
	},
	production: {
		db: process.env.DB_URI,
		rootPath,
		port: process.env.PORT || 80,
	},
};
