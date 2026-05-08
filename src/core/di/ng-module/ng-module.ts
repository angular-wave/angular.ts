import {
  isFunction,
  isDefined,
  isArray,
  isString,
  isObject,
} from "../../../shared/utils.ts";
import {
  _animateProvider,
  _compileProvider,
  _controllerProvider,
  _eventBus,
  _filterProvider,
  _injector,
  _provide,
  _rest,
  _sse,
  _stateProvider,
  _wasm,
  _webComponent,
  _webTransport,
  _websocket,
  _worker,
} from "../../../injection-tokens.ts";
import { isInjectable } from "../../../shared/predicates.ts";
import { validate, validateRequired } from "../../../shared/validate.ts";
import type { Injectable } from "../../../interface.ts";
import type {
  PersistentStoreConfig,
  StorageLike,
} from "../../../services/storage/storage.ts";
import type {
  EntityClass,
  RestFactory,
  RestOptions,
} from "../../../services/rest/rest.ts";
import type { SseConfig, SseService } from "../../../services/sse/sse.ts";
import type {
  WebTransportConfig,
  WebTransportService,
} from "../../../services/webtransport/webtransport.ts";
import type {
  WebSocketConfig,
  WebSocketService,
} from "../../../services/websocket/websocket.ts";
import type { WasmOptions, WasmService } from "../../../services/wasm/wasm.ts";
import type { StateDeclaration } from "../../../router/state/interface.ts";
import type {
  WorkerConfig,
  WorkerService,
} from "../../../services/worker/worker.ts";
import {
  createTopicService,
  type PubSub,
  type TopicService,
} from "../../../services/pubsub/pubsub.ts";
import type {
  WebComponentOptions,
  WebComponentService,
} from "../../../services/web-component/web-component.ts";

type ModuleConfigFn = Injectable<(...args: any[]) => unknown>;

type NamedInjectable = Injectable<(...args: any[]) => unknown>;

type StoreConfig = StorageLike & PersistentStoreConfig;

type InvokeQueueItem =
  | [typeof _provide, "value", [string, unknown]]
  | [typeof _provide, "constant", [string, object | string | number]]
  | [typeof _provide, "factory", [string, NamedInjectable]]
  | [typeof _provide, "service", [string, NamedInjectable]]
  | [typeof _provide, "provider", [string, NamedInjectable]]
  | [typeof _provide, "decorator", [string, NamedInjectable]]
  | [typeof _provide, "store", [string, Function, ng.StorageType, StoreConfig?]]
  | [typeof _injector, "invoke", [ModuleConfigFn]]
  | [typeof _compileProvider, "component", [string, ng.Component]]
  | [typeof _compileProvider, "directive", [string, NamedInjectable]]
  | [typeof _animateProvider, "register", [string, NamedInjectable]]
  | [typeof _filterProvider, "register", [string, ng.FilterFactory]]
  | [typeof _stateProvider, "state", [StateDeclaration]]
  | [
      typeof _controllerProvider,
      "register",
      [string, Injectable<ng.ControllerConstructor>],
    ];

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

  /**
   * @param {string} name - Name of the module
   * @param {Array<string>} requires - List of modules which the injector will load before the current module
   * @param {ng.Injectable<any>} [configFn]
   */
  constructor(name: string, requires: string[], configFn?: ModuleConfigFn) {
    validate(isString, name, "name");
    validate(isArray, requires, "requires");
    this.name = name;
    this._requires = requires;
    this._invokeQueue = [];
    this._configBlocks = [];
    this._runBlocks = [];

    if (configFn) {
      this.config(configFn);
    }

    this._services = [];
  }

  /**
   * @param {string} name
   * @param {unknown} object - Allows undefined
   * @returns {NgModule}
   */
  value(name: string, object: unknown): NgModule {
    validate(isString, name, "name");

    this._invokeQueue.push([_provide, "value", [name, object]]);

    return this;
  }

  /**
   * @param {string} name
   * @param {Object|string|number} object
   * @returns {NgModule}
   */
  constant(name: string, object: object | string | number): NgModule {
    validate(isString, name, "name");
    validate(isDefined, object, "object");

    this._invokeQueue.unshift([_provide, "constant", [name, object]]);

    return this;
  }

  /**
   *
   * @param {ng.Injectable<(...args: unknown[]) => unknown>} configFn
   * @returns {NgModule}
   */
  config(configFn: ModuleConfigFn): NgModule {
    validate(isInjectable, configFn, "configFn");

    this._configBlocks.push([_injector, "invoke", [configFn]]);

    return this;
  }

  /**
   * @param {ng.Injectable<(...args: unknown[]) => unknown>} block
   * @returns {NgModule}
   */
  run(block: ModuleConfigFn): NgModule {
    validate(isInjectable, block, "block");

    this._runBlocks.push(block);

    return this;
  }

  /**
   * @param {string} name
   * @param {ng.Component} options
   * @returns {NgModule}
   */
  component(name: string, options: ng.Component): NgModule {
    validate(isString, name, "name");
    validate(isDefined, options, "object");

    this._invokeQueue.push([_compileProvider, "component", [name, options]]);

    return this;
  }

  /**
   * @param {string} name
   * @param {ng.Injectable<(...args: unknown[]) => unknown>} providerFunction
   * @returns {NgModule}
   */
  factory(name: string, providerFunction: NamedInjectable): NgModule {
    validate(isString, name, "name");
    validateRequired(providerFunction, "providerFunction");
    this._invokeQueue.push([_provide, "factory", [name, providerFunction]]);

    return this;
  }

  /**
   * @param {string} name
   * @param {ng.Injectable<(...args: unknown[]) => unknown>} serviceFunction
   * @returns {NgModule}
   */
  service(name: string, serviceFunction: NamedInjectable): NgModule {
    validate(isString, name, "name");
    validateRequired(serviceFunction, "serviceFunction");
    this._services.push(name);
    this._invokeQueue.push([_provide, "service", [name, serviceFunction]]);

    return this;
  }

  /**
   * @param {string} name
   * @param {ng.Injectable<(...args: unknown[]) => unknown>} providerType
   * @returns {NgModule}
   */
  provider(name: string, providerType: NamedInjectable): NgModule {
    validate(isString, name, "name");
    validateRequired(providerType, "providerType");
    this._invokeQueue.push([_provide, "provider", [name, providerType]]);

    return this;
  }

  /**
   * @param {string} name
   * @param {ng.Injectable<(...args: unknown[]) => unknown>} decorFn
   * @returns {NgModule}
   */
  decorator(name: string, decorFn: NamedInjectable): NgModule {
    validate(isString, name, "name");
    validateRequired(decorFn, "decorFn");
    this._configBlocks.push([_provide, "decorator", [name, decorFn]]);

    return this;
  }

  /**
   * @param {string} name
   * @param {ng.Injectable<(...args: unknown[]) => unknown>} directiveFactory
   * @returns {NgModule}
   */
  directive(name: string, directiveFactory: NamedInjectable): NgModule {
    validate(isString, name, "name");
    validateRequired(directiveFactory, "directiveFactory");
    this._invokeQueue.push([
      _compileProvider,
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
  animation(name: string, animationFactory: NamedInjectable): NgModule {
    validate(isString, name, "name");
    validateRequired(animationFactory, "animationFactory");
    this._invokeQueue.push([
      _animateProvider,
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
  filter(name: string, filterFn: ng.FilterFactory): NgModule {
    validate(isString, name, "name");
    validate(isFunction, filterFn, `filterFn`);
    this._invokeQueue.push([_filterProvider, "register", [name, filterFn]]);

    return this;
  }

  /**
   * The $controller service is used by Angular to create new controllers.
   * This provider allows controller registration via the register method.
   *
   * @param {string} name Controller name
   * @param {ng.Injectable<ng.ControllerConstructor>} ctlFn Controller constructor fn (optionally decorated with DI annotations in the array notation)
   * @returns {NgModule}
   */
  controller(
    name: string,
    ctlFn: Injectable<ng.ControllerConstructor>,
  ): NgModule {
    validate(isString, name, "name");
    validateRequired(ctlFn, `fictlFnlterFn`);
    this._invokeQueue.push([_controllerProvider, "register", [name, ctlFn]]);

    return this;
  }

  /**
   * Register a router state during module configuration.
   *
   * This is equivalent to calling `$stateProvider.state(...)` in a config
   * block, but keeps route declarations in the same fluent module API used for
   * components, services, directives, and custom elements.
   *
   * @param {ng.StateDeclaration} definition - State declaration with a `name`.
   * @returns {NgModule}
   */
  state(definition: StateDeclaration): NgModule;
  /**
   * Register a named router state during module configuration.
   *
   * The provided `name` is copied onto the state declaration before it is
   * passed to `$stateProvider`.
   *
   * @param {string} name - State name.
   * @param {ng.StateDeclaration} definition - State declaration without a required `name`.
   * @returns {NgModule}
   */
  state(name: string, definition: Omit<StateDeclaration, "name">): NgModule;
  state(
    nameOrDefinition: string | StateDeclaration,
    definition?: Omit<StateDeclaration, "name">,
  ): NgModule {
    const state = normalizeStateDeclaration(nameOrDefinition, definition);

    this._configBlocks.push([_stateProvider, "state", [state]]);

    return this;
  }

  /**
   * Register a named WebAssembly module as an injectable service.
   *
   * The actual loading is delegated to the `$wasm` provider, so custom
   * runtimes can decide whether WebAssembly support is included.
   *
   * @param {string} name - Injectable name used to access the module exports.
   * @param {string} src - URL of the `.wasm` file to fetch and instantiate.
   * @param {WebAssembly.Imports} [imports] - WebAssembly import object.
   * @param {WasmOptions} [opts] - WebAssembly provider options.
   *
   * Supported keys:
   * - **raw**: `boolean`
   *   - `false` (default): the injectable resolves to `instance.exports`.
   *   - `true`: the injectable resolves to `{ instance, exports, module }`.
   *
   * @returns {NgModule}
   */
  wasm(
    name: string,
    src: string,
    imports: WebAssembly.Imports = {},
    opts: WasmOptions = {},
  ): NgModule {
    validate(isString, name, "name");
    validate(isString, src, "src");
    this._invokeQueue.push([
      _provide,
      "factory",
      [name, [_wasm, ($wasm: WasmService) => $wasm(src, imports, opts)]],
    ]);

    return this;
  }

  /**
   * Register a named Web Worker connection as an injectable service.
   *
   * The actual connection is delegated to the `$worker` provider, so worker
   * support remains provider-driven instead of directive-driven.
   *
   * @param {string} name - Injectable name.
   * @param {string | URL} scriptPath - Worker script URL.
   * @param {WorkerConfig} [config] - Worker connection options.
   * @returns {NgModule}
   */
  worker(
    name: string,
    scriptPath: string | URL,
    config: WorkerConfig = {},
  ): NgModule {
    validate(isString, name, "name");
    validateRequired(scriptPath, "scriptPath");
    this._invokeQueue.push([
      _provide,
      "factory",
      [
        name,
        [_worker, ($worker: WorkerService) => $worker(scriptPath, config)],
      ],
    ]);

    return this;
  }

  /**
   * Register a persistent object store as an injectable service.
   *
   * Store construction is delegated to `$provide.store`, which creates the
   * service through the injector and persists it through the selected backend.
   *
   * @param {string} name - Service name.
   * @param {Function|Object} ctor - Constructor, factory, or object to persist.
   * @param {ng.StorageType} type - Storage backend type.
   * @param {StorageLike & PersistentStoreConfig} [backendOrConfig] - Custom backend or persistence options.
   * @returns {NgModule}
   */
  store(
    name: string,
    ctor: Function | object,
    type: ng.StorageType,
    backendOrConfig?: StorageLike & PersistentStoreConfig,
  ): NgModule {
    validate(isString, name, "name");
    validateRequired(ctor, "ctor");
    this._invokeQueue.push([
      _provide,
      "store",
      [name, isObject(ctor) ? () => ctor : ctor, type, backendOrConfig],
    ]);

    return this;
  }

  /**
   * Register a REST resource as an injectable service.
   *
   * The resource factory is delegated to the `$rest` provider, keeping REST
   * support configurable by custom runtimes.
   *
   * @template T, ID
   * @param {string} name - Service name.
   * @param {string} url - Base URL or URI template.
   * @param {ng.EntityClass<T>} [entityClass] - Optional constructor for mapping JSON.
   * @param {RestOptions} [options] - Optional RestService options.
   * @returns {NgModule}
   */
  rest<T = unknown, ID = unknown>(
    name: string,
    url: string,
    entityClass?: EntityClass<T>,
    options: RestOptions = {},
  ): NgModule {
    validate(isString, name, "name");
    validate(isString, url, "url");
    this._invokeQueue.push([
      _provide,
      "factory",
      [
        name,
        [
          _rest,
          ($rest: RestFactory) => $rest<T, ID>(url, entityClass, options),
        ],
      ],
    ]);

    return this;
  }

  /**
   * Register a pre-configured SSE connection as an injectable service.
   *
   * The connection is created by `$sse` when the named service is requested.
   *
   * @param {string} name - Injectable name.
   * @param {string} url - SSE endpoint.
   * @param {SseConfig} [config] - SSE connection options.
   * @returns {NgModule}
   */
  sse(name: string, url: string, config: SseConfig = {}): NgModule {
    validate(isString, name, "name");
    validate(isString, url, "url");
    this._invokeQueue.push([
      _provide,
      "factory",
      [name, [_sse, ($sse: SseService) => $sse(url, config)]],
    ]);

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
   * @param {string[]} [protocols] - Optional subprotocols.
   * @param {WebSocketConfig} [config] - WebSocket connection options.
   * @returns {NgModule}
   */
  websocket(
    name: string,
    url: string,
    protocols: string[] = [],
    config: WebSocketConfig = {},
  ): NgModule {
    validate(isString, name, "name");
    validate(isString, url, "url");
    this._invokeQueue.push([
      _provide,
      "factory",
      [
        name,
        [
          _websocket,
          ($websocket: WebSocketService) => $websocket(url, protocols, config),
        ],
      ],
    ]);

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
   * @param {WebTransportConfig} [config] - WebTransport connection options.
   * @returns {NgModule}
   */
  webTransport(
    name: string,
    url: string,
    config: WebTransportConfig = {},
  ): NgModule {
    validate(isString, name, "name");
    validate(isString, url, "url");
    this._invokeQueue.push([
      _provide,
      "factory",
      [
        name,
        [
          _webTransport,
          ($webTransport: WebTransportService) => $webTransport(url, config),
        ],
      ],
    ]);

    return this;
  }

  /**
   * Register a scoped custom element backed by a normal AngularTS child scope.
   *
   * The definition is installed when the module runs. The custom element can be
   * consumed as a native element while its internal model remains part of the
   * AngularTS scope tree.
   *
   * @param {string} name - Custom element tag name.
   * @param {WebComponentOptions} options - Custom element options.
   * @returns {NgModule}
   */
  webComponent<T extends object = Record<string, any>>(
    name: string,
    options: WebComponentOptions<T>,
  ): NgModule {
    validate(isString, name, "name");
    validate(isObject, options, "options");
    this._runBlocks.push([
      _webComponent,
      ($webComponent: WebComponentService) =>
        $webComponent.define<T>(name, options),
    ]);

    return this;
  }

  /**
   * Register a topic-bound event bus facade as an injectable service.
   *
   * Events published through the facade are namespaced as `${topic}:${event}`,
   * keeping raw event-bus topic strings out of application services.
   *
   * @param {string} name - Injectable name.
   * @param {string} topic - Base event-bus topic prefix.
   * @returns {NgModule}
   */
  topic(name: string, topic: string): NgModule {
    validate(isString, name, "name");
    validate(isString, topic, "topic");
    this._invokeQueue.push([
      _provide,
      "factory",
      [
        name,
        [
          _eventBus,
          ($eventBus: PubSub): TopicService =>
            createTopicService($eventBus, topic),
        ],
      ],
    ]);

    return this;
  }
}

function normalizeStateDeclaration(
  nameOrDefinition: string | StateDeclaration,
  definition?: Omit<StateDeclaration, "name">,
): StateDeclaration {
  if (isString(nameOrDefinition)) {
    validate(isObject, definition, "definition");

    const namedDefinition = definition as StateDeclaration;

    if (
      isDefined(namedDefinition.name) &&
      namedDefinition.name !== nameOrDefinition
    ) {
      throw new Error(
        `State name '${namedDefinition.name}' does not match '${nameOrDefinition}'`,
      );
    }

    return { ...namedDefinition, name: nameOrDefinition };
  }

  validate(isObject, nameOrDefinition, "definition");

  return nameOrDefinition;
}
