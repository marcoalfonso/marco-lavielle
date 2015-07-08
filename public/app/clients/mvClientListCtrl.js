angular.module('app').controller('mvClientListCtrl', function($scope, mvCachedClients, $rootScope){
	$scope.clients = mvCachedClients.query();
	$rootScope.loaded = "loaded";
	$rootScope.levelUp = "level-0";
	$rootScope.desktop = "desktop";
	$rootScope.section = "preview-section-1";
	$scope.sortOptions = [{value:"name", text: "Sort by Name"},
		{value: "published", text: "Sort by Publish Date"}];
	$scope.sortOrder = $scope.sortOptions[0].value;
});