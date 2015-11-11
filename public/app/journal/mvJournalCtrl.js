angular.module('app').controller('mvJournalCtrl', function($scope, $rootScope, mvCachedPosts, $timeout){
	$rootScope.loaded = "loaded";
	$rootScope.desktop = "desktop";
	$rootScope.levelUp = "level-0";
	$scope.posts = mvPost.query();
	$timeout = twttr.widgets.load();
});