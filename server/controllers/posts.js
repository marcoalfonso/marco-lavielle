var Post = require('mongoose').model('Post');

exports.getPosts = function(req, res) {
	Post.find({}).exec(function(err, collection) {
		res.send(collection);
	})
};

exports.getPostById = function(req, res) {
	Post.findOne({_id:req.params.id}).exec(function(err, course) {
		res.send(course);
	})
};

exports.createPost = function(req, res, next) {
	var postData = req.body;
	Post.create(postData, function(err, post) {
		if(err) {
			if(err.toString().indexOf('E11000') > -1) {
				err = new Error('Duplicate Post');
			}
			res.status(400);
			return res.send({reason:err.toString()});
		} else {
			res.send(post);
		}		
	})
};