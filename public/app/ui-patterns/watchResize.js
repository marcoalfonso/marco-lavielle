angular.module('app').directive('watchResize', function(){
  return {
    restrict: 'A',
    link: function(scope, elem, attr) {
      angular.element(window).on('resize', function(){
        scope.$apply(function(){
          	scope.device = (window.innerWidth < 750) ? 'mobile' : 'desktop';
        });
      });
    }
  }
});