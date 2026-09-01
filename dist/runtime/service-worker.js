import { _serviceWorker, _exceptionHandler } from '../injection-tokens.js';
import { createLogService, createLogRuntimeConfiguration } from '../services/log/log.js';
import { applyServiceWorkerConfiguration, createServiceWorkerService, createServiceWorkerRuntimeConfiguration, destroyServiceWorkerService } from '../services/service-worker/service-worker.js';
import { getRuntimeComposition } from './custom-ng.js';

/**
 * Registers the managed `$serviceWorker` lifecycle and messaging facade in a
 * custom AngularTS runtime.
 */
const serviceWorkerModule = (angular) => {
    const composition = getRuntimeComposition(angular);
    const { platform } = composition;
    const log = createLogService(createLogRuntimeConfiguration(), platform.console);
    const configuration = createServiceWorkerRuntimeConfiguration();
    let service;
    composition.configRegistry.register(_serviceWorker, (value) => {
        const command = value;
        applyServiceWorkerConfiguration(configuration, command.scriptUrl, command.config);
    });
    platform.addDisposer(() => {
        if (service)
            destroyServiceWorkerService(service);
    });
    return angular.createModule("ng.serviceWorker", []).factory(_serviceWorker, [
        _exceptionHandler,
        ($exceptionHandler) => {
            service = createServiceWorkerService(platform.window.navigator.serviceWorker, {
                log,
                exceptionHandler: $exceptionHandler,
                configuration,
            });
            return service;
        },
    ]);
};

export { serviceWorkerModule };
