angular.module('app').factory('mvCachedClients', function(mvClient) {
	var clientList;

	return {
		query: function() {
			if(!clientList) {
				clientList = mvClient.query();
			}

			return clientList;
		}
	};
});