angular.module('app').controller('mvClientDetailCtrl', function($scope, mvCachedClients, $routeParams) {
	mvCachedClients.query().$promise.then(function(collection) {
		collection.forEach(function(client) {
			if (client._id === $routeParams.id) {
				$scope.client = client;
			}
		})
	})
});