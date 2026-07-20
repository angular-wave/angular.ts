const retentionCompiles = {
  a: 0,
  b: 0,
  c: 0,
};
const retentionDestroys = {
  a: 0,
  b: 0,
  c: 0,
};
const retentionSchedulerRuns = {
  a: 0,
  b: 0,
  c: 0,
};
const retentionQueuedWork = {
  a: 0,
  b: 0,
  c: 0,
};

window.routingRetentionDiagnostics = {
  compiles: retentionCompiles,
  destroys: retentionDestroys,
  schedulerRuns: retentionSchedulerRuns,
  queuedWork: retentionQueuedWork,
};

function retainedTab(label, key) {
  return {
    template:
      '<section>' +
      `<h2>${label}</h2>` +
      '<button type="button" ng-click="count = count + 1">' +
      `${label} count: {{count}}` +
      '</button>' +
      '<p>Pause events: {{pauseCount}}</p>' +
      '<p>Resume events: {{resumeCount}}</p>' +
      '</section>',
    controller: [
      '$scope',
      function ($scope) {
        retentionCompiles[key] += 1;
        window.renderRoutingRetentionDiagnostics?.();
        $scope.count = 0;
        $scope.pauseCount = 0;
        $scope.resumeCount = 0;

        $scope.$on('$viewRetentionPause', () => {
          $scope.pauseCount += 1;
          retentionQueuedWork[key] += 1;
          window.renderRoutingRetentionDiagnostics?.();
        });

        $scope.$on('$viewRetentionResume', () => {
          $scope.resumeCount += 1;
          retentionSchedulerRuns[key] += retentionQueuedWork[key];
          retentionQueuedWork[key] = 0;
          window.renderRoutingRetentionDiagnostics?.();
        });

        $scope.$on('$destroy', () => {
          retentionDestroys[key] += 1;
          retentionQueuedWork[key] = 0;
          window.renderRoutingRetentionDiagnostics?.();
        });
      },
    ],
  };
}

const routingRetentionDemo = window.angular
  .module('routingRetentionDemo', [])
  .router({
    name: 'retention',
    abstract: true,
    template: '<section><ng-view></ng-view></section>',
    policy: {
      retention: {
        mode: 'keep-alive',
        max: 2,
        pause: 'schedulers',
        evict: 'lru',
      },
    },
    children: [
      {
        name: 'tabA',
        ...retainedTab('Tab A', 'a'),
      },
      {
        name: 'tabB',
        ...retainedTab('Tab B', 'b'),
      },
      {
        name: 'tabC',
        ...retainedTab('Tab C', 'c'),
      },
    ],
  })
  .router({
    name: 'plain',
    template:
      '<p>Plain route destroys the active retained view only after eviction.</p>',
  });

document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('routing-retention-app');
  const stateOutput = document.getElementById('current-state');
  const actionOutput = document.getElementById('last-action');
  const compileOutput = document.getElementById('compile-counts');

  const injector = window.angular.bootstrap(root, [routingRetentionDemo.name]);
  const $state = injector.get('$state');

  function renderDiagnostics() {
    compileOutput.textContent = `A:${retentionCompiles.a} B:${retentionCompiles.b} C:${retentionCompiles.c}`;
  }

  window.renderRoutingRetentionDiagnostics = renderDiagnostics;

  function render(status) {
    stateOutput.textContent = $state.current.name || 'none';
    actionOutput.textContent = status;
    renderDiagnostics();
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

  void $state.go('retention.tabA', {}, { location: false }).then(() => {
    render(`entered ${$state.current.name || 'none'}`);
  });
});
