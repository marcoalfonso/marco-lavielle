angular.module('app').controller('mvClientDetailCtrl', function($scope, mvCachedClients, $routeParams, $rootScope) {
	mvCachedClients.query().$promise.then(function(collection) {
		collection.forEach(function(client) {
			/*if (client._id === $routeParams.id) {
				$scope.client = client;
			}*/
			if (client.slug === $routeParams.slug) {
				$scope.client = client;
			}
		});
	});
	$rootScope.loaded = "loaded";
	$rootScope.desktop = "desktop";
	$rootScope.sectionSelector = "section-1";
	$rootScope.scrollable = "scrollable";
	$rootScope.levelUp = "level-1";
});