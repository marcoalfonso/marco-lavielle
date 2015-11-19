angular.module('app').controller('mvPostEditCtrl', function ($rootScope, $scope, mvNotifier, mvPostsService , $location, mvCachedPosts, mvPost, $routeParams) {
	$scope.post = mvPost.show({id: $routeParams.id});

	$scope.postsClick = function() {
		$location.path('/admin/dashboard');
	};

	$scope.createPostsClick = function() {
		$location.path('/post-creation');
	};

	$scope.updatePost = function() {
		mvPost.update($scope.post);
        mvNotifier.notify('Post Updated!');
        $location.path('/admin/dashboard');
        $window.location.reload();
	};

});
