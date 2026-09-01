window.angular
  .createModule('demo2', [])
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
          // Pass `newHash` to setHash() and
          // $anchorScroll will automatically scroll to it
          $location.setHash('anchor' + x);
        } else {
          // call $anchorScroll() explicitly,
          // since getHash() still returns the same value
          $anchorScroll();
        }
      };
    },
  ]);

window.angular.bootstrap(document.getElementById('demo2'), ['demo2']);
