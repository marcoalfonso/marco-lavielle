angular.module('app').controller('aboutCtrl', function($scope, $rootScope){
	$rootScope.loaded = "loaded";
	$rootScope.detected = "detected";
	$rootScope.levelUp = "level-0";
	$scope.scan = "scan-faster";
})