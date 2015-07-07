var mongoose = require('mongoose'),
	monguurl = require('monguurl');

var postSchema = mongoose.Schema({
	title: {type:String, required:'{PATH} is required!'},
	slug: { type:String, index: { unique: true } },
	subtitle: {type:String, required:'{PATH} is required!'},
	published: {type:Date},
	author: {type:String},
	url: {type:String},
	photo: {type:String},
	body: {type:String}
});

postSchema.plugin(monguurl({
  source: 'title',
  target: 'slug'
}));

var Post = mongoose.model('Post', postSchema);

function createDefaultPosts() {
	Post.find({}).exec(function(err, collection) {
		if(collection.length === 0) {
			Post.create({title: 'Hello World', 
				subtitle: 'This is a test post', 
				body: "HELLO I AM A POST!!"});
		}
	});
}

exports.createDefaultPosts = createDefaultPosts;