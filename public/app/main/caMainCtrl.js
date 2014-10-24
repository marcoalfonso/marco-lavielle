angular.module('app').controller('caMainCtrl', function($scope) {
	$scope.apps = [
	    {name: 'Commercial Real Estate', featured: true, published: new Date('10/5/2013')},
	    {name: 'LawPath', featured: true, published: new Date('10/12/2013')},
	    {name: 'A-lift', featured: false, published: new Date('10/1/2013')},
	    {name: 'Ad-Roller', featured: false, published: new Date('7/12/2013')},
	]
});