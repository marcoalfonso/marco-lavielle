angular.module('app').controller('mvDashboardCtrl', function ($scope, $http, mvNotifier, mvPosts , $location) {

	$scope.createPost = function(title, subtitle, author, body) {
		var newPostData = {
			title: $scope.title,
			subtitle: $scope.subtitle,
			author: $scope.author,
			body: $scope.body
		}

		mvPosts.createPost(newPostData).then(function() {
			mvNotifier.notify('Post created!');
			$location.path('/');
		}, function(reason) {
			mvNotifier.error(reason);
		})
	}
});