import { AngularRuntime } from '../angular-runtime.js';
import { registerCustomNgModule } from './custom-ng.js';
export { coreProviders } from './custom-ng.js';
export { ngAnimationProviders, ngAriaDirectives, ngBindingDirectives, ngBrowserProviders, ngBuiltInFilters, ngCoreProviders, ngDefaultDirectiveGroups, ngDefaultProviderGroups, ngElementDirectives, ngFillDirectives, ngFilterProviders, ngFormDirectives, ngIntegrationDirectives, ngIntegrationProviders, ngRouterDirectives, ngRouterProviders, ngSecurityProviders, ngTemplateDirectives, registerNgModule, registerRouterAliases } from '../ng.js';
export { WasmProvider, WasmScope, WasmScopeAbi } from '../services/wasm/wasm.js';
export { createAngularElement, defineAngularElement } from './web-component.js';
export { AnchorScrollProvider } from '../services/anchor-scroll/anchor-scroll.js';
export { AnimateProvider } from '../animations/animate.js';
export { AriaProvider, ngCheckedAriaDirective, ngClickAriaDirective, ngDblclickAriaDirective, ngDisabledAriaDirective, ngHideAriaDirective, ngMessagesAriaDirective, ngModelAriaDirective, ngReadonlyAriaDirective, ngRequiredAriaDirective, ngShowAriaDirective, ngValueAriaDirective } from '../directive/aria/aria.js';
export { AttributesServiceProvider } from '../services/attributes/attributes.js';
export { CompileProvider } from '../core/compile/compile.js';
export { ControllerProvider } from '../core/controller/controller.js';
export { CookieProvider } from '../services/cookie/cookie.js';
export { ExceptionHandlerProvider } from '../services/exception/exception.js';
export { FilterProvider } from '../core/filter/filter.js';
export { HttpParamSerializerProvider, HttpProvider } from '../services/http/http.js';
export { InterpolateProvider } from '../core/interpolate/interpolate.js';
export { LocationProvider } from '../services/location/location.js';
export { LogProvider } from '../services/log/log.js';
export { ParseProvider } from '../core/parse/parse.js';
export { PubSubProvider } from '../services/pubsub/pubsub.js';
export { RestProvider } from '../services/rest/rest.js';
export { RootScopeProvider } from '../core/scope/scope.js';
export { RouterProvider } from '../router/router.js';
export { SceDelegateProvider, SceProvider } from '../services/sce/sce.js';
export { SseProvider } from '../services/sse/sse.js';
export { StateProvider } from '../router/state/state-service.js';
export { StateRefActiveDirective, StateRefDirective, StateRefDynamicDirective } from '../router/directives/state-directives.js';
export { StateRegistryProvider } from '../router/state/state-registry.js';
export { StreamProvider } from '../services/stream/readable-stream.js';
export { TemplateCacheProvider } from '../services/template-cache/template-cache.js';
export { TemplateFactoryProvider } from '../router/template-factory.js';
export { TemplateRequestProvider } from '../services/template-request/template-request.js';
export { TransitionProvider } from '../router/transition/transition-service.js';
export { ViewDirective, ViewDirectiveFill } from '../router/directives/view-directive.js';
export { ViewService } from '../router/view/view.js';
export { WebComponentProvider } from '../services/web-component/web-component.js';
export { WebSocketProvider } from '../services/websocket/websocket.js';
export { WebTransportProvider } from '../services/webtransport/webtransport.js';
export { WorkerProvider } from '../services/worker/worker.js';
export { asyncFilter } from '../filters/async.js';
export { classDirective } from '../directive/class/class.js';
export { createEventDirective, createWindowEventDirective, ngClickDirective, ngEventDirectives } from '../directive/events/events.js';
export { currencyFilter, numberFilter, percentFilter } from '../filters/number.js';
export { dateFilter } from '../filters/date.js';
export { entriesFilter, keysFilter, valuesFilter } from '../filters/collection.js';
export { filterFilter } from '../filters/filter.js';
export { formDirective, ngFormDirective } from '../directive/form/form.js';
export { inputDirective } from '../directive/input/input.js';
export { jsonFilter } from '../filters/json.js';
export { limitToFilter } from '../filters/limit-to.js';
export { maxlengthDirective, minlengthDirective, patternDirective, requiredDirective } from '../directive/validators/validators.js';
export { ngAttributeAliasDirectives } from '../directive/attrs/attrs.js';
export { ngBindDirective, ngBindHtmlDirective, ngBindTemplateDirective } from '../directive/bind/bind.js';
export { ngChannelDirective } from '../directive/channel/channel.js';
export { ngCloakDirective } from '../directive/cloak/cloak.js';
export { ngControllerDirective } from '../directive/controller/controller.js';
export { ngDeleteDirective, ngGetDirective, ngPostDirective, ngPutDirective, ngSseDirective } from '../directive/http/http.js';
export { ngElDirective } from '../directive/el/el.js';
export { ngHideDirective, ngShowDirective } from '../directive/show-hide/show-hide.js';
export { ngIfDirective } from '../directive/if/if.js';
export { ngIncludeDirective, ngIncludeFillContentDirective } from '../directive/include/include.js';
export { ngInitDirective } from '../directive/init/init.js';
export { ngInjectDirective } from '../directive/inject/inject.js';
export { ngListenerDirective } from '../directive/listener/listener.js';
export { ngMessageDefaultDirective, ngMessageDirective, ngMessageExpDirective, ngMessagesDirective, ngMessagesIncludeDirective } from '../directive/messages/messages.js';
export { ngModelDirective } from '../directive/model/model.js';
export { ngModelOptionsDirective } from '../directive/model-options/model-options.js';
export { ngNonBindableDirective } from '../directive/non-bindable/non-bindable.js';
export { ngOptionsDirective } from '../directive/options/options.js';
export { ngRefDirective } from '../directive/ref/ref.js';
export { ngRepeatDirective } from '../directive/repeat/repeat.js';
export { ngScopeDirective } from '../directive/scope/scope.js';
export { ngSetterDirective } from '../directive/setter/setter.js';
export { ngStyleDirective } from '../directive/style/style.js';
export { ngSwitchDefaultDirective, ngSwitchDirective, ngSwitchWhenDirective } from '../directive/switch/switch.js';
export { ngTranscludeDirective } from '../directive/transclude/transclude.js';
export { ngViewportDirective } from '../directive/viewport/viewport.js';
export { ngWasmDirective } from '../directive/wasm/wasm.js';
export { ngWebTransportDirective } from '../directive/webtransport/webtransport.js';
export { ngWorkerDirective } from '../directive/worker/worker.js';
export { optionDirective, selectDirective } from '../directive/select/select.js';
export { orderByFilter } from '../filters/order-by.js';
export { relativeTimeFilter } from '../filters/relative-time.js';
export { scriptDirective } from '../directive/script/script.js';

/**
 * Creates a side-effect-free AngularTS runtime with no built-in modules.
 */
function createAngularBare(options = {}) {
    return new AngularRuntime({
        attachToWindow: false,
        registerBuiltins: false,
        ...options,
    });
}
/**
 * Creates a side-effect-free AngularTS runtime with a custom `ng` module.
 */
function createAngularCustom(options = {}) {
    const angular = createAngularBare(options);
    registerCustomNgModule(angular, options.ngModule);
    return angular;
}

export { AngularRuntime, createAngularBare, createAngularCustom, registerCustomNgModule };
