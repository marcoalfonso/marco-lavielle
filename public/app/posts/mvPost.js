angular.module('app').factory('mvPost', function($resource) {
	var PostResource = $resource('/api/posts/:id', {id: "@id"}, {
		show: { method: 'GET' },
		update: {method:'PUT', isArray:false},
		delete: {method: 'DELETE', isArray:false}
	});

	return PostResource;
});