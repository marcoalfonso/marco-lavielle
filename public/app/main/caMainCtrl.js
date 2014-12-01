angular.module('app').controller('caMainCtrl', function($scope, mvCachedClients, $rootScope) {
	$rootScope.loaded = "loaded";
	$rootScope.preview="preview-section-1";
	$scope.clients = mvCachedClients.query();
});