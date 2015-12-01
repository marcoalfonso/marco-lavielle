angular.module('app').controller('mvJournalCtrl', function($scope, $rootScope, mvCachedPosts, $timeout){
	$rootScope.loaded = "loaded";
	$rootScope.levelUp = "level-0";
	$scope.posts = mvCachedPosts.query();
	$timeout = twttr.widgets.load();
});