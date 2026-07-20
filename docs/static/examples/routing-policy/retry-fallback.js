window.routingRetryFallbackDiagnostics = {
  started: [],
  succeeded: [],
  failed: [],
};

const routingRetryFallbackDemo = window.angular
  .module('routingRetryFallbackDemo', [])
  .config({
    $security: {
      fallback: 'allow',
    },
  })
  .router({
    name: 'demo',
    abstract: true,
    template:
      '<section>' +
      '<h1>Router retry and fallback</h1>' +
      '<nav>' +
      '  <button type="button" data-route="demo.transient">Transient state</button>' +
      '  <button type="button" data-route="demo.stable">Stable failure</button>' +
      '  <button type="button" data-route="demo.boundaryFailure">Error boundary</button>' +
      '  <button type="button" data-route="demo.base">Reset</button>' +
      '</nav>' +
      '<div><ng-view></ng-view></div>' +
      '</section>',
    children: [
      {
        name: 'base',
        url: '/base',
        template: '<p>Base state</p>',
      },
      {
        name: 'loading',
        url: '/loading',
        template: '<p>Preparing route transition...</p>',
      },
      {
        name: 'fallback',
        url: '/fallback',
        template: '<p>Fallback recovery route reached.</p>',
      },
      {
        name: 'transient',
        url: '/transient',
        template: '<p>Transient state payload: {{$resolve.payload}}</p>',
        resolve: {
          payload: () => 'ready',
        },
      },
      {
        name: 'stable',
        url: '/stable',
        template: '<p>Should fail and fallback.</p>',
        policy: {
          transition: {
            loading: 'demo.loading',
            retry: false,
            fallbackTo: 'demo.fallback',
          },
        },
        resolve: {
          payload: () => Promise.reject(new Error('permanent failure')),
        },
      },
      {
        name: 'boundaryFailure',
        url: '/boundary-failure',
        template: '<p>Should fail and use error boundary.</p>',
        policy: {
          transition: {
            loading: 'demo.loading',
            errorBoundary: 'demo.fallback',
          },
        },
        resolve: {
          payload: () => Promise.reject(new Error('boundary failure')),
        },
      },
    ],
  });

document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('routing-retry-fallback-app');
  const stateOutput = document.getElementById('current-state');
  const actionOutput = document.getElementById('last-action');

  const injector = window.angular.bootstrap(root, [
    routingRetryFallbackDemo.name,
  ]);
  const $state = injector.get('$state');
  const $transitions = injector.get('$transitions');

  $transitions.onStart({}, (transition) => {
    window.routingRetryFallbackDiagnostics.started.push(transition.to().name);
  });

  $transitions.onSuccess({}, (transition) => {
    window.routingRetryFallbackDiagnostics.succeeded.push(transition.to().name);
  });

  $transitions.onError({}, (transition) => {
    window.routingRetryFallbackDiagnostics.failed.push(transition.to().name);
  });

  function render(status) {
    stateOutput.textContent = $state.current.name || 'none';
    actionOutput.textContent = status;
  }

  root.addEventListener('click', (event) => {
    const target = event.target;

    if (!(target instanceof HTMLElement)) return;

    const state = target.getAttribute('data-route');

    if (!state) return;

    render(`requested ${state}`);

    void $state.go(state, {}, { location: false }).then(
      () => {
        render(`entered ${$state.current.name || 'none'}`);
      },
      (error) => {
        render(
          `transition ${state} failed: ${
            error && typeof error === 'object' && 'message' in error
              ? error.message
              : String(error)
          }`,
        );
      },
    );
  });

  void $state.go('demo.base', {}, { location: false }).then(() => {
    render(`entered ${$state.current.name || 'none'}`);
  });
});
