This is my personal website.

To run locally:

1. npm install
2. mongod --dbpath=/Users/$(whoami)/data/db
3. npm run start-server

Coded By Marco Lavielle

To deploy:

1. npm run build-prod
2. git push heroku master

Admin account:

- Set or reset a password (prompts, input hidden, min 12 characters):
  `heroku run node scripts/set-password.js marco`
  Locally: `node scripts/set-password.js marco` (uses DB_URI from .env.local).
- On an empty database, create the admin with
  `node scripts/set-password.js marco --create-admin`,
  or set SEED_ADMIN_PASSWORD before the first start.

Environment variables:

- DB_URI: MongoDB connection string.
- SESSION_SECRET: secret for signing session cookies. If unset, a random one
  is generated at boot and everyone is logged out on each restart.
- SEED_ADMIN_PASSWORD (optional): seeds the admin on an empty database.
