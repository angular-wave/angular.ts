export { angular } from "./index.ts";

import type { Angular as TAngular } from "./angular.ts";
import type { Attributes as TAttributes } from "./core/compile/attributes.ts";
import {
  Scope as TScope,
  ListenerFn as TListenerFn,
  ScopeEvent as TScopeEvent,
} from "./core/scope/scope.ts";
import type { ProviderCache as TProviderCache } from "./core/di/interface.ts";
import type { NgModule as TNgModule } from "./core/di/ng-module/ng-module.ts";
import type { InjectorService as TInjectorService } from "./core/di/internal-injector.ts";

import type {
  AnchorScrollProvider as TAnchorScrollProvider,
  AnchorScrollService as TAnchorScrollService,
} from "./services/anchor-scroll/anchor-scroll.ts";

import type { ControllerService as TControllerService } from "./core/controller/controller.ts";
import type {
  ExceptionHandler as TExceptionHandler,
  ExceptionHandlerProvider as TExceptionHandlerProvider,
} from "./services/exception/exception.ts";
import type { ParseService as TParseService } from "./core/parse/parse.ts";
import type { TemplateRequestService as TTemplateRequestService } from "./services/template-request/template-request.ts";

import {
  HttpParamSerializerProvider,
  type HttpMethod as THttpMethod,
  type HttpParamSerializer as THttpParamSerializer,
  type HttpPromise as THttpPromise,
  type HttpProviderDefaults as THttpProviderDefaults,
  type HttpResponse as THttpResponse,
  type HttpResponseStatus as THttpResponseStatus,
  type HttpService as THttpService,
  type RequestConfig as TRequestConfig,
  type RequestShortcutConfig as TRequestShortcutConfig,
} from "./services/http/http.ts";
import {
  FilterFactory as TFilterFactory,
  FilterService as TFilterService,
  FilterFn as TFilterFn,
} from "./filters/filter.ts";
import type { FilterProvider as TFilterProvider } from "./core/filter/filter.ts";
import type {
  InterpolateService as TInterpolateService,
  InterpolationFunction as TInterpolationFunction,
  InterpolateProvider as TInterpolateProvider,
} from "./core/interpolate/interpolate.ts";
import {
  SceProvider,
  type SceDelegateProvider as TSceDelegateProvider,
  type SceDelegateService as TSceDelegateService,
  type SceService as TSceService,
} from "./services/sce/sce.ts";
import type { StateProvider as TStateProvider } from "./router/state/state-service.ts";
import type { LogService as TLogService } from "./services/log/log.ts";
import {
  PubSubProvider as TPubSubProvider,
  PubSub as TPubSub,
} from "./services/pubsub/pubsub.ts";
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
  Provider as TProvideService,
  ServiceProvider as TServiceProvider,
} from "./interface.ts";
import type {
  SseService as TSseService,
  SseConfig as TSseConfig,
} from "./services/sse/sse.ts";
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
} from "./core/compile/compile.ts";
import {
  WorkerConnection as TWorkerConnection,
  WorkerConfig as TWorkerConfig,
} from "./directive/worker/worker.ts";
import type {
  Location as TLocationService,
  LocationProvider as TLocationProvider,
} from "./services/location/location.ts";
import { AnimationOptions as TAnimationOptions } from "./animations/interface.ts";
import {
  AnimateProvider,
  type AnimateService as TAnimateService,
} from "./animations/animate.ts";
import type { AnimateCssService as TAnimateCssService } from "./animations/css/animate-css.ts";
import type {
  StorageBackend as TStorageBackend,
  StorageType as TStorageType,
} from "./services/storage/storage.ts";
import type { StreamConnectionConfig as TStreamConnectionConfig } from "./services/stream/stream.ts";
import type {
  CookieService as TCookieService,
  CookieStoreOptions as TCookieStoreOptions,
  CookieOptions as TCookieOptions,
} from "./services/cookie/cookie.ts";
import {
  RestDefinition as TRestDefinition,
  EntityClass as TEntityClass,
  type RestService as TRestService,
} from "./services/rest/rest.ts";
import type { NgModelController as TNgModelController } from "./directive/model/model.ts";
import type { _RouterProvider as T_RouterProvider } from "./router/router.ts";
import type { TransitionProvider as TTransitionProvider } from "./router/transition/transition-service.ts";
import type { UrlService as TUrlService } from "./router/url/url-service.ts";
import type { ViewService as TViewService } from "./router/view/view.ts";
import {
  BuiltStateDeclaration as TBuiltStateDeclaration,
  StateDeclaration as TStateDeclaration,
  StateResolveArray as TStateResolveArray,
  StateResolveObject as TStateResolveObject,
} from "./router/state/interface.ts";
import type { StateObject as TStateObject } from "./router/state/state-object.ts";
import type { StateRegistryProvider as TStateRegistryProvider } from "./router/state/state-registry.ts";
import type {
  WebSocketConfig as TWebSocketConfig,
  WebSocketService as TWebSocketService,
} from "./services/websocket/websocket.ts";
import type { AnimateRunner as TAnimateRunner } from "./animations/runner/animate-runner.ts";
import type { Transition as TTransition } from "./router/transition/transition.ts";
import type { TemplateFactoryProvider as TTemplateFactoryProvider } from "./router/template-factory.ts";
import type { TransitionService as TTransitionService } from "./router/transition/interface.ts";
import type { UrlConfigProvider as TUrlConfigProvider } from "./router/url/url-config.ts";
import type { AriaService as TAriaService } from "./directive/aria/aria.ts";

declare global {
  interface Function {
    $inject?: readonly string[] | undefined;
    $nonscope?: readonly string[] | boolean | undefined;
  }

  interface Window {
    angular: TAngular;
  }

  export namespace ng {
    // Core types (docs preserved)
    export type Angular = TAngular;

    export type AnnotatedDirectiveFactory = TAnnotatedDirectiveFactory;

    export type Attributes = TAttributes & Record<string, string>;

    export type BoundTranscludeFn = TBoundTranscludeFn;

    export type Component = TComponent & Record<string, any>;

    export type CompositeLinkFn = TCompositeLinkFn;

    export type Controller = TController;

    export type Directive<TController = any> = TDirective<TController>;

    export type DirectiveFactory = TDirectiveFactory;

    export type LinkFnMapping = TLinkFnMapping;

    export type NgModule = TNgModule;

    export type NodeLinkFn = TNodeLinkFn;

    export type NodeLinkFnCtx = TNodeLinkFnCtx;

    export type PublicLinkFn = TPublicLinkFn;

    export type PubSubProvider = TPubSubProvider;

    export type Scope = TScope & Record<string, any>;

    export type TranscludeFn = TTranscludeFn;

    // Providers
    export type AnchorScrollProvider = TAnchorScrollProvider;

    export type AngularServiceProvider = TAngularServiceProvider;

    export type AnimateProvider = ThisParameterType<typeof AnimateProvider>;

    export type FilterProvider = TFilterProvider;

    export type ExceptionHandlerProvider = TExceptionHandlerProvider;

    export type HttpParamSerializerProvider = ThisParameterType<
      typeof HttpParamSerializerProvider
    >;

    export type InterpolateProvider = TInterpolateProvider;

    export type LocationProvider = TLocationProvider;

    export type SceDelegateProvider = TSceDelegateProvider;

    export type SceProvider = ThisParameterType<typeof SceProvider>;

    export type TransitionProvider = TTransitionProvider;

    export type TransitionService = TTransitionService;

    /** @internal */
    export type _RouterProvider = T_RouterProvider;

    export type TemplateFactoryProvider = TTemplateFactoryProvider;

    export type UrlConfigProvider = TUrlConfigProvider;

    // Services
    export type AnchorScrollService = TAnchorScrollService;

    export type AnimateService = TAnimateService;

    export type AnimateCssService = TAnimateCssService;

    export type AnimateRunner = TAnimateRunner;

    export type AriaService = TAriaService;

    export type CompileService = TCompileFn;

    export type ControllerService = TControllerService;

    export type CookieService = TCookieService;

    export type ExceptionHandlerService = TExceptionHandler;

    export type FilterFn = TFilterFn;

    export type FilterFactory = TFilterFactory;

    export type FilterService = TFilterService;

    export type HttpParamSerializerSerService = THttpParamSerializer;

    export type HttpService = THttpService;

    export type InjectorService = TInjectorService;

    export type InterpolateService = TInterpolateService;

    export type LocationService = TLocationService;

    export type LogService = TLogService;

    export type ParseService = TParseService;

    export type ProvideService = TProvideService;

    export type PubSubService = TPubSub;

    export type RootElementService = Element;

    export type RootScopeService = TScope & Record<string, any>;

    /** @internal */
    export type _RouterService = T_RouterProvider;

    export type StateService = TStateProvider;

    export type StateRegistryService = TStateRegistryProvider;

    export type SceService = TSceService;

    export type SceDelegateService = TSceDelegateService;

    export type SseService = TSseService;

    export type SseConfig = TSseConfig;

    export type TemplateCacheService = Map<string, string>;

    export type TemplateRequestService = TTemplateRequestService;

    export type UrlService = TUrlService;

    export type ViewService = TViewService;

    // Support types
    export type AngularService = Angular;

    export type AnnotatedFactory<T extends (...args: any[]) => any> =
      TAnnotatedFactory<T>;

    export type AnimationOptions = TAnimationOptions;

    export type BuiltStateDeclaration = TBuiltStateDeclaration;

    export type ControllerConstructor = TControllerConstructor;

    export type CookieOptions = TCookieOptions;

    export type CookieStoreOptions = TCookieStoreOptions;

    export type DocumentService = Document;

    export type EntityClass<T> = TEntityClass<T>;

    export type ErrorHandlingConfig = TErrorHandlingConfig;

    export type Expression = TExpression;

    export type HttpMethod = THttpMethod;

    export type HttpPromise<T> = THttpPromise<T>;

    export type HttpProviderDefaults = THttpProviderDefaults;

    export type HttpResponse<T> = THttpResponse<T>;

    export type HttpResponseStatus = THttpResponseStatus;

    export type Injectable<
      T extends
        | ((...args: any[]) => any)
        | (abstract new (...args: any[]) => any),
    > = TInjectable<T>;

    export type InjectionTokens = typeof PublicInjectionTokens;

    export type InterpolationFunction = TInterpolationFunction;

    export type InvocationDetail = TInvocationDetail;

    export type ListenerFn = TListenerFn;

    export type NgModelController = TNgModelController;

    export type ProviderCache = TProviderCache;

    export type RequestConfig = TRequestConfig;

    export type RequestShortcutConfig = TRequestShortcutConfig;

    export type RestDefinition<T> = TRestDefinition<T>;

    export type RestService<T, ID> = TRestService<T, ID>;

    export type ScopeEvent = TScopeEvent;

    export type ServiceProvider = TServiceProvider;

    export type StateDeclaration = TStateDeclaration;

    export type StateResolveArray = TStateResolveArray;

    export type StateResolveObject = TStateResolveObject;

    export type StateObject = TStateObject & Record<string, any>;

    export type StorageBackend = TStorageBackend;

    export type StorageType = TStorageType;

    export type StreamConnectionConfig = TStreamConnectionConfig;

    export type Transition = TTransition;

    export type Validator = TValidator;

    export type WebSocketConfig = TWebSocketConfig;

    export type WebSocketService = TWebSocketService;

    export type WindowService = Window;

    export type WorkerConfig = TWorkerConfig;

    export type WorkerConnection = TWorkerConnection;
  }
}
