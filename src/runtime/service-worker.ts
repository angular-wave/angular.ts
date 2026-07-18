import type { RuntimeModule } from "../angular-runtime.ts";
import type { RuntimeComposition } from "../core/composition/runtime-composition.ts";
import { _exceptionHandler, _serviceWorker } from "../injection-tokens.ts";
import {
  createLogRuntimeConfiguration,
  createLogService,
} from "../services/log/log.ts";
import {
  applyServiceWorkerConfiguration,
  createServiceWorkerRuntimeConfiguration,
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
  const configuration = createServiceWorkerRuntimeConfiguration();
  let service: ServiceWorkerService | undefined;

  runtime._composition.configRegistry.register(_serviceWorker, (value) => {
    const command = value as {
      scriptUrl: string | URL;
      config: import("../services/service-worker/service-worker.ts").ServiceWorkerConfig;
    };

    applyServiceWorkerConfiguration(
      configuration,
      command.scriptUrl,
      command.config,
    );
  });

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
          configuration,
        },
      );

      return service;
    },
  ]);
};
