window.angular
  .module('demo2', [])
  .run([
    '$anchorScroll',
    function ($anchorScroll) {
      $anchorScroll.yOffset = 100; // always scroll by 50 extra pixels
    },
  ])
  .controller('headerCtrl', [
    '$anchorScroll',
    '$location',
    '$scope',
    function ($anchorScroll, $location, $scope) {
      $scope.gotoAnchor = function (x) {
        window.$locationTest = $location;
        const newHash = 'anchor' + x;
        if ($location.getHash() !== newHash) {
          // set the $location.hash to `newHash` and
          // $anchorScroll will automatically scroll to it
          $location.setHash('anchor' + x);
        } else {
          // call $anchorScroll() explicitly,
          // since $location.hash hasn't changed
          $anchorScroll();
        }
      };
    },
  ]);

window.angular.bootstrap(document.getElementById('demo2'), ['demo2']);
