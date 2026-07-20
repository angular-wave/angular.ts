window.angular.module('serviceWorkerDemo', []).controller(
  'ServiceWorkerCtrl',
  class {
    static $inject = ['$serviceWorker', '$scope'];

    constructor($serviceWorker, $scope) {
      let version = 1;

      $scope.supportText = $serviceWorker.supported
        ? 'Service workers are supported.'
        : 'Service workers are not available in this browser.';
      $scope.statusText = $serviceWorker.status;
      $scope.messageText = 'No message yet.';
      $scope.updateText = 'No update waiting.';

      function workerUrl(nextVersion) {
        return `./service-worker-demo-worker.js?version=${nextVersion}`;
      }

      function waitForController() {
        if (navigator.serviceWorker.controller) {
          return Promise.resolve();
        }

        return new Promise((resolve) => {
          const onControllerChange = () => {
            navigator.serviceWorker.removeEventListener(
              'controllerchange',
              onControllerChange,
            );
            resolve();
          };

          navigator.serviceWorker.addEventListener(
            'controllerchange',
            onControllerChange,
          );
        });
      }

      $serviceWorker.onMessage((event) => {
        if (event.data?.type === 'service-worker-demo:pong') {
          $scope.messageText = `Worker ${event.data.version} replied.`;
        }
      });

      $serviceWorker.onUpdate((state) => {
        $scope.statusText = $serviceWorker.status;

        if (state.waiting) {
          $scope.updateText = 'Update is waiting. Activation is your choice.';
        } else if (state.phase) {
          $scope.updateText = `Update phase: ${state.phase}`;
        }
      });

      $serviceWorker.onControllerChange(() => {
        $scope.statusText = 'Controller changed. Reload remains explicit.';
      });

      $scope.register = async () => {
        if (!$serviceWorker.supported) {
          return;
        }

        await $serviceWorker.register(workerUrl(version), {
          scope: './',
          updateViaCache: 'none',
        });
        await $serviceWorker.ready();
        await waitForController();
        $scope.statusText = $serviceWorker.status;
      };

      $scope.ping = async () => {
        await $serviceWorker.post({
          type: 'service-worker-demo:ping',
        });
      };

      $scope.stageUpdate = async () => {
        version += 1;
        await navigator.serviceWorker.register(workerUrl(version), {
          scope: './',
          updateViaCache: 'none',
        });
      };

      $scope.activateUpdate = () => {
        const waiting = $serviceWorker.registration?.waiting;

        if (!waiting) {
          $scope.updateText = 'No waiting worker to activate.';
          return;
        }

        waiting.postMessage({
          type: 'service-worker-demo:skip-waiting',
        });
      };

      $scope.reload = () => {
        window.location.reload();
      };
    }
  },
);
