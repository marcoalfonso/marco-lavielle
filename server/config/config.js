var path = require('path');

var rootPath = path.normalize(__dirname +'/../../');

module.exports = {
	development: {
		db: 'mongodb://localhost/creating_apps',
		rootPath: rootPath,
		port: process.env.PORT || 3030,
	},
	production: {
		rootPath: rootPath,
		db: 'mongodb://marco:creating_apps@linus.mongohq.com:10037/creating_apps',
		port: process.env.PORT || 80
	}
}