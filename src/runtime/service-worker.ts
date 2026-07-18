import type { RuntimeModule } from "../angular-runtime.ts";
import type { RuntimeComposition } from "../core/composition/runtime-composition.ts";
import { _exceptionHandler, _serviceWorker } from "../injection-tokens.ts";
import {
  createLogRuntimeConfiguration,
  createLogService,
} from "../services/log/log.ts";
import {
  createServiceWorkerService,
  destroyServiceWorkerService,
  type ServiceWorkerService,
} from "../services/service-worker/service-worker.ts";

/**
 * Registers the managed `$serviceWorker` lifecycle and messaging facade in a
 * custom AngularTS runtime.
 */
export const serviceWorkerModule: RuntimeModule = (angular) => {
  const runtime = angular as ng.Angular & {
    _composition: RuntimeComposition;
  };
  const { platform } = runtime._composition;
  const log = createLogService(
    createLogRuntimeConfiguration(),
    platform.console,
  );
  let service: ServiceWorkerService | undefined;

  platform.addDisposer(() => {
    if (service) {
      destroyServiceWorkerService(service);
    }
  });

  return angular.module("ng.serviceWorker", []).factory(_serviceWorker, [
    _exceptionHandler,
    ($exceptionHandler: ng.ExceptionHandlerService) => {
      service = createServiceWorkerService(
        platform.window.navigator.serviceWorker,
        {
          log,
          err: $exceptionHandler,
        },
      );

      return service;
    },
  ]);
};
