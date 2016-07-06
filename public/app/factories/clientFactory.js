angular.module('app').factory('clientFactory', function($resource) {
	var ClientResource = $resource('/api/clients/:id', {id: "@id"}, {
		show: { method: 'GET' },
		update: {method:'PUT', isArray:false},
		delete: {method: 'DELETE', isArray:false}
	});

	return ClientResource;
});