export { angular } from "./index.ts";
export { Angular } from "./angular.ts";

export type {
  AnnotatedDirectiveFactory,
  AnnotatedFactory,
  AngularBootstrapConfig,
  AngularServiceProvider,
  ChangesObject,
  Component,
  Controller,
  ControllerConstructor,
  Directive,
  DirectiveCompileFn,
  DirectiveController,
  DirectiveFactory,
  DirectiveFactoryFn,
  DirectiveLinkFn,
  DirectivePrePost,
  Expression,
  Injectable,
  InjectableClass,
  InvocationDetail,
  OnChanges,
  OnChangesObject,
  OnDestroy,
  OnInit,
  PostLink,
  Provider,
  RootElementService,
  ServiceProvider,
  TranscludeFunctionObject,
} from "./interface.ts";

export { Attributes } from "./core/compile/attributes.ts";
export type {
  BoundTranscludeFn,
  CompileFn,
  PublicLinkFn,
  TranscludeFn,
} from "./core/compile/compile.ts";
export { NgModule } from "./core/di/ng-module/ng-module.ts";
export type { InjectorService } from "./core/di/internal-injector.ts";
export { RootScopeProvider, Scope } from "./core/scope/scope.ts";
export type { ListenerFn, ScopeEvent } from "./core/scope/scope.ts";
export type { ParseService } from "./core/parse/parse.ts";
export type {
  CompiledExpression,
  CompiledExpressionFunction,
} from "./core/parse/parse.ts";
export { ControllerProvider } from "./core/controller/controller.ts";
export type { ControllerService } from "./core/controller/controller.ts";
export { FilterProvider } from "./core/filter/filter.ts";
export type {
  FilterFactory,
  FilterFn,
  FilterService,
} from "./filters/filter.ts";
export { InterpolateProvider } from "./core/interpolate/interpolate.ts";
export type {
  InterpolateService,
  InterpolationFunction,
} from "./core/interpolate/interpolate.ts";

export type { AnimationOptions } from "./animations/interface.ts";
export { AnimateRunner } from "./animations/runner/animate-runner.ts";
export { AnimateProvider } from "./animations/animate.ts";
export type { AnimateService } from "./animations/animate.ts";
export type { AnimateCssService } from "./animations/css/animate-css.ts";

export { AnchorScrollProvider } from "./services/anchor-scroll/anchor-scroll.ts";
export type { AnchorScrollService } from "./services/anchor-scroll/anchor-scroll.ts";
export { CookieProvider, CookieService } from "./services/cookie/cookie.ts";
export type {
  CookieOptions,
  CookieStoreOptions,
} from "./services/cookie/cookie.ts";
export { ExceptionHandlerProvider } from "./services/exception/exception.ts";
export type { ExceptionHandler } from "./services/exception/exception.ts";
export {
  Http,
  HttpParamSerializerProvider,
  HttpProvider,
} from "./services/http/http.ts";
export type {
  HttpHeadersGetter,
  HttpInterceptor,
  HttpMethod,
  HttpParamSerializer,
  HttpPromise,
  HttpProviderDefaults,
  HttpRequestConfigHeaders,
  HttpRequestTransformer,
  HttpResponse,
  HttpResponseStatus,
  HttpResponseTransformer,
  HttpService,
  RequestConfig,
  RequestShortcutConfig,
} from "./services/http/http.ts";
export { Location, LocationProvider } from "./services/location/location.ts";
export type {
  Html5Mode,
  UrlChangeListener,
} from "./services/location/location.ts";
export type { LogService } from "./services/log/log.ts";
export { LogProvider } from "./services/log/log.ts";
export { PubSub, PubSubProvider } from "./services/pubsub/pubsub.ts";
export { RestProvider, RestService } from "./services/rest/rest.ts";
export type {
  EntityClass,
  RestDefinition,
  RestFactory,
} from "./services/rest/rest.ts";
export { SceDelegateProvider, SceProvider } from "./services/sce/sce.ts";
export type { SceDelegateService, SceService } from "./services/sce/sce.ts";
export { SseProvider } from "./services/sse/sse.ts";
export type {
  SseConfig,
  SseConnection,
  SseService,
} from "./services/sse/sse.ts";
export { StreamConnection } from "./services/stream/stream.ts";
export type { StreamConnectionConfig } from "./services/stream/stream.ts";
export { TemplateCacheProvider } from "./services/template-cache/template-cache.ts";
export type { TemplateCache } from "./services/template-cache/template-cache.ts";
export type { TemplateRequestService } from "./services/template-request/template-request.ts";
export type {
  StorageBackend,
  StorageType,
} from "./services/storage/storage.ts";
export { WebSocketProvider } from "./services/websocket/websocket.ts";
export type {
  WebSocketConfig,
  WebSocketService,
} from "./services/websocket/websocket.ts";
export {
  WorkerProvider,
  createWorkerConnection,
} from "./services/worker/worker.ts";
export type {
  WorkerConfig,
  WorkerConnection,
  WorkerService,
} from "./services/worker/worker.ts";
export { WasmProvider } from "./services/wasm/wasm.ts";
export type {
  WasmInstantiationResult,
  WasmOptions,
  WasmService,
} from "./services/wasm/wasm.ts";
export type { AriaService } from "./directive/aria/aria.ts";
export { SwapMode } from "./directive/http/http.ts";
export { NgModelController } from "./directive/model/model.ts";

export type { ParamDeclaration, RawParams } from "./router/params/interface.ts";
export type {
  HrefOptions,
  LazyStateLoader,
  LazyStateLoadResult,
  RedirectToResult,
  StateDeclaration,
  StateOrName,
  StateResolveArray,
  StateResolveObject,
  TargetStateDef,
  TransitionPromise,
  ViewDeclaration,
} from "./router/state/interface.ts";
export { StateProvider } from "./router/state/state-service.ts";
export { StateRegistryProvider } from "./router/state/state-registry.ts";
export { TargetState } from "./router/state/target-state.ts";
export type {
  DeregisterFn,
  HookMatchCriteria,
  HookMatchCriterion,
  HookRegOptions,
  HookRegistry,
  HookResult,
  TransitionHookFn,
  TransitionOptions,
  TransitionService,
  TransitionStateHookFn,
} from "./router/transition/interface.ts";
export { RejectType, Rejection } from "./router/transition/reject-factory.ts";
export type {
  RejectTypeValue,
  TransitionRejectionDetail,
} from "./router/transition/reject-factory.ts";
export { TransitionProvider } from "./router/transition/transition-service.ts";
export { Transition } from "./router/transition/transition.ts";
