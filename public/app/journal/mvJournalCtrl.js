angular.module('app').controller('mvJournalCtrl', function($scope, $rootScope, mvPost){
	$rootScope.loaded = "loaded";
	$rootScope.desktop = "desktop";
	$scope.posts = mvPost.query();
});