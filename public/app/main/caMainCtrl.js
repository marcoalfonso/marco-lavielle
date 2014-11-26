angular.module('app').controller('caMainCtrl', function($scope, mvCachedClients, $rootScope) {
	$rootScope.loaded = "loaded";
	$scope.clients = mvCachedClients.query();
});