angular.module('app').controller('mvClientListCtrl', function($scope, mvClient){
	$scope.clients = mvClient.query();
})