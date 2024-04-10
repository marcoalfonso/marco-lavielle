This is my personal website.

Node 6.12.3 and mongoDB are required to run the app.

To run locally:
1. npm install
2. mongod --dbpath=/Users/$(whoami)/data/db 
3. npm run start-server

Coded By Marco Lavielle

To deploy:
1. npm run build-prod
2. git push heroku master