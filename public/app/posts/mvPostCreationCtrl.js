angular.module('app').controller('mvPostCreationCtrl', function ($scope, $http, mvNotifier, mvPostsService , $location, mvCachedPosts) {
	$scope.goToDashboard = function() {
		$location.path('/admin/dashboard');
	};

	$scope.createPostClick = function() {
		$location.path('/post-creation');
	};

	$scope.createClientClick = function() {
		$location.path('/client-creation');
	};

	$scope.createPost = function(title, subtitle, author, body) {
		var newPostData = {
			title: $scope.title,
			subtitle: $scope.subtitle,
			author: $scope.author,
			body: $scope.body
		};

		mvPostsService.createPost(newPostData).then(function() {
			mvNotifier.notify('Post created!');
			$location.path('/admin/dashboard');
		}, function(reason) {
			mvNotifier.error(reason);
		});
	};

});
