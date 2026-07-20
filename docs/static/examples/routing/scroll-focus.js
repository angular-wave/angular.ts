const routingScrollFocusDemo = window.angular
  .module('routingScrollFocusDemo', [])
  .config({
    $location: {
      html5Mode: false,
      hashPrefix: '!',
    },
    $router: {
      scroll: { top: 0 },
      focus: '[data-route-focus]',
    },
  })
  .controller('ScrollFocusCtrl', [
    '$scope',
    '$state',
    '$transitions',
    function ScrollFocusCtrl($scope, $state, $transitions) {
      $scope.currentState = 'none';
      $scope.go = (state) => {
        void $state.go(state);
      };

      function render() {
        $scope.currentState = $state.current.name || 'none';
      }

      $transitions.onSuccess({}, render);

      void $state.go('home', {}, { location: false }).then(render);
    },
  ])
  .router({
    name: 'home',
    url: '/home',
    template: `
      <section>
        <h2 id="home-title" tabindex="-1" data-route-focus>Home route</h2>
        <button type="button" ng-click="go('details')">Details</button>
      </section>
    `,
  })
  .router({
    name: 'details',
    url: '/details',
    template: `
      <section>
        <h2 id="details-title" tabindex="-1" data-route-focus>Details route</h2>
        <button type="button" ng-click="go('home')">Home</button>
      </section>
    `,
  });

document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('routing-scroll-focus-app');

  window.angular.bootstrap(root, [routingScrollFocusDemo.name]);
});
