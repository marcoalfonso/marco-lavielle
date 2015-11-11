var http = require('https');
var request = require('request');

exports.createMediumPost = function(req) {
	var postData = {
		"title": req.body.title,
		"contentFormat": "html",
		"content": req.body.body,
		"tags": [],
		"publishStatus": "draft"
	};

	var options = {
	  url: 'https://api.medium.com/v1/users/188b53a3b7edc0c4f910fb119e31773ec51d057806ad3e995613b255d95d0b5c7/posts',
	  headers: {
			'Content-Type': 'application/json',
			'Accept-Charset': 'utf-8',
			'Accept': 'application/json',
			'Authorization': 'Bearer 29ee2ce632ef5827c74ec0c50d1fb89bbe2883732c1ec8b95eabf5aad1695aacf'
		},
		method: 'POST',
		json: true,
		body: postData
	};

	function callback(error, response, body) {
		console.log('STATUS: ' + response.statusCode);
  		console.log('HEADERS: ' + JSON.stringify(response.headers));
	  	if (!error && response.statusCode == 200) {
			var info = JSON.parse(body);
			console.log(info.stargazers_count + " Stars");
			console.log(info.forks_count + " Forks");
	  	}
	}

	request(options, callback);
}
