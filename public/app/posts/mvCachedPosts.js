angular.module('app').factory('mvCachedPosts', function(mvPost) {
	var postList;

	return {
		query: function() {
			if(!postList) {
				postList = mvPost.query();
			}

			return postList;
		}
	};
});