import { _eventBus, _exceptionHandler, _angular } from '../injection-tokens.js';
import { applyEventBusConfiguration, destroyEventBusRuntimeState, createEventBusService, createEventBusRuntimeState } from '../services/event-bus/event-bus.js';

/** Register the application-wide EventBus in a custom AngularTS runtime. */
const eventBusModule = (angular) => {
    const runtime = angular;
    const state = createEventBusRuntimeState();
    runtime._composition.configRegistry.register(_eventBus, (value) => {
        applyEventBusConfiguration(state, value);
    });
    runtime._composition.addDisposer(() => {
        destroyEventBusRuntimeState(state);
    });
    return angular.module("ng.eventBus", []).factory(_eventBus, [
        _exceptionHandler,
        _angular,
        ($exceptionHandler, angular) => {
            const host = angular;
            const service = createEventBusService(state, $exceptionHandler, host.$eventBus);
            host.$eventBus = service;
            return service;
        },
    ]);
};

export { eventBusModule };
