import type { RuntimeModule } from "../angular-runtime.ts";
import type { RuntimeComposition } from "../core/composition/runtime-composition.ts";
import {
  _anchorScroll,
  _aria,
  _compile,
  _controller,
  _exceptionHandler,
  _injector,
  _location,
  _rootElement,
  _rootScope,
  _security,
  _state,
  _stateRegistry,
  _transitions,
} from "../injection-tokens.ts";
import {
  applyAriaConfiguration,
  createAriaRuntimeState,
  createAriaService,
  destroyAriaRuntimeState,
  type AriaConfig,
} from "../directive/aria/aria.ts";
import {
  applyRouterRuntimeCommand,
  createRouterRuntime,
  routerRuntimeConfigKey,
  type RouterRuntimeCommand,
} from "../router/composition/router-runtime.ts";
import {
  StateRefActiveDirective,
  StateRefDynamicDirective,
} from "../router/directives/state-directives.ts";
import {
  ViewDirective,
  ViewDirectiveContentGuard,
} from "../router/directives/view-directive.ts";
import type { StateRegistryRuntime } from "../router/state/state-registry.ts";
import {
  applyAnchorScrollConfiguration,
  createAnchorScrollRuntimeState,
  createAnchorScrollService,
  destroyAnchorScrollRuntimeState,
  type AnchorScrollConfig,
} from "../services/anchor-scroll/anchor-scroll.ts";
import {
  applyLocationConfiguration,
  createLocationRuntimeState,
  type LocationConfig,
} from "../services/location/location.ts";
import {
  createLogRuntimeConfiguration,
  createLogService,
} from "../services/log/log.ts";
import {
  applySecurityConfiguration,
  createSecurityPolicy,
  createSecurityRuntimeConfiguration,
  type SecurityPolicyConfig,
} from "../services/security/security.ts";

function createRouteTemplateRequest(
  runtimeWindow: Window,
): ng.TemplateRequestService {
  return async (templateUrl) => {
    const response = await runtimeWindow.fetch(templateUrl, {
      headers: { Accept: "text/html" },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch route template "${templateUrl}": ${String(response.status)} ${response.statusText}`,
      );
    }

    return response.text();
  };
}

/**
 * Registers state routing, navigation policy, URL ownership, and router
 * directives in a custom AngularTS runtime.
 */
export const routerModule: RuntimeModule = (angular) => {
  const runtime = angular as ng.Angular & {
    _composition: RuntimeComposition;
  };
  const composition = runtime._composition;
  const { platform } = composition;
  const location = createLocationRuntimeState(platform.window);
  const securityConfiguration = createSecurityRuntimeConfiguration();
  const security = createSecurityPolicy(
    securityConfiguration,
    () => platform.window.location.href,
  );
  const aria = createAriaRuntimeState();
  const anchorScroll = createAnchorScrollRuntimeState();
  const log = createLogService(
    createLogRuntimeConfiguration(),
    platform.console,
  );
  const router = createRouterRuntime({
    compileLifecycle: composition.compileLifecycle,
    compileRegistry: composition.compileRegistry,
    exceptionHandler: composition.exceptionHandlerState.service,
    locationConfig: location.config,
    securityPolicy: security,
  });
  const templateRequest = createRouteTemplateRequest(platform.window);

  composition.configRegistry.register(_location, (value) => {
    applyLocationConfiguration(location, value as LocationConfig);
  });
  composition.configRegistry.register(_security, (value) => {
    applySecurityConfiguration(
      securityConfiguration,
      value as SecurityPolicyConfig,
    );
  });
  composition.configRegistry.register(_aria, (value) => {
    applyAriaConfiguration(aria, value as Partial<AriaConfig>);
  });
  composition.configRegistry.register(_anchorScroll, (value) => {
    applyAnchorScrollConfiguration(anchorScroll, value as AnchorScrollConfig);
  });
  composition.configRegistry.register(routerRuntimeConfigKey, (value) => {
    applyRouterRuntimeCommand(router, value as RouterRuntimeCommand);
  });
  platform.addDisposer(() => {
    router.destroy();
    destroyAnchorScrollRuntimeState(anchorScroll);
    location.destroy();
    destroyAriaRuntimeState(aria);
  });

  const module = angular
    .module("ng.router", [])
    .value(_security, security)
    .factory(_aria, () => createAriaService(aria, log))
    .factory(_location, [
      _rootScope,
      _rootElement,
      _exceptionHandler,
      (
        $rootScope: ng.Scope,
        $rootElement: HTMLElement,
        $exceptionHandler: ng.ExceptionHandlerService,
      ) => location.createService($rootScope, $rootElement, $exceptionHandler),
    ])
    .factory(_anchorScroll, [
      _location,
      _rootScope,
      ($location: ng.LocationService, $rootScope: ng.Scope) =>
        createAnchorScrollService(
          anchorScroll,
          $location,
          $rootScope,
          platform.document,
          platform.window as Window & typeof globalThis,
        ),
    ])
    .value(_transitions, router.transitions)
    .factory(_stateRegistry, [
      _injector,
      ($injector: ng.InjectorService) =>
        router.stateRegistry._initRuntime($injector),
    ]);

  const stateService = router.stateService;

  return module
    .factory(_state, [
      _compile,
      _controller,
      _rootScope,
      _injector,
      _location,
      _stateRegistry,
      (
        compile: ng.CompileService,
        controller: ng.ControllerService,
        rootScope: ng.Scope,
        injector: ng.InjectorService,
        $location: ng.LocationService,
        stateRegistry: StateRegistryRuntime,
      ) => {
        const templateFactory = router.createTemplateFactory(
          templateRequest,
          injector,
        );
        const viewService = router.createViewService({
          templateFactory,
          compile,
          controller,
          rootScope,
          injector,
        });

        return stateService._initRuntime(
          injector,
          $location,
          stateRegistry,
          rootScope,
          viewService,
        );
      },
    ])
    .directive("ngState", StateRefDynamicDirective)
    .directive("ngStateActive", StateRefActiveDirective)
    .directive("ngStateActiveExact", StateRefActiveDirective)
    .directive("ngView", ViewDirective)
    .directive("ngView", ViewDirectiveContentGuard);
};
