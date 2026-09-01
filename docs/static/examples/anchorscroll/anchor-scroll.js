window.angular.module('demo', []).controller('ScrollController', [
  '$scope',
  '$location',
  '$anchorScroll',
  function ($scope, $location, $anchorScroll) {
    $scope.gotoBottom = function () {
      // Pass the target element id to setHash().
      $location.setHash('bottom');

      // call $anchorScroll()
      $anchorScroll();
    };
  },
]);
