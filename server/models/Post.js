const mongoose = require('mongoose');
const slugPlugin = require('./plugins/slug');

const postSchema = new mongoose.Schema({
	title: {type:String, required:'{PATH} is required!'},
	slug: { type:String, index: { unique: true } },
	subtitle: {type:String, required:'{PATH} is required!'},
	published: { type : Date, default: Date.now },
	author: {type:String},
	url: {type:String},
	photo: {type:String},
	body: {type:String}
});

postSchema.plugin(slugPlugin, { source: 'title', target: 'slug' });

const Post = mongoose.model('Post', postSchema);

// An empty database starts with a welcome post.
Post.createDefaultPosts = async () => {
	if ((await Post.countDocuments()) > 0) return;
	await Post.create({
		title: 'Hello World',
		subtitle: 'Welcome To My Blog',
		body: "<p>Hi, welcome to my blog. I hope the code snippets you find in here will be useful in your coding journey. I also post stock images that can be used in your website under the creative commons licence. \n\nHopefully you will find some of these helpful. :)</p>",
	});
};

module.exports = Post;
