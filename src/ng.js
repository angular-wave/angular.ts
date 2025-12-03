import { CompileProvider } from "./core/compile/compile.js";
import {
  hiddenInputBrowserCacheDirective,
  inputDirective,
  ngValueDirective,
} from "./directive/input/input.js";
import { formDirective, ngFormDirective } from "./directive/form/form.js";
import { scriptDirective } from "./directive/script/script.js";
import { optionDirective, selectDirective } from "./directive/select/select.js";
import {
  ngBindDirective,
  ngBindHtmlDirective,
  ngBindTemplateDirective,
} from "./directive/bind/bind.js";
import {
  ngClassDirective,
  ngClassEvenDirective,
  ngClassOddDirective,
} from "./directive/class/class.js";
import { ngCloakDirective } from "./directive/cloak/cloak.js";
import { ngControllerDirective } from "./directive/controller/controller.js";
import {
  ngHideDirective,
  ngShowDirective,
} from "./directive/show-hide/show-hide.js";
import { ngIfDirective } from "./directive/if/if.js";
import {
  ngIncludeDirective,
  ngIncludeFillContentDirective,
} from "./directive/include/include.js";
import { ngInitDirective } from "./directive/init/init.js";
import { ngNonBindableDirective } from "./directive/non-bindable/non-bindable.js";
import { ngRefDirective } from "./directive/ref/ref.js";
import { ngRepeatDirective } from "./directive/repeat/repeat.js";
import { ngStyleDirective } from "./directive/style/style.js";
import {
  ngSwitchDefaultDirective,
  ngSwitchDirective,
  ngSwitchWhenDirective,
} from "./directive/switch/switch.js";
import { ngOptionsDirective } from "./directive/options/options.js";
import { ngTranscludeDirective } from "./directive/transclude/transclude.js";
import { ngModelDirective } from "./directive/model/model.js";
import {
  maxlengthDirective,
  minlengthDirective,
  patternDirective,
  requiredDirective,
} from "./directive/validators/validators.js";
import { ngModelOptionsDirective } from "./directive/model-options/model-options.js";
import { ngAttributeAliasDirectives } from "./directive/attrs/attrs.js";
import { ngEventDirectives } from "./directive/events/events.js";
import { AnchorScrollProvider } from "./services/anchor-scroll/anchor-scroll.js";
import { AnimateProvider } from "./animations/animate.js";
import { TemplateCacheProvider } from "./services/template-cache/template-cache.js";
import { ControllerProvider } from "./core/controller/controller.js";
import { ExceptionHandlerProvider } from "./services/exception/exception.js";
import { FilterProvider } from "./core/filter/filter.js";
import { InterpolateProvider } from "./core/interpolate/interpolate.js";
import {
  HttpParamSerializerProvider,
  HttpProvider,
} from "./services/http/http.js";
import { LocationProvider } from "./services/location/location.js";
import { LogProvider } from "./services/log/log.js";
import { ParseProvider } from "./core/parse/parse.js";
import { RootScopeProvider } from "./core/scope/scope.js";
import { SceDelegateProvider, SceProvider } from "./services/sce/sce.js";
import { TemplateRequestProvider } from "./services/template-request/template-request.js";
import { SanitizeUriProvider } from "./core/sanitize/sanitize-uri.js";
import {
  ngMessageDefaultDirective,
  ngMessageDirective,
  ngMessageExpDirective,
  ngMessagesDirective,
  ngMessagesIncludeDirective,
} from "./directive/messages/messages.js";
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
} from "./directive/aria/aria.js";
import { AnimateCssProvider } from "./animations/animate-css.js";
import { AnimateQueueProvider } from "./animations/queue/animate-queue.js";
import { AnimateJsProvider } from "./animations/animate-js.js";
import { AnimationProvider } from "./animations/animation.js";
import { RafSchedulerProvider } from "./animations/raf-scheduler.js";
import { AnimateCacheProvider } from "./animations/animate-cache.js";
import { AnimateCssDriverProvider } from "./animations/animate-css-driver.js";
import { AnimateJsDriverProvider } from "./animations/animate-js-driver.js";
import { ngAnimateSwapDirective } from "./animations/animate-swap.js";
import { $$AnimateChildrenDirective } from "./animations/animate-children-directive.js";
import { UrlConfigProvider } from "./router/url/url-config.js";
import { Router } from "./router/router.js";
import { ViewService } from "./router/view/view.js";
import { TransitionProvider } from "./router/transition/transition-service.js";
import { StateProvider } from "./router/state/state-service.js";
import { ViewScrollProvider } from "./router/view-scroll.js";
import { TemplateFactoryProvider } from "./router/template-factory.js";
import { UrlService } from "./router/url/url-service.js";
import { StateRegistryProvider } from "./router/state/state-registry.js";
import { trace } from "./router/common/trace.js";
import {
  $StateRefActiveDirective,
  $StateRefDirective,
  $StateRefDynamicDirective,
} from "./router/directives/state-directives.js";
import {
  $ViewDirectiveFill,
  ngView,
} from "./router/directives/view-directive.js";
import { ngChannelDirective } from "./directive/channel/channel.js";
import { ngSetterDirective } from "./directive/setter/setter.js";
import { PubSubProvider } from "./services/pubsub/pubsub.js";
import {
  ngDeleteDirective,
  ngGetDirective,
  ngPostDirective,
  ngPutDirective,
  ngSseDirective,
} from "./directive/http/http.js";
import { $injectTokens as $t } from "./injection-tokens.js";
import { ngInjectDirective } from "./directive/inject/inject.js";
import { ngElDirective } from "./directive/el/el.js";
import { SseProvider } from "./services/sse/sse.js";
import { ngViewportDirective } from "./directive/viewport/viewport.js";
import { ngWorkerDirective } from "./directive/worker/worker.js";
import { ngWasmDirective } from "./directive/wasm/wasm.js";
import { ngScopeDirective } from "./directive/scope/scope.js";
import { CookieProvider } from "./services/cookie/cookie.js";
import { RestProvider } from "./services/rest/rest.js";

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
        $t.$provide,
        /** @param {ng.ProvideService} $provide */
        ($provide) => {
          // $$sanitizeUriProvider needs to be before $compileProvider as it is used by it.
          $provide.provider({
            $$sanitizeUri: SanitizeUriProvider,
          });
          $provide.value($t.$window, window);
          $provide.value($t.$document, document);
          $provide
            .provider($t.$compile, CompileProvider)
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
              input: hiddenInputBrowserCacheDirective,
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
              ngSref: $StateRefDirective,
              ngSrefActive: $StateRefActiveDirective,
              ngSrefActiveEq: $StateRefActiveDirective,
              ngState: $StateRefDynamicDirective,
              ngView,
            })
            .directive({
              ngView: $ViewDirectiveFill,
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
            $$animateCache: AnimateCacheProvider,
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
            $$rAFScheduler: RafSchedulerProvider,
            $rest: RestProvider,
            $rootScope: RootScopeProvider,
            $router: Router,
            $sce: SceProvider,
            $sceDelegate: SceDelegateProvider,
            $sse: SseProvider,
            $templateCache: TemplateCacheProvider,
            $templateRequest: TemplateRequestProvider,
            $urlConfig: UrlConfigProvider,
            $view: ViewService,
            $transitions: TransitionProvider,
            $state: StateProvider,
            $viewScroll: ViewScrollProvider,
            $templateFactory: TemplateFactoryProvider,
            $url: UrlService,
            $stateRegistry: StateRegistryProvider,
            $eventBus: PubSubProvider,
          });
        },
      ],
    )
    .factory("$stateParams", [
      $t.$router,
      /**
       * @param {import('./router/router.js').Router} globals
       * @returns {import('./router/params/state-params.js').StateParams }
       */
      (globals) => globals.params,
    ])
    .value("$trace", trace);
}
