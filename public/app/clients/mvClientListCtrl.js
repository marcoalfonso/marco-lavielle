angular.module('app').controller('mvClientListCtrl', function($scope, mvCachedClients){
	$scope.clients = mvCachedClients.query();

	$scope.sortOptions = [{value:"name", text: "Sort by Name"},
		{value: "published", text: "Sort by Publish Date"}];
	$scope.sortOrder = $scope.sortOptions[0].value;
})