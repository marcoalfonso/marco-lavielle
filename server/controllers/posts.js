var Post = require('mongoose').model('Post');

exports.getPosts = function(req, res) {
	Post.find({}).exec(function(err, collection) {
		res.send(collection);
	});
};

exports.getPostById = function(req, res) {
	Post.findOne({_id:req.params.id}).exec(function(err, post) {
		res.send(post);
	});
};

exports.getPostBySlug = function(req, res) {
	Post.findOne({slug:req.params.slug}).exec(function(err, post) {
		res.send(post);
	});
};

exports.deletePostById = function(req, res) {
	Post.findByIdAndRemove(req.params.id, function(err, post) {
		res.send(post);
	});
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
	});
};

// Updates an existing post. It used to never reply on success (so saves
// hung in the browser) and would create a post for an unknown id.
exports.updatePost = function(req, res) {
	var obj = req.body;
	var id = obj._id;
	delete obj._id;
	if (!id) {
		res.status(400);
		return res.send({reason:'Missing _id'});
	}
	Post.updateOne({_id: id}, obj, function(err, result) {
		if(err) {
			res.status(400);
			return res.send({reason:err.toString()});
		}
		if (!result.matchedCount) {
			res.status(404);
			return res.send({reason:'Not found'});
		}
		res.send({success:true});
	});
};
