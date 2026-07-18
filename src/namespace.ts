export { afterRender, angular, queueAfterRender } from "./index.ts";
export type { Policy, PolicyContext, PolicyDecision } from "./index.ts";

import type { Angular as TAngular } from "./angular.ts";
import type {
  Scope as TScope,
  ListenerFn as TListenerFn,
  ScopeEvent as TScopeEvent,
} from "./core/scope/scope.ts";
import type {
  NgModule as TNgModule,
  RouterModule as TRouterModule,
} from "./core/di/ng-module/ng-module.ts";
import type { InjectorService as TInjectorService } from "./core/di/internal-injector.ts";
import type {
  Model as TModel,
  ModelChange as TModelChange,
  ModelRestoreOptions as TModelRestoreOptions,
  ModelSyncFailureMode as TModelSyncFailureMode,
  ModelSyncOptions as TModelSyncOptions,
  ModelSyncTarget as TModelSyncTarget,
} from "./core/app-context/app-context.ts";
import type {
  Policy as TPolicy,
  PolicyContext as TPolicyContext,
  PolicyDecision as TPolicyDecision,
} from "./core/policy/policy.ts";

import type { AnchorScrollService as TAnchorScrollService } from "./services/anchor-scroll/anchor-scroll.ts";
import type { ControllerService as TControllerService } from "./core/controller/controller.ts";
import type { ExceptionHandler as TExceptionHandler } from "./services/exception/exception.ts";
import type { ParseService as TParseService } from "./core/parse/parse.ts";
import type { TemplateRequestService as TTemplateRequestService } from "./services/template-request/template-request.ts";
import type { TemplateCacheService as TTemplateCacheService } from "./services/template-cache/template-cache.ts";
import type {
  SecurityConfig as TSecurityConfig,
  SecurityCredentialsConfig as TSecurityCredentialsConfig,
  SecurityPolicy as TSecurityPolicy,
} from "./services/security/security.ts";
import type { StateRegistryService as TStateRegistryService } from "./router/state/state-registry.ts";

import type {
  HttpMethod as THttpMethod,
  HttpParamSerializer as THttpParamSerializer,
  HttpDefaults as THttpDefaults,
  HttpResponse as THttpResponse,
  HttpResponseStatus as THttpResponseStatus,
  HttpService as THttpService,
  HttpRequestConfig as THttpRequestConfig,
  HttpRequestOptions as THttpRequestOptions,
} from "./services/http/http.ts";
import type {
  HtmlCanvasConfig as THtmlCanvasConfig,
  HtmlCanvasRuntimeSupport as THtmlCanvasRuntimeSupport,
  HtmlCanvasService as THtmlCanvasService,
} from "./services/html-canvas/html-canvas.ts";
import type {
  FilterFactory as TFilterFactory,
  FilterService as TFilterService,
  FilterFn as TFilterFn,
} from "./filters/filter.ts";
import type { EntryFilterItem as TEntryFilterItem } from "./filters/collection.ts";
import type { CurrencyFilterOptions as TCurrencyFilterOptions } from "./filters/number.ts";
import type {
  InterpolateService as TInterpolateService,
  InterpolationFunction as TInterpolationFunction,
  InterpolateConfig as TInterpolateConfig,
} from "./core/interpolate/interpolate.ts";
import type {
  Machine as TMachine,
  MachineContract as TMachineContract,
  MachineConfig as TMachineConfig,
  MachineService as TMachineService,
  MachineSendResult as TMachineSendResult,
  MachineSendStatus as TMachineSendStatus,
  MachineSnapshot as TMachineSnapshot,
} from "./services/machine/machine.ts";
import type {
  Workflow as TWorkflow,
  WorkflowContract as TWorkflowContract,
  WorkflowCommand as TWorkflowCommand,
  WorkflowCommandContract as TWorkflowCommandContract,
  WorkflowCommandContext as TWorkflowCommandContext,
  WorkflowCommandDefinition as TWorkflowCommandDefinition,
  WorkflowResult as TWorkflowResult,
  WorkflowService as TWorkflowService,
  WorkflowSnapshot as TWorkflowSnapshot,
  WorkflowSupervisor as TWorkflowSupervisor,
  WorkflowSupervisorConfig as TWorkflowSupervisorConfig,
  WorkflowSupervisorPersistenceConfig as TWorkflowSupervisorPersistenceConfig,
  WorkflowSupervisorPersistence as TWorkflowSupervisorPersistence,
  WorkflowSupervisorSnapshot as TWorkflowSupervisorSnapshot,
} from "./services/workflow/workflow.ts";
import type {
  SceDelegateService as TSceDelegateService,
  SceService as TSceService,
} from "./services/sce/sce.ts";
import type {
  LogBeaconConfig as TLogBeaconConfig,
  LogBeaconSerializer as TLogBeaconSerializer,
  LogEntry as TLogEntry,
  LogLevel as TLogLevel,
  LogService as TLogService,
} from "./services/log/log.ts";
import type {
  EventDeliveryPolicy as TEventDeliveryPolicy,
  EventDeliveryPolicyContext as TEventDeliveryPolicyContext,
  EventBus as TEventBus,
  EventBusConfig as TEventBusConfig,
} from "./services/event-bus/event-bus.ts";
import type {
  AnnotatedFactory as TAnnotatedFactory,
  ClassMap as TClassMap,
  ClassValue as TClassValue,
  Directive as TDirective,
  DirectiveFactory as TDirectiveFactory,
  DirectiveRestrict as TDirectiveRestrict,
  InjectionTokenMap as TInjectionTokenMap,
  AnnotatedDirectiveFactory as TAnnotatedDirectiveFactory,
  Component as TComponent,
  Controller as TController,
  ControllerConstructor as TControllerConstructor,
  Injectable as TInjectable,
  ProviderDefinition as TProviderDefinition,
  Expression as TExpression,
} from "./interface.ts";
import type {
  SseConnection as TSseConnection,
  SseService as TSseService,
  SseConfig as TSseConfig,
} from "./services/sse/sse.ts";
import type {
  ErrorHandlingConfig as TErrorHandlingConfig,
  Validator as TValidator,
} from "./shared/interface.ts";
import type {
  CompileFn as TCompileFn,
  LinkFn as TLinkFn,
  TranscludeFn as TTranscludeFn,
} from "./core/compile/compile.ts";
import type {
  RealtimeProtocolEventDetail as TRealtimeProtocolEventDetail,
  RealtimeProtocolMessage as TRealtimeProtocolMessage,
  SwapMode as TSwapMode,
} from "./directive/realtime/protocol.ts";
import type {
  WorkerConfig as TWorkerConfig,
  WorkerError as TWorkerError,
  WorkerErrorCode as TWorkerErrorCode,
  WorkerHandle as TWorkerHandle,
  WorkerModelMessage as TWorkerModelMessage,
  WorkerRequest as TWorkerRequest,
  WorkerRequestOptions as TWorkerRequestOptions,
  WorkerResponse as TWorkerResponse,
  WorkerService as TWorkerService,
  WorkerStatus as TWorkerStatus,
} from "./services/worker/worker.ts";
import type {
  WasmBinding as TWasmBinding,
  WasmBindingOptions as TWasmBindingOptions,
  WasmCompileOptions as TWasmCompileOptions,
  WasmError as TWasmError,
  WasmErrorCode as TWasmErrorCode,
  WasmErrorStage as TWasmErrorStage,
  WasmLoadOptions as TWasmLoadOptions,
  WasmResource as TWasmResource,
  WasmResourceStatus as TWasmResourceStatus,
  WasmService as TWasmService,
  WasmSource as TWasmSource,
  WasmTarget as TWasmTarget,
} from "./services/wasm/wasm.ts";
import type { Location as TLocationService } from "./services/location/location.ts";
import type {
  AnimationContext as TAnimationContext,
  AnimationHandle as TAnimationHandle,
  AnimationLifecycleCallback as TAnimationLifecycleCallback,
  AnimationPhase as TAnimationPhase,
  AnimationPreset as TAnimationPreset,
  AnimationPresetHandler as TAnimationPresetHandler,
  AnimationResult as TAnimationResult,
  AnimateService as TAnimateService,
  AnimationOptions as TAnimationOptions,
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
  ServiceWorkerConfig as TServiceWorkerConfig,
  ServiceWorkerErrorCode as TServiceWorkerErrorCode,
  ServiceWorkerMessageEvent as TServiceWorkerMessageEvent,
  ServiceWorkerMessageTarget as TServiceWorkerMessageTarget,
  ServiceWorkerPostOptions as TServiceWorkerPostOptions,
  ServiceWorkerRegistrationState as TServiceWorkerRegistrationState,
  ServiceWorkerRequestOptions as TServiceWorkerRequestOptions,
  ServiceWorkerService as TServiceWorkerService,
  ServiceWorkerUpdateState as TServiceWorkerUpdateState,
} from "./services/service-worker/service-worker.ts";
import type { StreamService as TStreamService } from "./services/stream/readable-stream.ts";
import type {
  CookieService as TCookieService,
  CookieStoreOptions as TCookieStoreOptions,
  CookieOptions as TCookieOptions,
} from "./services/cookie/cookie.ts";
import type {
  CachedRestBackendOptions as TCachedRestBackendOptions,
  EntityClass as TEntityClass,
  RestBackend as TRestBackend,
  RestCachePolicy as TRestCachePolicy,
  RestCachePolicyContext as TRestCachePolicyContext,
  RestCacheStore as TRestCacheStore,
  RestCacheStrategy as TRestCacheStrategy,
  RestFactory as TRestFactory,
  RestOptions as TRestOptions,
  RestRequest as TRestRequest,
  RestResponse as TRestResponse,
  RestRevalidateEvent as TRestRevalidateEvent,
  RestService as TRestService,
} from "./services/rest/rest.ts";
import type { NgModelController as TNgModelController } from "./directive/model/model.ts";
import type {
  ParamsOf as TParamsOf,
  ResolvesOf as TResolvesOf,
  RouterModuleDeclaration as TRouterModuleDeclaration,
  RoutesOf as TRoutesOf,
  StateDeclaration as TStateDeclaration,
  RouteContract as TRouteContract,
  RouteMap as TRouteMap,
  StatePolicyDeclaration as TStatePolicyDeclaration,
} from "./router/state/interface.ts";
import type { StateService as TStateService } from "./router/state/state-service.ts";
import type { RouterConfig as TRouterConfig } from "./router/router.ts";
import type {
  WebSocketConnection as TWebSocketConnection,
  WebSocketConfig as TWebSocketConfig,
  WebSocketService as TWebSocketService,
} from "./services/websocket/websocket.ts";
import type {
  AppComponentOptions as TAppComponentOptions,
  ElementScopeOptions as TElementScopeOptions,
  ScopeElement as TScopeElement,
  ScopeElementConstructor as TScopeElementConstructor,
  WebComponentContext as TWebComponentContext,
  WebComponentConfig as TWebComponentConfig,
  WebComponentInput as TWebComponentInput,
  WebComponentInputConfig as TWebComponentInputConfig,
  WebComponentInputs as TWebComponentInputs,
  WebComponentService as TWebComponentService,
} from "./services/web-component/web-component.ts";
import type {
  AngularElementDefinition as TAngularElementDefinition,
  AngularElementModuleOptions as TAngularElementModuleOptions,
  AngularElementOptions as TAngularElementOptions,
} from "./runtime/web-component.ts";
import type {
  WebTransportBufferInput as TWebTransportBufferInput,
  WebTransportConfig as TWebTransportConfig,
  WebTransportConnection as TWebTransportConnection,
  WebTransportDatagramEvent as TWebTransportDatagramEvent,
  WebTransportReconnectEvent as TWebTransportReconnectEvent,
  WebTransportRetryDelay as TWebTransportRetryDelay,
  WebTransportService as TWebTransportService,
} from "./services/webtransport/webtransport.ts";
import type {
  Transition as TTransition,
  TransitionRouteContract as TTransitionRouteContract,
} from "./router/transition/transition.ts";
import type { TransitionService as TTransitionService } from "./router/transition/interface.ts";
import type {
  AriaConfig as TAriaConfig,
  AriaService as TAriaService,
} from "./directive/aria/aria.ts";
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

    export type ClassMap = TClassMap;

    export type ClassValue = TClassValue;

    export type Directive<TController = unknown> = TDirective<TController>;

    export type DirectiveRestrict = TDirectiveRestrict;

    export type DirectiveFactory = TDirectiveFactory;

    export type NgModule = TNgModule;

    export type RouterModule<TRouteMap extends RouteMap = RouteMap> =
      TRouterModule<TRouteMap>;

    export type LinkFn = TLinkFn;

    export type Scope = TScope;

    export type TranscludeFn = TTranscludeFn;

    // Declarative config surfaces replace provider-era namespace aliases.

    export type AriaConfig = TAriaConfig;

    export type InterpolateConfig = TInterpolateConfig;

    // Services
    export type AngularService = TAngular;

    export type ScopeService = TScope;

    export type RootScopeService = TScope;

    export type ElementService = Element;

    export type RootElementService = HTMLElement;

    export type DocumentService = Document;

    export type WindowService = Window;

    export type AnchorScrollService = TAnchorScrollService;

    export type AnimateService = TAnimateService;

    export type AnimationHandle = TAnimationHandle;

    export type AnimationContext = TAnimationContext;

    export type AnimationLifecycleCallback = TAnimationLifecycleCallback;

    export type AriaService = TAriaService;

    export type CompileService = TCompileFn;

    export type ControllerService = TControllerService;

    export type CookieService = TCookieService;

    export type EventBusService = TEventBus;

    export type ExceptionHandlerService = TExceptionHandler;

    export type HtmlCanvasConfig = THtmlCanvasConfig;

    export type HtmlCanvasRuntimeSupport = THtmlCanvasRuntimeSupport;

    export type HtmlCanvasService = THtmlCanvasService;

    export type FilterFn = TFilterFn;

    export type FilterFactory = TFilterFactory;

    export type FilterService = TFilterService;

    export type EntryFilterItem = TEntryFilterItem;

    export type CurrencyFilterOptions = TCurrencyFilterOptions;

    export type HttpParamSerializerService = THttpParamSerializer;

    export type HttpService = THttpService;

    export type InjectorService<TCustomServices extends object = object> =
      TInjectorService<TCustomServices>;

    export type InjectionTokenMap = TInjectionTokenMap;
    export type Model<
      T extends Record<string, unknown> = Record<string, unknown>,
    > = TModel<T>;
    export type ModelChange = TModelChange;
    export type ModelRestoreOptions = TModelRestoreOptions;
    export type ModelSyncFailureMode = TModelSyncFailureMode;
    export type ModelSyncOptions = TModelSyncOptions;
    export type ModelSyncTarget<
      T extends Record<string, unknown> = Record<string, unknown>,
    > = TModelSyncTarget<T>;

    export type InterpolateService = TInterpolateService;

    export type LocationService = TLocationService;

    export type LogBeaconConfig = TLogBeaconConfig;
    export type LogBeaconSerializer = TLogBeaconSerializer;
    export type LogEntry = TLogEntry;
    export type LogLevel = TLogLevel;
    export type LogService = TLogService;

    export type MachineService = TMachineService;

    export type WorkflowService = TWorkflowService;

    export type ParseService = TParseService;

    export type Policy<
      TContext extends TPolicyContext = TPolicyContext,
      TDecisionType extends string = string,
    > = TPolicy<TContext, TDecisionType>;

    export type PolicyContext<TOperation extends string = string> =
      TPolicyContext<TOperation>;

    export type PolicyDecision<TType extends string = string> =
      TPolicyDecision<TType>;

    export type EventBusConfig = TEventBusConfig;

    export type EventDeliveryPolicy = TEventDeliveryPolicy;

    export type EventDeliveryPolicyContext = TEventDeliveryPolicyContext;

    export type SceService = TSceService;

    export type SceDelegateService = TSceDelegateService;

    export type SseService = TSseService;

    export type SseConfig = TSseConfig;

    export type SseConnection = TSseConnection;

    export type SecurityPolicy = TSecurityPolicy;
    export type SecurityConfig = TSecurityConfig;
    export type SecurityCredentialsConfig = TSecurityCredentialsConfig;

    export type StateRegistryService = TStateRegistryService;

    export type ServiceWorkerService = TServiceWorkerService;

    export type RealtimeProtocolEventDetail<
      T = unknown,
      TSource = unknown,
    > = TRealtimeProtocolEventDetail<T, TSource>;

    export type RealtimeProtocolMessage = TRealtimeProtocolMessage;

    export type SwapMode = TSwapMode;

    export type TemplateCacheService = TTemplateCacheService;

    export type TemplateRequestService = TTemplateRequestService;

    export type TransitionsService = TTransitionService;

    export type WorkerService = TWorkerService;

    // Support types
    export type AnnotatedFactory<T extends (...args: never[]) => unknown> =
      TAnnotatedFactory<T>;

    export type AnimationOptions = TAnimationOptions;

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

    export type EntityClass<T> = TEntityClass<T>;

    export type ErrorHandlingConfig = TErrorHandlingConfig;

    export type Expression = TExpression;

    export type HttpMethod = THttpMethod;

    export type HttpDefaults = THttpDefaults;

    export type HttpResponse<T> = THttpResponse<T>;

    export type HttpResponseStatus = THttpResponseStatus;

    export type Injectable<
      T extends
        | ((...args: never[]) => unknown)
        | (abstract new (...args: never[]) => unknown),
    > = TInjectable<T>;

    export type ProviderDefinition = TProviderDefinition;

    export type InterpolationFunction = TInterpolationFunction;

    export type ListenerFn = TListenerFn;

    export type Machine<
      TContract extends TMachineContract = {
        data: object;
        events: Record<string, unknown>;
        state: string;
      },
    > = TMachine<TContract>;

    export type MachineContract = TMachineContract;

    export type MachineConfig<
      TContract extends TMachineContract = {
        data: object;
        events: Record<string, unknown>;
        state: string;
      },
    > = TMachineConfig<TContract>;

    export type MachineSnapshot<
      TContract extends TMachineContract = {
        data: object;
        events: Record<string, unknown>;
        state: string;
      },
    > = TMachineSnapshot<TContract>;

    export type MachineSendResult<TMode extends string = string> =
      TMachineSendResult<TMode>;

    export type MachineSendStatus = TMachineSendStatus;

    export type Workflow<
      TContract extends TWorkflowContract = {
        data: object;
        commands: Record<never, never>;
        state: string;
      },
    > = TWorkflow<TContract>;

    export type WorkflowContract = TWorkflowContract;

    export type WorkflowCommand<
      TContract extends TWorkflowContract = {
        data: object;
        commands: Record<never, never>;
        state: string;
      },
      TCommand extends TWorkflowCommandContract = {
        input: unknown;
        output: unknown;
      },
    > = TWorkflowCommand<TContract, TCommand>;

    export type WorkflowCommandContract = TWorkflowCommandContract;

    export type WorkflowCommandContext<
      TContract extends TWorkflowContract = {
        data: object;
        commands: Record<never, never>;
        state: string;
      },
      TInput = unknown,
    > = TWorkflowCommandContext<TContract, TInput>;

    export type WorkflowCommandDefinition<
      TContract extends TWorkflowContract = {
        data: object;
        commands: Record<never, never>;
        state: string;
      },
      TCommand extends TWorkflowCommandContract = {
        input: unknown;
        output: unknown;
      },
    > = TWorkflowCommandDefinition<TContract, TCommand>;

    export type WorkflowResult<TOutput = unknown> = TWorkflowResult<TOutput>;

    export type WorkflowSnapshot<
      TContract extends TWorkflowContract = {
        data: object;
        commands: Record<never, never>;
        state: string;
      },
    > = TWorkflowSnapshot<TContract>;

    export type WorkflowSupervisor<
      TWorkflows extends Record<string, unknown> = Record<string, unknown>,
    > = TWorkflowSupervisor<TWorkflows>;

    export type WorkflowSupervisorConfig<
      TWorkflows extends Record<string, unknown> = Record<string, unknown>,
    > = TWorkflowSupervisorConfig<TWorkflows>;

    export type WorkflowSupervisorPersistenceConfig =
      TWorkflowSupervisorPersistenceConfig;

    export type WorkflowSupervisorPersistence<
      TSnapshot extends TWorkflowSupervisorSnapshot =
        TWorkflowSupervisorSnapshot,
    > = TWorkflowSupervisorPersistence<TSnapshot>;

    export type WorkflowSupervisorSnapshot<
      TWorkflowSnapshots extends Record<string, TWorkflowSnapshot> = Record<
        string,
        TWorkflowSnapshot
      >,
    > = TWorkflowSupervisorSnapshot<TWorkflowSnapshots>;

    export type NgModelController = TNgModelController;

    export type HttpRequestConfig = THttpRequestConfig;

    export type HttpRequestOptions = THttpRequestOptions;

    export type RestFactory = TRestFactory;

    export type RestBackend = TRestBackend;

    export type RestCachePolicy = TRestCachePolicy;

    export type RestCachePolicyContext = TRestCachePolicyContext;

    export type RestCacheStore = TRestCacheStore;

    export type RestCacheStrategy = TRestCacheStrategy;

    export type RestOptions = TRestOptions;

    export type RestRequest = TRestRequest;

    export type RestResponse<T> = TRestResponse<T>;

    export type RestRevalidateEvent<T> = TRestRevalidateEvent<T>;

    export type CachedRestBackendOptions = TCachedRestBackendOptions;

    export type RestService<T, ID> = TRestService<T, ID>;

    export type ScopeEvent = TScopeEvent;

    export type RouterModuleDeclaration = TRouterModuleDeclaration;

    export type RouterConfig = TRouterConfig;

    export type RouteContract = TRouteContract;

    export type RouteMap = TRouteMap;

    export type RoutesOf<
      TTree extends { name: string; children?: readonly unknown[] },
      TParamTypes extends Record<string, unknown> = Record<never, never>,
    > = TRoutesOf<TTree, TParamTypes>;

    export type ParamsOf<
      TRouteMap extends RouteMap,
      TRouteName extends Extract<keyof TRouteMap, string>,
    > = TParamsOf<TRouteMap, TRouteName>;

    export type ResolvesOf<
      TRouteMap extends RouteMap,
      TRouteName extends Extract<keyof TRouteMap, string>,
    > = TResolvesOf<TRouteMap, TRouteName>;

    export type StateService<
      TRouteMap extends RouteMap = Record<string, never>,
    > = TStateService<TRouteMap>;

    export type StateDeclaration = TStateDeclaration;

    export type StatePolicyDeclaration = TStatePolicyDeclaration;

    export type StorageBackend = TStorageBackend;

    export type StorageType = TStorageType;

    export type ConnectionConfig = TConnectionConfig;

    export type ConnectionEvent = TConnectionEvent;

    export type ServiceWorkerConfig = TServiceWorkerConfig;

    export type ServiceWorkerErrorCode = TServiceWorkerErrorCode;

    export type ServiceWorkerMessageEvent<TData = unknown> =
      TServiceWorkerMessageEvent<TData>;

    export type ServiceWorkerMessageTarget = TServiceWorkerMessageTarget;
    export type ServiceWorkerPostOptions = TServiceWorkerPostOptions;

    export type ServiceWorkerRegistrationState =
      TServiceWorkerRegistrationState;

    export type ServiceWorkerRequestOptions = TServiceWorkerRequestOptions;

    export type ServiceWorkerUpdateState = TServiceWorkerUpdateState;

    export type StreamService = TStreamService;

    export type Transition<
      TRouteMap extends RouteMap = RouteMap,
      TRoutes extends TTransitionRouteContract<TRouteMap> = {
        from: Extract<keyof TRouteMap, string>;
        to: Extract<keyof TRouteMap, string>;
      },
    > = TTransition<TRouteMap, TRoutes>;

    export type TransitionRouteContract<TRouteMap extends RouteMap = RouteMap> =
      TTransitionRouteContract<TRouteMap>;

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

    export type WebComponentConfig = TWebComponentConfig;

    export type WebComponentInput = TWebComponentInput;

    export type WebComponentInputConfig = TWebComponentInputConfig;

    export type WebComponentInputs = TWebComponentInputs;

    export type WebComponentService = TWebComponentService;

    export type WebSocketConfig = TWebSocketConfig;

    export type WebSocketConnection = TWebSocketConnection;

    export type WebSocketService = TWebSocketService;

    export type WebTransportBufferInput = TWebTransportBufferInput;

    export type WebTransportConfig = TWebTransportConfig;

    export type WebTransportConnection = TWebTransportConnection;

    export type WebTransportDatagramEvent<T> = TWebTransportDatagramEvent<T>;

    export type WebTransportReconnectEvent = TWebTransportReconnectEvent;

    export type WebTransportRetryDelay = TWebTransportRetryDelay;

    export type WebTransportService = TWebTransportService;

    export type WorkerConfig<TReceive = unknown> = TWorkerConfig<TReceive>;

    export type WorkerError = TWorkerError;

    export type WorkerErrorCode = TWorkerErrorCode;

    export type WorkerHandle<
      TSend = unknown,
      TReceive = unknown,
    > = TWorkerHandle<TSend, TReceive>;

    export type WorkerModelMessage<
      T extends Record<string, unknown> = Record<string, unknown>,
    > = TWorkerModelMessage<T>;

    export type WorkerRequest<TPayload = unknown> = TWorkerRequest<TPayload>;

    export type WorkerRequestOptions = TWorkerRequestOptions;

    export type WorkerResponse<TResult = unknown> = TWorkerResponse<TResult>;

    export type WorkerStatus = TWorkerStatus;

    export type WasmBinding<TTarget extends TWasmTarget = TWasmTarget> =
      TWasmBinding<TTarget>;

    export type WasmBindingOptions = TWasmBindingOptions;

    export type WasmCompileOptions = TWasmCompileOptions;

    export type WasmError = TWasmError;

    export type WasmErrorCode = TWasmErrorCode;

    export type WasmErrorStage = TWasmErrorStage;

    export type WasmLoadOptions = TWasmLoadOptions;

    export type WasmResource<
      TExports extends WebAssembly.Exports = WebAssembly.Exports,
    > = TWasmResource<TExports>;

    export type WasmResourceStatus = TWasmResourceStatus;

    export type WasmService = TWasmService;

    export type WasmSource = TWasmSource;

    export type WasmTarget = TWasmTarget;
  }
}
