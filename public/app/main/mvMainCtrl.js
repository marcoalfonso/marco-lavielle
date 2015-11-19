angular.module('app').controller('mvMainCtrl', function($scope, mvCachedClients, mvCachedPosts) {
	$scope.loaded = "loaded";
	$scope.desktop = "desktop";
	$scope.detected = "detected";
	$scope.section = "preview-section-1";
	
	$scope.clients = mvCachedClients.query();
	$scope.posts = mvCachedPosts.query();
});