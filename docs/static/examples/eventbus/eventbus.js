window.angular.module('demo', []).controller(
  'DemoCtrl',
  class {
    static $inject = ['$eventBus', '$scope'];
    constructor($eventBus, $scope) {
      const unsubscribe = $eventBus.subscribe('demo', (val) => {
        // `this.ms = val` will not work because `this` is not a proxy
        //  to trigger change detection, we access controller as a scope property
        $scope.$ctrl.ms = val;
      });

      $scope.$on('$destroy', unsubscribe);
    }
  },
);
