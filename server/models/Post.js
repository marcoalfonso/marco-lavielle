var mongoose = require('mongoose'),
	monguurl = require('monguurl');

var postSchema = mongoose.Schema({
	title: {type:String, required:'{PATH} is required!'},
	slug: { type:String, index: { unique: true } },
	subtitle: {type:String, required:'{PATH} is required!'},
	published: { type : Date, default: Date.now },
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
				subtitle: 'Welcome To My Blog', 
				body: "<p>Hi, welcome to my blog. I hope the code snippets you find in here will be useful in your coding journey. I also post stock images that can be used in your website under the creative commons licence. \n\nHopefully you will find some of these helpful. :)</p>"});
		}
	});
}

exports.createDefaultPosts = createDefaultPosts;