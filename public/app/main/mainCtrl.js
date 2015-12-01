angular.module('app').controller('mainCtrl', function($scope, mvCachedClients, mvCachedPosts, $window) {
	$scope.loaded = "loaded";

	$scope.detected = "detected";
	$scope.section = "preview-section-1";
	
	$scope.clients = mvCachedClients.query();
	$scope.posts = mvCachedPosts.query();

	if($window.innerWidth < 750) {
		$scope.device = "mobile";
	} else {
		$scope.device = "desktop";
	}
});