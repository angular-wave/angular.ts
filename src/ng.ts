import {
  _angular,
  _compile,
  _controller,
  _cookie,
  _document,
  _eventBus,
  _exceptionHandler,
  _filter,
  _http,
  _injector,
  _interpolate,
  _location,
  _log,
  _machine,
  _parse,
  _rootElement,
  _rootScope,
  _sce,
  _sceDelegate,
  _security,
  _serviceWorker,
  _sse,
  _state,
  _stream,
  _templateCache,
  _window,
  _webComponent,
  _webTransport,
  _websocket,
  _worker,
  _workflow,
} from "./injection-tokens.ts";
import type { AngularRuntime } from "./angular-runtime.ts";
import { createAnimateService } from "./animations/animate.ts";
import { createControllerService } from "./core/controller/controller.ts";
import {
  createFilterRegistration,
  type FilterRegistry,
} from "./core/filter/filter.ts";
import {
  applyInterpolateConfiguration,
  createInterpolateService,
  type InterpolateConfig,
} from "./core/interpolate/interpolate.ts";
import { createMachineService } from "./services/machine/machine.ts";
import { createWorkflowService } from "./services/workflow/workflow.ts";
import { createParseService } from "./core/parse/parse.ts";
import { requireAppRoot } from "./core/app-context/app-context.ts";
import type {
  RuntimeComposition,
  RuntimeProviderRecipe,
  RuntimeRegistrationRecipe,
} from "./core/composition/runtime-composition.ts";
import { registerRuntimeProviders } from "./core/composition/runtime-composition.ts";
import { createRootScopeService } from "./core/scope/scope.ts";
import type { ProviderRegistry } from "./core/di/interface.ts";
import {
  entriesFilter,
  keysFilter,
  valuesFilter,
} from "./filters/collection.ts";
import { asyncFilter } from "./filters/async.ts";
import { dateFilter } from "./filters/date.ts";
import {
  filterFilter,
  type FilterFactory,
  type FilterFn,
} from "./filters/filter.ts";
import { jsonFilter } from "./filters/json.ts";
import { limitToFilter } from "./filters/limit-to.ts";
import {
  currencyFilter,
  numberFilter,
  percentFilter,
} from "./filters/number.ts";
import { orderByFilter } from "./filters/order-by.ts";
import { relativeTimeFilter } from "./filters/relative-time.ts";
import {
  applyAriaConfiguration,
  createAriaRuntimeState,
  createAriaService,
  destroyAriaRuntimeState,
  ngCheckedAriaDirective,
  ngClickAriaDirective,
  ngDblclickAriaDirective,
  ngDisabledAriaDirective,
  ngHideAriaDirective,
  ngMessagesAriaDirective,
  ngModelAriaDirective,
  ngReadonlyAriaDirective,
  ngRequiredAriaDirective,
  ngShowAriaDirective,
  ngValueAriaDirective,
  type AriaConfig,
} from "./directive/aria/aria.ts";
import { ngAttributeAliasDirectives } from "./directive/attrs/attrs.ts";
import {
  ngBindDirective,
  ngBindHtmlDirective,
  ngBindTemplateDirective,
} from "./directive/bind/bind.ts";
import { ngChannelDirective } from "./directive/channel/channel.ts";
import { classDirective } from "./directive/class/class.ts";
import { ngCloakDirective } from "./directive/cloak/cloak.ts";
import { ngControllerDirective } from "./directive/controller/controller.ts";
import { ngElDirective } from "./directive/el/el.ts";
import { ngEventDirectives } from "./directive/events/events.ts";
import { formDirective, ngFormDirective } from "./directive/form/form.ts";
import {
  ngDeleteDirective,
  ngGetDirective,
  ngPostDirective,
  ngPutDirective,
  ngSseDirective,
} from "./directive/http/http.ts";
import { ngIfDirective } from "./directive/if/if.ts";
import {
  ngIncludeDirective,
  ngIncludeFillContentDirective,
} from "./directive/include/include.ts";
import { inputDirective } from "./directive/input/input.ts";
import { ngInitDirective } from "./directive/init/init.ts";
import { ngInjectDirective } from "./directive/inject/inject.ts";
import { ngListenerDirective } from "./directive/listener/listener.ts";
import { ngModelDirective } from "./directive/model/model.ts";
import { ngModelOptionsDirective } from "./directive/model-options/model-options.ts";
import {
  ngMessageDefaultDirective,
  ngMessageDirective,
  ngMessageExpDirective,
  ngMessagesDirective,
  ngMessagesIncludeDirective,
} from "./directive/messages/messages.ts";
import { ngNonBindableDirective } from "./directive/non-bindable/non-bindable.ts";
import { ngOptionsDirective } from "./directive/options/options.ts";
import { ngPointerCaptureDirective } from "./directive/pointer-capture/pointer-capture.ts";
import { optionDirective, selectDirective } from "./directive/select/select.ts";
import { ngRefDirective } from "./directive/ref/ref.ts";
import { ngRepeatDirective } from "./directive/repeat/repeat.ts";
import { ngScopeDirective } from "./directive/scope/scope.ts";
import { scriptDirective } from "./directive/script/script.ts";
import { ngSetterDirective } from "./directive/setter/setter.ts";
import {
  ngHideDirective,
  ngShowDirective,
} from "./directive/show-hide/show-hide.ts";
import { ngStyleDirective } from "./directive/style/style.ts";
import {
  ngSwitchDefaultDirective,
  ngSwitchDirective,
  ngSwitchWhenDirective,
} from "./directive/switch/switch.ts";
import { ngTranscludeDirective } from "./directive/transclude/transclude.ts";
import {
  maxlengthDirective,
  minlengthDirective,
  patternDirective,
  requiredDirective,
} from "./directive/validators/validators.ts";
import { ngViewportDirective } from "./directive/viewport/viewport.ts";
import { ngWebTransportDirective } from "./directive/webtransport/webtransport.ts";
import { ngWorkerDirective } from "./directive/worker/worker.ts";
import {
  StateRefActiveDirective,
  StateRefDynamicDirective,
} from "./router/directives/state-directives.ts";
import {
  ViewDirective,
  ViewDirectiveContentGuard,
} from "./router/directives/view-directive.ts";
import { routerRuntimeRegistration } from "./router/composition/router-runtime.ts";
import {
  applyAnchorScrollConfiguration,
  createAnchorScrollRuntimeState,
  createAnchorScrollService,
  destroyAnchorScrollRuntimeState,
  type AnchorScrollConfig,
} from "./services/anchor-scroll/anchor-scroll.ts";
import {
  CookieService,
  type CookieConfig,
  type CookieOptions,
} from "./services/cookie/cookie.ts";
import {
  applyExceptionHandlerConfiguration,
  createExceptionHandlerService,
  type ExceptionHandlerConfig,
} from "./services/exception/exception.ts";
import {
  applyHttpConfiguration,
  createHttpParamSerializer,
  createHttpRuntimeConfiguration,
  createHttpService,
  type HttpConfig,
} from "./services/http/http.ts";
import {
  applyLocationConfiguration,
  createLocationRuntimeState,
  type LocationConfig,
} from "./services/location/location.ts";
import {
  applyLogConfiguration,
  createLogRuntimeConfiguration,
  createLogService,
  type LogBeaconSerializer,
  type LogConfig,
} from "./services/log/log.ts";
import {
  applyEventBusConfiguration,
  createEventBusRuntimeState,
  createEventBusService,
  destroyEventBusRuntimeState,
  type EventBus,
  type EventBusConfig,
} from "./services/event-bus/event-bus.ts";
import {
  createRestFactory,
  type RestConfig,
  type RestOptions,
} from "./services/rest/rest.ts";
import {
  applySecurityConfiguration,
  createSecurityPolicy,
  createSecurityRuntimeConfiguration,
  type SecurityPolicyConfig,
} from "./services/security/security.ts";
import {
  createServiceWorkerService,
  destroyServiceWorkerService,
  type ServiceWorkerService,
} from "./services/service-worker/service-worker.ts";
import {
  SceConfiguration,
  type SceConfig,
  SceDelegateConfiguration,
  type SceDelegateConfig,
} from "./services/sce/sce.ts";
import {
  applySseConfiguration,
  createSseRuntimeConfiguration,
  createSseService,
  destroySseRuntimeConfiguration,
  type SseConfig,
} from "./services/sse/sse.ts";
import { createStreamService } from "./services/stream/readable-stream.ts";
import type {
  TemplateCache,
  TemplateCacheConfig,
} from "./services/template-cache/template-cache.ts";
import {
  applyTemplateRequestConfig,
  createTemplateRequestHttpOptions,
  createTemplateRequestService,
  type TemplateRequestConfig,
} from "./services/template-request/template-request.ts";
import {
  applyWebComponentConfiguration,
  createWebComponentRuntimeState,
  createWebComponentService,
  destroyWebComponentRuntimeState,
  type WebComponentConfig,
} from "./services/web-component/web-component.ts";
import {
  applyWebTransportConfiguration,
  createWebTransportRuntimeConfiguration,
  createWebTransportService,
  destroyWebTransportRuntimeConfiguration,
  type WebTransportConfig,
} from "./services/webtransport/webtransport.ts";
import {
  applyWebSocketConfiguration,
  createWebSocketRuntimeConfiguration,
  createWebSocketService,
  destroyWebSocketRuntimeConfiguration,
  type WebSocketConfig,
} from "./services/websocket/websocket.ts";
import {
  createWorkerRuntimeState,
  createWorkerService,
  destroyWorkerRuntimeState,
} from "./services/worker/worker.ts";
import { entries } from "./shared/utils.ts";

export {
  entriesFilter,
  keysFilter,
  valuesFilter,
} from "./filters/collection.ts";
export { asyncFilter } from "./filters/async.ts";
export { dateFilter } from "./filters/date.ts";
export { filterFilter } from "./filters/filter.ts";
export type { FilterFactory, FilterFn } from "./filters/filter.ts";
export { jsonFilter } from "./filters/json.ts";
export { limitToFilter } from "./filters/limit-to.ts";
export {
  currencyFilter,
  numberFilter,
  percentFilter,
} from "./filters/number.ts";
export { orderByFilter } from "./filters/order-by.ts";
export { relativeTimeFilter } from "./filters/relative-time.ts";
export {
  ngCheckedAriaDirective,
  ngClickAriaDirective,
  ngDblclickAriaDirective,
  ngDisabledAriaDirective,
  ngHideAriaDirective,
  ngMessagesAriaDirective,
  ngModelAriaDirective,
  ngReadonlyAriaDirective,
  ngRequiredAriaDirective,
  ngShowAriaDirective,
  ngValueAriaDirective,
} from "./directive/aria/aria.ts";
export { ngAttributeAliasDirectives } from "./directive/attrs/attrs.ts";
export {
  ngBindDirective,
  ngBindHtmlDirective,
  ngBindTemplateDirective,
} from "./directive/bind/bind.ts";
export { ngChannelDirective } from "./directive/channel/channel.ts";
export { classDirective } from "./directive/class/class.ts";
export { ngCloakDirective } from "./directive/cloak/cloak.ts";
export { ngControllerDirective } from "./directive/controller/controller.ts";
export { ngElDirective } from "./directive/el/el.ts";
export {
  createEventDirective,
  createWindowEventDirective,
  ngEventDirectives,
} from "./directive/events/events.ts";
export type {
  NgEventDirectiveName,
  NgEventName,
} from "./directive/events/events.ts";
export { formDirective, ngFormDirective } from "./directive/form/form.ts";
export {
  ngDeleteDirective,
  ngGetDirective,
  ngPostDirective,
  ngPutDirective,
  ngSseDirective,
} from "./directive/http/http.ts";
export { ngIfDirective } from "./directive/if/if.ts";
export {
  ngIncludeDirective,
  ngIncludeFillContentDirective,
} from "./directive/include/include.ts";
export { inputDirective } from "./directive/input/input.ts";
export { ngInitDirective } from "./directive/init/init.ts";
export { ngInjectDirective } from "./directive/inject/inject.ts";
export { ngListenerDirective } from "./directive/listener/listener.ts";
export { ngModelDirective } from "./directive/model/model.ts";
export { ngModelOptionsDirective } from "./directive/model-options/model-options.ts";
export {
  ngMessageDefaultDirective,
  ngMessageDirective,
  ngMessageExpDirective,
  ngMessagesDirective,
  ngMessagesIncludeDirective,
} from "./directive/messages/messages.ts";
export { ngNonBindableDirective } from "./directive/non-bindable/non-bindable.ts";
export { ngOptionsDirective } from "./directive/options/options.ts";
export { ngPointerCaptureDirective } from "./directive/pointer-capture/pointer-capture.ts";
export { optionDirective, selectDirective } from "./directive/select/select.ts";
export { ngRefDirective } from "./directive/ref/ref.ts";
export { ngRepeatDirective } from "./directive/repeat/repeat.ts";
export { ngScopeDirective } from "./directive/scope/scope.ts";
export { scriptDirective } from "./directive/script/script.ts";
export { ngSetterDirective } from "./directive/setter/setter.ts";
export {
  ngHideDirective,
  ngShowDirective,
} from "./directive/show-hide/show-hide.ts";
export { ngStyleDirective } from "./directive/style/style.ts";
export {
  ngSwitchDefaultDirective,
  ngSwitchDirective,
  ngSwitchWhenDirective,
} from "./directive/switch/switch.ts";
export { ngTranscludeDirective } from "./directive/transclude/transclude.ts";
export {
  maxlengthDirective,
  minlengthDirective,
  patternDirective,
  requiredDirective,
} from "./directive/validators/validators.ts";
export { ngViewportDirective } from "./directive/viewport/viewport.ts";
export { ngWebTransportDirective } from "./directive/webtransport/webtransport.ts";
export { ngWorkerDirective } from "./directive/worker/worker.ts";
export {
  StateRefActiveDirective,
  StateRefDynamicDirective,
} from "./router/directives/state-directives.ts";
export {
  ViewDirective,
  ViewDirectiveContentGuard,
} from "./router/directives/view-directive.ts";
export {
  getNormalizedAttr,
  getNormalizedAttrName,
  hasNormalizedAttr,
} from "./shared/dom.ts";
type Dynamic = ReturnType<typeof JSON.parse>;

type ProviderGroup = Record<string, RuntimeProviderRecipe>;

type DirectiveGroup = Record<string, ng.DirectiveFactory>;

type BuiltInFilterFactory = (...args: Dynamic[]) => FilterFn;

type FilterGroup = Record<string, BuiltInFilterFactory>;

/**
 * Runtime identity and DOM globals.
 *
 * Custom runtimes almost always want these values, even when they do not include
 * browser I/O, router, animation, or platform integration services.
 */
function registerRuntimeHostValues(
  angular: AngularRuntime,
  registry: ProviderRegistry,
): RuntimeComposition {
  const runtime = angular as ng.Angular & {
    _composition: RuntimeComposition;
  };
  const { platform } = runtime._composition;

  registry.value(_angular, angular);
  registry.value(_window, platform.window);
  registry.value(_document, platform.document);

  return runtime._composition;
}

/** Registers built-in filters against the runtime-owned filter registry. */
function registerBuiltInFilters(filterRegistry: FilterRegistry): void {
  const filterEntries = entries(ngBuiltInFilters) as [
    string,
    BuiltInFilterFactory,
  ][];

  filterEntries.forEach(([name, factory]) => {
    filterRegistry.register(name, factory as FilterFactory);
  });
}

/** Providers required by scopes, expressions, controllers, and compile. */
const controllerRuntimeRegistration: RuntimeRegistrationRecipe = {
  _register(registry, name, context): unknown {
    return registry.factory(name, [
      _injector,
      ($injector: ng.InjectorService) =>
        createControllerService(context.runtime.controllerRegistry, $injector),
    ]);
  },
};

const exceptionHandlerRuntimeRegistration: RuntimeRegistrationRecipe = {
  _register(registry, name, context): unknown {
    const state = context.runtime.exceptionHandlerState;

    context.runtime.configRegistry.register(name, (value) => {
      applyExceptionHandlerConfiguration(
        state,
        value as ExceptionHandlerConfig,
      );
    });

    return registry.factory(name, () => createExceptionHandlerService(state));
  },
};

const interpolateRuntimeRegistration: RuntimeRegistrationRecipe = {
  _register(registry, name, context): unknown {
    const state = context.runtime.interpolateState;

    context.runtime.configRegistry.register(name, (value) => {
      applyInterpolateConfiguration(state, value as InterpolateConfig);
    });

    return registry.factory(name, [
      _parse,
      _sce,
      ($parse: ng.ParseService, $sce: ng.SceService) =>
        createInterpolateService(state, $parse, $sce),
    ]);
  },
};

const parseRuntimeRegistration: RuntimeRegistrationRecipe = {
  _register(registry, name): unknown {
    return registry.factory(name, [
      _injector,
      ($injector: ng.InjectorService) => createParseService($injector),
    ]);
  },
};

const rootScopeRuntimeRegistration: RuntimeRegistrationRecipe = {
  _register(registry, name, context): unknown {
    return registry.factory(name, [
      _exceptionHandler,
      _parse,
      (
        $exceptionHandler: ng.ExceptionHandlerService,
        $parse: ng.ParseService,
      ) =>
        createRootScopeService(
          context.runtime.appContext,
          $exceptionHandler,
          $parse,
        ),
    ]);
  },
};

export const ngCoreProviders: ProviderGroup = {
  $controller: controllerRuntimeRegistration,
  $exceptionHandler: exceptionHandlerRuntimeRegistration,
  $interpolate: interpolateRuntimeRegistration,
  $parse: parseRuntimeRegistration,
  $rootScope: rootScopeRuntimeRegistration,
};

/** Reactive state and command orchestration providers for full app runtimes. */
const machineRuntimeRegistration: RuntimeRegistrationRecipe = {
  _register(registry: ProviderRegistry, name: string): unknown {
    return registry.factory(name, createMachineService);
  },
};

const workflowRuntimeRegistration: RuntimeRegistrationRecipe = {
  _register(registry: ProviderRegistry, name: string): unknown {
    return registry.factory(name, [_machine, createWorkflowService]);
  },
};

export const ngOrchestrationProviders = {
  [_machine]: machineRuntimeRegistration,
  [_workflow]: workflowRuntimeRegistration,
} satisfies ProviderGroup;

const filterRuntimeRegistration: RuntimeRegistrationRecipe = {
  _register(registry, name, context): unknown {
    const filterRegistry = context.runtime.filterRegistry;

    filterRegistry.attach(registry);

    return registry.factory(name, createFilterRegistration(filterRegistry));
  },
};

/** Expression filters. Omit this group for runtimes that do not use pipe filters. */
export const ngFilterProviders = {
  [_filter]: filterRuntimeRegistration,
} satisfies ProviderGroup;

/** Built-in filters included by the default full `ng` runtime. */
export const ngBuiltInFilters = {
  async: asyncFilter,
  date: dateFilter,
  entries: entriesFilter,
  filter: filterFilter,
  json: jsonFilter,
  keys: keysFilter,
  limitTo: limitToFilter,
  currency: currencyFilter,
  number: numberFilter,
  orderBy: orderByFilter,
  percent: percentFilter,
  relativeTime: relativeTimeFilter,
  values: valuesFilter,
} satisfies FilterGroup;

/** Browser services that are useful in normal apps but optional for small runtimes. */
const anchorScrollRuntimeRegistration: RuntimeRegistrationRecipe = {
  _register(registry, name, context): unknown {
    const state = createAnchorScrollRuntimeState();

    context.runtime.configRegistry.register(name, (value) => {
      applyAnchorScrollConfiguration(state, value as AnchorScrollConfig);
    });
    context.platform.addDisposer(() => {
      destroyAnchorScrollRuntimeState(state);
    });

    return registry.factory(name, [
      _location,
      _rootScope,
      _document,
      _window,
      (
        $location: ng.LocationService,
        $rootScope: ng.Scope,
        $document: Document,
        $window: Window,
      ) =>
        createAnchorScrollService(
          state,
          $location,
          $rootScope,
          $document,
          $window as Window & typeof globalThis,
        ),
    ]);
  },
};

const cookieRuntimeRegistration: RuntimeRegistrationRecipe = {
  _register(registry, name, context): unknown {
    let defaults: CookieOptions = {};

    context.runtime.configRegistry.register(name, (value) => {
      const config = value as CookieConfig;

      if (config.defaults !== undefined) {
        defaults = {
          ...defaults,
          ...config.defaults,
        };
      }
    });

    return registry.factory(name, () => new CookieService(defaults));
  },
};

const templateCacheRuntimeRegistration: RuntimeRegistrationRecipe = {
  _register(registry, name, context): unknown {
    let cache: TemplateCache = new Map();

    context.runtime.configRegistry.register(name, (value) => {
      const config = value as TemplateCacheConfig;

      if (config.cache !== undefined) cache = config.cache;
    });

    return registry.factory(name, () => cache);
  },
};

const templateRequestRuntimeRegistration: RuntimeRegistrationRecipe = {
  _register(registry, name, context): unknown {
    let httpOptions = createTemplateRequestHttpOptions();

    context.runtime.configRegistry.register(name, (value) => {
      const config = value as TemplateRequestConfig;

      httpOptions = applyTemplateRequestConfig(httpOptions, config);
    });

    return registry.factory(name, [
      _templateCache,
      _http,
      ($templateCache: ng.TemplateCacheService, $http: ng.HttpService) =>
        createTemplateRequestService($templateCache, $http, httpOptions),
    ]);
  },
};

const httpParamSerializerRuntimeRegistration: RuntimeRegistrationRecipe = {
  _register(registry, name): unknown {
    return registry.factory(name, createHttpParamSerializer);
  },
};

const httpRuntimeRegistration: RuntimeRegistrationRecipe = {
  _register(registry, name, context): unknown {
    const configuration = createHttpRuntimeConfiguration();

    context.runtime.configRegistry.register(name, (value) => {
      applyHttpConfiguration(configuration, value as HttpConfig);
    });

    return registry.factory(name, [
      _injector,
      _sce,
      _cookie,
      _security,
      _stream,
      (
        $injector: ng.InjectorService,
        $sce: ng.SceService,
        $cookie: ng.CookieService,
        $security: ng.SecurityPolicy,
        $stream: ng.StreamService,
      ) =>
        createHttpService(
          $injector,
          $sce,
          $cookie,
          $security,
          $stream,
          configuration,
        ),
    ]);
  },
};

const ariaRuntimeRegistration: RuntimeRegistrationRecipe = {
  _register(registry, name, context): unknown {
    const state = createAriaRuntimeState();

    context.runtime.configRegistry.register(name, (value) => {
      applyAriaConfiguration(state, value as Partial<AriaConfig>);
    });
    context.platform.addDisposer(() => {
      destroyAriaRuntimeState(state);
    });

    return registry.factory(name, [
      _log,
      ($log: ng.LogService) => createAriaService(state, $log),
    ]);
  },
};

const locationRuntimeRegistration: RuntimeRegistrationRecipe = {
  _register(registry, name, context): unknown {
    const state = createLocationRuntimeState(context.platform.window);

    context.runtime.configRegistry.register(name, (value) => {
      applyLocationConfiguration(state, value as LocationConfig);
    });
    context.platform.addDisposer(() => {
      state.destroy();
    });

    registry.factory(name, [
      _rootScope,
      _rootElement,
      _exceptionHandler,
      (
        $rootScope: ng.Scope,
        $rootElement: HTMLElement,
        $exceptionHandler: ng.ExceptionHandlerService,
      ) => state.createService($rootScope, $rootElement, $exceptionHandler),
    ]);

    return state;
  },
};

const logRuntimeRegistration: RuntimeRegistrationRecipe = {
  _register(registry, name, context): unknown {
    const configuration = createLogRuntimeConfiguration();

    context.runtime.configRegistry.register(name, (value) => {
      applyLogConfiguration(configuration, value as LogConfig);
    });

    return registry.factory(name, [
      _injector,
      ($injector: ng.InjectorService) => {
        const navigator = context.platform.window.navigator;

        return createLogService(configuration, context.platform.console, {
          resolveSerializer: (serializerName) =>
            $injector.get<LogBeaconSerializer>(serializerName),
          sendBeacon:
            typeof navigator.sendBeacon === "function"
              ? (url, data) => navigator.sendBeacon(url, data)
              : undefined,
        });
      },
    ]);
  },
};

export const ngBrowserProviders = {
  $anchorScroll: anchorScrollRuntimeRegistration,
  $aria: ariaRuntimeRegistration,
  $cookie: cookieRuntimeRegistration,
  $http: httpRuntimeRegistration,
  $httpParamSerializer: httpParamSerializerRuntimeRegistration,
  $location: locationRuntimeRegistration,
  $log: logRuntimeRegistration,
  $templateCache: templateCacheRuntimeRegistration,
  $templateRequest: templateRequestRuntimeRegistration,
} satisfies ProviderGroup;

/** Strict contextual escaping providers. */
const sceRuntimeRegistration: RuntimeRegistrationRecipe = {
  _register(registry, name, context): unknown {
    const configuration = new SceConfiguration();

    context.runtime.configRegistry.register(name, (value) => {
      const config = value as SceConfig;

      if (config.enabled !== undefined) {
        configuration.enabled(config.enabled);
      }
    });

    return registry.factory(name, [
      _parse,
      _sceDelegate,
      ($parse: ng.ParseService, $sceDelegate: ng.SceDelegateService) =>
        configuration.createService($parse, $sceDelegate),
    ]);
  },
};

const sceDelegateRuntimeRegistration: RuntimeRegistrationRecipe = {
  _register(registry, name, context): unknown {
    const configuration = new SceDelegateConfiguration();

    context.runtime.configRegistry.register(name, (value) => {
      const config = value as SceDelegateConfig;

      if (config.trustedResourceUrlList !== undefined) {
        configuration.trustedResourceUrlList(config.trustedResourceUrlList);
      }
      if (config.bannedResourceUrlList !== undefined) {
        configuration.bannedResourceUrlList(config.bannedResourceUrlList);
      }
      if (config.aHrefSanitizationTrustedUrlList !== undefined) {
        configuration.aHrefSanitizationTrustedUrlList(
          config.aHrefSanitizationTrustedUrlList,
        );
      }
      if (config.imgSrcSanitizationTrustedUrlList !== undefined) {
        configuration.imgSrcSanitizationTrustedUrlList(
          config.imgSrcSanitizationTrustedUrlList,
        );
      }
    });

    return registry.factory(name, [
      _injector,
      _window,
      _exceptionHandler,
      (
        $injector: ng.InjectorService,
        $window: Window,
        $exceptionHandler: ng.ExceptionHandlerService,
      ) => configuration.createService($injector, $window, $exceptionHandler),
    ]);
  },
};

const securityRuntimeRegistration: RuntimeRegistrationRecipe = {
  _register(registry, name, context): unknown {
    const configuration = createSecurityRuntimeConfiguration();
    const policy = createSecurityPolicy(
      configuration,
      () => context.platform.window.location.href,
    );

    context.runtime.configRegistry.register(name, (value) => {
      applySecurityConfiguration(configuration, value as SecurityPolicyConfig);
    });
    registry.value(name, policy);

    return policy;
  },
};

export const ngSecurityProviders = {
  $security: securityRuntimeRegistration,
  $sce: sceRuntimeRegistration,
  $sceDelegate: sceDelegateRuntimeRegistration,
} satisfies ProviderGroup;

/** Native animation service composition. */
const animateRuntimeRegistration: RuntimeRegistrationRecipe = {
  _register(registry, name, context): unknown {
    return registry.factory(name, [
      _injector,
      ($injector: ng.InjectorService) =>
        createAnimateService(context.runtime.animationRegistry, $injector),
    ]);
  },
};

export const ngAnimationProviders = {
  $animate: animateRuntimeRegistration,
} satisfies ProviderGroup;

/** State-router providers. Omit this group for custom-element or widget runtimes without routing. */
export const ngRouterProviders = {
  [_state]: routerRuntimeRegistration,
} satisfies ProviderGroup;

const streamRuntimeRegistration: RuntimeRegistrationRecipe = {
  _register(registry: ProviderRegistry, name: string): unknown {
    return registry.factory(name, createStreamService);
  },
};

const eventBusRuntimeRegistration: RuntimeRegistrationRecipe = {
  _register(registry, name, context): unknown {
    const state = createEventBusRuntimeState();

    context.runtime.configRegistry.register(name, (value) => {
      applyEventBusConfiguration(state, value as EventBusConfig);
    });
    context.runtime.addDisposer(() => {
      destroyEventBusRuntimeState(state);
    });

    return registry.factory(name, [
      _exceptionHandler,
      _angular,
      ($exceptionHandler: ng.ExceptionHandlerService, angular: ng.Angular) => {
        const host = angular as ng.Angular & { $eventBus?: EventBus };
        const service = createEventBusService(
          state,
          $exceptionHandler,
          host.$eventBus,
        );

        host.$eventBus = service;

        return service;
      },
    ]);
  },
};

const restRuntimeRegistration: RuntimeRegistrationRecipe = {
  _register(registry, name, context): unknown {
    let defaults: RestOptions = {};

    context.runtime.configRegistry.register(name, (value) => {
      const config = value as RestConfig;

      if (config.defaults !== undefined) {
        defaults = { ...defaults, ...config.defaults };
      }
    });

    return registry.factory(name, [
      _http,
      ($http: ng.HttpService) => createRestFactory($http, defaults),
    ]);
  },
};

const websocketRuntimeRegistration: RuntimeRegistrationRecipe = {
  _register(registry, name, context): unknown {
    const configuration = createWebSocketRuntimeConfiguration();
    const runtimeWindow = context.platform.window as Window & {
      WebSocket: typeof WebSocket;
    };

    context.runtime.configRegistry.register(name, (value) => {
      applyWebSocketConfiguration(
        configuration,
        value as { defaults?: WebSocketConfig },
      );
    });
    context.platform.addDisposer(() => {
      destroyWebSocketRuntimeConfiguration(configuration);
    });

    return registry.factory(name, [
      _log,
      ($log: ng.LogService) =>
        createWebSocketService($log, configuration, runtimeWindow.WebSocket),
    ]);
  },
};

const sseRuntimeRegistration: RuntimeRegistrationRecipe = {
  _register(registry, name, context): unknown {
    const configuration = createSseRuntimeConfiguration();
    const runtimeWindow = context.platform.window as Window & {
      EventSource: typeof EventSource;
    };

    context.runtime.configRegistry.register(name, (value) => {
      applySseConfiguration(configuration, value as { defaults?: SseConfig });
    });
    context.platform.addDisposer(() => {
      destroySseRuntimeConfiguration(configuration);
    });

    return registry.factory(name, [
      _log,
      ($log: ng.LogService) =>
        createSseService($log, configuration, () => runtimeWindow.EventSource),
    ]);
  },
};

const webTransportRuntimeRegistration: RuntimeRegistrationRecipe = {
  _register(registry, name, context): unknown {
    const configuration = createWebTransportRuntimeConfiguration();
    const runtimeWindow = context.platform.window as Window & {
      WebTransport?: new (
        url: string,
        options?: WebTransportOptions,
      ) => WebTransport;
    };

    context.runtime.configRegistry.register(name, (value) => {
      applyWebTransportConfiguration(
        configuration,
        value as {
          defaults?: WebTransportConfig;
        },
      );
    });
    context.platform.addDisposer(() => {
      destroyWebTransportRuntimeConfiguration(configuration);
    });

    return registry.factory(name, [
      _log,
      ($log: ng.LogService) =>
        createWebTransportService(
          $log,
          configuration,
          () => runtimeWindow.WebTransport,
          runtimeWindow.location.href,
        ),
    ]);
  },
};

const workerRuntimeRegistration: RuntimeRegistrationRecipe = {
  _register(registry, name, context): unknown {
    const state = createWorkerRuntimeState();
    const runtimeWindow = context.platform.window as Window & {
      Worker: typeof Worker;
    };

    context.platform.addDisposer(() => {
      destroyWorkerRuntimeState(state);
    });

    return registry.factory(name, [
      _log,
      ($log: ng.LogService) =>
        createWorkerService($log, state, () => runtimeWindow.Worker),
    ]);
  },
};

const webComponentRuntimeRegistration: RuntimeRegistrationRecipe = {
  _register(registry, name, context): unknown {
    const state = createWebComponentRuntimeState();

    context.runtime.configRegistry.register(name, (value) => {
      applyWebComponentConfiguration(state, value as WebComponentConfig);
    });
    context.platform.addDisposer(() => {
      destroyWebComponentRuntimeState(state);
    });

    return registry.factory(name, [
      _injector,
      _rootScope,
      _compile,
      (
        $injector: ng.InjectorService,
        $rootScope: ng.Scope,
        $compile: ng.CompileService,
      ) => createWebComponentService($injector, $rootScope, $compile, state),
    ]);
  },
};

const serviceWorkerRuntimeRegistration: RuntimeRegistrationRecipe = {
  _register(registry, name, context): unknown {
    let service: ServiceWorkerService | undefined;
    let destroyed = false;

    context.platform.addDisposer(() => {
      destroyed = true;

      if (service) destroyServiceWorkerService(service);
    });

    return registry.factory(name, [
      _log,
      _exceptionHandler,
      (log: ng.LogService, err: ng.ExceptionHandlerService) => {
        service = createServiceWorkerService(
          context.platform.window.navigator.serviceWorker,
          { log, err },
        );

        if (destroyed) destroyServiceWorkerService(service);

        return service;
      },
    ]);
  },
};

/** Network, messaging, persistence, and worker-style integration providers. */
export const ngIntegrationProviders = {
  [_eventBus]: eventBusRuntimeRegistration,
  $rest: restRuntimeRegistration,
  [_serviceWorker]: serviceWorkerRuntimeRegistration,
  [_sse]: sseRuntimeRegistration,
  $stream: streamRuntimeRegistration,
  [_webComponent]: webComponentRuntimeRegistration,
  [_websocket]: websocketRuntimeRegistration,
  [_webTransport]: webTransportRuntimeRegistration,
  [_worker]: workerRuntimeRegistration,
} satisfies ProviderGroup;

/** Element, form, and script directives for normal HTML integration. */
export const ngElementDirectives = {
  input: inputDirective,
  textarea: inputDirective,
  form: formDirective,
  script: scriptDirective,
  select: selectDirective,
  option: optionDirective,
  ngForm: ngFormDirective,
} satisfies DirectiveGroup;

/** Template binding and DOM update directives. */
export const ngBindingDirectives = {
  ngBind: ngBindDirective,
  ngBindHtml: ngBindHtmlDirective,
  ngBindTemplate: ngBindTemplateDirective,
  ngClass: classDirective,
  ngCloak: ngCloakDirective,
  ngEl: ngElDirective,
  ngHide: ngHideDirective,
  ngRef: ngRefDirective,
  ngShow: ngShowDirective,
  ngStyle: ngStyleDirective,
} satisfies DirectiveGroup;

/** Control-flow and composition directives. */
export const ngTemplateDirectives = {
  ngController: ngControllerDirective,
  ngIf: ngIfDirective,
  ngInclude: ngIncludeDirective,
  ngInject: ngInjectDirective,
  ngInit: ngInitDirective,
  ngListener: ngListenerDirective,
  ngNonBindable: ngNonBindableDirective,
  ngPointerCapture: ngPointerCaptureDirective,
  ngRepeat: ngRepeatDirective,
  ngScope: ngScopeDirective,
  ngSetter: ngSetterDirective,
  ngSwitch: ngSwitchDirective,
  ngSwitchWhen: ngSwitchWhenDirective,
  ngSwitchDefault: ngSwitchDefaultDirective,
  ngTransclude: ngTranscludeDirective,
} satisfies DirectiveGroup;

/** Form model, validation, selection, and message directives. */
export const ngFormDirectives = {
  ngMessages: ngMessagesDirective,
  ngMessage: ngMessageDirective,
  ngMessageExp: ngMessageExpDirective,
  ngMessagesInclude: ngMessagesIncludeDirective,
  ngMessageDefault: ngMessageDefaultDirective,
  ngModel: ngModelDirective,
  ngModelOptions: ngModelOptionsDirective,
  ngOptions: ngOptionsDirective,
  pattern: patternDirective,
  ngPattern: patternDirective,
  required: requiredDirective,
  ngRequired: requiredDirective,
  ngMinlength: minlengthDirective,
  minlength: minlengthDirective,
  ngMaxlength: maxlengthDirective,
  maxlength: maxlengthDirective,
} satisfies DirectiveGroup;

/** HTTP, streaming, WebTransport, and Worker directives. */
export const ngIntegrationDirectives = {
  ngChannel: ngChannelDirective,
  ngDelete: ngDeleteDirective,
  ngGet: ngGetDirective,
  ngPost: ngPostDirective,
  ngPut: ngPutDirective,
  ngSse: ngSseDirective,
  ngViewport: ngViewportDirective,
  ngWebTransport: ngWebTransportDirective,
  ngWorker: ngWorkerDirective,
} satisfies DirectiveGroup;

/** Accessibility enhancement directives layered onto normal template directives. */
export const ngAriaDirectives = {
  ngChecked: ngCheckedAriaDirective,
  ngClick: ngClickAriaDirective,
  ngDblclick: ngDblclickAriaDirective,
  ngDisabled: ngDisabledAriaDirective,
  ngHide: ngHideAriaDirective,
  ngShow: ngShowAriaDirective,
  ngMessages: ngMessagesAriaDirective,
  ngModel: ngModelAriaDirective,
  ngReadonly: ngReadonlyAriaDirective,
  ngRequired: ngRequiredAriaDirective,
  ngValue: ngValueAriaDirective,
} satisfies DirectiveGroup;

/** State-router directives. */
export const ngRouterDirectives = {
  ngState: StateRefDynamicDirective,
  ngStateActive: StateRefActiveDirective,
  ngStateActiveExact: StateRefActiveDirective,
  ngView: ViewDirective,
} satisfies DirectiveGroup;

/** Fill/transclusion directives that intentionally register after their base directive. */
export const ngFillDirectives = {
  ngInclude: ngIncludeFillContentDirective,
  ngView: ViewDirectiveContentGuard,
} satisfies DirectiveGroup;

/** Provider groups included by the default full `ng` runtime. */
export const ngDefaultProviderGroups = [
  ngCoreProviders,
  ngOrchestrationProviders,
  ngFilterProviders,
  ngSecurityProviders,
  ngBrowserProviders,
  ngAnimationProviders,
  ngRouterProviders,
  ngIntegrationProviders,
] satisfies ProviderGroup[];

/** Directive groups included by the default full `ng` runtime. */
export const ngDefaultDirectiveGroups = [
  ngElementDirectives,
  ngBindingDirectives,
  ngTemplateDirectives,
  ngFormDirectives,
  ngIntegrationDirectives,
  ngAriaDirectives,
  ngRouterDirectives,
  ngFillDirectives,
  ngAttributeAliasDirectives,
  ngEventDirectives,
] satisfies DirectiveGroup[];

/**
 * Initializes and registers the core `ng` module.
 *
 * This wires together the built-in providers, directives, services, and
 * router integrations that make up the default AngularTS runtime.
 */
export function registerNgModule(angular: AngularRuntime): ng.NgModule {
  const runtime = angular as ng.Angular & {
    _composition: RuntimeComposition;
  };
  const compileRegistry = runtime._composition.compileRegistry;

  const ngModule = angular.module("ng", []);

  ngModule._registerProviders((registry) => {
    const composition = registerRuntimeHostValues(angular, registry);

    registry.factory(_compile, [
      _injector,
      _interpolate,
      _sce,
      _exceptionHandler,
      _parse,
      _controller,
      _rootScope,
      (
        $injector: ng.InjectorService,
        $interpolate: ng.InterpolateService,
        $sce: ng.SceService,
        $exceptionHandler: ng.ExceptionHandlerService,
        $parse: ng.ParseService,
        $controller: ng.ControllerService,
        $rootScope: ng.Scope,
      ) =>
        compileRegistry.createService(
          $injector,
          $interpolate,
          $sce,
          $exceptionHandler,
          $parse,
          $controller,
          requireAppRoot(composition.appContext, $rootScope),
        ),
    ]);

    const registeredProviders = new Map<string, unknown>();

    ngDefaultProviderGroups.forEach((providers) => {
      registerRuntimeProviders(
        registry,
        providers,
        composition,
        registeredProviders,
      );
    });

    registerBuiltInFilters(composition.filterRegistry);
  });

  ngDefaultDirectiveGroups.forEach((directives) => {
    entries(directives).forEach(([name, directive]) => {
      ngModule.directive(name, directive);
    });
  });

  return ngModule;
}
