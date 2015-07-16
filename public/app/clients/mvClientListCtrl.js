angular.module('app').controller('mvClientListCtrl', function($scope, mvCachedClients, $rootScope){
	$scope.clients = mvCachedClients.query();
	$rootScope.loaded = "loaded";
	$rootScope.levelUp = "level-0";
	$rootScope.desktop = "desktop";
	$rootScope.section = "preview-section-1";
});