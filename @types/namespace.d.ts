export { angular } from "./index.js";
import { Angular as TAngular } from "./angular.js";
import { Attributes as TAttributes } from "./core/compile/attributes.js";
import { Scope as TScope } from "./core/scope/scope.js";
import { ProviderCache as TProviderCache } from "./core/di/interface.ts";
import {
  ListenerFn as TListenerFn,
  Listener as TListener,
  ScopeEvent as TScopeEvent,
} from "./core/scope/interface.ts";
import { NgModule as TNgModule } from "./core/di/ng-module/ng-module.js";
import { InjectorService as TInjectorService } from "./core/di/internal-injector.js";
import { AnchorScrollProvider as TAnchorScrollProvider } from "./services/anchor-scroll/anchor-scroll.js";
import { AnchorScrollService as TAnchorScrollService } from "./services/anchor-scroll/interface.ts";
import { ControllerService as TControllerService } from "./core/controller/interface.ts";
import { ExceptionHandler as TExceptionHandler } from "./services/exception/interface.ts";
import { ExceptionHandlerProvider as TExceptionHandlerProvider } from "./services/exception/exception.js";
import { ParseService as TParseService } from "./core/parse/interface.ts";
import { TemplateRequestService as TTemplateRequestService } from "./services/template-request/interface.ts";
import {
  HttpParamSerializer as THttpParamSerializer,
  HttpProviderDefaults as THttpProviderDefaults,
  RequestShortcutConfig as TRequestShortcutConfig,
  HttpResponseStatus as THttpResponseStatus,
  HttpMethod as THttpMethod,
  RequestConfig as TRequestConfig,
  HttpPromise as THttpPromise,
  HttpResponse as THttpResponse,
} from "./services/http/interface.ts";
import { HttpParamSerializerProvider as THttpParamSerializerProvider } from "./services/http/http.js";
import {
  FilterFactory as TFilterFactory,
  FilterService as TFilterService,
  FilterFn as TFilterFn,
} from "./filters/interface.ts";
import { FilterProvider as TFilterProvider } from "./core/filter/filter.js";
import {
  InterpolateService as TInterpolateService,
  InterpolationFunction as TInterpolationFunction,
} from "./core/interpolate/interface.ts";
import { InterpolateProvider as TInterpolateProvider } from "./core/interpolate/interpolate.js";
import {
  SceProvider as TSceProvider,
  SceDelegateProvider as TSceDelegateProvider,
} from "./services/sce/sce.js";
import { StateProvider as TStateProvider } from "./router/state/state-service.js";
import { HttpService as THttpService } from "./services/http/interface.ts";
import { LogService as TLogService } from "./services/log/interface.ts";
import {
  PubSubProvider as TPubSubProvider,
  PubSub as TPubSub,
} from "./services/pubsub/pubsub.js";
import {
  AnnotatedFactory as TAnnotatedFactory,
  Directive as TDirective,
  DirectiveFactory as TDirectiveFactory,
  AnnotatedDirectiveFactory as TAnnotatedDirectiveFactory,
  Component as TComponent,
  Controller as TController,
  ControllerConstructor as TControllerConstructor,
  Injectable as TInjectable,
  Expression as TExpression,
  PublicInjectionTokens,
  InvocationDetail as TInvocationDetail,
  AngularServiceProvider as TAngularServiceProvider,
} from "./interface.ts";
import {
  SseService as TSseService,
  SseConfig as TSseConfig,
} from "./services/sse/interface.ts";
import type {
  ErrorHandlingConfig as TErrorHandlingConfig,
  Validator as TValidator,
} from "./shared/interface.ts";
import {
  BoundTranscludeFn as TBoundTranscludeFn,
  CompileFn as TCompileFn,
  PublicLinkFn as TPublicLinkFn,
  NodeLinkFnCtx as TNodeLinkFnCtx,
  NodeLinkFn as TNodeLinkFn,
  TranscludeFn as TTranscludeFn,
  LinkFnMapping as TLinkFnMapping,
  CompositeLinkFn as TCompositeLinkFn,
} from "./core/compile/interface.ts";
import {
  WorkerConnection as TWorkerConnection,
  WorkerConfig as TWorkerConfig,
} from "./directive/worker/interface.ts";
import { Provider as TProvideService } from "./interface.ts";
import { Location as TLocationService } from "./services/location/location.js";
import {
  AnimateService as TAnimateService,
  AnimationOptions as TAnimationOptions,
  AnimateCssService as TAnimateCssService,
} from "./animations/interface.ts";
import {
  StorageBackend as TStorageBackend,
  StorageType as TStorageType,
} from "./services/storage/interface.ts";
import { StreamConnectionConfig as TStreamConnectionConfig } from "./services/stream/interface.ts";
import { CookieService as TCookieService } from "./services/cookie/cookie.js";
import {
  CookieStoreOptions as TCookieStoreOptions,
  CookieOptions as TCookieOptions,
} from "./services/cookie/interface.ts";
import {
  RestDefinition as TRestDefinition,
  EntityClass as TEntityClass,
} from "./services/rest/interface.ts";
import { RestService as TRestService } from "./services/rest/rest.js";
import { ServiceProvider as TServiceProvider } from "./interface.ts";
import { NgModelController as TNgModelController } from "./directive/model/model.js";
import { RouterProvider as TRouterProvider } from "./router/router.ts";
import { TransitionProvider as TTransitionProvider } from "./router/transition/transition-service.js";
import { AnimateProvider as TAnimateProvider } from "./animations/animate.js";
import { UrlService as TUrlService } from "./router/url/url-service.js";
import { LocationProvider as TLocationProvider } from "./services/location/location.js";
import { ViewService as TViewService } from "./router/view/view.js";
import {
  BuiltStateDeclaration as TBuiltStateDeclaration,
  StateDeclaration as TStateDeclaration,
} from "./router/state/interface.ts";
import { StateObject as TStateObject } from "./router/state/state-object.js";
import { StateRegistryProvider as TStateRegistryProvider } from "./router/state/state-registry.js";
import {
  SceService as TSceService,
  SceDelegateService as TSceDelegateService,
} from "./services/sce/interface.ts";
import {
  WebSocketConfig as TWebSocketConfig,
  WebSocketService as TWebSocketService,
} from "./services/websocket/interface.ts";
import { AnimateRunner as TAnimateRunner } from "./animations/runner/animate-runner.js";
import { Transition as TTransition } from "./router/transition/transition.js";
import { TemplateFactoryProvider as TTemplateFactoryProvider } from "./router/template-factory.js";
import { TransitionService as TTransitionService } from "./router/transition/interface.ts";
import { UrlConfigProvider as TUrlConfigProvider } from "./router/url/url-config.js";
import { AriaService as TAriaService } from "./directive/aria/interface.ts";
declare global {
  interface Function {
    $inject?: readonly string[] | undefined;
    $nonscope?: readonly string[] | boolean | undefined;
  }
  interface Window {
    angular: TAngular;
  }
  export namespace ng {
    type Angular = TAngular;
    type AnnotatedDirectiveFactory = TAnnotatedDirectiveFactory;
    type Attributes = TAttributes & Record<string, string>;
    type BoundTranscludeFn = TBoundTranscludeFn;
    type Component = TComponent & Record<string, any>;
    type CompositeLinkFn = TCompositeLinkFn;
    type Controller = TController;
    type Directive<TController = any> = TDirective<TController>;
    type DirectiveFactory = TDirectiveFactory;
    type LinkFnMapping = TLinkFnMapping;
    type NgModule = TNgModule;
    type NodeLinkFn = TNodeLinkFn;
    type NodeLinkFnCtx = TNodeLinkFnCtx;
    type PublicLinkFn = TPublicLinkFn;
    type PubSubProvider = TPubSubProvider;
    type Scope = TScope & Record<string, any>;
    type TranscludeFn = TTranscludeFn;
    type AnchorScrollProvider = TAnchorScrollProvider;
    type AngularServiceProvider = TAngularServiceProvider;
    type AnimateProvider = TAnimateProvider;
    type FilterProvider = TFilterProvider;
    type ExceptionHandlerProvider = TExceptionHandlerProvider;
    type HttpParamSerializerProvider = THttpParamSerializerProvider;
    type InterpolateProvider = TInterpolateProvider;
    type LocationProvider = TLocationProvider;
    type SceDelegateProvider = TSceDelegateProvider;
    type SceProvider = TSceProvider;
    type TransitionProvider = TTransitionProvider;
    type TransitionService = TTransitionService;
    type RouterProvider = TRouterProvider;
    type TemplateFactoryProvider = TTemplateFactoryProvider;
    type UrlConfigProvider = TUrlConfigProvider;
    type AnchorScrollService = TAnchorScrollService;
    type AnimateService = TAnimateService;
    type AnimateCssService = TAnimateCssService;
    type AnimateRunner = TAnimateRunner;
    type AriaService = TAriaService;
    type CompileService = TCompileFn;
    type ControllerService = TControllerService;
    type CookieService = TCookieService;
    type ExceptionHandlerService = TExceptionHandler;
    type FilterFn = TFilterFn;
    type FilterFactory = TFilterFactory;
    type FilterService = TFilterService;
    type HttpParamSerializerSerService = THttpParamSerializer;
    type HttpService = THttpService;
    type InjectorService = TInjectorService;
    type InterpolateService = TInterpolateService;
    type LocationService = TLocationService;
    type LogService = TLogService;
    type ParseService = TParseService;
    type ProvideService = TProvideService;
    type PubSubService = TPubSub;
    type RootElementService = Element;
    type RootScopeService = TScope & Record<string, any>;
    type RouterService = TRouterProvider;
    type StateService = TStateProvider;
    type StateRegistryService = TStateRegistryProvider;
    type SceService = TSceService;
    type SceDelegateService = TSceDelegateService;
    type SseService = TSseService;
    type SseConfig = TSseConfig;
    type TemplateCacheService = Map<string, string>;
    type TemplateRequestService = TTemplateRequestService;
    type UrlService = TUrlService;
    type ViewService = TViewService;
    type AngularService = Angular;
    type AnnotatedFactory<T extends (...args: any[]) => any> =
      TAnnotatedFactory<T>;
    type AnimationOptions = TAnimationOptions;
    type BuiltStateDeclaration = TBuiltStateDeclaration;
    type ControllerConstructor = TControllerConstructor;
    type CookieOptions = TCookieOptions;
    type CookieStoreOptions = TCookieStoreOptions;
    type DocumentService = Document;
    type EntityClass<T> = TEntityClass<T>;
    type ErrorHandlingConfig = TErrorHandlingConfig;
    type Expression = TExpression;
    type HttpMethod = THttpMethod;
    type HttpPromise<T> = THttpPromise<T>;
    type HttpProviderDefaults = THttpProviderDefaults;
    type HttpResponse<T> = THttpResponse<T>;
    type HttpResponseStatus = THttpResponseStatus;
    type Injectable<
      T extends
        | ((...args: any[]) => any)
        | (abstract new (...args: any[]) => any),
    > = TInjectable<T>;
    type InjectionTokens = typeof PublicInjectionTokens;
    type InterpolationFunction = TInterpolationFunction;
    type InvocationDetail = TInvocationDetail;
    type Listener = TListener;
    type ListenerFn = TListenerFn;
    type NgModelController = TNgModelController;
    type ProviderCache = TProviderCache;
    type RequestConfig = TRequestConfig;
    type RequestShortcutConfig = TRequestShortcutConfig;
    type RestDefinition<T> = TRestDefinition<T>;
    type RestService<T, ID> = TRestService<T, ID>;
    type ScopeEvent = TScopeEvent;
    type ServiceProvider = TServiceProvider;
    type StateDeclaration = TStateDeclaration;
    type StateObject = TStateObject & Record<string, any>;
    type StorageBackend = TStorageBackend;
    type StorageType = TStorageType;
    type StreamConnectionConfig = TStreamConnectionConfig;
    type Transition = TTransition;
    type Validator = TValidator;
    type WebSocketConfig = TWebSocketConfig;
    type WebSocketService = TWebSocketService;
    type WindowService = Window;
    type WorkerConfig = TWorkerConfig;
    type WorkerConnection = TWorkerConnection;
  }
}
