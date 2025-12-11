export { angular } from "./index.js";
import { Angular as TAngular } from "./angular.js";
import { Attributes as TAttributes } from "./core/compile/attributes.js";
import { Scope as TScope } from "./core/scope/scope.js";
import {
  ListenerFn as TListenerFn,
  Listener as TListener,
} from "./core/scope/interface.ts";
import { NgModule as TNgModule } from "./core/di/ng-module/ng-module.js";
import { InjectorService as TInjectorService } from "./core/di/internal-injector.js";
import {
  AnchorScrollProvider as TAnchorScrollProvider,
  AnchorScrollService as TAnchorScrollService,
} from "./services/anchor-scroll/anchor-scroll.js";
import { ControllerService as TControllerService } from "./core/controller/interface.ts";
import { ExceptionHandler as TExceptionHandler } from "./services/exception/interface.ts";
import { ParseService as TParseService } from "./core/parse/interface.ts";
import { TemplateRequestService as TTemplateRequestService } from "./services/template-request/interface.ts";
import { HttpParamSerializer as THttpParamSerializer } from "./services/http/interface.ts";
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
  Directive as TDirective,
  DirectiveFactory as TDirectiveFactory,
  AnnotatedDirectiveFactory as TAnnotatedDirectiveFactory,
  Component as TComponent,
  Controller as TController,
  ControllerConstructor as TControllerConstructor,
  Injectable as TInjectable,
  Expression as TExpression,
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
} from "./core/compile/inteface.ts";
import {
  WorkerConnection as TWorkerConnection,
  WorkerConfig as TWorkerConfig,
} from "./directive/worker/interface.ts";
import { Provider as TProvideService } from "./interface.ts";
import { Location as TLocationService } from "./services/location/location.js";
import { AnimateService as TAnimateService } from "./animations/interface.ts";
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
import { RouterProvider } from "./router/router.ts";
import { TransitionProvider as TTransitionProvider } from "./router/transition/transition-service.js";
import { AnimateProvider as TAnimateProvider } from "./animations/animate.js";
import { UrlService as TUrlService } from "./router/url/url-service.js";
import { LocationProvider as TLocationProvider } from "./services/location/location.js";
import { ViewService as TViewService } from "./router/view/view.js";
import { StateDeclaration as TStateDeclaration } from "./router/state/interface.ts";
import { StateObject as TStateObject } from "./router/state/state-object.js";
declare global {
  interface Function {
    $inject?: readonly string[] | undefined;
  }
  interface Window {
    angular: TAngular;
  }
  export namespace ng {
    type Angular = TAngular;
    type Attributes = TAttributes & Record<string, any>;
    type Directive<TController = any> = TDirective<TController>;
    type DirectiveFactory = TDirectiveFactory;
    type AnnotatedDirectiveFactory = TAnnotatedDirectiveFactory;
    type Component = TComponent & Record<string, any>;
    type Controller = TController;
    type Scope = TScope & Record<string, any>;
    type NgModule = TNgModule;
    type PubSubProvider = TPubSubProvider;
    type CompositeLinkFn = TCompositeLinkFn;
    type PublicLinkFn = TPublicLinkFn;
    type NodeLinkFn = TNodeLinkFn;
    type NodeLinkFnCtx = TNodeLinkFnCtx;
    type TranscludeFn = TTranscludeFn;
    type BoundTranscludeFn = TBoundTranscludeFn;
    type LinkFnMapping = TLinkFnMapping;
    type AnchorScrollProvider = TAnchorScrollProvider;
    type AnimateProvider = TAnimateProvider;
    type FilterProvider = TFilterProvider;
    type InterpolateProvider = TInterpolateProvider;
    type HttpParamSerializerProvider = THttpParamSerializerProvider;
    type LocationProvider = TLocationProvider;
    type SceProvider = TSceProvider;
    type SceDelegateProvider = TSceDelegateProvider;
    type TransitionProvider = TTransitionProvider;
    type AnchorScrollService = TAnchorScrollService;
    type AnimateService = TAnimateService;
    type CompileService = TCompileFn;
    type ControllerService = TControllerService;
    type CookieService = TCookieService;
    type ExceptionHandlerService = TExceptionHandler;
    type FilterFn = TFilterFn;
    type FilterFactory = TFilterFactory;
    type FilterService = TFilterService;
    type HttpParamSerializerSerService = THttpParamSerializer;
    type HttpService = THttpService;
    type InterpolateService = TInterpolateService;
    type InjectorService = TInjectorService;
    type LocationService = TLocationService;
    type LogService = TLogService;
    type ParseService = TParseService;
    type ProvideService = TProvideService;
    type PubSubService = TPubSub;
    type RootElementService = Element;
    type RootScopeService = TScope & Record<string, any>;
    type RouterService = RouterProvider;
    type StateService = TStateProvider;
    type SseService = TSseService;
    type SseConfig = TSseConfig;
    type TemplateCacheService = Map<string, string>;
    type TemplateRequestService = TTemplateRequestService;
    type UrlService = TUrlService;
    type ViewService = TViewService;
    type ErrorHandlingConfig = TErrorHandlingConfig;
    type ListenerFn = TListenerFn;
    type Listener = TListener;
    type DocumentService = Document;
    type WindowService = Window;
    type WorkerConfig = TWorkerConfig;
    type WorkerConnection = TWorkerConnection;
    type Injectable<
      T extends
        | ((...args: any[]) => any)
        | (abstract new (...args: any[]) => any),
    > = TInjectable<T>;
    type StorageBackend = TStorageBackend;
    type StorageType = TStorageType;
    type StreamConnectionConfig = TStreamConnectionConfig;
    type CookieOptions = TCookieOptions;
    type ControllerConstructor = TControllerConstructor;
    type CookieStoreOptions = TCookieStoreOptions;
    type RestService<T, ID> = TRestService<T, ID>;
    type RestDefinition<T> = TRestDefinition<T>;
    type EntityClass<T> = TEntityClass<T>;
    type ServiceProvider = TServiceProvider;
    type Expression = TExpression;
    type NgModelController = TNgModelController;
    type Validator = TValidator;
    type StateDeclaration = TStateDeclaration;
    type StateObject = TStateObject;
  }
}
