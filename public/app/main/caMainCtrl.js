angular.module('app').controller('caMainCtrl', function($scope, mvCachedClients, $rootScope) {
	$rootScope.loaded = "loaded";
	$rootScope.desktop = "desktop";
	$rootScope.detected = "detected";
	$rootScope.preview="preview-section-1";
	$scope.clients = mvCachedClients.query();
});