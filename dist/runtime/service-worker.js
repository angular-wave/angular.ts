import { _serviceWorker, _exceptionHandler } from '../injection-tokens.js';
import { createLogService, createLogRuntimeConfiguration } from '../services/log/log.js';
import { applyServiceWorkerConfiguration, createServiceWorkerService, createServiceWorkerRuntimeConfiguration, destroyServiceWorkerService } from '../services/service-worker/service-worker.js';

/**
 * Registers the managed `$serviceWorker` lifecycle and messaging facade in a
 * custom AngularTS runtime.
 */
const serviceWorkerModule = (angular) => {
    const runtime = angular;
    const { platform } = runtime._composition;
    const log = createLogService(createLogRuntimeConfiguration(), platform.console);
    const configuration = createServiceWorkerRuntimeConfiguration();
    let service;
    runtime._composition.configRegistry.register(_serviceWorker, (value) => {
        const command = value;
        applyServiceWorkerConfiguration(configuration, command.scriptUrl, command.config);
    });
    platform.addDisposer(() => {
        if (service) {
            destroyServiceWorkerService(service);
        }
    });
    return angular.module("ng.serviceWorker", []).factory(_serviceWorker, [
        _exceptionHandler,
        ($exceptionHandler) => {
            service = createServiceWorkerService(platform.window.navigator.serviceWorker, {
                log,
                err: $exceptionHandler,
                configuration,
            });
            return service;
        },
    ]);
};

export { serviceWorkerModule };
