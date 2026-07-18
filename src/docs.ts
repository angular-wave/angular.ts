export { angular } from "./index.ts";
export { Angular } from "./angular.ts";
export { AngularRuntime } from "./angular-runtime.ts";
export type {
  AngularRuntimeConstructorInput,
  AngularRuntimeOptions,
  RuntimeModule,
} from "./angular-runtime.ts";
export type { ErrorHandlingConfig, Validator } from "./shared/interface.ts";

export type {
  AnnotatedDirectiveFactory,
  AnnotatedFactory,
  AngularBootstrapConfig,
  ChangesObject,
  ClassMap,
  ClassValue,
  Component,
  Constructor,
  Controller,
  ControllerConstructor,
  Directive,
  DirectiveCompileFn,
  DirectiveController,
  DirectiveFactory,
  DirectiveFactoryFn,
  DirectiveLinkFn,
  DirectivePrePost,
  DirectiveRestrict,
  Expression,
  FactoryFunction,
  Injectable,
  InjectableClass,
  OnChanges,
  OnChangesObject,
  OnDestroy,
  OnInit,
  PostLink,
  ProviderDefinition,
  TranscludeFunctionObject,
} from "./interface.ts";

export type {
  CompileConfig,
  CompilePropertySecurityContext,
  CompileFn,
  LinkFn,
  TranscludeFn,
} from "./core/compile/compile.ts";
export { NgModule } from "./core/di/ng-module/ng-module.ts";
export type {
  AngularConfigMap,
  DynamicConfig,
  ModelFactory,
  ModelInitializer,
  ModuleConfigFn,
  NamedConstructorInjectable,
  NamedInjectable,
  NamedServiceInjectable,
  SseModuleConfig,
  StoreConstructor,
  StoreCreator,
  StoreFactory,
  RouterModule,
  WebSocketModuleConfig,
  WebTransportModuleConfig,
} from "./core/di/ng-module/ng-module.ts";
export type {
  InjectableFunction,
  ModuleLike,
  RunBlock,
} from "./core/di/injector.ts";
export type {
  Model,
  ModelChange,
  ModelRestoreOptions,
  ModelSyncFailureMode,
  ModelSyncOptions,
  ModelSyncTarget,
} from "./core/app-context/app-context.ts";
export { Scope } from "./core/scope/scope.ts";
export type { ListenerFn, ScopeEvent } from "./core/scope/scope.ts";
export type {
  ScopeListenerScheduler,
  ScopeTarget,
} from "./core/scope/scope.ts";
export type { ParseService } from "./core/parse/parse.ts";
export type {
  CompiledExpression,
  CompiledExpressionFunction,
  CompiledExpressionProps,
} from "./core/parse/parse.ts";
export type { ControllerService } from "./core/controller/controller.ts";
export type {
  FilterFactory,
  FilterFn,
  FilterService,
} from "./filters/filter.ts";
export type { EntryFilterItem } from "./filters/collection.ts";
export type { CurrencyFilterOptions } from "./filters/number.ts";
export type {
  InterpolateConfig,
  InterpolateService,
  InterpolationFunction,
} from "./core/interpolate/interpolate.ts";
export type {
  Policy,
  PolicyContext,
  PolicyDecision,
} from "./core/policy/policy.ts";

export type {
  AnimateService,
  AnimationContext,
  AnimationHandle,
  AnimationLifecycleCallback,
  AnimationPhase,
  AnimationPreset,
  AnimationPresetHandler,
  AnimationResult,
  AnimationOptions,
} from "./animations/animate.ts";

export type {
  AnchorScrollConfig,
  AnchorScrollService,
} from "./services/anchor-scroll/anchor-scroll.ts";
export { CookieService } from "./services/cookie/cookie.ts";
export type {
  CookieConfig,
  CookieOptions,
  CookieStoreOptions,
} from "./services/cookie/cookie.ts";
export type {
  ExceptionHandler,
  ExceptionHandlerConfig,
} from "./services/exception/exception.ts";
export { Http, HttpError } from "./services/http/http.ts";
export type {
  HttpConfig,
  HttpHeadersGetter,
  HttpCacheLike,
  HttpHeaderValue,
  HttpHeaderType,
  HttpInterceptorFactory,
  HttpInterceptor,
  HttpMethod,
  HttpParams,
  HttpParamSerializer,
  HttpDefaults,
  HttpRequestConfigHeaders,
  HttpRequestTransformer,
  HttpResponse,
  HttpResponseStatus,
  HttpResponseTransformer,
  HttpService,
  HttpRequestConfig,
  HttpRequestOptions,
} from "./services/http/http.ts";
export type {
  NavigationPolicyContext,
  NavigationPolicyRequirements,
  RequestPolicyContext,
  SecurityBasicCredentials,
  SecurityCredentialSource,
  SecurityPolicy,
  SecurityConfig,
  SecurityPolicyContext,
  SecurityCredentialsConfig,
  SecurityPolicyDecision,
  SecurityRequestCredentials,
} from "./services/security/security.ts";
export { Location } from "./services/location/location.ts";
export type {
  Html5Mode,
  LocationConfig,
  UrlChangeListener,
} from "./services/location/location.ts";
export type {
  LogBeaconConfig,
  LogBeaconSerializer,
  LogCall,
  LogConfig,
  LogEntry,
  LogLevel,
  LogService,
  LogServiceFactory,
} from "./services/log/log.ts";
export type {
  Machine,
  MachineContract,
  MachineConfig,
  MachineEventMap,
  MachineState,
  MachineNoEvents,
  MachineService,
  MachineSendResult,
  MachineSendStatus,
  MachineSnapshot,
  MachineStateDefinition,
  MachineStateMap,
} from "./services/machine/machine.ts";
export { EventBus } from "./services/event-bus/event-bus.ts";
export type {
  EventDeliveryPolicy,
  EventDeliveryPolicyContext,
  EventBusConfig,
  EventBusListener,
} from "./services/event-bus/event-bus.ts";
export {
  CachedRestBackend,
  HttpRestBackend,
  RestService,
} from "./services/rest/rest.ts";
export type {
  CachedRestBackendOptions,
  EntityClass,
  RestBackend,
  RestCachePolicy,
  RestCachePolicyContext,
  RestCacheStore,
  RestCacheStrategy,
  RestConfig,
  RestFactory,
  RestOptions,
  RestRequest,
  RestResponse,
  RestRevalidateEvent,
} from "./services/rest/rest.ts";
export { SCE_CONTEXTS } from "./services/sce/context.ts";
export type { SceContext } from "./services/sce/context.ts";
export type {
  SceConfig,
  SceDelegateConfig,
  SceDelegateService,
  SceResourceUrlMatcher,
  SceService,
} from "./services/sce/sce.ts";
export type {
  SseConfig,
  SseConnection,
  SseService,
} from "./services/sse/sse.ts";
export type {
  ConnectionConfig,
  ConnectionEvent,
} from "./services/connection/connection-manager.ts";
export type {
  JsonLineStreamReadOptions,
  LineStreamReadOptions,
  StreamReadOptions,
  StreamService,
  TextStreamReadOptions,
} from "./services/stream/readable-stream.ts";
export type {
  Workflow,
  WorkflowContract,
  WorkflowCommand,
  WorkflowCommandContract,
  WorkflowCommandContext,
  WorkflowCommandDefinition,
  WorkflowResult,
  WorkflowConfig,
  WorkflowConcurrencyMode,
  WorkflowDiagnostic,
  WorkflowHistoryEntry,
  WorkflowService,
  WorkflowSnapshot,
  WorkflowSupervisor,
  WorkflowSupervisorConfig,
  WorkflowSupervisorDiagnostic,
  WorkflowSupervisorPersistence,
  WorkflowSupervisorPersistenceConfig,
  WorkflowSupervisorSnapshot,
  WorkflowSupervisorStatus,
} from "./services/workflow/workflow.ts";
export type {
  ServiceWorkerConfig,
  ServiceWorkerErrorCode,
  ServiceWorkerMessageEvent,
  ServiceWorkerMessageTarget,
  ServiceWorkerPostOptions,
  ServiceWorkerRegistrationState,
  ServiceWorkerRequestOptions,
  ServiceWorkerService,
  ServiceWorkerUpdateState,
} from "./services/service-worker/service-worker.ts";
export { ServiceWorkerError } from "./services/service-worker/service-worker.ts";
export type {
  HtmlCanvasActiveConfig,
  HtmlCanvasConfig,
  HtmlCanvasDisabledConfig,
  HtmlCanvasMode,
  NormalizedHtmlCanvasConfig,
  HtmlCanvasRuntimeSupport,
  HtmlCanvasScheduler,
  HtmlCanvasService,
  HtmlCanvasRoot,
  HtmlCanvasRootOptions,
  HtmlCanvasSourceOptions,
  NativeHtmlCanvasService,
} from "./services/html-canvas/html-canvas.ts";
export type {
  TemplateCache,
  TemplateCacheConfig,
} from "./services/template-cache/template-cache.ts";
export type {
  TemplateRequestConfig,
  TemplateRequestService,
} from "./services/template-request/template-request.ts";
export type {
  PersistentStoreConfig,
  StorageBackend,
  StorageLike,
  StorageType,
} from "./services/storage/storage.ts";
export { ScopeElement } from "./services/web-component/web-component.ts";
export type {
  AppComponentOptions,
  ElementScopeOptions,
  ScopeElementConstructor,
  WebComponentContext,
  WebComponentConfig,
  WebComponentInput,
  WebComponentInputConfig,
  WebComponentInputs,
  WebComponentInputType,
  WebComponentService,
} from "./services/web-component/web-component.ts";
export type {
  AngularElementDefinition,
  AngularElementModuleOptions,
  AngularElementOptions,
} from "./runtime/web-component.ts";
export type {
  DirectiveRegistration,
  DirectiveRegistrations,
  FilterRegistration,
  FilterRegistrations,
  ProviderFactory,
  ProviderRegistration,
  ServiceFactory,
  ServiceRegistration,
  ServiceRegistrations,
} from "./runtime/custom-ng.ts";
export { createAngular } from "./runtime/index.ts";
export type { AngularComposition } from "./runtime/index.ts";
export { orchestrationModule } from "./runtime/orchestration.ts";
export { realtimeModule } from "./runtime/realtime.ts";
export { routerModule } from "./runtime/router.ts";
export { serviceWorkerModule } from "./runtime/service-worker.ts";
export { eventBusModule } from "./runtime/event-bus.ts";
export { htmlCanvasModule } from "./runtime/html-canvas.ts";
export { wasmModule } from "./runtime/wasm.ts";
export { webComponentModule } from "./runtime/web-component.ts";
export type {
  WebSocketConnection,
  WebSocketConfig,
  WebSocketService,
} from "./services/websocket/websocket.ts";
export type {
  WebTransportBufferInput,
  WebTransportConfig,
  WebTransportConnection,
  WebTransportDatagramEvent,
  WebTransportReconnectEvent,
  WebTransportRetryDelay,
  WebTransportService,
} from "./services/webtransport/webtransport.ts";
export type {
  WorkerConfig,
  WorkerErrorCode,
  WorkerHandle,
  WorkerModelMessage,
  WorkerRequest,
  WorkerRequestOptions,
  WorkerResponse,
  WorkerService,
  WorkerStatus,
} from "./services/worker/worker.ts";
export { WorkerError } from "./services/worker/worker.ts";
export { WasmAbi, WasmAbiError, WasmError } from "./services/wasm/wasm.ts";
export type {
  WasmAbiErrorCode,
  WasmAbiExports,
  WasmBinding,
  WasmBindingOptions,
  WasmCompileOptions,
  WasmErrorCode,
  WasmErrorStage,
  WasmLoadOptions,
  WasmResource,
  WasmResourceStatus,
  WasmScope,
  WasmScopeAbi,
  WasmScopeAbiImportObject,
  WasmScopeAbiImports,
  WasmScopeBindingOptions,
  WasmScopeOptions,
  WasmScopeReference,
  WasmScopeTransaction,
  WasmScopeTransactionUpdate,
  WasmScopeUpdate,
  WasmScopeWatchOptions,
  WasmScopeWriteOptions,
  WasmService,
  WasmSource,
  WasmTarget,
} from "./services/wasm/wasm.ts";
export type { AriaConfig, AriaService } from "./directive/aria/aria.ts";
export {
  SwapMode,
  getRealtimeProtocolContent,
  isRealtimeProtocolMessage,
} from "./directive/realtime/protocol.ts";
export type {
  RealtimeProtocolEventDetail,
  RealtimeProtocolMessage,
} from "./directive/realtime/protocol.ts";
export { NgModelController } from "./directive/model/model.ts";
export type {
  AsyncModelValidators,
  ModelValidators,
  NgModelOptions,
} from "./directive/model/model.ts";
export type {
  ControlName,
  FormControlTarget,
  PublicValidationState,
} from "./directive/form/form.ts";
export type {
  ModelOptions,
  ModelOptionsConfig,
  ModelOptionValue,
} from "./directive/model-options/model-options.ts";
export { ngWebTransportDirective } from "./directive/webtransport/webtransport.ts";

export { ArrayParamType, ParamType } from "./router/params/param-type.ts";
export type { ParamTypeConfig } from "./router/params/param-type.ts";
export type {
  ParamDeclaration,
  ParamTypeDefinition,
  RawParams,
} from "./router/params/interface.ts";
export type {
  ResolvableData,
  ResolvableLiteral,
  ResolveFn,
} from "./router/resolve/interface.ts";
export type {
  HrefOptions,
  LazyStateLoader,
  LazyStateLoadResult,
  RawViewConfig,
  RedirectToResult,
  RoutedComponent,
  RouterInjectable,
  RouterModuleDeclaration,
  StateCanExitPolicy,
  StateDirtyPolicy,
  StateDirtyPolicyDeclaration,
  StateErrorBoundaryPolicy,
  StateDeclaration,
  StateNavigationPolicyDeclaration,
  StatePolicyDeclaration,
  StateResolveArray,
  StateResolveObject,
  StateRetentionPolicyDeclaration,
  StateRetentionEvictionMode,
  StateRetentionEvictionPolicy,
  StateRetentionEvictionContext,
  StateRetentionKeyPolicy,
  StateRetentionMode,
  StateRetentionPauseMode,
  StateRetentionPolicyContext,
  StateRetryPolicy,
  StateTransitionFallbackTarget,
  StateTransitionErrorPolicyContext,
  StateTransitionLoadingPolicy,
  StateTransitionLoadingPolicyContext,
  StateTransitionPolicyDeclaration,
  StateTransitionPolicyContext,
  StateTransitionRetryPolicyContext,
  StateTransitionResult,
  StateOrName,
  TemplateFactory,
  TemplateUrlFactory,
  TransitionPromise,
  ParamsOf,
  ResolvesOf,
  RoutesOf,
  RouteContract,
  RouteMap,
  ViewDeclaration,
} from "./router/state/interface.ts";
export { TargetState } from "./router/state/target-state.ts";
export type {
  RouterConfig,
  RouterFocusConfig,
  RouterFocusOptions,
  RouterScrollConfig,
  RouterScrollOptions,
} from "./router/router.ts";
export type { StateService } from "./router/state/state-service.ts";
export type {
  DeregisterFn,
  HookRegistry,
  IStateMatch,
  HookMatchCriteria,
  HookMatchCriterion,
  HookRegOptions,
  HookResult,
  HookResultValue,
  TransitionHookFn,
  TransitionOptions,
  TransitionService,
  TransitionStateHookFn,
} from "./router/transition/interface.ts";
export { Transition } from "./router/transition/transition.ts";
export type { TransitionRouteContract } from "./router/transition/transition.ts";

/** Public `$angular` injectable contract. */
export type AngularService = import("./angular.ts").Angular;

/** Public view-local `$scope` injectable contract. */
export type ScopeService = import("./core/scope/scope.ts").Scope;

/** Public application-root `$rootScope` injectable contract. */
export type RootScopeService = import("./core/scope/scope.ts").Scope;

/** Public directive-host `$element` injectable contract. */
export type ElementService = Element;

/** Public bootstrapped `$rootElement` injectable contract. */
export type RootElementService = HTMLElement;

/** Public browser `$document` injectable contract. */
export type DocumentService = Document;

/** Public browser `$window` injectable contract. */
export type WindowService = Window;

/** Public `$compile` advanced compile/link service contract. */
export type CompileService = import("./core/compile/compile.ts").CompileFn;

/** Public `$eventBus` injectable contract. */
export type EventBusService =
  import("./services/event-bus/event-bus.ts").EventBus;

/** Ambient `ng.ExceptionHandlerService` compatibility alias. */
export type ExceptionHandlerService =
  import("./services/exception/exception.ts").ExceptionHandler;

/** Ambient `ng.HttpParamSerializerService` compatibility alias. */
export type HttpParamSerializerService =
  import("./services/http/http.ts").HttpParamSerializer;

/** Ambient `ng.InjectorService` advanced injector extension alias. */
export type InjectorService<TCustomServices extends object = object> =
  import("./core/di/internal-injector.ts").InjectorService<TCustomServices>;

export type { InjectionTokenMap } from "./interface.ts";

/** Ambient `ng.LocationService` compatibility alias for `$location`. */
export type LocationService =
  import("./services/location/location.ts").Location;

export type { StateRegistryService } from "./router/state/state-registry.ts";
export type { TemplateCacheService } from "./services/template-cache/template-cache.ts";

/** Ambient `ng.TransitionsService` compatibility alias for router hooks. */
export type TransitionsService =
  import("./router/transition/interface.ts").TransitionService;
