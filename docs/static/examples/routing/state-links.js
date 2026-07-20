const routingStateLinksDemo = window.angular
  .module('routingStateLinksDemo', [])
  .config({
    $location: {
      html5Mode: false,
      hashPrefix: '!',
    },
  })
  .controller('StateLinksCtrl', [
    '$scope',
    '$state',
    '$transitions',
    function StateLinksCtrl($scope, $state, $transitions) {
      $scope.order = { id: 42 };
      $scope.currentState = 'none';
      $scope.currentOrder = 'none';

      function render() {
        $scope.currentState = $state.current.name || 'none';
        $scope.currentOrder = $state.params.id || 'none';
      }

      $transitions.onSuccess({}, render);

      void $state.go('orders', {}, { location: false }).then(render);
    },
  ])
  .router({
    name: 'orders',
    url: '/orders',
    template:
      '<section><p>Orders route loaded</p><ng-view></ng-view></section>',
  })
  .router({
    name: 'orders.detail',
    url: '/:id',
    template: '<p>Order detail route loaded</p>',
  });

document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('routing-state-links-app');

  window.angular.bootstrap(root, [routingStateLinksDemo.name]);
});
