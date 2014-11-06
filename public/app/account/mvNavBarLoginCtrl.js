angular.module('app').controller('mvNavBarLoginCtrl', function ($scope, $http, mvIdentity, mvNotifier) {
	$scope.identity = mvIdentity;
	$scope.signin = function(username, password) {
		$http.post('/login', {username:username, password:password}).then(function(response) {
			if (response.data.success) {
				mvIdentity.currentUser = response.data.user;
				mvNotifier.notify('Logged In!');
			} else {
				mvNotifier.notify('Username/Password combination incorrect');
			}
		});
	}
})