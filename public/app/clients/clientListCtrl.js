angular.module('app').controller('clientListCtrl', function($scope, mvCachedClients, $rootScope){
	$scope.clients = mvCachedClients.query();
	$rootScope.loaded = "loaded";
	$rootScope.levelUp = "level-0";
	$rootScope.section = "preview-section-1";
});