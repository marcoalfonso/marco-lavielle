var Post = require('mongoose').model('Post');
var http = require('http');
var request = require('request');
var medium = require('./medium');

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
	console.log("REQUEST", req);
	
	medium.createMediumPost(req);

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

exports.updatePost = function(req, res) {
	var obj = req.body;
	var id = obj._id;
	delete obj._id;
	if (id) {
		Post.update({_id: id}, obj, {upsert: true}, function(err) {
			if(err) {
				res.status(400);
				return res.send({reason:err.toString()});
			}
		});
	}
};
