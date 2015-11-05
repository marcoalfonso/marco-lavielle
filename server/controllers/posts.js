var Post = require('mongoose').model('Post');
var medium = require('medium-sdk');
var http = require('http');

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
	var options = {
	  host: 'https://api.medium.com',
	  path: '/v1/me'
	  headers: {
	    'Content-Type': 'application/json',
	    'Accept-Charset': 'utf-8',
	    'Accept': 'application/json',
	    'Authorization': 'Bearer 29ee2ce632ef5827c74ec0c50d1fb89bbe2883732c1ec8b95eabf5aad1695aacf'
	  }
	};
	callback = function(response) {
	  var str = '';

	  //another chunk of data has been recieved, so append it to `str`
	  response.on('data', function (chunk) {
	    str += chunk;
	  });

	  //the whole response has been recieved, so we just print it out here
	  response.on('end', function () {
	    console.log(str);
	  });
	}

	var req = http.request(options, callback);
	console.log("REQUEST", req);
	req.end();


	/*var postData = req.body;
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
	});*/


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