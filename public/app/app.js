angular.module('app', ['ngResource', 'ngRoute', 'ngCookies', 'ephox.textboxio']);

angular.module('app').config(function($routeProvider, $locationProvider){
	var routeRoleChecks = {
		admin: {auth: function(mvAuth) {
			return mvAuth.authorizeCurrentUserForRoute('admin');
		}},
		user: {auth: function(mvAuth) {
			return mvAuth.authorizeAuthenticatedUserForRoute();
		}}
	};

	$locationProvider.html5Mode({
		enabled: true,
		requireBase: false
	});

	$routeProvider
		.when('/', { templateUrl: '/partials/main/main', controller: 'mvMainCtrl'})

		.when('/admin/users', { templateUrl: '/partials/admin/user-list', 
			controller: 'mvUserListCtrl', resolve: routeRoleChecks.admin
		})
		.when('/admin/dashboard', { templateUrl: '/partials/dashboard/dashboard', 
			controller: 'mvDashboardCtrl', resolve: routeRoleChecks.admin
		})
		.when('/posts/:id', { templateUrl: '/partials/posts/post-edit', 
			controller: 'mvPostEditCtrl', resolve: routeRoleChecks.admin
		})
		.when('/post-creation', { templateUrl: '/partials/posts/post-creation', 
			controller: 'mvPostCreationCtrl', resolve: routeRoleChecks.admin
		})
		.when('/signin', { templateUrl: '/partials/account/signin', 
			controller: 'mvLoginCtrl'
		})
		.when('/signup', { templateUrl: '/partials/account/signup', 
			controller: 'mvSignupCtrl'
		})
		.when('/profile', { templateUrl: '/partials/account/profile', 
			controller: 'mvProfileCtrl', resolve: routeRoleChecks.user
		})
		.when('/clients', { templateUrl: '/partials/clients/client-list', 
			controller: 'mvClientListCtrl'
		})
		.when('/clients/:slug', { templateUrl: '/partials/clients/client-details', 
			controller: 'mvClientDetailCtrl'
		})
		.when('/experience', { templateUrl: '/partials/experience/experience-details', 
			controller: 'mvExperienceCtrl'
		})
		.when('/about', { templateUrl: '/partials/about/about-details', 
			controller: 'mvAboutCtrl'
		})
		.when('/journal', { templateUrl: '/partials/journal/journal',
			controller: 'mvJournalCtrl'
		})
		.when('/journal/:slug', { templateUrl: '/partials/posts/post-details', 
			controller: 'mvPostDetailCtrl'
		});
});


angular.module('app').run(function($rootScope, $location) {
	$rootScope.$on('$routeChangeError', function(evt, current, previous, rejection) {
		if(rejection === 'not authorized') {
			$location.path('/');
		}
	});
});