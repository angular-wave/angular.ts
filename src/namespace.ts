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
import { InterpolateService as TInterpolateService } from "./core/interpolate/interface.ts";
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
    export type AnimateProvider = TAnimateProvider;
    export type FilterProvider = TFilterProvider;
    export type ExceptionHandlerProvider = TExceptionHandlerProvider;
    export type HttpParamSerializerProvider = THttpParamSerializerProvider;
    export type InterpolateProvider = TInterpolateProvider;
    export type LocationProvider = TLocationProvider;
    export type SceDelegateProvider = TSceDelegateProvider;
    export type SceProvider = TSceProvider;
    export type TransitionProvider = TTransitionProvider;
    export type TransitionService = TTransitionService;
    export type RouterProvider = TRouterProvider;
    export type TemplateFactoryProvider = TTemplateFactoryProvider;
    export type UrlConfigProvider = TUrlConfigProvider;

    // Services
    export type AnchorScrollService = TAnchorScrollService;
    export type AnimateService = TAnimateService;
    export type AnimateCssService = TAnimateCssService;
    export type AnimateRunner = TAnimateRunner;
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
    export type RouterService = TRouterProvider;
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
    export type InvocationDetail = TInvocationDetail;
    export type Listener = TListener;
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
    export type StateObject = TStateObject;
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
