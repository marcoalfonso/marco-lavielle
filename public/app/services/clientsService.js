angular.module('app').factory('clientsService', function($http, $q, clientFactory, $routeParams) {
	return {
		createClient: function(newClientData) {
			var newClient = new clientFactory(newClientData);
			var dfd = $q.defer();
			newClient.$save().then(function(){
				dfd.resolve();
			}, function (response) {
				dfd.reject(response.data.reason);
			});

			return dfd.promise;
		}
	};
});