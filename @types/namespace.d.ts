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
import { ErrorHandler as TErrorHandler } from "./services/exception/interface.ts";
import { ParseService as TParseService } from "./core/parse/interface.ts";
import { TemplateRequestService as TTemplateRequestService } from "./services/template-request/interface.ts";
import { HttpParamSerializer as THttpParamSerializer } from "./services/http/interface.ts";
import { HttpParamSerializerProvider as THttpParamSerializerProvider } from "./services/http/http.js";
import {
  FilterFactory as TFilterFactory,
  FilterFn as TFilterFn,
} from "./filters/interface.ts";
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
  Component as TComponent,
  Controller as TController,
  Injectable as TInjectable,
} from "./interface.ts";
import {
  SseService as TSseService,
  SseConfig as TSseConfig,
} from "./services/sse/interface.ts";
import type { ErrorHandlingConfig as TErrorHandlingConfig } from "./shared/interface.ts";
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
import { StorageBackend as TStorageBackend } from "./services/storage/interface.ts";
import { StreamConnectionConfig as TStreamConnectionConfig } from "./services/stream/interface.ts";
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
    type Component = TComponent;
    type Controller = TController;
    type Scope = TScope;
    type NgModule = TNgModule;
    type PubSubProvider = TPubSubProvider;
    type FilterFn = TFilterFn;
    type CompositeLinkFn = TCompositeLinkFn;
    type PublicLinkFn = TPublicLinkFn;
    type NodeLinkFn = TNodeLinkFn;
    type NodeLinkFnCtx = TNodeLinkFnCtx;
    type TranscludeFn = TTranscludeFn;
    type BoundTranscludeFn = TBoundTranscludeFn;
    type LinkFnMapping = TLinkFnMapping;
    type AnchorScrollProvider = TAnchorScrollProvider;
    type InterpolateProvider = TInterpolateProvider;
    type HttpParamSerializerProvider = THttpParamSerializerProvider;
    type SceProvider = TSceProvider;
    type SceDelegateProvider = TSceDelegateProvider;
    type AnchorScrollService = TAnchorScrollService;
    type AnimateService = TAnimateService;
    type CompileService = TCompileFn;
    type ControllerService = TControllerService;
    type ExceptionHandlerService = TErrorHandler;
    type FilterService = TFilterFactory;
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
    type RootScopeService = TScope;
    type StateService = TStateProvider;
    type SseService = TSseService;
    type SseConfig = TSseConfig;
    type TemplateCacheService = Map<string, string>;
    type TemplateRequestService = TTemplateRequestService;
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
    type StreamConnectionConfig = TStreamConnectionConfig;
  }
}
