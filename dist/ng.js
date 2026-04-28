import { _provide, _angular, _window, _document, _compile, _router } from './injection-tokens.js';
import { $$AnimateChildrenDirective } from './animations/animate-children-directive.js';
import { AnimateCssDriverProvider } from './animations/animate-css-driver.js';
import { AnimateJsDriverProvider } from './animations/animate-js-driver.js';
import { AnimateJsProvider } from './animations/animate-js.js';
import { ngAnimateSwapDirective } from './animations/animate-swap.js';
import { AnimateProvider } from './animations/animate.js';
import { AnimationProvider } from './animations/animation.js';
import { AnimateCssProvider } from './animations/css/animate-css.js';
import { AnimateQueueProvider } from './animations/queue/animate-queue.js';
import { CompileProvider } from './core/compile/compile.js';
import { ControllerProvider } from './core/controller/controller.js';
import { FilterProvider } from './core/filter/filter.js';
import { InterpolateProvider } from './core/interpolate/interpolate.js';
import { ParseProvider } from './core/parse/parse.js';
import { RootScopeProvider } from './core/scope/scope.js';
import { ngDisabledAriaDirective, ngValueAriaDirective, ngRequiredAriaDirective, ngReadonlyAriaDirective, ngModelAriaDirective, ngMessagesAriaDirective, ngShowAriaDirective, ngHideAriaDirective, ngDblclickAriaDirective, ngClickAriaDirective, ngCheckedAriaDirective, AriaProvider } from './directive/aria/aria.js';
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
import { ngWorkerDirective } from './directive/worker/worker.js';
import { StateRefDynamicDirective, StateRefActiveDirective, StateRefDirective } from './router/directives/state-directives.js';
import { ViewDirective, ViewDirectiveFill } from './router/directives/view-directive.js';
import { _RouterProvider } from './router/router.js';
import { StateProvider } from './router/state/state-service.js';
import { StateRegistryProvider } from './router/state/state-registry.js';
import { TemplateFactoryProvider } from './router/template-factory.js';
import { TransitionProvider } from './router/transition/transition-service.js';
import { UrlConfigProvider } from './router/url/url-config.js';
import { UrlService } from './router/url/url-service.js';
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
import { TemplateCacheProvider } from './services/template-cache/template-cache.js';
import { TemplateRequestProvider } from './services/template-request/template-request.js';
import { WebSocketProvider } from './services/websocket/websocket.js';
import { WorkerProvider } from './services/worker/worker.js';
import { WasmProvider } from './services/wasm/wasm.js';

/**
 * Initializes and registers the core `ng` module.
 *
 * This wires together the built-in providers, directives, services, and
 * router integrations that make up the default AngularTS runtime.
 */
function registerNgModule(angular) {
    return angular
        .module("ng", [], [
        _provide,
        ($provide) => {
            $provide.provider(_angular, class {
                constructor() {
                    this.$get = () => angular;
                }
            });
            $provide.value(_window, window);
            $provide.value(_document, document);
            $provide
                .provider(_compile, CompileProvider)
                .directive({
                input: inputDirective,
                textarea: inputDirective,
                form: formDirective,
                script: scriptDirective,
                select: selectDirective,
                option: optionDirective,
                ngBind: ngBindDirective,
                ngBindHtml: ngBindHtmlDirective,
                ngBindTemplate: ngBindTemplateDirective,
                ngChannel: ngChannelDirective,
                ngClass: classDirective,
                ngCloak: ngCloakDirective,
                ngController: ngControllerDirective,
                ngDelete: ngDeleteDirective,
                ngDisabled: ngDisabledAriaDirective,
                ngEl: ngElDirective,
                ngForm: ngFormDirective,
                ngGet: ngGetDirective,
                ngHide: ngHideDirective,
                ngIf: ngIfDirective,
                ngInclude: ngIncludeDirective,
                ngInject: ngInjectDirective,
                ngInit: ngInitDirective,
                ngListener: ngListenerDirective,
                ngMessages: ngMessagesDirective,
                ngMessage: ngMessageDirective,
                ngMessageExp: ngMessageExpDirective,
                ngMessagesInclude: ngMessagesIncludeDirective,
                ngMessageDefault: ngMessageDefaultDirective,
                ngNonBindable: ngNonBindableDirective,
                ngPost: ngPostDirective,
                ngPut: ngPutDirective,
                ngRef: ngRefDirective,
                ngRepeat: ngRepeatDirective,
                ngSetter: ngSetterDirective,
                ngShow: ngShowDirective,
                ngStyle: ngStyleDirective,
                ngSse: ngSseDirective,
                ngSwitch: ngSwitchDirective,
                ngSwitchWhen: ngSwitchWhenDirective,
                ngSwitchDefault: ngSwitchDefaultDirective,
                ngOptions: ngOptionsDirective,
                ngTransclude: ngTranscludeDirective,
                ngModel: ngModelDirective,
                pattern: patternDirective,
                ngPattern: patternDirective,
                required: requiredDirective,
                ngRequired: requiredDirective,
                ngMinlength: minlengthDirective,
                minlength: minlengthDirective,
                ngMaxlength: maxlengthDirective,
                maxlength: maxlengthDirective,
                ngValue: ngValueDirective,
                ngModelOptions: ngModelOptionsDirective,
                ngViewport: ngViewportDirective,
                ngWasm: ngWasmDirective,
                ngWorker: ngWorkerDirective,
                ngScope: ngScopeDirective,
            })
                .directive({
                input: hiddenInputDirective,
                ngAnimateSwap: ngAnimateSwapDirective,
                ngAnimateChildren: $$AnimateChildrenDirective,
                // aria directives
                ngChecked: ngCheckedAriaDirective,
                ngClick: ngClickAriaDirective,
                ngDblclick: ngDblclickAriaDirective,
                ngInclude: ngIncludeFillContentDirective,
                ngHide: ngHideAriaDirective,
                ngShow: ngShowAriaDirective,
                ngMessages: ngMessagesAriaDirective,
                ngModel: ngModelAriaDirective,
                ngReadonly: ngReadonlyAriaDirective,
                ngRequired: ngRequiredAriaDirective,
                ngValue: ngValueAriaDirective,
                // router directives
                ngSref: StateRefDirective,
                ngSrefActive: StateRefActiveDirective,
                ngSrefActiveEq: StateRefActiveDirective,
                ngState: StateRefDynamicDirective,
                ngView: ViewDirective,
            })
                .directive({
                ngView: ViewDirectiveFill,
            })
                .directive(ngAttributeAliasDirectives)
                .directive(ngEventDirectives);
            $provide.provider({
                $aria: AriaProvider,
                $anchorScroll: AnchorScrollProvider,
                $animate: AnimateProvider,
                $$animation: AnimationProvider,
                $animateCss: AnimateCssProvider,
                $$animateCssDriver: AnimateCssDriverProvider,
                $$animateJs: AnimateJsProvider,
                $$animateJsDriver: AnimateJsDriverProvider,
                $$animateQueue: AnimateQueueProvider,
                $controller: ControllerProvider,
                $cookie: CookieProvider,
                $exceptionHandler: ExceptionHandlerProvider,
                $filter: FilterProvider,
                $interpolate: InterpolateProvider,
                $http: HttpProvider,
                $httpParamSerializer: HttpParamSerializerProvider,
                $location: LocationProvider,
                $log: LogProvider,
                $parse: ParseProvider,
                $rest: RestProvider,
                $rootScope: RootScopeProvider,
                [_router]: _RouterProvider,
                $sce: SceProvider,
                $sceDelegate: SceDelegateProvider,
                $sse: SseProvider,
                $templateCache: TemplateCacheProvider,
                $templateRequest: TemplateRequestProvider,
                $urlConfig: UrlConfigProvider,
                $view: ViewService,
                $transitions: TransitionProvider,
                $templateFactory: TemplateFactoryProvider,
                $url: UrlService,
                $stateRegistry: StateRegistryProvider,
                $state: StateProvider,
                $eventBus: PubSubProvider,
                $websocket: WebSocketProvider,
                $worker: WorkerProvider,
                $wasm: WasmProvider,
            });
        },
    ])
        .factory("$stateParams", [
        _router,
        /**
         * Exposes the router's current parameter bag as `$stateParams`.
         */
        (state) => state._params,
    ]);
}

export { registerNgModule };
