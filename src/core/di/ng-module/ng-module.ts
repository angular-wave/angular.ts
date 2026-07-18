import {
  isFunction,
  isDefined,
  isArray,
  isString,
  isObject,
} from "../../../shared/utils.ts";
import { AnimationRegistry } from "../../../animations/animate.ts";
import { ControllerRegistry } from "../../controller/controller.ts";
import {
  _anchorScroll,
  _animate,
  _aria,
  _compile,
  _controller,
  _cookie,
  _element,
  _eventBus,
  _exceptionHandler,
  _htmlCanvas,
  _http,
  _injector,
  _interpolate,
  _location,
  _log,
  _machine,
  _rest,
  _rootElement,
  _rootScope,
  _sce,
  _sceDelegate,
  _serviceWorker,
  _state,
  _stateRegistry,
  _sse,
  _security,
  _scope,
  _templateCache,
  _templateRequest,
  _transitions,
  _wasm,
  _webComponent,
  _webTransport,
  _websocket,
  _worker,
  _workflow,
} from "../../../injection-tokens.ts";
import { isInjectable } from "../injectable.ts";
import { FilterRegistry } from "../../filter/filter.ts";
import { validate, validateRequired } from "../../../shared/validate.ts";
import type {
  Constructor,
  Injectable,
  ProviderDefinition,
} from "../../../interface.ts";
import type {
  PersistentStoreConfig,
  StorageLike,
} from "../../../services/storage/storage.ts";
import type {
  EntityClass,
  RestFactory,
  RestOptions,
  RestConfig,
} from "../../../services/rest/rest.ts";
import type { SseConfig, SseService } from "../../../services/sse/sse.ts";
import {
  createConfiguredServiceWorkerService,
  type ServiceWorkerConfig,
  type ServiceWorkerService,
} from "../../../services/service-worker/service-worker.ts";
import type {
  WebTransportConfig,
  WebTransportService,
} from "../../../services/webtransport/webtransport.ts";
import type {
  WebSocketConfig,
  WebSocketService,
} from "../../../services/websocket/websocket.ts";
import type {
  WasmLoadOptions,
  WasmResource,
  WasmService,
} from "../../../services/wasm/wasm.ts";
import type {
  LazyStateLoader,
  ParamsOf,
  ResolvesOf,
  RouterModuleDeclaration,
  RoutesOf,
  StateDeclaration,
  RouteMap,
} from "../../../router/state/interface.ts";
import type { RouterConfig } from "../../../router/router.ts";
import { type RouterRuntimeCommand } from "../../../router/composition/router-runtime.ts";
import { setStateDeclarationSource } from "../../../router/state/state-object.ts";
import type {
  WorkerConfig,
  WorkerService,
} from "../../../services/worker/worker.ts";
import type {
  AppComponentOptions,
  ScopeElementConstructor,
  WebComponentConfig,
  WebComponentService,
} from "../../../services/web-component/web-component.ts";
import type {
  MachineConfig,
  MachineEventMap,
  MachineMode,
  MachineNoEvents,
  MachineService,
  MachineStateDefinition,
  MachineStateMap,
} from "../../../services/machine/machine.ts";
import {
  createWorkflowSupervisor,
  type WorkflowSupervisorConfig,
  WorkflowConfig,
  WorkflowNoCommands,
  WorkflowService,
} from "../../../services/workflow/workflow.ts";
import type { CookieConfig } from "../../../services/cookie/cookie.ts";
import {
  CompileLifecycle,
  CompileRegistry,
  type CompileConfig,
} from "../../../core/compile/compile.ts";
import { RuntimeConfigRegistry } from "../../composition/runtime-composition.ts";
import type { LogConfig } from "../../../services/log/log.ts";
import type { LocationConfig } from "../../../services/location/location.ts";
import type { ExceptionHandlerConfig } from "../../../services/exception/exception.ts";
import type { EventBusConfig } from "../../../services/event-bus/event-bus.ts";
import type { AnchorScrollConfig } from "../../../services/anchor-scroll/anchor-scroll.ts";
import type { AriaConfig } from "../../../directive/aria/aria.ts";
import type { InterpolateConfig } from "../../interpolate/interpolate.ts";
import type {
  SceConfig,
  SceDelegateConfig,
} from "../../../services/sce/sce.ts";
import type { HttpConfig } from "../../../services/http/http.ts";
import type { HtmlCanvasConfig } from "../../../services/html-canvas/html-canvas.ts";
import type { TemplateCacheConfig } from "../../../services/template-cache/template-cache.ts";
import type { TemplateRequestConfig } from "../../../services/template-request/template-request.ts";
import {
  AppContext,
  type ModelState,
  type ModelStateFactory,
} from "../../app-context/app-context.ts";
import type { SecurityPolicyConfig } from "../../../services/security/security.ts";
import { annotate } from "../di.ts";
import {
  providerRegistration,
  type ProviderRegistry,
  type ProviderRegistrationCommand,
} from "../interface.ts";

export type ModuleConfigFn = Injectable<(...args: never[]) => unknown>;

export type NamedInjectable = Injectable<(...args: never[]) => unknown>;

export type NamedConstructorInjectable = Injectable<Constructor>;

export type NamedServiceInjectable =
  | NamedConstructorInjectable
  | NamedInjectable;

type StoreConfig = StorageLike & PersistentStoreConfig;

export type StoreFactory = (...args: never[]) => unknown;

export type StoreConstructor = new (...args: never[]) => unknown;

export type StoreCreator = StoreFactory | StoreConstructor;

export type DynamicConfig<T> = T | Injectable<(...args: never[]) => T>;

type NamedMachineEventNames<TStates extends object> = {
  [TMode in keyof TStates]: TStates[TMode] extends { on?: infer TOn }
    ? Extract<keyof TOn, string>
    : never;
}[keyof TStates];

type NamedMachineEvents<TStates extends object> = Record<
  NamedMachineEventNames<TStates>,
  unknown
>;

type InferredNamedMachineConfig<
  TData extends object,
  TStates extends Record<string, MachineStateDefinition<TData>>,
> = Omit<
  MachineConfig<
    TData,
    NamedMachineEvents<TStates>,
    Extract<keyof TStates, string>
  >,
  "initial" | "states"
> & {
  initial: Extract<keyof TStates, string>;
  states: TStates &
    MachineStateMap<
      TData,
      NamedMachineEvents<TStates>,
      Extract<keyof TStates, string>
    >;
};

export type ModelFactory<T extends Record<string, unknown>> = Injectable<
  (...args: never[]) => T
>;

export type ModelInitializer<T extends Record<string, unknown>> =
  | T
  | ModelFactory<T>;

const rootScopedModelFactoryDependencies = new Set<string>([
  _anchorScroll,
  _animate,
  _compile,
  _controller,
  _element,
  _rootElement,
  _rootScope,
  _scope,
  _state,
  _stateRegistry,
  _transitions,
  _webComponent,
]);

export interface SseModuleConfig {
  defaults?: SseConfig;
}

export interface WebSocketModuleConfig {
  defaults?: WebSocketConfig;
}

export interface WebTransportModuleConfig {
  defaults?: WebTransportConfig;
}

const routerConfigKey = "$router" as const;

export interface AngularConfigMap {
  [_compile]?: CompileConfig;
  [_anchorScroll]?: AnchorScrollConfig;
  [_aria]?: Partial<AriaConfig>;
  [_cookie]?: CookieConfig;
  [_eventBus]?: EventBusConfig;
  [_exceptionHandler]?: ExceptionHandlerConfig;
  [_htmlCanvas]?: HtmlCanvasConfig;
  [_http]?: HttpConfig;
  [_interpolate]?: InterpolateConfig;
  [_location]?: LocationConfig;
  [_log]?: LogConfig;
  [_rest]?: RestConfig;
  [routerConfigKey]?: RouterConfig;
  [_sce]?: SceConfig;
  [_sceDelegate]?: SceDelegateConfig;
  [_security]?: SecurityPolicyConfig;
  [_sse]?: SseModuleConfig;
  [_templateCache]?: TemplateCacheConfig;
  [_templateRequest]?: TemplateRequestConfig;
  [_webComponent]?: WebComponentConfig;
  [_webTransport]?: WebTransportModuleConfig;
  [_websocket]?: WebSocketModuleConfig;
}

export type AngularConfigKey = keyof AngularConfigMap;

export type AngularConfigFor<TKey extends AngularConfigKey> = NonNullable<
  AngularConfigMap[TKey]
>;

type NormalizedAngularConfigMap = {
  [TKey in AngularConfigKey]?: AngularConfigFor<TKey>;
};

const angularConfigKeys = new Set<string>([
  _anchorScroll,
  _aria,
  _compile,
  _cookie,
  _eventBus,
  _exceptionHandler,
  _htmlCanvas,
  _http,
  _interpolate,
  _location,
  _log,
  _rest,
  routerConfigKey,
  _sce,
  _sceDelegate,
  _security,
  _sse,
  _templateCache,
  _templateRequest,
  _webComponent,
  _webTransport,
  _websocket,
]);

function assertKnownAngularConfigKey(
  key: string,
): asserts key is AngularConfigKey {
  if (!angularConfigKeys.has(key)) {
    throw new Error(`Unknown AngularTS config key '${key}'.`);
  }
}

function setAngularConfig(
  target: NormalizedAngularConfigMap,
  key: AngularConfigKey,
  value: unknown,
): void {
  validate(isObject, value, key);
  (target as Record<AngularConfigKey, unknown>)[key] = value;
}

function isStringOrUrl(value: unknown): boolean {
  return isString(value) || value instanceof URL;
}

function isDynamicConfig(
  value: unknown,
  isStatic: (value: unknown) => boolean,
): boolean {
  return isInjectable(value) || isStatic(value);
}

function resolveDynamicConfig<T>(
  value: DynamicConfig<T>,
  injector: ng.InjectorService,
): T {
  if (!isInjectable<(...args: never[]) => T>(value)) {
    return value;
  }

  return injector.invoke(value);
}

function cloneWorkflowSupervisorModuleConfig<
  TWorkflows extends Record<string, unknown>,
>(
  config: WorkflowSupervisorConfig<TWorkflows>,
): WorkflowSupervisorConfig<TWorkflows> {
  return {
    ...config,
    workflows: cloneWorkflowSupervisorDefinitions(
      config.workflows,
    ) as TWorkflows,
  };
}

function cloneWorkflowSupervisorDefinitions(workflows: unknown): unknown {
  if (!isObject(workflows) || isArray(workflows)) {
    return workflows;
  }

  const cloned: Record<string, unknown> = {};

  for (const [name, definition] of Object.entries(workflows)) {
    cloned[name] = cloneWorkflowSupervisorDefinition(definition);
  }

  return cloned;
}

function cloneWorkflowSupervisorDefinition(definition: unknown): unknown {
  if (
    !isObject(definition) ||
    isWorkflowInstanceLike(definition) ||
    !hasOwnData(definition)
  ) {
    return definition;
  }

  return {
    ...definition,
    data: structuredClone(definition.data),
  };
}

function isWorkflowInstanceLike(value: object): boolean {
  const candidate = value as {
    restore?: unknown;
    run?: unknown;
    snapshot?: unknown;
  };

  return (
    isFunction(candidate.restore) &&
    isFunction(candidate.run) &&
    isFunction(candidate.snapshot)
  );
}

function hasOwnData(value: object): value is { data: unknown } {
  return Object.prototype.hasOwnProperty.call(value, "data");
}

function isPlainModelRoot(value: unknown): value is ModelState {
  if (!isObject(value) || isArray(value)) {
    return false;
  }

  const prototype: unknown = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}

function cloneModelRoot<T extends ModelState>(value: T): T {
  try {
    return structuredClone(value);
  } catch {
    return { ...value };
  }
}

function getModelFactoryDependencies(
  name: string,
  initial: ModelFactory<ModelState>,
): string[] {
  if (!isFunction(initial)) {
    return annotate(initial, false, `model ${name}`);
  }

  const factory = initial as ModelFactory<ModelState> & {
    $inject?: string[];
  };
  const hadOwnInject = Object.prototype.hasOwnProperty.call(factory, "$inject");
  const previousInject = factory.$inject;

  try {
    return annotate(factory, false, `model ${name}`);
  } finally {
    if (hadOwnInject) {
      factory.$inject = previousInject;
    } else {
      delete factory.$inject;
    }
  }
}

function assertAppSafeModelFactoryDependencies<T extends ModelState>(
  name: string,
  initial: ModelFactory<T>,
): void {
  const dependencies = getModelFactoryDependencies(
    name,
    initial as ModelFactory<ModelState>,
  );
  const rootScopedDependency = dependencies.find((dependency) =>
    rootScopedModelFactoryDependencies.has(dependency),
  );

  if (rootScopedDependency) {
    throw new Error(
      `Model '${name}' factory cannot inject root-scoped dependency '${rootScopedDependency}'.`,
    );
  }
}

function createModelFactory<T extends ModelState>(
  initial: ModelInitializer<T>,
  getInjector: () => ng.InjectorService | undefined,
): ModelStateFactory<T> {
  if (!isInjectable(initial)) {
    return () => cloneModelRoot(initial);
  }

  return () => {
    const injector = getInjector();

    if (!injector) {
      throw new Error(
        "Injectable model factories require an active AngularTS injector.",
      );
    }

    return injector.invoke(initial, undefined, undefined, "model");
  };
}

type InvokeQueueItem =
  | ProviderRegistrationCommand
  | [typeof _injector, "invoke", [ModuleConfigFn]]
  | [CompileRegistry, "component", [string, ng.Component]]
  | [CompileRegistry, "directive", [string, ng.DirectiveFactory]]
  | [CompileRegistry, "configure", [CompileConfig]]
  | [AnimationRegistry, "register", [string, NamedInjectable]]
  | [
      ControllerRegistry,
      "register",
      [string, Injectable<ng.ControllerConstructor>],
    ]
  | [RuntimeConfigRegistry, "configure", [string, unknown]]
  | [FilterRegistry, "register", [string, ng.FilterFactory]];

function registerValue(
  name: string,
  value: unknown,
): ProviderRegistrationCommand {
  return providerRegistration((registry) => {
    registry.value(name, value);
  });
}

function registerConstant(
  name: string,
  value: unknown,
): ProviderRegistrationCommand {
  return providerRegistration((registry) => {
    registry.constant(name, value);
  });
}

function registerFactory(
  name: string,
  factory: NamedInjectable,
): ProviderRegistrationCommand {
  return providerRegistration((registry) => {
    registry.factory(name, factory);
  });
}

function registerService(
  name: string,
  service: NamedServiceInjectable,
): ProviderRegistrationCommand {
  return providerRegistration((registry) => {
    registry.service(name, service);
  });
}

function registerProvider(
  name: string,
  provider: ProviderDefinition,
): ProviderRegistrationCommand {
  return providerRegistration((registry) => {
    registry.provider(name, provider);
  });
}

function registerDecorator(
  name: string,
  decorator: NamedInjectable,
): ProviderRegistrationCommand {
  return providerRegistration((registry) => {
    registry.decorator(name, decorator);
  });
}

function registerStore(
  name: string,
  constructor: StoreCreator,
  type: ng.StorageType,
  config?: StoreConfig,
): ProviderRegistrationCommand {
  return providerRegistration((registry) => {
    registry.store(name, constructor, type, config);
  });
}

type RouteNameOf<TRouteMap extends RouteMap> = Extract<keyof TRouteMap, string>;

type RouteParentPrefix<TRouteName extends string> =
  TRouteName extends `${infer TParent}.${string}`
    ? TParent | RouteParentPrefix<TParent>
    : never;

type LazyRoutePrefixOf<TRouteMap extends RouteMap> =
  | RouteNameOf<TRouteMap>
  | RouteParentPrefix<RouteNameOf<TRouteMap>>;

type LazyRouteGlobOf<TRouteMap extends RouteMap> =
  LazyRoutePrefixOf<TRouteMap> extends infer TPrefix
    ? TPrefix extends string
      ? `${TPrefix}.**`
      : never
    : never;

type LazyRoutePrefix<TRouteMap extends RouteMap> =
  | LazyRoutePrefixOf<TRouteMap>
  | LazyRouteGlobOf<TRouteMap>;

type RouterModuleInput =
  | RouterModuleDeclaration
  | readonly RouterModuleDeclaration[];

type RouterDeclarationFor<
  TRouteMap extends RouteMap,
  TDeclaration extends RouterModuleInput,
> =
  Exclude<
    RouteNameOf<RoutesOf<TDeclaration>>,
    LazyRoutePrefixOf<TRouteMap>
  > extends never
    ? IncompatibleRouterRouteNames<TRouteMap, TDeclaration> extends never
      ? TDeclaration
      : never
    : never;

type IncompatibleRecordKeys<
  TActual extends Record<string, unknown>,
  TExpected extends Record<string, unknown>,
> = {
  [TKey in keyof TActual]: TKey extends keyof TExpected
    ? TActual[TKey] extends TExpected[TKey]
      ? never
      : TKey
    : TKey;
}[keyof TActual];

type RouteContractIsCompatible<
  TActualMap extends RouteMap,
  TExpectedMap extends RouteMap,
  TRouteName extends Extract<keyof TActualMap & keyof TExpectedMap, string>,
> =
  IncompatibleRecordKeys<
    ParamsOf<TActualMap, TRouteName>,
    ParamsOf<TExpectedMap, TRouteName>
  > extends never
    ? IncompatibleRecordKeys<
        ResolvesOf<TActualMap, TRouteName>,
        ResolvesOf<TExpectedMap, TRouteName>
      > extends never
      ? true
      : false
    : false;

type IncompatibleRouterRouteNames<
  TRouteMap extends RouteMap,
  TDeclaration extends RouterModuleInput,
  TDeclaredRoutes extends RouteMap = RoutesOf<TDeclaration>,
> = {
  [TRouteName in Extract<
    keyof TDeclaredRoutes & keyof TRouteMap,
    string
  >]: RouteContractIsCompatible<
    TDeclaredRoutes,
    TRouteMap,
    TRouteName
  > extends true
    ? never
    : TRouteName;
}[Extract<keyof TDeclaredRoutes & keyof TRouteMap, string>];

export type RouterModule<TRouteMap extends RouteMap = RouteMap> = Omit<
  NgModule,
  "router" | "lazyState"
> & {
  /**
   * Register a router tree while preserving this module's route map.
   */
  router<const TDeclaration extends RouterModuleInput>(
    declaration: TDeclaration & RouterDeclarationFor<TRouteMap, TDeclaration>,
  ): RouterModule<TRouteMap>;

  /**
   * Register a lazy state namespace while preserving this module route map.
   */
  lazyState(
    prefix: LazyRoutePrefix<TRouteMap>,
    loader: LazyStateLoader,
  ): RouterModule<TRouteMap>;
};

/**
 * Modules are collections of application configuration information for components:
 * controllers, directives, filters, etc. They provide recipes for the injector
 * to do the actual instantiation. A module itself has no behaviour but only state.
 * A such, it acts as a data structure between the Angular instance and the injector service.
 */
export class NgModule {
  name: string;
  /** @internal */
  _requires: string[];
  /** @internal */
  _invokeQueue: InvokeQueueItem[];
  /** @internal */
  _configBlocks: InvokeQueueItem[];
  /** @internal */
  _runBlocks: ModuleConfigFn[];
  /** @internal */
  _services: string[];
  /** @internal */
  _models: Map<string, ModelStateFactory<ModelState>>;
  /** @internal */
  _animationRegistry: AnimationRegistry;
  /** @internal */
  _controllerRegistry: ControllerRegistry;
  /** @internal */
  _filterRegistry: FilterRegistry;
  /** @internal */
  _compileRegistry: CompileRegistry;
  /** @internal */
  _appContext: AppContext;
  /** @internal */
  _runtimeConfig: RuntimeConfigRegistry;

  /**
   * @param {string} name - Name of the module
   * @param {Array<string>} requires - List of modules which the injector will load before the current module
   * @param {ng.Injectable<any>} [configFn]
   */
  constructor(name: string, requires: string[], configFn?: ModuleConfigFn);
  /** @internal */
  constructor(
    name: string,
    requires: string[],
    configFn: ModuleConfigFn | undefined,
    animationRegistry: AnimationRegistry,
    controllerRegistry: ControllerRegistry,
    filterRegistry: FilterRegistry,
    compileRegistry: CompileRegistry,
    appContext: AppContext,
    runtimeConfig: RuntimeConfigRegistry,
  );
  constructor(
    name: string,
    requires: string[],
    configFn?: ModuleConfigFn,
    animationRegistry?: AnimationRegistry,
    controllerRegistry?: ControllerRegistry,
    filterRegistry?: FilterRegistry,
    compileRegistry?: CompileRegistry,
    appContext?: AppContext,
    runtimeConfig?: RuntimeConfigRegistry,
  ) {
    validate(isString, name, "name");
    validate(isArray, requires, "requires");
    this.name = name;
    this._requires = requires;
    this._invokeQueue = [];
    this._configBlocks = [];
    this._runBlocks = [];
    this._animationRegistry = animationRegistry ?? new AnimationRegistry();
    this._controllerRegistry = controllerRegistry ?? new ControllerRegistry();
    this._filterRegistry = filterRegistry ?? new FilterRegistry();
    this._compileRegistry =
      compileRegistry ?? new CompileRegistry(new CompileLifecycle());
    this._appContext = appContext ?? new AppContext();
    this._runtimeConfig = runtimeConfig ?? new RuntimeConfigRegistry();

    if (configFn) {
      this._config(configFn);
    }

    this._services = [];
    this._models = new Map();
  }

  /**
   * @param {string} name
   * @param {unknown} object - Allows undefined
   * @returns {NgModule}
   */
  value(name: string, object: unknown): this {
    validate(isString, name, "name");

    this._invokeQueue.push(registerValue(name, object));

    return this;
  }

  /**
   * @param {string} name
   * @param {Object|string|number} object
   * @returns {NgModule}
   */
  constant(name: string, object: object | string | number): this {
    validate(isString, name, "name");
    validate(isDefined, object, "object");

    this._invokeQueue.unshift(registerConstant(name, object));

    return this;
  }

  /**
   *
   * @param {ng.Injectable<(...args: unknown[]) => unknown>} configFn
   * @returns {NgModule}
   */
  /** @internal */
  _config(configFn: ModuleConfigFn): this {
    validate(isInjectable, configFn, "configFn", "notinjectable");

    this._configBlocks.push([_injector, "invoke", [configFn]]);

    return this;
  }

  /** @internal */
  _registerProviders(register: (registry: ProviderRegistry) => void): this {
    validate(isFunction, register, "register");
    this._invokeQueue.push(providerRegistration(register));

    return this;
  }

  /**
   * Declare built-in AngularTS service configuration during the config phase.
   *
   * @param config - Built-in config map.
   * @returns {NgModule}
   */
  config(config: AngularConfigMap): this;

  config(config: AngularConfigMap): this {
    const normalized: NormalizedAngularConfigMap = {};

    validate(isObject, config, "config");

    for (const key of Object.keys(config)) {
      assertKnownAngularConfigKey(key);

      setAngularConfig(normalized, key, config[key]);
    }

    const compileConfig = normalized.$compile;

    if (compileConfig) {
      this._configBlocks.push([
        this._compileRegistry,
        "configure",
        [compileConfig],
      ]);
    }

    const anchorScrollConfig = normalized.$anchorScroll;

    if (anchorScrollConfig) {
      this._configBlocks.push([
        this._runtimeConfig,
        "configure",
        [_anchorScroll, anchorScrollConfig],
      ]);
    }

    const ariaConfig = normalized.$aria;

    if (ariaConfig) {
      this._configBlocks.push([
        this._runtimeConfig,
        "configure",
        [_aria, ariaConfig],
      ]);
    }

    const cookieConfig = normalized.$cookie;

    if (cookieConfig) {
      this._configBlocks.push([
        this._runtimeConfig,
        "configure",
        [_cookie, cookieConfig],
      ]);
    }

    const exceptionHandlerConfig = normalized.$exceptionHandler;

    if (exceptionHandlerConfig) {
      this._configBlocks.push([
        this._runtimeConfig,
        "configure",
        [_exceptionHandler, exceptionHandlerConfig],
      ]);
    }

    const eventBusConfig = normalized.$eventBus;

    if (eventBusConfig) {
      this._configBlocks.push([
        this._runtimeConfig,
        "configure",
        [_eventBus, eventBusConfig],
      ]);
    }

    const htmlCanvasConfig = normalized.$htmlCanvas;

    if (htmlCanvasConfig) {
      this._configBlocks.push([
        this._runtimeConfig,
        "configure",
        [_htmlCanvas, htmlCanvasConfig],
      ]);
    }

    const httpConfig = normalized.$http;

    if (httpConfig) {
      this._configBlocks.push([
        this._runtimeConfig,
        "configure",
        [_http, httpConfig],
      ]);
    }

    const interpolateConfig = normalized.$interpolate;

    if (interpolateConfig) {
      this._configBlocks.push([
        this._runtimeConfig,
        "configure",
        [_interpolate, interpolateConfig],
      ]);
    }

    const logConfig = normalized.$log;

    if (logConfig) {
      this._configBlocks.push([
        this._runtimeConfig,
        "configure",
        [_log, logConfig],
      ]);
    }

    const locationConfig = normalized.$location;

    if (locationConfig) {
      this._configBlocks.push([
        this._runtimeConfig,
        "configure",
        [_location, locationConfig],
      ]);
    }

    const sceConfig = normalized.$sce;

    if (sceConfig) {
      this._configBlocks.push([
        this._runtimeConfig,
        "configure",
        [_sce, sceConfig],
      ]);
    }

    const sceDelegateConfig = normalized.$sceDelegate;

    if (sceDelegateConfig) {
      this._configBlocks.push([
        this._runtimeConfig,
        "configure",
        [_sceDelegate, sceDelegateConfig],
      ]);
    }

    const templateCacheConfig = normalized.$templateCache;

    if (templateCacheConfig) {
      this._configBlocks.push([
        this._runtimeConfig,
        "configure",
        [_templateCache, templateCacheConfig],
      ]);
    }

    const templateRequestConfig = normalized.$templateRequest;

    if (templateRequestConfig) {
      this._configBlocks.push([
        this._runtimeConfig,
        "configure",
        [_templateRequest, templateRequestConfig],
      ]);
    }

    const webComponentConfig = normalized.$webComponent;

    if (webComponentConfig) {
      this._configBlocks.push([
        this._runtimeConfig,
        "configure",
        [_webComponent, webComponentConfig],
      ]);
    }

    const restConfig = normalized.$rest;

    if (restConfig) {
      this._configBlocks.push([
        this._runtimeConfig,
        "configure",
        [_rest, restConfig],
      ]);
    }

    const routerConfig = normalized.$router;

    if (routerConfig) {
      this._configBlocks.push([
        this._runtimeConfig,
        "configure",
        [
          routerConfigKey,
          {
            type: "config",
            config: routerConfig,
          } satisfies RouterRuntimeCommand,
        ],
      ]);
    }

    const securityConfig = normalized.$security;

    if (securityConfig) {
      this._configBlocks.push([
        this._runtimeConfig,
        "configure",
        [_security, securityConfig],
      ]);
    }

    const sseConfig = normalized.$sse;

    if (sseConfig) {
      this._configBlocks.push([
        this._runtimeConfig,
        "configure",
        [_sse, sseConfig],
      ]);
    }

    const webSocketConfig = normalized.$websocket;

    if (webSocketConfig) {
      this._configBlocks.push([
        this._runtimeConfig,
        "configure",
        [_websocket, webSocketConfig],
      ]);
    }

    const webTransportConfig = normalized.$webTransport;

    if (webTransportConfig) {
      this._configBlocks.push([
        this._runtimeConfig,
        "configure",
        [_webTransport, webTransportConfig],
      ]);
    }

    return this;
  }

  /**
   * @param {ng.Injectable<(...args: unknown[]) => unknown>} block
   * @returns {NgModule}
   */
  run(block: ModuleConfigFn): this {
    validate(isInjectable, block, "block", "notinjectable");

    this._runBlocks.push(block);

    return this;
  }

  /**
   * @param {string} name
   * @param {ng.Component} options
   * @returns {NgModule}
   */
  component(name: string, options: ng.Component): this {
    validate(isString, name, "name");
    validate(isDefined, options, "object");

    this._invokeQueue.push([
      this._compileRegistry,
      "component",
      [name, options],
    ]);

    return this;
  }

  /**
   * @param {string} name
   * @param {ng.Injectable<(...args: unknown[]) => unknown>} providerFunction
   * @returns {NgModule}
   */
  factory(name: string, providerFunction: NamedInjectable): this {
    validate(isString, name, "name");
    validateRequired(providerFunction, "providerFunction");
    this._invokeQueue.push(registerFactory(name, providerFunction));

    return this;
  }

  /**
   * @param {string} name
   * @param {ng.Injectable<(...args: unknown[]) => unknown>} serviceFunction
   * @returns {NgModule}
   */
  service(name: string, serviceFunction: NamedServiceInjectable): this {
    validate(isString, name, "name");
    validateRequired(serviceFunction, "serviceFunction");
    this._services.push(name);
    this._invokeQueue.push(registerService(name, serviceFunction));

    return this;
  }

  /**
   * @param {string} name
   * @param {ng.ProviderDefinition} providerType
   * @returns {NgModule}
   */
  provider(name: string, providerType: ProviderDefinition): this {
    validate(isString, name, "name");
    validateRequired(providerType, "providerType");
    this._invokeQueue.push(registerProvider(name, providerType));

    return this;
  }

  /**
   * @param {string} name
   * @param {ng.Injectable<(...args: unknown[]) => unknown>} decorFn
   * @returns {NgModule}
   */
  decorator(name: string, decorFn: NamedInjectable): this {
    validate(isString, name, "name");
    validateRequired(decorFn, "decorFn");
    this._configBlocks.push(registerDecorator(name, decorFn));

    return this;
  }

  /**
   * @param {string} name
   * @param {ng.Injectable<(...args: unknown[]) => unknown>} directiveFactory
   * @returns {NgModule}
   */
  directive(name: string, directiveFactory: ng.DirectiveFactory): this {
    validate(isString, name, "name");
    validateRequired(directiveFactory, "directiveFactory");
    this._invokeQueue.push([
      this._compileRegistry,
      "directive",
      [name, directiveFactory],
    ]);

    return this;
  }

  /**
   * @param {string} name
   * @param {ng.Injectable<(...args: unknown[]) => unknown>} animationFactory
   * @returns {NgModule}
   */
  animation(name: string, animationFactory: NamedInjectable): this {
    validate(isString, name, "name");
    validateRequired(animationFactory, "animationFactory");
    this._invokeQueue.push([
      this._animationRegistry,
      "register",
      [name, animationFactory],
    ]);

    return this;
  }

  /**
   * @param {string} name
   * @param {ng.FilterFactory} filterFn
   * @return {NgModule}
   */
  filter(name: string, filterFn: ng.FilterFactory): this {
    validate(isString, name, "name");
    validate(isFunction, filterFn, `filterFn`);
    this._invokeQueue.push([
      this._filterRegistry,
      "register",
      [name, filterFn],
    ]);

    return this;
  }

  /**
   * The $controller service is used by Angular to create new controllers.
   * Named controllers are stored in the owning runtime's controller registry.
   *
   * @param {string} name Controller name
   * @param {ng.Injectable<ng.ControllerConstructor>} ctlFn Controller constructor fn (optionally decorated with DI annotations in the array notation)
   * @returns {NgModule}
   */
  controller(name: string, ctlFn: Injectable<ng.ControllerConstructor>): this {
    validate(isString, name, "name");
    validateRequired(ctlFn, "controller");
    this._invokeQueue.push([
      this._controllerRegistry,
      "register",
      [name, ctlFn],
    ]);

    return this;
  }

  /**
   * Register a named reactive model as an injectable app-owned service.
   *
   * The model is created lazily by the owning `AppContext` when the service is
   * first injected. Models are shared across every root scope managed by the
   * same `AppContext`; they are not children of `$rootScope`.
   *
   * Assign an injected model to a controller or scope property to bind it in a
   * template. DOM interpolation, `ng-bind`, directive expressions, nested
   * object reads, and array length reads update when the app model changes;
   * callers should not use `$apply`, `$digest`, or manual refresh calls after
   * mutating the model.
   *
   * The injected `Model<T>` value is proxy-backed. It exposes scope-proxy
   * methods such as `$watch`, `$batch`, `$merge`, `$on`, `$emit`, `$broadcast`,
   * and `$destroy`, plus `$snapshot`, `$restore`, and `$sync` for model
   * lifecycle and synchronization.
   *
   * Prefer the factory form for nontrivial initial state:
   *
   * ```ts
   * app.model("user", () => ({ name: "John", authenticated: false }));
   * ```
   *
   * @param {string} name - Injectable model name.
   * @param {Object|Function|Array} initial - Plain object state or an
   * injectable factory that returns plain object state.
   * @returns {NgModule}
   */
  model<T extends Record<string, unknown>>(
    name: string,
    initial: ModelInitializer<T>,
  ): this {
    validate(isString, name, "name");
    validate(
      (value) => isInjectable(value) || isPlainModelRoot(value),
      initial,
      "initial",
    );

    if (this._models.has(name)) {
      throw new Error(`Model '${name}' is already registered.`);
    }

    if (isInjectable(initial)) {
      assertAppSafeModelFactoryDependencies(name, initial);
    }

    let modelInjector: ng.InjectorService | undefined;
    const modelFactory = createModelFactory(initial, () => modelInjector);

    this._models.set(name, modelFactory as ModelStateFactory<ModelState>);
    this._invokeQueue.push(
      registerFactory(name, [
        _injector,
        (injector: ng.InjectorService) => {
          modelInjector ??= injector;

          return this._appContext.registerModel(name, modelFactory, {
            injector,
          });
        },
      ]),
    );

    return this;
  }

  /**
   * Register a named reactive mode machine as an injectable service.
   *
   * The machine is created by `$machine` when the named service is requested.
   * The returned instance is not tied to any one scope lifetime; it registers
   * with AngularTS scope proxies when assigned to a controller or scope.
   *
   * @param {string} name - Injectable name.
   * @param {ng.MachineConfig|ng.Injectable} config - Machine configuration
   * or a resolvable config factory.
   * @returns {NgModule}
   */
  machine<
    TData extends object = Record<string, unknown>,
    const TStates extends Record<string, MachineStateDefinition<TData>> =
      Record<string, MachineStateDefinition<TData>>,
  >(
    name: string,
    config:
      | InferredNamedMachineConfig<TData, TStates>
      | Injectable<() => InferredNamedMachineConfig<TData, TStates>>,
  ): this;
  machine<
    TData extends object = Record<string, unknown>,
    TEvents extends object = MachineEventMap,
    TMode extends MachineMode = MachineMode,
  >(
    name: string,
    config:
      | MachineConfig<TData, TEvents, TMode>
      | Injectable<() => MachineConfig<TData, TEvents, TMode>>,
  ): this;
  machine<
    TData extends object = Record<string, unknown>,
    TEvents extends object = MachineEventMap,
    TMode extends MachineMode = MachineMode,
  >(
    name: string,
    config:
      | MachineConfig<TData, TEvents, TMode>
      | Injectable<() => MachineConfig<TData, TEvents, TMode>>,
  ): this {
    validate(isString, name, "name");
    validate(isDynamicConfig.bind(null, config, isObject), config, "config");
    this._invokeQueue.push(
      registerFactory(name, [
        _machine,
        _injector,
        ($machine: MachineService, $injector: ng.InjectorService) => {
          const resolvedConfig = resolveDynamicConfig(config, $injector);
          const data = structuredClone(resolvedConfig.data);

          return $machine({
            ...resolvedConfig,
            data,
          });
        },
      ]),
    );

    return this;
  }

  /**
   * Register a named workflow as an injectable service.
   *
   * The workflow is created by `$workflow` when the named service is requested.
   * Workflow behavior remains local to its `WorkflowConfig`; the provider does
   * not apply global workflow defaults.
   *
   * @param {string} name - Injectable name.
   * @param {WorkflowConfig|ng.Injectable} config - Workflow configuration
   * or a resolvable config factory.
   * @returns {NgModule}
   */
  workflow<
    TData extends object = Record<string, unknown>,
    TEvents extends object = MachineNoEvents,
    TCommands extends object = WorkflowNoCommands,
  >(
    name: string,
    config:
      | WorkflowConfig<TData, TEvents, TCommands>
      | Injectable<() => WorkflowConfig<TData, TEvents, TCommands>>,
  ): this {
    validate(isString, name, "name");
    validate(isDynamicConfig.bind(null, config, isObject), config, "config");
    this._invokeQueue.push(
      registerFactory(name, [
        _workflow,
        _injector,
        ($workflow: WorkflowService, $injector: ng.InjectorService) => {
          const resolvedConfig = resolveDynamicConfig(config, $injector);

          return $workflow({
            ...resolvedConfig,
            data: structuredClone(resolvedConfig.data),
          });
        },
      ]),
    );

    return this;
  }

  /**
   * Register a named workflow supervisor as an injectable service.
   *
   * The supervisor is created when the named service is requested. It composes
   * existing workflow configs or workflow instances and keeps persistence and
   * recovery policy local to the supervisor config.
   *
   * @param name - Injectable name.
   * @param config - Supervisor configuration or a resolvable config factory.
   * @returns {NgModule}
   */
  workflowSupervisor<
    TWorkflows extends Record<string, unknown> = Record<string, unknown>,
  >(
    name: string,
    config:
      | WorkflowSupervisorConfig<TWorkflows>
      | Injectable<() => WorkflowSupervisorConfig<TWorkflows>>,
  ): this {
    validate(isString, name, "name");
    validate(isDynamicConfig.bind(null, config, isObject), config, "config");
    this._invokeQueue.push(
      registerFactory(name, [
        _workflow,
        _injector,
        ($workflow: WorkflowService, $injector: ng.InjectorService) => {
          const resolvedConfig = resolveDynamicConfig(config, $injector);

          return createWorkflowSupervisor(
            $workflow,
            cloneWorkflowSupervisorModuleConfig(resolvedConfig),
          );
        },
      ]),
    );

    return this;
  }

  /**
   * Register a module-owned router state tree during module configuration.
   *
   * Child state names are relative to their parent unless they contain a dot.
   * Each route is queued for the composed router runtime, so module router
   * trees compose with `lazyState(...)` and inherited route policies.
   *
   * @param declaration - Router tree root declaration.
   * @returns {NgModule}
   */
  router<TDeclaration extends RouterModuleInput>(
    declaration: TDeclaration,
  ): RouterModule<RoutesOf<TDeclaration>>;
  router<TRouteMap extends RouteMap>(
    declaration: RouterModuleInput,
  ): RouterModule<TRouteMap>;
  router(declaration: RouterModuleInput): RouterModule {
    const states = flattenRouterModuleDeclaration(declaration);

    for (const state of states) {
      this._configBlocks.push([
        this._runtimeConfig,
        "configure",
        [
          routerConfigKey,
          { type: "state", definition: state } satisfies RouterRuntimeCommand,
        ],
      ]);
    }

    return this as unknown as RouterModule;
  }

  /**
   * Register a lazy router state namespace during module configuration.
   *
   * Lazy route declarations use the same composed router runtime as static
   * module routes.
   *
   * @param prefix - State name prefix to load on demand.
   * @param loader - Loader invoked by the router when a transition targets the prefix.
   * @returns {NgModule}
   */
  lazyState(prefix: string, loader: LazyStateLoader): this {
    validate(isString, prefix, "prefix");
    validate(isFunction, loader, "loader");

    this._configBlocks.push([
      this._runtimeConfig,
      "configure",
      [
        routerConfigKey,
        { type: "lazy", prefix, loader } satisfies RouterRuntimeCommand,
      ],
    ]);

    return this;
  }

  /**
   * Register a named WebAssembly module as an injectable resource.
   *
   * The actual loading is delegated to the `$wasm` service, so custom
   * runtimes can decide whether WebAssembly support is included.
   *
   * @param {string} name - Injectable name used to access the resource.
   * @param config - Module source and imports, optionally produced by DI.
   *
   * @returns {NgModule}
   */
  wasm(name: string, config: DynamicConfig<WasmLoadOptions>): this {
    validate(isString, name, "name");
    validate((value) => isDynamicConfig(value, isObject), config, "config");

    this._invokeQueue.push(
      registerFactory(name, [
        _wasm,
        _injector,
        ($wasm: WasmService, $injector: ng.InjectorService): WasmResource =>
          $wasm.load(resolveDynamicConfig(config, $injector)),
      ]),
    );

    return this;
  }

  /**
   * Register a named Web Worker connection as an injectable service.
   *
   * The actual connection is delegated to the `$worker` provider, so worker
   * support remains provider-driven instead of directive-driven.
   *
   * @param {string} name - Injectable name.
   * @param {string|URL|ng.Injectable<(...args: never[]) => string|URL>}
   *   [scriptPath] Worker script URL, optionally produced by DI.
   * @param {WorkerConfig|ng.Injectable<(...args: never[]) => WorkerConfig>}
   *   [config] Worker connection options, optionally produced by DI.
   * @returns {NgModule}
   */
  worker(
    name: string,
    scriptPath: DynamicConfig<string | URL>,
    config: DynamicConfig<WorkerConfig> = {},
  ): this {
    validate(isString, name, "name");
    validate(
      (value) => isDynamicConfig(value, isStringOrUrl),
      scriptPath,
      "scriptPath",
    );
    validate((value) => isDynamicConfig(value, isObject), config, "config");
    this._invokeQueue.push(
      registerFactory(name, [
        _worker,
        _injector,
        ($worker: WorkerService, $injector: ng.InjectorService) =>
          $worker(
            resolveDynamicConfig(scriptPath, $injector),
            resolveDynamicConfig(config, $injector),
          ),
      ]),
    );

    return this;
  }

  /**
   * Register a named service-worker facade as an injectable service.
   *
   * The named service delegates to the singleton `$serviceWorker` browser
   * container, but carries module-owned default registration script/config.
   * Registration remains explicit unless `config.autoRegister` is true.
   *
   * @param name - Injectable name.
   * @param scriptUrl - Service worker script URL, optionally produced by DI.
   * @param config - Registration defaults, optionally produced by DI.
   * @returns {NgModule}
   */
  serviceWorker(
    name: string,
    scriptUrl: DynamicConfig<string | URL>,
    config: DynamicConfig<ServiceWorkerConfig> = {},
  ): this {
    validate(isString, name, "name");
    validate(
      (value) => isDynamicConfig(value, isStringOrUrl),
      scriptUrl,
      "scriptUrl",
    );
    validate((value) => isDynamicConfig(value, isObject), config, "config");
    this._invokeQueue.push(
      registerFactory(name, [
        _serviceWorker,
        _injector,
        _exceptionHandler,
        (
          $serviceWorker: ServiceWorkerService,
          $injector: ng.InjectorService,
          $exceptionHandler: ng.ExceptionHandlerService,
        ) =>
          createConfiguredServiceWorkerService(
            $serviceWorker,
            resolveDynamicConfig(scriptUrl, $injector),
            resolveDynamicConfig(config, $injector),
            $exceptionHandler,
          ),
      ]),
    );

    return this;
  }

  /**
   * Register a persistent object store as an injectable service.
   *
   * Store construction is delegated to the internal provider registry, which
   * creates the service through the injector and persists it through the
   * selected backend.
   *
   * @param {string} name - Service name.
   * @param {Function|Object} ctor - Constructor, factory, or object to persist.
   * @param {ng.StorageType} type - Storage backend type.
   * @param {StorageLike & PersistentStoreConfig} [backendOrConfig] - Custom backend or persistence options.
   * @returns {NgModule}
   */
  store(
    name: string,
    ctor: StoreCreator | object,
    type: ng.StorageType,
    backendOrConfig?: StorageLike & PersistentStoreConfig,
  ): this {
    validate(isString, name, "name");
    validateRequired(ctor, "ctor");
    this._invokeQueue.push(
      registerStore(
        name,
        isObject(ctor) ? () => ctor : ctor,
        type,
        backendOrConfig,
      ),
    );

    return this;
  }

  /**
   * Register a REST resource as an injectable service.
   *
   * The resource factory is delegated to the injected `$rest` service, keeping
   * REST support configurable by custom runtimes.
   *
   * @template T, ID
   * @param {string} name - Service name.
   * @param {string} url - Base URL or URI template.
   * @param {ng.EntityClass<T>} [entityClass] - Optional constructor for mapping JSON.
   * @param {RestOptions|ng.Injectable<(...args: never[]) => RestOptions>} [options]
   *   Optional RestService options, optionally produced by DI.
   * @returns {NgModule}
   */
  rest<T = unknown>(
    name: string,
    url: string,
    entityClass?: EntityClass<T>,
    options: DynamicConfig<RestOptions> = {},
  ): this {
    validate(isString, name, "name");
    validate(isString, url, "url");
    validate((value) => isDynamicConfig(value, isObject), options, "options");
    this._invokeQueue.push(
      registerFactory(name, [
        _rest,
        _injector,
        ($rest: RestFactory, $injector: ng.InjectorService) =>
          $rest<T>(url, entityClass, resolveDynamicConfig(options, $injector)),
      ]),
    );

    return this;
  }

  /**
   * Register a pre-configured SSE connection as an injectable service.
   *
   * The connection is created by `$sse` when the named service is requested.
   *
   * @param {string} name - Injectable name.
   * @param {string} url - SSE endpoint.
   * @param {SseConfig|ng.Injectable<(...args: never[]) => SseConfig>} [config]
   *   SSE connection options, optionally produced by DI.
   * @returns {NgModule}
   */
  sse(name: string, url: string, config: DynamicConfig<SseConfig> = {}): this {
    validate(isString, name, "name");
    validate(isString, url, "url");
    validate((value) => isDynamicConfig(value, isObject), config, "config");
    this._invokeQueue.push(
      registerFactory(name, [
        _sse,
        _injector,
        ($sse: SseService, $injector: ng.InjectorService) =>
          $sse(url, resolveDynamicConfig(config, $injector)),
      ]),
    );

    return this;
  }

  /**
   * Register a pre-configured WebSocket connection as an injectable service.
   *
   * The connection is created by `$websocket` when the named service is
   * requested.
   *
   * @param {string} name - Injectable name.
   * @param {string} url - WebSocket endpoint.
   * @param {WebSocketConfig|ng.Injectable<(...args: never[]) => WebSocketConfig>}
   *   [config] WebSocket connection options, optionally produced by DI.
   * @returns {NgModule}
   */
  websocket(
    name: string,
    url: string,
    config: DynamicConfig<WebSocketConfig> = {},
  ): this {
    validate(isString, name, "name");
    validate(isString, url, "url");
    validate((value) => isDynamicConfig(value, isObject), config, "config");
    this._invokeQueue.push(
      registerFactory(name, [
        _websocket,
        _injector,
        ($websocket: WebSocketService, $injector: ng.InjectorService) =>
          $websocket(url, resolveDynamicConfig(config, $injector)),
      ]),
    );

    return this;
  }

  /**
   * Register a pre-configured WebTransport connection as an injectable service.
   *
   * The connection is created by `$webTransport` when the named service is
   * requested.
   *
   * @param {string} name - Injectable name.
   * @param {string} url - WebTransport endpoint.
   * @param {WebTransportConfig|ng.Injectable<(...args: never[]) => WebTransportConfig>}
   *   [config] WebTransport connection options, optionally produced by DI.
   * @returns {NgModule}
   */
  webTransport(
    name: string,
    url: string,
    config: DynamicConfig<WebTransportConfig> = {},
  ): this {
    validate(isString, name, "name");
    validate(isString, url, "url");
    validate((value) => isDynamicConfig(value, isObject), config, "config");
    this._invokeQueue.push(
      registerFactory(name, [
        _webTransport,
        _injector,
        ($webTransport: WebTransportService, $injector: ng.InjectorService) =>
          $webTransport(url, resolveDynamicConfig(config, $injector)),
      ]),
    );

    return this;
  }

  /**
   * Register an options-backed application host custom element.
   *
   * The definition is installed when the module runs. The host element is a
   * native custom element backed by an AngularTS child scope.
   *
   * @param {string} name - Custom element tag name.
   * @param {AppComponentOptions} options - App component options.
   * @returns {NgModule}
   */
  appComponent<T extends object = Record<string, unknown>>(
    name: string,
    options: AppComponentOptions<T>,
  ): this {
    validate(isString, name, "name");
    validate(isObject, options, "options");
    this._runBlocks.push([
      _webComponent,
      ($webComponent: WebComponentService) =>
        $webComponent.defineAppComponent<T>(name, options),
    ]);

    return this;
  }

  /**
   * Register a user-authored native custom element backed by an AngularTS scope.
   *
   * The element class must extend `ScopeElement`. Its static template, shadow,
   * scope, inputs, and isolate properties configure the AngularTS wiring.
   *
   * @param {string} name - Custom element tag name.
   * @param {ScopeElementConstructor} elementClass - Custom element class.
   * @returns {NgModule}
   */
  webComponent<T extends object = Record<string, unknown>>(
    name: string,
    elementClass: ScopeElementConstructor<T>,
  ): this {
    validate(isString, name, "name");
    validate(isFunction, elementClass, "elementClass");
    this._runBlocks.push([
      _webComponent,
      ($webComponent: WebComponentService) =>
        $webComponent.defineElement<T>(name, elementClass),
    ]);

    return this;
  }
}

function flattenRouterModuleDeclaration(
  declaration: RouterModuleInput,
): StateDeclaration[] {
  const states: StateDeclaration[] = [];

  if (isRouterModuleForest(declaration)) {
    for (const route of declaration) {
      appendRouterModuleDeclaration(route, undefined, states);
    }
  } else {
    appendRouterModuleDeclaration(declaration, undefined, states);
  }

  return states;
}

function isRouterModuleForest(
  declaration: RouterModuleInput,
): declaration is readonly RouterModuleDeclaration[] {
  return isArray(declaration);
}

function appendRouterModuleDeclaration(
  declaration: RouterModuleDeclaration,
  parentName: string | undefined,
  states: StateDeclaration[],
): void {
  validate(isObject, declaration, "declaration");
  validate(isString, declaration.name, "name");

  const { children, ...stateDeclaration } = declaration;
  const name = resolveRouterStateName(parentName, declaration.name);
  const canUseSource = children === undefined && name === declaration.name;
  const flattened = canUseSource
    ? (declaration as StateDeclaration)
    : { ...stateDeclaration, name };

  if (!canUseSource) {
    setStateDeclarationSource(flattened, declaration);
  }
  states.push(flattened);

  if (children === undefined) {
    return;
  }

  validate(isArray, children, "children");

  for (const child of children) {
    appendRouterModuleDeclaration(child, name, states);
  }
}

function resolveRouterStateName(
  parentName: string | undefined,
  childName: string,
): string {
  if (parentName === undefined || childName.includes(".")) {
    return childName;
  }

  return `${parentName}.${childName}`;
}
