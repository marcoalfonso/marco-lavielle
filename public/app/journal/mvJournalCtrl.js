angular.module('app').controller('mvJournalCtrl', function($scope, $rootScope, mvCachedPosts, $timeout){
	$rootScope.loaded = "loaded";
	$rootScope.desktop = "desktop";
	$rootScope.levelUp = "level-0";
	$scope.clients = mvCachedPosts.query();
	$timeout = twttr.widgets.load();
});