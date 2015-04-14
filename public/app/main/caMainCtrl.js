angular.module('app').controller('caMainCtrl', function($scope, mvCachedClients) {
	$scope.loaded = "loaded";
	$scope.desktop = "desktop";
	$scope.detected = "detected";
	$scope.section = "preview-section-1";
	$scope.clients = mvCachedClients.query();
});