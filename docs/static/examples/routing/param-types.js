function ItemController($scope, $state) {
  $scope.slug = $state.params.slug;
}

ItemController.$inject = ['$scope', '$state'];

const routingParamTypesDemo = window.angular
  .module('routingParamTypesDemo', [])
  .config({
    $location: {
      html5Mode: false,
      hashPrefix: '!',
    },
    $router: {
      paramTypes: {
        slug: {
          pattern: /[A-Za-z]+-[0-9]+/,
          encode(value) {
            return String(value).toUpperCase();
          },
          decode(value) {
            return String(value).toLowerCase();
          },
          is(value) {
            return typeof value === 'string' && /^[a-z]+-[0-9]+$/.test(value);
          },
          equals(left, right) {
            return left === right;
          },
        },
      },
    },
  })
  .router({
    name: 'catalog',
    url: '/catalog',
    template: '<p>Choose an item.</p>',
  })
  .router({
    name: 'item',
    url: '/item/{slug:slug}',
    controller: ItemController,
    template:
      '<p>Decoded item slug: <b id="decoded-route-slug" ng-bind="slug"></b></p>',
  });

document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('routing-param-types-app');
  const currentState = document.getElementById('current-state');
  const currentSlug = document.getElementById('current-slug');
  const generatedHref = document.getElementById('generated-href');
  const encodedLink = document.getElementById('encoded-link');

  const injector = window.angular.bootstrap(root, [routingParamTypesDemo.name]);
  const $state = injector.get('$state');
  const $transitions = injector.get('$transitions');

  function render() {
    currentState.textContent = $state.current.name || 'none';
    currentSlug.textContent = $state.params.slug || 'none';
  }

  function scheduleRender() {
    setTimeout(render);
  }

  const href = $state.href('item', { slug: 'alpha-12' }, { inherit: false });

  generatedHref.textContent = href;
  encodedLink.setAttribute('href', href);

  $transitions.onSuccess({}, scheduleRender);

  scheduleRender();
});
