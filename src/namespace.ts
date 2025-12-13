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

import { AnchorScrollProvider as TAnchorScrollProvider } from "./services/anchor-scroll/anchor-scroll.js";

import {
  AnchorScrollFunction as TAnchorScrollFunction,
  AnchorScrollService as TAnchorScrollService,
  AnchorScrollObject as TAnchorScrollObject,
} from "./services/anchor-scroll/interface.ts";

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
import {
  BuiltStateDeclaration as TBuiltStateDeclaration,
  StateDeclaration as TStateDeclaration,
} from "./router/state/interface.ts";
import { StateObject as TStateObject } from "./router/state/state-object.js";
import { StateRegistryProvider as TStateRegistryProvider } from "./router/state/state-registry.js";
import { ViewScroll } from "./router/scroll/interface.ts";
import { HookRegistry } from "./router/transition/interface.ts";

declare global {
  interface Function {
    $inject?: readonly string[] | undefined;
  }

  interface Window {
    angular: TAngular;
  }

  export namespace ng {
    // Core types (docs preserved)
    export type Angular = TAngular;
    export type Attributes = TAttributes & Record<string, any>;
    export type Directive<TController = any> = TDirective<TController>;
    export type DirectiveFactory = TDirectiveFactory;
    export type AnnotatedDirectiveFactory = TAnnotatedDirectiveFactory;
    export type Component = TComponent & Record<string, any>;
    export type Controller = TController;
    export type Scope = TScope & Record<string, any>;
    export type NgModule = TNgModule;
    export type PubSubProvider = TPubSubProvider;

    export type CompositeLinkFn = TCompositeLinkFn;
    export type PublicLinkFn = TPublicLinkFn;
    export type NodeLinkFn = TNodeLinkFn;
    export type NodeLinkFnCtx = TNodeLinkFnCtx;
    export type TranscludeFn = TTranscludeFn;
    export type BoundTranscludeFn = TBoundTranscludeFn;
    export type LinkFnMapping = TLinkFnMapping;

    // Providers
    export type AnchorScrollProvider = TAnchorScrollProvider;
    export type AnimateProvider = TAnimateProvider;
    export type FilterProvider = TFilterProvider;
    export type InterpolateProvider = TInterpolateProvider;
    export type HttpParamSerializerProvider = THttpParamSerializerProvider;
    export type LocationProvider = TLocationProvider;
    export type SceProvider = TSceProvider;
    export type SceDelegateProvider = TSceDelegateProvider;
    export type TransitionProvider = TTransitionProvider;

    // Services
    export type AnchorScrollService = TAnchorScrollService;
    export type AnimateService = TAnimateService;
    export type CompileService = TCompileFn;
    export type ControllerService = TControllerService;
    export type CookieService = TCookieService;
    export type ExceptionHandlerService = TExceptionHandler;
    export type FilterFn = TFilterFn;
    export type FilterFactory = TFilterFactory;
    export type FilterService = TFilterService;
    export type HttpParamSerializerSerService = THttpParamSerializer;
    export type HttpService = THttpService;
    export type InterpolateService = TInterpolateService;
    export type InjectorService = TInjectorService;
    export type LocationService = TLocationService;
    export type LogService = TLogService;
    export type ParseService = TParseService;
    export type ProvideService = TProvideService;
    export type PubSubService = TPubSub;
    export type RootElementService = Element;
    export type RootScopeService = TScope & Record<string, any>;
    export type RouterService = RouterProvider;
    export type StateService = TStateProvider;
    export type StateRegistryService = TStateRegistryProvider;
    export type SseService = TSseService;
    export type SseConfig = TSseConfig;
    export type TransitionService = TransitionProvider & HookRegistry;
    export type TemplateCacheService = Map<string, string>;
    export type TemplateRequestService = TTemplateRequestService;
    export type UrlService = TUrlService;
    export type ViewService = TViewService;
    export type ViewScrollService = ViewScroll;

    // Support types
    export type ErrorHandlingConfig = TErrorHandlingConfig;
    export type ListenerFn = TListenerFn;
    export type Listener = TListener;
    export type DocumentService = Document;
    export type WindowService = Window;
    export type WorkerConfig = TWorkerConfig;
    export type WorkerConnection = TWorkerConnection;
    export type Injectable<
      T extends
        | ((...args: any[]) => any)
        | (abstract new (...args: any[]) => any),
    > = TInjectable<T>;
    export type StorageBackend = TStorageBackend;
    export type StorageType = TStorageType;
    export type StreamConnectionConfig = TStreamConnectionConfig;
    export type CookieOptions = TCookieOptions;
    export type ControllerConstructor = TControllerConstructor;
    export type CookieStoreOptions = TCookieStoreOptions;
    export type RestService<T, ID> = TRestService<T, ID>;
    export type RestDefinition<T> = TRestDefinition<T>;
    export type EntityClass<T> = TEntityClass<T>;
    export type ServiceProvider = TServiceProvider;
    export type Expression = TExpression;
    export type NgModelController = TNgModelController;
    export type Validator = TValidator;
    export type StateDeclaration = TStateDeclaration;
    export type BuiltStateDeclaration = TBuiltStateDeclaration;
    export type StateObject = TStateObject;
    export type AnchorScrollFunction = TAnchorScrollFunction;
    export type AnchorScrollObject = TAnchorScrollObject;
  }
}
