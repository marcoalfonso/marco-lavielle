angular.module('app').factory('mvPosts', function($http, $q, mvPost) {
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
		}
	};
});