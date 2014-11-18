angular.module('app').factory('mvClient', function($resource){
	var ClientResource = $resource('/api/clients/:_id', {_id: "@id"}, {
		update: {method:'PUT', isArray:false}
	});

	return ClientResource;
});