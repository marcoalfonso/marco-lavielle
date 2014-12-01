angular.module('app').controller('mvClientListCtrl', function($scope, mvCachedClients, $rootScope){
	$scope.clients = mvCachedClients.query();
	$rootScope.loaded = "loaded";
	$scope.sortOptions = [{value:"name", text: "Sort by Name"},
		{value: "published", text: "Sort by Publish Date"}];
	$scope.sortOrder = $scope.sortOptions[0].value;
})