import type {
  CompileLifecycle,
  CompileRegistry,
} from "../../core/compile/compile.ts";
import type {
  ProviderCompositionContext,
  RuntimeRegistrationRecipe,
} from "../../core/composition/runtime-composition.ts";
import type { ProviderRegistry } from "../../core/di/interface.ts";
import {
  _compile,
  _controller,
  _injector,
  _location,
  _rootScope,
  _security,
  _stateRegistry,
  _templateRequest,
  _transitions,
} from "../../injection-tokens.ts";
import type {
  LocationConfig,
  LocationRuntimeState,
} from "../../services/location/location.ts";
import type { SecurityPolicy } from "../../services/security/security.ts";
import { RouterRuntimeState, type RouterConfig } from "../router.ts";
import { StateRegistryRuntime } from "../state/state-registry.ts";
import { StateRuntime } from "../state/state-service.ts";
import type { LazyStateLoader, StateDeclaration } from "../state/interface.ts";
import { TemplateFactoryService } from "../router/template-factory.ts";
import { TransitionRuntime } from "../transition/transition-service.ts";
import { ViewService, type ViewServiceDependencies } from "../view/view.ts";

export interface RouterRuntimeDependencies {
  compileLifecycle: CompileLifecycle;
  compileRegistry: CompileRegistry;
  exceptionHandler: ng.ExceptionHandlerService;
  locationConfig: LocationConfig;
  securityPolicy: SecurityPolicy;
}

export interface RouterRuntimeComposition {
  readonly routerState: RouterRuntimeState;
  readonly stateRegistry: StateRegistryRuntime;
  readonly stateService: StateRuntime;
  readonly templateFactory: TemplateFactoryService | undefined;
  readonly transitions: TransitionRuntime;
  readonly viewService: ViewService | undefined;
  readonly destroyed: boolean;
  createTemplateFactory(
    templateRequest: ng.TemplateRequestService,
    injector: ng.InjectorService,
  ): TemplateFactoryService;
  createViewService(
    dependencies: Omit<
      ViewServiceDependencies,
      "compileLifecycle" | "routerState" | "transitions"
    >,
  ): ViewService;
  destroy(): void;
}

/** @internal */
export const routerRuntimeConfigKey = "$router" as const;

/** @internal */
export type RouterRuntimeCommand =
  | { type: "config"; config: RouterConfig }
  | { type: "state"; definition: StateDeclaration }
  | { type: "lazy"; prefix: string; loader: LazyStateLoader };

/** @internal */
export function applyRouterRuntimeCommand(
  runtime: RouterRuntimeComposition,
  command: RouterRuntimeCommand,
): void {
  switch (command.type) {
    case "config":
      runtime.routerState.config(command.config);
      break;
    case "state":
      runtime.stateService.state(command.definition);
      break;
    case "lazy":
      runtime.stateService.lazy(command.prefix, command.loader);
      break;
  }
}

/** @internal */
export function createRouterRuntime(
  dependencies: RouterRuntimeDependencies,
): RouterRuntimeComposition {
  const routerState = new RouterRuntimeState(dependencies.locationConfig);
  const stateRegistry = new StateRegistryRuntime(
    routerState,
    dependencies.compileRegistry,
  );
  const transitions = new TransitionRuntime(
    routerState,
    dependencies.exceptionHandler,
    dependencies.securityPolicy,
  );
  const stateService = new StateRuntime(
    stateRegistry,
    routerState,
    transitions,
    dependencies.exceptionHandler,
  );
  let templateFactory: TemplateFactoryService | undefined;
  let viewService: ViewService | undefined;
  let destroyed = false;

  return {
    routerState,
    stateRegistry,
    stateService,
    transitions,
    get templateFactory() {
      return templateFactory;
    },
    get viewService() {
      return viewService;
    },
    get destroyed() {
      return destroyed;
    },
    createTemplateFactory(templateRequest, injector) {
      if (destroyed) {
        throw new Error(
          "Cannot create a template factory after router destruction",
        );
      }

      templateFactory ??= new TemplateFactoryService(
        dependencies.compileRegistry,
        templateRequest,
        injector,
      );

      return templateFactory;
    },
    createViewService(viewDependencies) {
      if (destroyed) {
        throw new Error(
          "Cannot create a view service after router destruction",
        );
      }

      viewService ??= new ViewService({
        compileLifecycle: dependencies.compileLifecycle,
        routerState,
        transitions,
        ...viewDependencies,
      });

      return viewService;
    },
    destroy() {
      if (destroyed) return;

      destroyed = true;
      viewService?.destroy();
    },
  };
}

/** @internal */
export const routerRuntimeRegistration: RuntimeRegistrationRecipe = {
  _register(
    registry: ProviderRegistry,
    name: string,
    { runtime, providers }: ProviderCompositionContext,
  ) {
    const locationState = requireProvider(
      providers,
      _location,
    ) as LocationRuntimeState;
    const securityPolicy = requireProvider(
      providers,
      _security,
    ) as SecurityPolicy;
    const routerRuntime = createRouterRuntime({
      compileLifecycle: runtime.compileLifecycle,
      compileRegistry: runtime.compileRegistry,
      exceptionHandler: runtime.exceptionHandlerState.service,
      locationConfig: locationState.config,
      securityPolicy,
    });

    runtime.addDisposer(() => {
      routerRuntime.destroy();
    });

    runtime.configRegistry.register(routerRuntimeConfigKey, (value) => {
      applyRouterRuntimeCommand(routerRuntime, value as RouterRuntimeCommand);
    });

    registry.value(_transitions, routerRuntime.transitions);
    registry.factory(_stateRegistry, [
      _injector,
      ($injector: ng.InjectorService) =>
        routerRuntime.stateRegistry._initRuntime($injector),
    ]);
    const stateService = routerRuntime.stateService;
    registry.factory(name, [
      _templateRequest,
      _compile,
      _controller,
      _rootScope,
      _injector,
      _location,
      _stateRegistry,
      (
        templateRequest: ng.TemplateRequestService,
        compile: ng.CompileService,
        controller: ng.ControllerService,
        rootScope: ng.Scope,
        injector: ng.InjectorService,
        location: ng.LocationService,
        stateRegistry: StateRegistryRuntime,
      ) => {
        const templateFactory = routerRuntime.createTemplateFactory(
          templateRequest,
          injector,
        );
        const viewService = routerRuntime.createViewService({
          templateFactory,
          compile,
          controller,
          rootScope,
          injector,
        });

        return stateService._initRuntime(
          injector,
          location,
          stateRegistry,
          rootScope,
          viewService,
        );
      },
    ]);

    return stateService;
  },
};

function requireProvider(
  providers: ReadonlyMap<string, unknown>,
  name: string,
): unknown {
  const provider = providers.get(name);

  if (!provider) {
    throw new Error(`${name} must be composed before the router runtime`);
  }

  return provider;
}
