import type { RuntimeModule } from "../angular-runtime.ts";
import { _angular, _eventBus, _exceptionHandler } from "../injection-tokens.ts";
import {
  applyEventBusConfiguration,
  createEventBusRuntimeState,
  createEventBusService,
  destroyEventBusRuntimeState,
  type EventBus,
  type EventBusConfig,
} from "../services/event-bus/event-bus.ts";
import { getRuntimeComposition } from "./custom-ng.ts";

/** Register the application-wide EventBus in a custom AngularTS runtime. */
export const eventBusModule: RuntimeModule = (angular) => {
  const composition = getRuntimeComposition(angular);
  const state = createEventBusRuntimeState();

  composition.configRegistry.register(_eventBus, (value) => {
    applyEventBusConfiguration(state, value as EventBusConfig);
  });
  composition.addDisposer(() => {
    destroyEventBusRuntimeState(state);
  });

  return angular.module("ng.eventBus", []).factory(_eventBus, [
    _exceptionHandler,
    _angular,
    ($exceptionHandler: ng.ExceptionHandlerService, angular: ng.Angular) => {
      const host = angular as ng.Angular & { eventBus?: EventBus };
      const service = createEventBusService(
        state,
        $exceptionHandler,
        host.eventBus,
      );

      host.eventBus = service;

      return service;
    },
  ]);
};
