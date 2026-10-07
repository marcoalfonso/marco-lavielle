const path = require('node:path');
const express = require('express');

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

app.listen(config.port, () => console.log(`Listening on port ${config.port}...`));
