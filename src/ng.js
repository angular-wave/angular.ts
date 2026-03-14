import { $$AnimateChildrenDirective } from "./animations/animate-children-directive.ts";
import { AnimateCssDriverProvider } from "./animations/animate-css-driver.ts";
import { AnimateJsDriverProvider } from "./animations/animate-js-driver.ts";
import { AnimateJsProvider } from "./animations/animate-js.ts";
import { ngAnimateSwapDirective } from "./animations/animate-swap.ts";
import { AnimateProvider } from "./animations/animate.ts";
import { AnimationProvider } from "./animations/animation.ts";
import { AnimateCssProvider } from "./animations/css/animate-css.ts";
import { AnimateQueueProvider } from "./animations/queue/animate-queue.ts";
import { CompileProvider } from "./core/compile/compile.js";
import { ControllerProvider } from "./core/controller/controller.ts";
import { FilterProvider } from "./core/filter/filter.ts";
import { InterpolateProvider } from "./core/interpolate/interpolate.ts";
import { ParseProvider } from "./core/parse/parse.ts";
import { SanitizeUriProvider } from "./core/sanitize/sanitize-uri.ts";
import { RootScopeProvider } from "./core/scope/scope.js";
import { $injectTokens as $t } from "./injection-tokens.js";
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
import {
  ngClassDirective,
  ngClassEvenDirective,
  ngClassOddDirective,
} from "./directive/class/class.ts";
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
import { ngWorkerDirective } from "./directive/worker/worker.ts";
import { trace } from "./router/common/trace.ts";
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
import { UrlConfigProvider } from "./router/url/url-config.ts";
import { UrlService } from "./router/url/url-service.ts";
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
import { RestProvider } from "./services/rest/rest.js";
import { SceDelegateProvider, SceProvider } from "./services/sce/sce.ts";
import { SseProvider } from "./services/sse/sse.ts";
import { TemplateCacheProvider } from "./services/template-cache/template-cache.ts";
import { TemplateRequestProvider } from "./services/template-request/template-request.ts";
import { WebSocketProvider } from "./services/websocket/websocket.ts";

/**
 * Initializes core `ng` module.
 * @param {ng.Angular} angular
 * @returns {ng.NgModule} `ng` module
 */
export function registerNgModule(angular) {
  return angular
    .module(
      "ng",
      [],
      [
        $t._provide,
        /** @param {ng.ProvideService} $provide */
        ($provide) => {
          // $$sanitizeUriProvider needs to be before $compileProvider as it is used by it.
          $provide.provider({
            $$sanitizeUri: SanitizeUriProvider,
          });
          $provide.provider(
            $t._angular,
            class Test {
              $get = () => angular;
            },
          );
          $provide.value($t._window, window);
          $provide.value($t._document, document);
          $provide
            .provider($t._compile, CompileProvider)
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
              ngClass: ngClassDirective,
              ngClassEven: ngClassEvenDirective,
              ngClassOdd: ngClassOddDirective,
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
            $router: RouterProvider,
            $sce: SceProvider,
            $sceDelegate: SceDelegateProvider,
            $sse: SseProvider,
            $templateCache: TemplateCacheProvider,
            $templateRequest: TemplateRequestProvider,
            $urlConfig: UrlConfigProvider,
            $view: ViewService,
            $transitions: TransitionProvider,
            $state: StateProvider,
            $templateFactory: TemplateFactoryProvider,
            $url: UrlService,
            $stateRegistry: StateRegistryProvider,
            $eventBus: PubSubProvider,
            $websocket: WebSocketProvider,
          });
        },
      ],
    )
    .factory("$stateParams", [
      $t._router,
      /**
       * @param {ng.RouterService} globals
       * @returns {import('./router/params/state-params.ts').StateParams }
       */
      (globals) => globals.params,
    ])
    .value("$trace", trace);
}
