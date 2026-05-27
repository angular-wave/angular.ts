export { angular } from "./index.ts";

import type { Angular as TAngular } from "./angular.ts";
import type {
  Scope as TScope,
  ListenerFn as TListenerFn,
  RootScopeProvider as TRootScopeProvider,
  ScopeEvent as TScopeEvent,
} from "./core/scope/scope.ts";
import type { NgModule as TNgModule } from "./core/di/ng-module/ng-module.ts";
import type { InjectorService as TInjectorService } from "./core/di/internal-injector.ts";

import type {
  AnchorScrollProvider as TAnchorScrollProvider,
  AnchorScrollService as TAnchorScrollService,
} from "./services/anchor-scroll/anchor-scroll.ts";
import type {
  ControllerProvider as TControllerProvider,
  ControllerService as TControllerService,
} from "./core/controller/controller.ts";
import type {
  ExceptionHandler as TExceptionHandler,
  ExceptionHandlerProvider as TExceptionHandlerProvider,
} from "./services/exception/exception.ts";
import type {
  ParseProvider as TParseProvider,
  ParseService as TParseService,
} from "./core/parse/parse.ts";
import type {
  TemplateRequestProvider as TTemplateRequestProvider,
  TemplateRequestService as TTemplateRequestService,
} from "./services/template-request/template-request.ts";

import type {
  HttpParamSerializerProvider as THttpParamSerializerProvider,
  HttpProvider as THttpProvider,
  HttpMethod as THttpMethod,
  HttpParamSerializer as THttpParamSerializer,
  HttpPromise as THttpPromise,
  HttpProviderDefaults as THttpProviderDefaults,
  HttpResponse as THttpResponse,
  HttpResponseStatus as THttpResponseStatus,
  HttpService as THttpService,
  RequestConfig as TRequestConfig,
  RequestShortcutConfig as TRequestShortcutConfig,
} from "./services/http/http.ts";
import type {
  FilterFactory as TFilterFactory,
  FilterService as TFilterService,
  FilterFn as TFilterFn,
} from "./filters/filter.ts";
import type { EntryFilterItem as TEntryFilterItem } from "./filters/collection.ts";
import type { DateFilterOptions as TDateFilterOptions } from "./filters/date.ts";
import type {
  CurrencyFilterOptions as TCurrencyFilterOptions,
  NumberFilterOptions as TNumberFilterOptions,
} from "./filters/number.ts";
import type { RelativeTimeFilterOptions as TRelativeTimeFilterOptions } from "./filters/relative-time.ts";
import type { FilterProvider as TFilterProvider } from "./core/filter/filter.ts";
import type {
  InterpolateService as TInterpolateService,
  InterpolationFunction as TInterpolationFunction,
  InterpolateProvider as TInterpolateProvider,
} from "./core/interpolate/interpolate.ts";
import type {
  SceProvider as TSceProvider,
  SceDelegateProvider as TSceDelegateProvider,
  SceDelegateService as TSceDelegateService,
  SceService as TSceService,
} from "./services/sce/sce.ts";
import type { StateProvider as TStateProvider } from "./router/state/state-service.ts";
import type {
  LogProvider as TLogProvider,
  LogService as TLogService,
} from "./services/log/log.ts";
import type {
  PubSubProvider as TPubSubProvider,
  PubSub as TPubSub,
} from "./services/pubsub/pubsub.ts";
import type {
  AnnotatedFactory as TAnnotatedFactory,
  Directive as TDirective,
  DirectiveFactory as TDirectiveFactory,
  DirectiveRestrict as TDirectiveRestrict,
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
  SseConnection as TSseConnection,
  SseProvider as TSseProvider,
  SseService as TSseService,
  SseConfig as TSseConfig,
} from "./services/sse/sse.ts";
import type {
  ErrorHandlingConfig as TErrorHandlingConfig,
  Validator as TValidator,
} from "./shared/interface.ts";
import type {
  CompileFn as TCompileFn,
  CompileLifecycleProvider as TCompileLifecycleProvider,
  CompileProvider as TCompileProvider,
  PublicLinkFn as TPublicLinkFn,
  TranscludeFn as TTranscludeFn,
} from "./core/compile/compile.ts";
import type {
  RealtimeProtocolEventDetail as TRealtimeProtocolEventDetail,
  RealtimeProtocolMessage as TRealtimeProtocolMessage,
  SwapModeType as TSwapModeType,
} from "./directive/realtime/protocol.ts";
import type {
  WorkerConnection as TWorkerConnection,
  WorkerConfig as TWorkerConfig,
} from "./directive/worker/worker.ts";
import type {
  WasmAbiExports as TWasmAbiExports,
  WasmInstantiationResult as TWasmInstantiationResult,
  WasmOptions as TWasmOptions,
  WasmScope as TWasmScope,
  WasmScopeAbi as TWasmScopeAbi,
  WasmScopeAbiImportObject as TWasmScopeAbiImportObject,
  WasmScopeAbiImports as TWasmScopeAbiImports,
  WasmScopeBindingOptions as TWasmScopeBindingOptions,
  WasmScopeOptions as TWasmScopeOptions,
  WasmScopeReference as TWasmScopeReference,
  WasmScopeUpdate as TWasmScopeUpdate,
  WasmScopeWatchOptions as TWasmScopeWatchOptions,
  WasmProvider as TWasmProvider,
  WasmService as TWasmService,
} from "./services/wasm/wasm.ts";
import type {
  Location as TLocationService,
  LocationProvider as TLocationProvider,
} from "./services/location/location.ts";
import type {
  AnimationContext as TAnimationContext,
  AnimationHandle as TAnimationHandle,
  AnimationLifecycleCallback as TAnimationLifecycleCallback,
  AnimationPhase as TAnimationPhase,
  AnimationPreset as TAnimationPreset,
  AnimationPresetHandler as TAnimationPresetHandler,
  AnimationResult as TAnimationResult,
  AnimateProvider as TAnimateProvider,
  AnimateService as TAnimateService,
  NativeAnimationOptions as TNativeAnimationOptions,
} from "./animations/animate.ts";
import type {
  StorageBackend as TStorageBackend,
  StorageType as TStorageType,
} from "./services/storage/storage.ts";
import type {
  ConnectionConfig as TConnectionConfig,
  ConnectionEvent as TConnectionEvent,
} from "./services/connection/connection-manager.ts";
import type {
  StreamProvider as TStreamProvider,
  StreamService as TStreamService,
} from "./services/stream/readable-stream.ts";
import type {
  CookieService as TCookieService,
  CookieProvider as TCookieProvider,
  CookieStoreOptions as TCookieStoreOptions,
  CookieOptions as TCookieOptions,
} from "./services/cookie/cookie.ts";
import type { TemplateCacheProvider as TTemplateCacheProvider } from "./services/template-cache/template-cache.ts";
import type {
  CachedRestBackendOptions as TCachedRestBackendOptions,
  RestDefinition as TRestDefinition,
  EntityClass as TEntityClass,
  RestBackend as TRestBackend,
  RestCacheStore as TRestCacheStore,
  RestCacheStrategy as TRestCacheStrategy,
  RestFactory as TRestFactory,
  RestOptions as TRestOptions,
  RestProvider as TRestProvider,
  RestRequest as TRestRequest,
  RestResponse as TRestResponse,
  RestRevalidateEvent as TRestRevalidateEvent,
  RestService as TRestService,
} from "./services/rest/rest.ts";
import type { NgModelController as TNgModelController } from "./directive/model/model.ts";
import type {
  StateDeclaration as TStateDeclaration,
  StateResolveArray as TStateResolveArray,
  StateResolveObject as TStateResolveObject,
} from "./router/state/interface.ts";
import type { StateRegistryProvider as TStateRegistryProvider } from "./router/state/state-registry.ts";
import type { RouterProvider as TRouterProvider } from "./router/router.ts";
import type { TemplateFactoryProvider as TTemplateFactoryProvider } from "./router/router/template-factory.ts";
import type { ViewService as TViewService } from "./router/view/view.ts";
import type {
  WebSocketConnection as TWebSocketConnection,
  WebSocketConfig as TWebSocketConfig,
  WebSocketProvider as TWebSocketProvider,
  WebSocketService as TWebSocketService,
} from "./services/websocket/websocket.ts";
import type {
  AppComponentOptions as TAppComponentOptions,
  ElementScopeOptions as TElementScopeOptions,
  ScopeElement as TScopeElement,
  ScopeElementConstructor as TScopeElementConstructor,
  WebComponentContext as TWebComponentContext,
  WebComponentInput as TWebComponentInput,
  WebComponentInputConfig as TWebComponentInputConfig,
  WebComponentInputs as TWebComponentInputs,
  WebComponentProvider as TWebComponentProvider,
  WebComponentService as TWebComponentService,
} from "./services/web-component/web-component.ts";
import type {
  AngularElementDefinition as TAngularElementDefinition,
  AngularElementModuleOptions as TAngularElementModuleOptions,
  AngularElementOptions as TAngularElementOptions,
} from "./runtime/web-component.ts";
import type {
  NativeWebTransport as TNativeWebTransport,
  WebTransportBufferInput as TWebTransportBufferInput,
  WebTransportCertificateHash as TWebTransportCertificateHash,
  WebTransportConfig as TWebTransportConfig,
  WebTransportConnection as TWebTransportConnection,
  WebTransportDatagramEvent as TWebTransportDatagramEvent,
  WebTransportOptions as TWebTransportOptions,
  WebTransportProvider as TWebTransportProvider,
  WebTransportReconnectEvent as TWebTransportReconnectEvent,
  WebTransportRetryDelay as TWebTransportRetryDelay,
  WebTransportService as TWebTransportService,
} from "./services/webtransport/webtransport.ts";
import type { Transition as TTransition } from "./router/transition/transition.ts";
import type { TransitionService as TTransitionService } from "./router/transition/interface.ts";
import type { TransitionProvider as TTransitionProvider } from "./router/transition/transition-service.ts";
import type {
  AriaProvider as TAriaProvider,
  AriaService as TAriaService,
} from "./directive/aria/aria.ts";
import type {
  WorkerProvider as TWorkerProvider,
  WorkerService as TWorkerService,
} from "./services/worker/worker.ts";

declare global {
  interface Function {
    $inject?: readonly string[] | undefined;
    $nonscope?: readonly string[] | boolean | undefined;
  }

  interface Window {
    angular: TAngular;
  }

  // eslint-disable-next-line @typescript-eslint/no-namespace -- Public global declaration for ng.* types.
  export namespace ng {
    // Core types (docs preserved)
    export type Angular = TAngular;

    export type AnnotatedDirectiveFactory = TAnnotatedDirectiveFactory;

    export type Component = TComponent;

    export type Controller = TController;

    export type Directive<TController = unknown> = TDirective<TController>;

    export type DirectiveRestrict = TDirectiveRestrict;

    export type DirectiveFactory = TDirectiveFactory;

    export type NgModule = TNgModule;

    export type PublicLinkFn = TPublicLinkFn;

    export type PubSubProvider = TPubSubProvider;

    export type Scope = TScope;

    export type ScopeService = TScope;

    export type TranscludeFn = TTranscludeFn;

    // Providers
    export type AnchorScrollProvider = TAnchorScrollProvider;

    export type AngularProvider = TAngularServiceProvider;

    export type AngularServiceProvider = TAngularServiceProvider;

    export type AnimateProvider = TAnimateProvider;

    export type AriaProvider = TAriaProvider;

    export type CompileLifecycleProvider = TCompileLifecycleProvider;

    export type CompileProvider = TCompileProvider;

    export type ControllerProvider = TControllerProvider;

    export type CookieProvider = TCookieProvider;

    export type EventBusProvider = TPubSubProvider;

    export type FilterProvider = TFilterProvider;

    export type ExceptionHandlerProvider = TExceptionHandlerProvider;

    export type HttpParamSerializerProvider = THttpParamSerializerProvider;

    export type HttpProvider = THttpProvider;

    export type InterpolateProvider = TInterpolateProvider;

    export type LocationProvider = TLocationProvider;

    export type LogProvider = TLogProvider;

    export type ParseProvider = TParseProvider;

    export type RestProvider = TRestProvider;

    export type RootScopeProvider = TRootScopeProvider;

    export type RouterProvider = TRouterProvider;

    export type SceDelegateProvider = TSceDelegateProvider;

    export type SceProvider = TSceProvider;

    export type SseProvider = TSseProvider;

    export type StateProvider = TStateProvider;

    export type StateRegistryProvider = TStateRegistryProvider;

    export type StreamProvider = TStreamProvider;

    export type TemplateCacheProvider = TTemplateCacheProvider;

    export type TemplateFactoryProvider = TTemplateFactoryProvider;

    export type TemplateRequestProvider = TTemplateRequestProvider;

    export type TransitionProvider = TTransitionProvider;

    export type TransitionsProvider = TTransitionProvider;

    export type TransitionService = TTransitionService;

    export type ViewProvider = TViewService;

    export type WasmProvider = TWasmProvider;

    export type WebComponentProvider = TWebComponentProvider;

    export type WebSocketProvider = TWebSocketProvider;

    export type WebTransportProvider = TWebTransportProvider;

    export type WorkerProvider = TWorkerProvider;

    // Services
    export type AnchorScrollService = TAnchorScrollService;

    export type AnimateService = TAnimateService;

    export type AnimationHandle = TAnimationHandle;

    export type AnimationContext = TAnimationContext;

    export type AnimationLifecycleCallback = TAnimationLifecycleCallback;

    export type AriaService = TAriaService;

    export type CompileService = TCompileFn;

    export type CompileLifecycleService = TCompileLifecycleProvider;

    export type ControllerService = TControllerService;

    export type CookieService = TCookieService;

    export type ElementService = Element;

    export type EventBusService = TPubSub;

    export type ExceptionHandlerService = TExceptionHandler;

    export type FilterFn = TFilterFn;

    export type FilterFactory = TFilterFactory;

    export type FilterService = TFilterService;

    export type EntryFilterItem = TEntryFilterItem;

    export type DateFilterOptions = TDateFilterOptions;

    export type NumberFilterOptions = TNumberFilterOptions;

    export type CurrencyFilterOptions = TCurrencyFilterOptions;

    export type RelativeTimeFilterOptions = TRelativeTimeFilterOptions;

    export type HttpParamSerializerService = THttpParamSerializer;

    export type HttpService = THttpService;

    export type InjectorService = TInjectorService;

    export type InterpolateService = TInterpolateService;

    export type LocationService = TLocationService;

    export type LogService = TLogService;

    export type ParseService = TParseService;

    export type ProvideService = TProvideService;

    export type PubSubService = TPubSub;

    export type RootElementService = Element;

    export type RootScopeService = TScope;

    export type StateService = TStateProvider;

    export type StateRegistryService = TStateRegistryProvider;

    export type SceService = TSceService;

    export type SceDelegateService = TSceDelegateService;

    export type SseService = TSseService;

    export type SseConfig = TSseConfig;

    export type SseConnection = TSseConnection;

    export type RealtimeProtocolEventDetail<
      T = unknown,
      TSource = unknown,
    > = TRealtimeProtocolEventDetail<T, TSource>;

    export type RealtimeProtocolMessage = TRealtimeProtocolMessage;

    export type SseProtocolEventDetail<T = unknown> =
      TRealtimeProtocolEventDetail<T, TSseConnection>;

    export type SseProtocolMessage = TRealtimeProtocolMessage;

    export type SwapModeType = TSwapModeType;

    export type TemplateCacheService = Map<string, string>;

    export type TemplateFactoryService = TTemplateFactoryProvider;

    export type TemplateRequestService = TTemplateRequestService;

    export type TransitionsService = TTransitionService;

    export type ViewService = TViewService;

    export type WorkerService = TWorkerService;

    // Support types
    export type AngularService = Angular;

    export type AnnotatedFactory<T extends (...args: never[]) => unknown> =
      TAnnotatedFactory<T>;

    export type AnimationOptions = TNativeAnimationOptions;

    export type NativeAnimationOptions = TNativeAnimationOptions;

    export type AnimationPhase = TAnimationPhase;

    export type AnimationPreset = TAnimationPreset;

    export type AnimationPresetHandler = TAnimationPresetHandler;

    export type AnimationResult = TAnimationResult;

    export type AngularElementDefinition = TAngularElementDefinition;

    export type AngularElementModuleOptions = TAngularElementModuleOptions;

    export type AngularElementOptions<
      T extends object = Record<string, unknown>,
    > = TAngularElementOptions<T>;

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
        | ((...args: never[]) => unknown)
        | (abstract new (...args: never[]) => unknown),
    > = TInjectable<T>;

    export type InjectionTokens = typeof PublicInjectionTokens;

    export type InterpolationFunction = TInterpolationFunction;

    export type InvocationDetail = TInvocationDetail;

    export type ListenerFn = TListenerFn;

    export type NgModelController = TNgModelController;

    export type RequestConfig = TRequestConfig;

    export type RequestShortcutConfig = TRequestShortcutConfig;

    export type RestDefinition<T> = TRestDefinition<T>;

    export type RestFactory = TRestFactory;

    export type RestBackend = TRestBackend;

    export type RestCacheStore = TRestCacheStore;

    export type RestCacheStrategy = TRestCacheStrategy;

    export type RestOptions = TRestOptions;

    export type RestRequest = TRestRequest;

    export type RestResponse<T> = TRestResponse<T>;

    export type RestRevalidateEvent<T> = TRestRevalidateEvent<T>;

    export type CachedRestBackendOptions = TCachedRestBackendOptions;

    export type RestService<T, ID> = TRestService<T, ID>;

    export type ScopeEvent = TScopeEvent;

    export type ServiceProvider = TServiceProvider;

    export type StateDeclaration = TStateDeclaration;

    export type StateResolveArray = TStateResolveArray;

    export type StateResolveObject = TStateResolveObject;

    export type StorageBackend = TStorageBackend;

    export type StorageType = TStorageType;

    export type ConnectionConfig = TConnectionConfig;

    export type ConnectionEvent = TConnectionEvent;

    export type StreamService = TStreamService;

    export type Transition = TTransition;

    export type Validator = TValidator;

    export type ElementScopeOptions = TElementScopeOptions;

    export type AppComponentOptions<
      T extends object = Record<string, unknown>,
    > = TAppComponentOptions<T>;

    export type ScopeElement<T extends object = Record<string, unknown>> =
      TScopeElement<T>;

    export type ScopeElementConstructor<
      T extends object = Record<string, unknown>,
    > = TScopeElementConstructor<T>;

    export type WebComponentContext<
      T extends object = Record<string, unknown>,
    > = TWebComponentContext<T>;

    export type WebComponentInput = TWebComponentInput;

    export type WebComponentInputConfig = TWebComponentInputConfig;

    export type WebComponentInputs = TWebComponentInputs;

    export type WebComponentService = TWebComponentService;

    export type WebSocketConfig = TWebSocketConfig;

    export type WebSocketConnection = TWebSocketConnection;

    export type WebSocketService = TWebSocketService;

    export type NativeWebTransport = TNativeWebTransport;

    export type WebTransportBufferInput = TWebTransportBufferInput;

    export type WebTransportCertificateHash = TWebTransportCertificateHash;

    export type WebTransportConfig = TWebTransportConfig;

    export type WebTransportConnection = TWebTransportConnection;

    export type WebTransportDatagramEvent<T> = TWebTransportDatagramEvent<T>;

    export type WebTransportOptions = TWebTransportOptions;

    export type WebTransportReconnectEvent = TWebTransportReconnectEvent;

    export type WebTransportRetryDelay = TWebTransportRetryDelay;

    export type WebTransportService = TWebTransportService;

    export type WindowService = Window;

    export type WorkerConfig = TWorkerConfig;

    export type WorkerConnection = TWorkerConnection;

    export type WasmAbiExports = TWasmAbiExports;

    export type WasmInstantiationResult = TWasmInstantiationResult;

    export type WasmOptions = TWasmOptions;

    export type WasmScope = TWasmScope;

    export type WasmScopeAbi = TWasmScopeAbi;

    export type WasmScopeAbiImportObject = TWasmScopeAbiImportObject;

    export type WasmScopeAbiImports = TWasmScopeAbiImports;

    export type WasmScopeBindingOptions = TWasmScopeBindingOptions;

    export type WasmScopeOptions = TWasmScopeOptions;

    export type WasmScopeReference = TWasmScopeReference;

    export type WasmScopeUpdate = TWasmScopeUpdate;

    export type WasmScopeWatchOptions = TWasmScopeWatchOptions;

    export type WasmService = TWasmService;
  }
}
