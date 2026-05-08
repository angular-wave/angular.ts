import {
  _angular,
  _compile,
  _document,
  _provide,
  _router,
  _window,
} from "./injection-tokens.ts";
import { $$AnimateChildrenDirective } from "./animations/animate-children-directive.ts";
import { AnimateCssDriverProvider } from "./animations/animate-css-driver.ts";
import { AnimateJsDriverProvider } from "./animations/animate-js-driver.ts";
import { AnimateJsProvider } from "./animations/animate-js.ts";
import { ngAnimateSwapDirective } from "./animations/animate-swap.ts";
import { AnimateProvider } from "./animations/animate.ts";
import { AnimationProvider } from "./animations/animation.ts";
import { AnimateCssProvider } from "./animations/css/animate-css.ts";
import { AnimateQueueProvider } from "./animations/queue/animate-queue.ts";
import { CompileProvider } from "./core/compile/compile.ts";
import { ControllerProvider } from "./core/controller/controller.ts";
import { FilterProvider } from "./core/filter/filter.ts";
import { InterpolateProvider } from "./core/interpolate/interpolate.ts";
import { ParseProvider } from "./core/parse/parse.ts";
import { RootScopeProvider } from "./core/scope/scope.ts";
import {
  AriaProvider,
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
import {
  hiddenInputDirective,
  inputDirective,
  ngValueDirective,
} from "./directive/input/input.ts";
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
import { ngWasmDirective } from "./directive/wasm/wasm.ts";
import { ngWebTransportDirective } from "./directive/webtransport/webtransport.ts";
import { ngWorkerDirective } from "./directive/worker/worker.ts";
import {
  StateRefActiveDirective,
  StateRefDirective,
  StateRefDynamicDirective,
} from "./router/directives/state-directives.ts";
import {
  ViewDirectiveFill,
  ViewDirective,
} from "./router/directives/view-directive.ts";
import { RouterProvider } from "./router/router.ts";
import { StateProvider } from "./router/state/state-service.ts";
import { StateRegistryProvider } from "./router/state/state-registry.ts";
import { TemplateFactoryProvider } from "./router/template-factory.ts";
import { TransitionProvider } from "./router/transition/transition-service.ts";
import { ViewService } from "./router/view/view.ts";
import { AnchorScrollProvider } from "./services/anchor-scroll/anchor-scroll.ts";
import { CookieProvider } from "./services/cookie/cookie.ts";
import { ExceptionHandlerProvider } from "./services/exception/exception.ts";
import {
  HttpParamSerializerProvider,
  HttpProvider,
} from "./services/http/http.ts";
import { LocationProvider } from "./services/location/location.ts";
import { LogProvider } from "./services/log/log.ts";
import { PubSubProvider } from "./services/pubsub/pubsub.ts";
import { RestProvider } from "./services/rest/rest.ts";
import { SceDelegateProvider, SceProvider } from "./services/sce/sce.ts";
import { SseProvider } from "./services/sse/sse.ts";
import { StreamProvider } from "./services/stream/readable-stream.ts";
import { TemplateCacheProvider } from "./services/template-cache/template-cache.ts";
import { TemplateRequestProvider } from "./services/template-request/template-request.ts";
import { WebComponentProvider } from "./services/web-component/web-component.ts";
import { WebTransportProvider } from "./services/webtransport/webtransport.ts";
import { WebSocketProvider } from "./services/websocket/websocket.ts";
import { WorkerProvider } from "./services/worker/worker.ts";
import { WasmProvider } from "./services/wasm/wasm.ts";

type ProviderGroup = Record<string, Function>;

type DirectiveGroup = Record<string, ng.DirectiveFactory>;

/**
 * Runtime identity and DOM globals.
 *
 * Custom runtimes almost always want these values, even when they do not include
 * browser I/O, router, animation, or platform integration services.
 */
function registerRuntimeHostValues(
  angular: ng.Angular,
  $provide: ng.ProvideService,
): void {
  $provide.provider(
    _angular,
    class {
      $get = () => angular;
    },
  );
  $provide.value(_window, window);
  $provide.value(_document, document);
}

/** Providers required by scopes, expressions, filters, controllers, and compile. */
export const ngCoreProviders = {
  $controller: ControllerProvider,
  $exceptionHandler: ExceptionHandlerProvider,
  $filter: FilterProvider,
  $interpolate: InterpolateProvider,
  $parse: ParseProvider,
  $rootScope: RootScopeProvider,
} satisfies ProviderGroup;

/** Browser services that are useful in normal apps but optional for small runtimes. */
export const ngBrowserProviders = {
  $anchorScroll: AnchorScrollProvider,
  $aria: AriaProvider,
  $cookie: CookieProvider,
  $http: HttpProvider,
  $httpParamSerializer: HttpParamSerializerProvider,
  $location: LocationProvider,
  $log: LogProvider,
  $templateCache: TemplateCacheProvider,
  $templateRequest: TemplateRequestProvider,
} satisfies ProviderGroup;

/** Strict contextual escaping providers. */
export const ngSecurityProviders = {
  $sce: SceProvider,
  $sceDelegate: SceDelegateProvider,
} satisfies ProviderGroup;

/** Animation providers. Omit this group for runtimes that use native transitions only. */
export const ngAnimationProviders = {
  $animate: AnimateProvider,
  $$animation: AnimationProvider,
  $animateCss: AnimateCssProvider,
  $$animateCssDriver: AnimateCssDriverProvider,
  $$animateJs: AnimateJsProvider,
  $$animateJsDriver: AnimateJsDriverProvider,
  $$animateQueue: AnimateQueueProvider,
} satisfies ProviderGroup;

/** State-router providers. Omit this group for custom-element or widget runtimes without routing. */
export const ngRouterProviders = {
  [_router]: RouterProvider,
  $view: ViewService,
  $transitions: TransitionProvider,
  $templateFactory: TemplateFactoryProvider,
  $stateRegistry: StateRegistryProvider,
  $state: StateProvider,
} satisfies ProviderGroup;

/** Network, messaging, persistence, and worker-style integration providers. */
export const ngIntegrationProviders = {
  $eventBus: PubSubProvider,
  $rest: RestProvider,
  $sse: SseProvider,
  $stream: StreamProvider,
  $wasm: WasmProvider,
  $webComponent: WebComponentProvider,
  $websocket: WebSocketProvider,
  $webTransport: WebTransportProvider,
  $worker: WorkerProvider,
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
  ngValue: ngValueDirective,
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

/** HTTP, streaming, WebAssembly, WebTransport, and Worker directives. */
export const ngIntegrationDirectives = {
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
} satisfies DirectiveGroup;

/** Animation directives. */
export const ngAnimationDirectives = {
  ngAnimateSwap: ngAnimateSwapDirective,
  ngAnimateChildren: $$AnimateChildrenDirective,
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
  ngSref: StateRefDirective,
  ngSrefActive: StateRefActiveDirective,
  ngSrefActiveEq: StateRefActiveDirective,
  ngState: StateRefDynamicDirective,
  ngView: ViewDirective,
} satisfies DirectiveGroup;

/** Fill/transclusion directives that intentionally register after their base directive. */
export const ngFillDirectives = {
  input: hiddenInputDirective,
  ngInclude: ngIncludeFillContentDirective,
  ngView: ViewDirectiveFill,
} satisfies DirectiveGroup;

/** Provider groups included by the default full `ng` runtime. */
export const ngDefaultProviderGroups = [
  ngCoreProviders,
  ngBrowserProviders,
  ngSecurityProviders,
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
  ngAnimationDirectives,
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
export function registerNgModule(angular: ng.Angular): ng.NgModule {
  const ngModule = angular.module(
    "ng",
    [],
    [
      _provide,
      ($provide: ng.ProvideService) => {
        registerRuntimeHostValues(angular, $provide);

        const $compileProvider = $provide.provider(
          _compile,
          CompileProvider,
        ) as unknown as CompileProvider;

        ngDefaultDirectiveGroups.forEach((directives) => {
          $compileProvider.directive(directives);
        });

        ngDefaultProviderGroups.forEach((providers) => {
          $provide.provider(providers);
        });
      },
    ],
  );

  registerRouterAliases(ngModule);

  return ngModule;
}

/**
 * Router compatibility aliases layered on top of the router provider group.
 */
export function registerRouterAliases(ngModule: ng.NgModule): ng.NgModule {
  return ngModule.factory("$stateParams", [
    _router,
    /**
     * Exposes the router's current parameter bag as `$stateParams`.
     */
    (state: RouterProvider) => state._params,
  ]);
}
