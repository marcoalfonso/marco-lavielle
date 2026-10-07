const mongoose = require('mongoose');
const User = require('../models/User');
const Client = require('../models/Client');
const Post = require('../models/Post');

mongoose.set('strictQuery', false);

// Connects, then fills an empty database with its first records.
module.exports = async (config) => {
	mongoose.connection.on('error', (err) => console.error('Database error:', err.message));
	await mongoose.connect(config.db);
	console.log('marco lavielle db opened');
	await Promise.all([User.createDefaultUsers(), Client.createDefaultClients(), Post.createDefaultPosts()]);
};
