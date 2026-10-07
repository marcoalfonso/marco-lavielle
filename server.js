const path = require('node:path');
const express = require('express');
const mongoose = require('mongoose');

require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local'), quiet: true });

const env = (process.env.NODE_ENV = process.env.NODE_ENV || 'development');
const config = require('./server/config/config')[env];
const configureExpress = require('./server/config/express');
const connectDatabase = require('./server/config/mongoose');
const configurePassport = require('./server/config/passport');
const routes = require('./server/config/routes');

const app = express();
configureExpress(app, config);
configurePassport();
app.use(routes);

connectDatabase(config).catch((err) => {
	console.error('Could not connect to the database:', err.message);
	process.exit(1);
});

const server = app.listen(config.port, () => console.log(`Listening on port ${config.port}...`));

// Heroku restarts the dyno daily and on each deploy, sending SIGTERM first:
// stop taking new connections, let requests in flight finish, then close the
// database and exit (Heroku allows 30 seconds).
process.on('SIGTERM', () => {
	console.log('SIGTERM: finishing requests in flight, then exiting');
	server.close(() => mongoose.disconnect().finally(() => process.exit(0)));
	setTimeout(() => process.exit(0), 25000).unref();
});
