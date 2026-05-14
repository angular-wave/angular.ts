import { _router, _provide, _compile, _angular, _window, _document, _filter } from './injection-tokens.js';
import { AnimateProvider } from './animations/animate.js';
import { CompileProvider } from './core/compile/compile.js';
import { ControllerProvider } from './core/controller/controller.js';
import { FilterProvider } from './core/filter/filter.js';
import { InterpolateProvider } from './core/interpolate/interpolate.js';
import { ParseProvider } from './core/parse/parse.js';
import { RootScopeProvider } from './core/scope/scope.js';
import { valuesFilter, keysFilter, entriesFilter } from './filters/collection.js';
import { asyncFilter } from './filters/async.js';
import { dateFilter } from './filters/date.js';
import { filterFilter } from './filters/filter.js';
import { jsonFilter } from './filters/json.js';
import { limitToFilter } from './filters/limit-to.js';
import { percentFilter, numberFilter, currencyFilter } from './filters/number.js';
import { orderByFilter } from './filters/order-by.js';
import { relativeTimeFilter } from './filters/relative-time.js';
import { ngValueAriaDirective, ngRequiredAriaDirective, ngReadonlyAriaDirective, ngModelAriaDirective, ngMessagesAriaDirective, ngShowAriaDirective, ngHideAriaDirective, ngDisabledAriaDirective, ngDblclickAriaDirective, ngClickAriaDirective, ngCheckedAriaDirective, AriaProvider } from './directive/aria/aria.js';
import { ngAttributeAliasDirectives } from './directive/attrs/attrs.js';
import { ngBindTemplateDirective, ngBindHtmlDirective, ngBindDirective } from './directive/bind/bind.js';
import { ngChannelDirective } from './directive/channel/channel.js';
import { classDirective } from './directive/class/class.js';
import { ngCloakDirective } from './directive/cloak/cloak.js';
import { ngControllerDirective } from './directive/controller/controller.js';
import { ngElDirective } from './directive/el/el.js';
import { ngEventDirectives } from './directive/events/events.js';
import { ngFormDirective, formDirective } from './directive/form/form.js';
import { ngSseDirective, ngPutDirective, ngPostDirective, ngGetDirective, ngDeleteDirective } from './directive/http/http.js';
import { ngIfDirective } from './directive/if/if.js';
import { ngIncludeDirective, ngIncludeFillContentDirective } from './directive/include/include.js';
import { ngValueDirective, inputDirective, hiddenInputDirective } from './directive/input/input.js';
import { ngInitDirective } from './directive/init/init.js';
import { ngInjectDirective } from './directive/inject/inject.js';
import { ngListenerDirective } from './directive/listener/listener.js';
import { ngModelDirective } from './directive/model/model.js';
import { ngModelOptionsDirective } from './directive/model-options/model-options.js';
import { ngMessageDefaultDirective, ngMessagesIncludeDirective, ngMessageExpDirective, ngMessageDirective, ngMessagesDirective } from './directive/messages/messages.js';
import { ngNonBindableDirective } from './directive/non-bindable/non-bindable.js';
import { ngOptionsDirective } from './directive/options/options.js';
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
import { ngWasmDirective } from './directive/wasm/wasm.js';
import { ngWebTransportDirective } from './directive/webtransport/webtransport.js';
import { ngWorkerDirective } from './directive/worker/worker.js';
import { StateRefDynamicDirective, StateRefActiveDirective, StateRefDirective } from './router/directives/state-directives.js';
import { ViewDirective, ViewDirectiveFill } from './router/directives/view-directive.js';
import { RouterProvider } from './router/router.js';
import { StateProvider } from './router/state/state-service.js';
import { StateRegistryProvider } from './router/state/state-registry.js';
import { TemplateFactoryProvider } from './router/template-factory.js';
import { TransitionProvider } from './router/transition/transition-service.js';
import { ViewService } from './router/view/view.js';
import { AnchorScrollProvider } from './services/anchor-scroll/anchor-scroll.js';
import { CookieProvider } from './services/cookie/cookie.js';
import { ExceptionHandlerProvider } from './services/exception/exception.js';
import { HttpParamSerializerProvider, HttpProvider } from './services/http/http.js';
import { LocationProvider } from './services/location/location.js';
import { LogProvider } from './services/log/log.js';
import { PubSubProvider } from './services/pubsub/pubsub.js';
import { RestProvider } from './services/rest/rest.js';
import { SceDelegateProvider, SceProvider } from './services/sce/sce.js';
import { SseProvider } from './services/sse/sse.js';
import { StreamProvider } from './services/stream/readable-stream.js';
import { TemplateCacheProvider } from './services/template-cache/template-cache.js';
import { TemplateRequestProvider } from './services/template-request/template-request.js';
import { WebComponentProvider } from './services/web-component/web-component.js';
import { WebTransportProvider } from './services/webtransport/webtransport.js';
import { WebSocketProvider } from './services/websocket/websocket.js';
import { WorkerProvider } from './services/worker/worker.js';
import { WasmProvider } from './services/wasm/wasm.js';

/**
 * Runtime identity and DOM globals.
 *
 * Custom runtimes almost always want these values, even when they do not include
 * browser I/O, router, animation, or platform integration services.
 */
function registerRuntimeHostValues(angular, $provide) {
    $provide.provider(_angular, class {
        constructor() {
            this.$get = () => angular;
        }
    });
    $provide.value(_window, window);
    $provide.value(_document, document);
}
/** Registers built-in filters against the already-registered `$filter` provider. */
function registerBuiltInFilters($filterProvider) {
    const filterEntries = Object.entries(ngBuiltInFilters);
    filterEntries.forEach(([name, factory]) => {
        $filterProvider.register(name, factory);
    });
}
/** Providers required by scopes, expressions, controllers, and compile. */
const ngCoreProviders = {
    $controller: ControllerProvider,
    $exceptionHandler: ExceptionHandlerProvider,
    $interpolate: InterpolateProvider,
    $parse: ParseProvider,
    $rootScope: RootScopeProvider,
};
/** Legacy expression filters. Omit this group for runtimes that do not use pipe filters. */
const ngFilterProviders = {
    $filter: FilterProvider,
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
const ngBrowserProviders = {
    $anchorScroll: AnchorScrollProvider,
    $aria: AriaProvider,
    $cookie: CookieProvider,
    $http: HttpProvider,
    $httpParamSerializer: HttpParamSerializerProvider,
    $location: LocationProvider,
    $log: LogProvider,
    $templateCache: TemplateCacheProvider,
    $templateRequest: TemplateRequestProvider,
};
/** Strict contextual escaping providers. */
const ngSecurityProviders = {
    $sce: SceProvider,
    $sceDelegate: SceDelegateProvider,
};
/** Native animation provider. */
const ngAnimationProviders = {
    $animate: AnimateProvider,
};
/** State-router providers. Omit this group for custom-element or widget runtimes without routing. */
const ngRouterProviders = {
    [_router]: RouterProvider,
    $view: ViewService,
    $transitions: TransitionProvider,
    $templateFactory: TemplateFactoryProvider,
    $stateRegistry: StateRegistryProvider,
    $state: StateProvider,
};
/** Network, messaging, persistence, and worker-style integration providers. */
const ngIntegrationProviders = {
    $eventBus: PubSubProvider,
    $rest: RestProvider,
    $sse: SseProvider,
    $stream: StreamProvider,
    $wasm: WasmProvider,
    $webComponent: WebComponentProvider,
    $websocket: WebSocketProvider,
    $webTransport: WebTransportProvider,
    $worker: WorkerProvider,
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
    ngValue: ngValueDirective,
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
/** HTTP, streaming, WebAssembly, WebTransport, and Worker directives. */
const ngIntegrationDirectives = {
    ngChannel: ngChannelDirective,
    ngDelete: ngDeleteDirective,
    ngGet: ngGetDirective,
    ngPost: ngPostDirective,
    ngPut: ngPutDirective,
    ngSse: ngSseDirective,
    ngViewport: ngViewportDirective,
    ngWasm: ngWasmDirective,
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
    ngSref: StateRefDirective,
    ngSrefActive: StateRefActiveDirective,
    ngSrefActiveEq: StateRefActiveDirective,
    ngState: StateRefDynamicDirective,
    ngView: ViewDirective,
};
/** Fill/transclusion directives that intentionally register after their base directive. */
const ngFillDirectives = {
    input: hiddenInputDirective,
    ngInclude: ngIncludeFillContentDirective,
    ngView: ViewDirectiveFill,
};
/** Provider groups included by the default full `ng` runtime. */
const ngDefaultProviderGroups = [
    ngCoreProviders,
    ngFilterProviders,
    ngBrowserProviders,
    ngSecurityProviders,
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
    const ngModule = angular.module("ng", [], [
        _provide,
        ($provide) => {
            registerRuntimeHostValues(angular, $provide);
            const $compileProvider = $provide.provider(_compile, CompileProvider);
            ngDefaultDirectiveGroups.forEach((directives) => {
                $compileProvider.directive(directives);
            });
            let $filterProvider;
            ngDefaultProviderGroups.forEach((providers) => {
                const providerEntries = Object.entries(providers);
                providerEntries.forEach(([name, provider]) => {
                    const registeredProvider = $provide.provider(name, provider);
                    if (name === _filter) {
                        $filterProvider = registeredProvider;
                    }
                });
            });
            if ($filterProvider) {
                registerBuiltInFilters($filterProvider);
            }
        },
    ]);
    registerRouterAliases(ngModule);
    return ngModule;
}
/**
 * Router compatibility aliases layered on top of the router provider group.
 */
function registerRouterAliases(ngModule) {
    return ngModule.factory("$stateParams", [
        _router,
        /**
         * Exposes the router's current parameter bag as `$stateParams`.
         */
        (state) => state._params,
    ]);
}

export { ngAnimationProviders, ngAriaDirectives, ngBindingDirectives, ngBrowserProviders, ngBuiltInFilters, ngCoreProviders, ngDefaultDirectiveGroups, ngDefaultProviderGroups, ngElementDirectives, ngFillDirectives, ngFilterProviders, ngFormDirectives, ngIntegrationDirectives, ngIntegrationProviders, ngRouterDirectives, ngRouterProviders, ngSecurityProviders, ngTemplateDirectives, registerNgModule, registerRouterAliases };
