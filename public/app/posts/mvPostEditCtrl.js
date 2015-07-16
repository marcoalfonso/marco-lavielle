angular.module('app').controller('mvPostEditCtrl', function ($rootScope, $scope, $http, mvNotifier, mvPostsService , $location, mvCachedPosts, mvPost, $routeParams) {
	$scope.post = mvPost.show({id: $routeParams.id});

	$scope.postsClick = function() {
		$location.path('/admin/dashboard');
	};

	$scope.createPostsClick = function() {
		$location.path('/post-creation');
	};

	$scope.updatePost = function(title, subtitle, author, body) {
		/*var newPostData = {
			title: $scope.title,
			subtitle: $scope.subtitle,
			author: $scope.author,
			body: $scope.body
		};

		mvPostsService.createPost(newPostData).then(function() {
			mvNotifier.notify('Post created!');
			$location.path('/');
		}, function(reason) {
			mvNotifier.error(reason);
		});*/
	};

});
