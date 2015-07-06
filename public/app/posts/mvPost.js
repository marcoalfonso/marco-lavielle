angular.module('app').factory('mvPost', function($resource) {
	var PostResource = $resource('/api/posts/:id', {_id: "@id"}, {
		update: {method:'PUT',isArray:false}
	});

	return PostResource;
});