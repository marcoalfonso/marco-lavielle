angular.module('app').controller('caMainCtrl', function($scope, mvCachedClients) {
	$scope.clients = mvCachedClients.query();
});