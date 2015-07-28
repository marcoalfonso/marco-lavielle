angular.module('app').controller('mvPostDetailCtrl', function($scope, mvCachedPosts, $routeParams, $rootScope, $timeout, $sce) {
	mvCachedPosts.query().$promise.then(function(collection) {
		collection.forEach(function(post) {
			if (post.slug === $routeParams.slug) {
				$scope.post = post;
				$scope.post.body = $sce.trustAsHtml(post.body);
			}
		});
	});
	$rootScope.loaded = "loaded";
	$rootScope.desktop = "desktop";
	$rootScope.levelUp = "level-1";
	$timeout = twttr.widgets.load();
});
