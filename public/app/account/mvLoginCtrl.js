angular.module('app').controller('mvLoginCtrl', function ($cookieStore, $scope, $http, mvIdentity, mvNotifier, mvAuth, $location) {
	$scope.identity = mvIdentity;
	$scope.signin = function(username, password) {
		mvAuth.authenticateUser(username, password).then(function(success) {
			if(success) {
				$cookieStore.put('loggedin', 'true');
				console.log($cookieStore.get('loggedin'));
				mvNotifier.notify('You have successfully signed in!');
				$location.path('/admin/dashboard');
			} else {
				mvNotifier.notify('Username/Password combination incorrect');
			}
		});
	};

	$scope.signout = function() {
		mvAuth.logoutUser().then(function() {
			$scope.username = "";
			$scope.password = "";
			$cookieStore.put('loggedin', 'false');
			mvNotifier.notify('You have successfully signed out!');
			$location.path('/');
		});
	};
});