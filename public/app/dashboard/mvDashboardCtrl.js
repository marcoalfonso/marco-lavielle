angular.module('app').controller('mvDashboardCtrl', function (mvPost, $scope, $http, mvNotifier, mvPostsService , $location, mvCachedPosts) {
	$scope.createPostVisible = false;
	$scope.posts = mvCachedPosts.query();
	$rootScope.levelUp = "level-0";

	$scope.sortOptions = [{value:"name", text: "Sort by Name"},
		{value: "published", text: "Sort by Publish Date"}];
	$scope.sortOrder = $scope.sortOptions[0].value;

	$scope.editPost = function (userId) {
        $location.path('/posts/' + userId);
    };

	$scope.postsClick = function() {
		$location.path('/admin/dashboard');
	};

	$scope.createPostsClick = function() {
		$location.path('/post-creation');
	};

	$scope.deletePost = function(postId) {
        mvPost.delete({id: postId });
        mvNotifier.notify('Post deleted!');
        $location.path('/admin/dashboard');
    };
});