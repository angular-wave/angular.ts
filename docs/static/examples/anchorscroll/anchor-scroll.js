window.angular.module('demo', []).controller('ScrollController', [
  '$scope',
  '$location',
  '$anchorScroll',
  function ($scope, $location, $anchorScroll) {
    $scope.gotoBottom = function () {
      // set the location.hash to the id of
      // the element you wish to scroll to.
      $location.setHash('bottom');

      // call $anchorScroll()
      $anchorScroll();
    };
  },
]);
