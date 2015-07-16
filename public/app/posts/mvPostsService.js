angular.module('app').factory('mvPostsService', function($http, $q, mvPost) {
	return {
		createPost: function(newPostData) {
			var newPost = new mvPost(newPostData);
			var dfd = $q.defer();

			newPost.$save().then(function(){
				dfd.resolve();
			}, function (response) {
				dfd.reject(response.data.reason);
			});

			return dfd.promise;
		},
		deletePost: function(postId) {
			var deletePost = mvPost.delete({id: postId });
			var dfd = $q.defer();

			deletePost.$delete().then(function(){
				dfd.resolve();
			}, function (response) {
				dfd.reject(response.data.reason);
			});

			return dfd.promise;
		}
	};
});