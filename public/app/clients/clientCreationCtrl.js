angular.module('app').controller('clientCreationCtrl', function ($scope, $http, mvNotifier, clientsService , $location) {
	$scope.goToDashboard = function() {
		$location.path('/admin/dashboard');
	};

	$scope.createPostClick = function() {
		$location.path('/post-creation');
	};

	$scope.createClientClick = function() {
		$location.path('/client-creation');
	};

	$scope.createClient = function(name, tags, url, photo, body) {
		var newClientData = {
			name: $scope.name,
			tags: $scope.tags,
			url: $scope.url,
			photo: $scope.photo,
			description: $scope.body
		};

		clientsService.createClient(newClientData).then(function() {
			mvNotifier.notify('Client created!');
			$location.path('/admin/dashboard');
		}, function(reason) {
			mvNotifier.error(reason);
		});
	};

});
