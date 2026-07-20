import { _injector, _templateCache, _http, _security, _rootScope, _rootElement, _exceptionHandler, _sce, _cookie, _stream, _log, _location, _document, _window, _parse, _workflow, _machine, _filter, _sceDelegate, _state, _worker, _webTransport, _websocket, _webComponent, _sse, _serviceWorker, _eventBus, _compile, _angular, _interpolate, _controller } from './injection-tokens.js';
import { createAnimateService } from './animations/animate.js';
import { createControllerService } from './core/controller/controller.js';
import { createFilterRegistration } from './core/filter/filter.js';
import { applyInterpolateConfiguration, createInterpolateService } from './core/interpolate/interpolate.js';
import { createMachineService } from './services/machine/machine.js';
import { createWorkflowService } from './services/workflow/workflow.js';
import { createParseService } from './core/parse/parse.js';
import { requireAppRoot } from './core/app-context/app-context.js';
import { registerRuntimeProviders } from './core/composition/runtime-composition.js';
import { createRootScopeService } from './core/scope/scope.js';
import { valuesFilter, keysFilter, entriesFilter } from './filters/collection.js';
import { asyncFilter } from './filters/async.js';
import { dateFilter } from './filters/date.js';
import { filterFilter } from './filters/filter.js';
import { jsonFilter } from './filters/json.js';
import { limitToFilter } from './filters/limit-to.js';
import { percentFilter, numberFilter, currencyFilter } from './filters/number.js';
import { orderByFilter } from './filters/order-by.js';
import { relativeTimeFilter } from './filters/relative-time.js';
import { ngValueAriaDirective, ngRequiredAriaDirective, ngReadonlyAriaDirective, ngModelAriaDirective, ngMessagesAriaDirective, ngShowAriaDirective, ngHideAriaDirective, ngDisabledAriaDirective, ngDblclickAriaDirective, ngClickAriaDirective, ngCheckedAriaDirective, applyAriaConfiguration, destroyAriaRuntimeState, createAriaService, createAriaRuntimeState } from './directive/aria/aria.js';
import { ngAttributeAliasDirectives } from './directive/attrs/attrs.js';
import { ngBindTemplateDirective, ngBindHtmlDirective, ngBindDirective } from './directive/bind/bind.js';
import { ngChannelDirective } from './directive/channel/channel.js';
import { classDirective } from './directive/class/class.js';
import { ngCloakDirective } from './directive/cloak/cloak.js';
import { ngControllerDirective } from './directive/controller/controller.js';
import { ngElDirective } from './directive/el/el.js';
import { ngEventDirectives } from './directive/events/events.js';
export { createEventDirective, createWindowEventDirective } from './directive/events/events.js';
import { ngFormDirective, formDirective } from './directive/form/form.js';
import { ngSseDirective, ngPutDirective, ngPostDirective, ngGetDirective, ngDeleteDirective } from './directive/http/http.js';
import { ngIfDirective } from './directive/if/if.js';
import { ngIncludeDirective, ngIncludeFillContentDirective } from './directive/include/include.js';
import { inputDirective } from './directive/input/input.js';
import { ngInitDirective } from './directive/init/init.js';
import { ngInjectDirective } from './directive/inject/inject.js';
import { ngListenerDirective } from './directive/listener/listener.js';
import { ngModelDirective } from './directive/model/model.js';
import { ngModelOptionsDirective } from './directive/model-options/model-options.js';
import { ngMessageDefaultDirective, ngMessagesIncludeDirective, ngMessageExpDirective, ngMessageDirective, ngMessagesDirective } from './directive/messages/messages.js';
import { ngNonBindableDirective } from './directive/non-bindable/non-bindable.js';
import { ngOptionsDirective } from './directive/options/options.js';
import { ngPointerCaptureDirective } from './directive/pointer-capture/pointer-capture.js';
import { optionDirective, selectDirective } from './directive/select/select.js';
import { ngRefDirective } from './directive/ref/ref.js';
import { ngRepeatDirective } from './directive/repeat/repeat.js';
import { ngScopeDirective } from './directive/scope/scope.js';
import { scriptDirective } from './directive/script/script.js';
import { ngSetterDirective } from './directive/setter/setter.js';
import { ngShowDirective, ngHideDirective } from './directive/show-hide/show-hide.js';
import { ngStyleDirective } from './directive/style/style.js';
import { ngSwitchDefaultDirective, ngSwitchWhenDirective, ngSwitchDirective } from './directive/switch/switch.js';
import { ngTranscludeDirective } from './directive/transclude/transclude.js';
import { maxlengthDirective, minlengthDirective, requiredDirective, patternDirective } from './directive/validators/validators.js';
import { ngViewportDirective } from './directive/viewport/viewport.js';
import { ngWebTransportDirective } from './directive/webtransport/webtransport.js';
import { ngWorkerDirective } from './directive/worker/worker.js';
import { StateRefActiveDirective, StateRefDynamicDirective } from './router/directives/state-directives.js';
import { ViewDirective, ViewDirectiveContentGuard } from './router/directives/view-directive.js';
import { routerRuntimeRegistration } from './router/composition/router-runtime.js';
import { applyAnchorScrollConfiguration, destroyAnchorScrollRuntimeState, createAnchorScrollService, createAnchorScrollRuntimeState } from './services/anchor-scroll/anchor-scroll.js';
import { CookieService } from './services/cookie/cookie.js';
import { applyExceptionHandlerConfiguration, createExceptionHandlerService } from './services/exception/exception.js';
import { createHttpParamSerializer, createHttpRuntimeConfiguration, applyHttpConfiguration, createHttpService } from './services/http/http.js';
import { createLocationRuntimeState, applyLocationConfiguration } from './services/location/location.js';
import { applyLogConfiguration, createLogService, createLogRuntimeConfiguration } from './services/log/log.js';
import { applyEventBusConfiguration, destroyEventBusRuntimeState, createEventBusService, createEventBusRuntimeState } from './services/event-bus/event-bus.js';
import { createRestFactory } from './services/rest/rest.js';
import { applySecurityConfiguration, createSecurityPolicy, createSecurityRuntimeConfiguration } from './services/security/security.js';
import { applyServiceWorkerConfiguration, createServiceWorkerService, destroyServiceWorkerService, createServiceWorkerRuntimeConfiguration } from './services/service-worker/service-worker.js';
import { SceDelegateConfiguration, SceConfiguration } from './services/sce/sce.js';
import { applySseConfiguration, destroySseRuntimeConfiguration, createSseService, createSseRuntimeConfiguration } from './services/sse/sse.js';
import { createStreamService } from './services/stream/readable-stream.js';
import { applyTemplateRequestConfig, createTemplateRequestService, createTemplateRequestHttpOptions } from './services/template-request/template-request.js';
import { applyWebComponentConfiguration, destroyWebComponentRuntimeState, createWebComponentService, createWebComponentRuntimeState } from './services/web-component/web-component.js';
import { applyWebTransportConfiguration, destroyWebTransportRuntimeConfiguration, createWebTransportService, createWebTransportRuntimeConfiguration } from './services/webtransport/webtransport.js';
import { applyWebSocketConfiguration, destroyWebSocketRuntimeConfiguration, createWebSocketService, createWebSocketRuntimeConfiguration } from './services/websocket/websocket.js';
import { destroyWorkerRuntimeState, createWorkerService, createWorkerRuntimeState } from './services/worker/worker.js';
import { entries } from './shared/utils.js';
export { getNormalizedAttr, getNormalizedAttrName, hasNormalizedAttr } from './shared/dom.js';

/**
 * Runtime identity and DOM globals.
 *
 * Custom runtimes almost always want these values, even when they do not include
 * browser I/O, router, animation, or platform integration services.
 */
function registerRuntimeHostValues(angular, registry) {
    const runtime = angular;
    const { platform } = runtime._composition;
    registry.value(_angular, angular);
    registry.value(_window, platform.window);
    registry.value(_document, platform.document);
    return runtime._composition;
}
/** Registers built-in filters against the runtime-owned filter registry. */
function registerBuiltInFilters(filterRegistry) {
    const filterEntries = entries(ngBuiltInFilters);
    filterEntries.forEach(([name, factory]) => {
        filterRegistry.register(name, factory);
    });
}
/** Providers required by scopes, expressions, controllers, and compile. */
const controllerRuntimeRegistration = {
    _register(registry, name, context) {
        return registry.factory(name, [
            _injector,
            ($injector) => createControllerService(context.runtime.controllerRegistry, $injector),
        ]);
    },
};
const exceptionHandlerRuntimeRegistration = {
    _register(registry, name, context) {
        const state = context.runtime.exceptionHandlerState;
        context.runtime.configRegistry.register(name, (value) => {
            applyExceptionHandlerConfiguration(state, value);
        });
        return registry.factory(name, () => createExceptionHandlerService(state));
    },
};
const interpolateRuntimeRegistration = {
    _register(registry, name, context) {
        const state = context.runtime.interpolateState;
        context.runtime.configRegistry.register(name, (value) => {
            applyInterpolateConfiguration(state, value);
        });
        return registry.factory(name, [
            _parse,
            _sce,
            ($parse, $sce) => createInterpolateService(state, $parse, $sce),
        ]);
    },
};
const parseRuntimeRegistration = {
    _register(registry, name) {
        return registry.factory(name, [
            _injector,
            ($injector) => createParseService($injector),
        ]);
    },
};
const rootScopeRuntimeRegistration = {
    _register(registry, name, context) {
        return registry.factory(name, [
            _exceptionHandler,
            _parse,
            ($exceptionHandler, $parse) => createRootScopeService(context.runtime.appContext, $exceptionHandler, $parse),
        ]);
    },
};
const ngCoreProviders = {
    $controller: controllerRuntimeRegistration,
    $exceptionHandler: exceptionHandlerRuntimeRegistration,
    $interpolate: interpolateRuntimeRegistration,
    $parse: parseRuntimeRegistration,
    $rootScope: rootScopeRuntimeRegistration,
};
/** Reactive state and command orchestration providers for full app runtimes. */
const machineRuntimeRegistration = {
    _register(registry, name) {
        return registry.factory(name, createMachineService);
    },
};
const workflowRuntimeRegistration = {
    _register(registry, name) {
        return registry.factory(name, createWorkflowService);
    },
};
const ngOrchestrationProviders = {
    [_machine]: machineRuntimeRegistration,
    [_workflow]: workflowRuntimeRegistration,
};
const filterRuntimeRegistration = {
    _register(registry, name, context) {
        const filterRegistry = context.runtime.filterRegistry;
        filterRegistry.attach(registry);
        return registry.factory(name, createFilterRegistration(filterRegistry));
    },
};
/** Expression filters. Omit this group for runtimes that do not use pipe filters. */
const ngFilterProviders = {
    [_filter]: filterRuntimeRegistration,
};
/** Built-in filters included by the default full `ng` runtime. */
const ngBuiltInFilters = {
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
};
/** Browser services that are useful in normal apps but optional for small runtimes. */
const anchorScrollRuntimeRegistration = {
    _register(registry, name, context) {
        const state = createAnchorScrollRuntimeState();
        context.runtime.configRegistry.register(name, (value) => {
            applyAnchorScrollConfiguration(state, value);
        });
        context.platform.addDisposer(() => {
            destroyAnchorScrollRuntimeState(state);
        });
        return registry.factory(name, [
            _location,
            _rootScope,
            _document,
            _window,
            ($location, $rootScope, $document, $window) => createAnchorScrollService(state, $location, $rootScope, $document, $window),
        ]);
    },
};
const cookieRuntimeRegistration = {
    _register(registry, name, context) {
        let defaults = {};
        context.runtime.configRegistry.register(name, (value) => {
            const config = value;
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
const templateCacheRuntimeRegistration = {
    _register(registry, name, context) {
        let cache = new Map();
        context.runtime.configRegistry.register(name, (value) => {
            const config = value;
            if (config.cache !== undefined)
                cache = config.cache;
        });
        return registry.factory(name, () => cache);
    },
};
const templateRequestRuntimeRegistration = {
    _register(registry, name, context) {
        let httpOptions = createTemplateRequestHttpOptions();
        context.runtime.configRegistry.register(name, (value) => {
            const config = value;
            httpOptions = applyTemplateRequestConfig(httpOptions, config);
        });
        return registry.factory(name, [
            _templateCache,
            _http,
            ($templateCache, $http) => createTemplateRequestService($templateCache, $http, httpOptions),
        ]);
    },
};
const httpParamSerializerRuntimeRegistration = {
    _register(registry, name) {
        return registry.factory(name, createHttpParamSerializer);
    },
};
const httpRuntimeRegistration = {
    _register(registry, name, context) {
        const configuration = createHttpRuntimeConfiguration();
        context.runtime.configRegistry.register(name, (value) => {
            applyHttpConfiguration(configuration, value);
        });
        return registry.factory(name, [
            _injector,
            _sce,
            _cookie,
            _security,
            _stream,
            ($injector, $sce, $cookie, $security, $stream) => createHttpService($injector, $sce, $cookie, $security, $stream, configuration),
        ]);
    },
};
const ariaRuntimeRegistration = {
    _register(registry, name, context) {
        const state = createAriaRuntimeState();
        context.runtime.configRegistry.register(name, (value) => {
            applyAriaConfiguration(state, value);
        });
        context.platform.addDisposer(() => {
            destroyAriaRuntimeState(state);
        });
        return registry.factory(name, [
            _log,
            ($log) => createAriaService(state, $log),
        ]);
    },
};
const locationRuntimeRegistration = {
    _register(registry, name, context) {
        const state = createLocationRuntimeState(context.platform.window);
        context.runtime.configRegistry.register(name, (value) => {
            applyLocationConfiguration(state, value);
        });
        context.platform.addDisposer(() => {
            state.destroy();
        });
        registry.factory(name, [
            _rootScope,
            _rootElement,
            _exceptionHandler,
            ($rootScope, $rootElement, $exceptionHandler) => state.createService($rootScope, $rootElement, $exceptionHandler),
        ]);
        return state;
    },
};
const logRuntimeRegistration = {
    _register(registry, name, context) {
        const configuration = createLogRuntimeConfiguration();
        const securityPolicy = context.providers.get(_security);
        context.runtime.configRegistry.register(name, (value) => {
            applyLogConfiguration(configuration, value);
        });
        return registry.factory(name, [
            _injector,
            ($injector) => {
                const navigator = context.platform.window.navigator;
                return createLogService(configuration, context.platform.console, {
                    authorizeBeacon: securityPolicy
                        ? (securityContext) => securityPolicy.check(securityContext)
                        : undefined,
                    resolveSerializer: (serializerName) => $injector.get(serializerName),
                    sendBeacon: typeof navigator.sendBeacon === "function"
                        ? (url, data) => navigator.sendBeacon(url, data)
                        : undefined,
                });
            },
        ]);
    },
};
const ngBrowserProviders = {
    $anchorScroll: anchorScrollRuntimeRegistration,
    $aria: ariaRuntimeRegistration,
    $cookie: cookieRuntimeRegistration,
    $http: httpRuntimeRegistration,
    $httpParamSerializer: httpParamSerializerRuntimeRegistration,
    $location: locationRuntimeRegistration,
    $log: logRuntimeRegistration,
    $templateCache: templateCacheRuntimeRegistration,
    $templateRequest: templateRequestRuntimeRegistration,
};
/** Strict contextual escaping providers. */
const sceRuntimeRegistration = {
    _register(registry, name, context) {
        const configuration = new SceConfiguration();
        context.runtime.configRegistry.register(name, (value) => {
            const config = value;
            if (config.enabled !== undefined) {
                configuration.enabled(config.enabled);
            }
        });
        return registry.factory(name, [
            _parse,
            _sceDelegate,
            ($parse, $sceDelegate) => configuration.createService($parse, $sceDelegate),
        ]);
    },
};
const sceDelegateRuntimeRegistration = {
    _register(registry, name, context) {
        const configuration = new SceDelegateConfiguration();
        context.runtime.configRegistry.register(name, (value) => {
            const config = value;
            if (config.trustedResourceUrlList !== undefined) {
                configuration.trustedResourceUrlList(config.trustedResourceUrlList);
            }
            if (config.bannedResourceUrlList !== undefined) {
                configuration.bannedResourceUrlList(config.bannedResourceUrlList);
            }
            if (config.aHrefSanitizationTrustedUrlList !== undefined) {
                configuration.aHrefSanitizationTrustedUrlList(config.aHrefSanitizationTrustedUrlList);
            }
            if (config.imgSrcSanitizationTrustedUrlList !== undefined) {
                configuration.imgSrcSanitizationTrustedUrlList(config.imgSrcSanitizationTrustedUrlList);
            }
        });
        return registry.factory(name, [
            _injector,
            _window,
            _exceptionHandler,
            ($injector, $window, $exceptionHandler) => configuration.createService($injector, $window, $exceptionHandler),
        ]);
    },
};
const securityRuntimeRegistration = {
    _register(registry, name, context) {
        const configuration = createSecurityRuntimeConfiguration();
        const policy = createSecurityPolicy(configuration, () => context.platform.window.location.href);
        context.runtime.configRegistry.register(name, (value) => {
            applySecurityConfiguration(configuration, value);
        });
        registry.value(name, policy);
        return policy;
    },
};
const ngSecurityProviders = {
    $security: securityRuntimeRegistration,
    $sce: sceRuntimeRegistration,
    $sceDelegate: sceDelegateRuntimeRegistration,
};
/** Native animation service composition. */
const animateRuntimeRegistration = {
    _register(registry, name, context) {
        return registry.factory(name, [
            _injector,
            ($injector) => createAnimateService(context.runtime.animationRegistry, $injector),
        ]);
    },
};
const ngAnimationProviders = {
    $animate: animateRuntimeRegistration,
};
/** State-router providers. Omit this group for custom-element or widget runtimes without routing. */
const ngRouterProviders = {
    [_state]: routerRuntimeRegistration,
};
const streamRuntimeRegistration = {
    _register(registry, name) {
        return registry.factory(name, createStreamService);
    },
};
const eventBusRuntimeRegistration = {
    _register(registry, name, context) {
        const state = createEventBusRuntimeState();
        context.runtime.configRegistry.register(name, (value) => {
            applyEventBusConfiguration(state, value);
        });
        context.runtime.addDisposer(() => {
            destroyEventBusRuntimeState(state);
        });
        return registry.factory(name, [
            _exceptionHandler,
            _angular,
            ($exceptionHandler, angular) => {
                const host = angular;
                const service = createEventBusService(state, $exceptionHandler, host.$eventBus);
                host.$eventBus = service;
                return service;
            },
        ]);
    },
};
const restRuntimeRegistration = {
    _register(registry, name, context) {
        let defaults = {};
        context.runtime.configRegistry.register(name, (value) => {
            const config = value;
            if (config.defaults !== undefined) {
                defaults = { ...defaults, ...config.defaults };
            }
        });
        return registry.factory(name, [
            _http,
            ($http) => createRestFactory($http, defaults),
        ]);
    },
};
const websocketRuntimeRegistration = {
    _register(registry, name, context) {
        const configuration = createWebSocketRuntimeConfiguration();
        const runtimeWindow = context.platform.window;
        context.runtime.configRegistry.register(name, (value) => {
            applyWebSocketConfiguration(configuration, value);
        });
        context.platform.addDisposer(() => {
            destroyWebSocketRuntimeConfiguration(configuration);
        });
        return registry.factory(name, [
            _log,
            ($log) => createWebSocketService($log, configuration, runtimeWindow.WebSocket),
        ]);
    },
};
const sseRuntimeRegistration = {
    _register(registry, name, context) {
        const configuration = createSseRuntimeConfiguration();
        const runtimeWindow = context.platform.window;
        context.runtime.configRegistry.register(name, (value) => {
            applySseConfiguration(configuration, value);
        });
        context.platform.addDisposer(() => {
            destroySseRuntimeConfiguration(configuration);
        });
        return registry.factory(name, [
            _log,
            ($log) => createSseService($log, configuration, () => runtimeWindow.EventSource),
        ]);
    },
};
const webTransportRuntimeRegistration = {
    _register(registry, name, context) {
        const configuration = createWebTransportRuntimeConfiguration();
        const runtimeWindow = context.platform.window;
        context.runtime.configRegistry.register(name, (value) => {
            applyWebTransportConfiguration(configuration, value);
        });
        context.platform.addDisposer(() => {
            destroyWebTransportRuntimeConfiguration(configuration);
        });
        return registry.factory(name, [
            _log,
            ($log) => createWebTransportService($log, configuration, () => runtimeWindow.WebTransport, runtimeWindow.location.href),
        ]);
    },
};
const workerRuntimeRegistration = {
    _register(registry, name, context) {
        const state = createWorkerRuntimeState();
        const runtimeWindow = context.platform.window;
        context.platform.addDisposer(() => {
            destroyWorkerRuntimeState(state);
        });
        return registry.factory(name, [
            _log,
            _security,
            ($log, $security) => createWorkerService($log, state, () => runtimeWindow.Worker, $security),
        ]);
    },
};
const webComponentRuntimeRegistration = {
    _register(registry, name, context) {
        const state = createWebComponentRuntimeState();
        context.runtime.configRegistry.register(name, (value) => {
            applyWebComponentConfiguration(state, value);
        });
        context.platform.addDisposer(() => {
            destroyWebComponentRuntimeState(state);
        });
        return registry.factory(name, [
            _injector,
            _rootScope,
            _compile,
            ($injector, $rootScope, $compile) => createWebComponentService($injector, $rootScope, $compile, state),
        ]);
    },
};
const serviceWorkerRuntimeRegistration = {
    _register(registry, name, context) {
        const configuration = createServiceWorkerRuntimeConfiguration();
        let service;
        let destroyed = false;
        context.runtime.configRegistry.register(name, (value) => {
            const command = value;
            applyServiceWorkerConfiguration(configuration, command.scriptUrl, command.config);
        });
        context.platform.addDisposer(() => {
            destroyed = true;
            if (service)
                destroyServiceWorkerService(service);
        });
        return registry.factory(name, [
            _log,
            _exceptionHandler,
            _security,
            (log, err, security) => {
                service = createServiceWorkerService(context.platform.window.navigator.serviceWorker, { log, err, configuration, security });
                if (destroyed)
                    destroyServiceWorkerService(service);
                return service;
            },
        ]);
    },
};
/** Network, messaging, persistence, and worker-style integration providers. */
const ngIntegrationProviders = {
    [_eventBus]: eventBusRuntimeRegistration,
    $rest: restRuntimeRegistration,
    [_serviceWorker]: serviceWorkerRuntimeRegistration,
    [_sse]: sseRuntimeRegistration,
    $stream: streamRuntimeRegistration,
    [_webComponent]: webComponentRuntimeRegistration,
    [_websocket]: websocketRuntimeRegistration,
    [_webTransport]: webTransportRuntimeRegistration,
    [_worker]: workerRuntimeRegistration,
};
/** Element, form, and script directives for normal HTML integration. */
const ngElementDirectives = {
    input: inputDirective,
    textarea: inputDirective,
    form: formDirective,
    script: scriptDirective,
    select: selectDirective,
    option: optionDirective,
    ngForm: ngFormDirective,
};
/** Template binding and DOM update directives. */
const ngBindingDirectives = {
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
};
/** Control-flow and composition directives. */
const ngTemplateDirectives = {
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
};
/** Form model, validation, selection, and message directives. */
const ngFormDirectives = {
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
};
/** HTTP, streaming, WebTransport, and Worker directives. */
const ngIntegrationDirectives = {
    ngChannel: ngChannelDirective,
    ngDelete: ngDeleteDirective,
    ngGet: ngGetDirective,
    ngPost: ngPostDirective,
    ngPut: ngPutDirective,
    ngSse: ngSseDirective,
    ngViewport: ngViewportDirective,
    ngWebTransport: ngWebTransportDirective,
    ngWorker: ngWorkerDirective,
};
/** Accessibility enhancement directives layered onto normal template directives. */
const ngAriaDirectives = {
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
};
/** State-router directives. */
const ngRouterDirectives = {
    ngState: StateRefDynamicDirective,
    ngStateActive: StateRefActiveDirective,
    ngStateActiveExact: StateRefActiveDirective,
    ngView: ViewDirective,
};
/** Fill/transclusion directives that intentionally register after their base directive. */
const ngFillDirectives = {
    ngInclude: ngIncludeFillContentDirective,
    ngView: ViewDirectiveContentGuard,
};
/** Provider groups included by the default full `ng` runtime. */
const ngDefaultProviderGroups = [
    ngCoreProviders,
    ngOrchestrationProviders,
    ngFilterProviders,
    ngSecurityProviders,
    ngBrowserProviders,
    ngAnimationProviders,
    ngRouterProviders,
    ngIntegrationProviders,
];
/** Directive groups included by the default full `ng` runtime. */
const ngDefaultDirectiveGroups = [
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
];
/**
 * Initializes and registers the core `ng` module.
 *
 * This wires together the built-in providers, directives, services, and
 * router integrations that make up the default AngularTS runtime.
 */
function registerNgModule(angular) {
    const runtime = angular;
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
            ($injector, $interpolate, $sce, $exceptionHandler, $parse, $controller, $rootScope) => compileRegistry.createService($injector, $interpolate, $sce, $exceptionHandler, $parse, $controller, requireAppRoot(composition.appContext, $rootScope)),
        ]);
        const registeredProviders = new Map();
        ngDefaultProviderGroups.forEach((providers) => {
            registerRuntimeProviders(registry, providers, composition, registeredProviders);
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

export { StateRefActiveDirective, StateRefDynamicDirective, ViewDirective, ViewDirectiveContentGuard, asyncFilter, classDirective, currencyFilter, dateFilter, entriesFilter, filterFilter, formDirective, inputDirective, jsonFilter, keysFilter, limitToFilter, maxlengthDirective, minlengthDirective, ngAnimationProviders, ngAriaDirectives, ngAttributeAliasDirectives, ngBindDirective, ngBindHtmlDirective, ngBindTemplateDirective, ngBindingDirectives, ngBrowserProviders, ngBuiltInFilters, ngChannelDirective, ngCheckedAriaDirective, ngClickAriaDirective, ngCloakDirective, ngControllerDirective, ngCoreProviders, ngDblclickAriaDirective, ngDefaultDirectiveGroups, ngDefaultProviderGroups, ngDeleteDirective, ngDisabledAriaDirective, ngElDirective, ngElementDirectives, ngEventDirectives, ngFillDirectives, ngFilterProviders, ngFormDirective, ngFormDirectives, ngGetDirective, ngHideAriaDirective, ngHideDirective, ngIfDirective, ngIncludeDirective, ngIncludeFillContentDirective, ngInitDirective, ngInjectDirective, ngIntegrationDirectives, ngIntegrationProviders, ngListenerDirective, ngMessageDefaultDirective, ngMessageDirective, ngMessageExpDirective, ngMessagesAriaDirective, ngMessagesDirective, ngMessagesIncludeDirective, ngModelAriaDirective, ngModelDirective, ngModelOptionsDirective, ngNonBindableDirective, ngOptionsDirective, ngOrchestrationProviders, ngPointerCaptureDirective, ngPostDirective, ngPutDirective, ngReadonlyAriaDirective, ngRefDirective, ngRepeatDirective, ngRequiredAriaDirective, ngRouterDirectives, ngRouterProviders, ngScopeDirective, ngSecurityProviders, ngSetterDirective, ngShowAriaDirective, ngShowDirective, ngSseDirective, ngStyleDirective, ngSwitchDefaultDirective, ngSwitchDirective, ngSwitchWhenDirective, ngTemplateDirectives, ngTranscludeDirective, ngValueAriaDirective, ngViewportDirective, ngWebTransportDirective, ngWorkerDirective, numberFilter, optionDirective, orderByFilter, patternDirective, percentFilter, registerNgModule, relativeTimeFilter, requiredDirective, scriptDirective, selectDirective, valuesFilter };
