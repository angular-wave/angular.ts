import { $injectTokens as $t } from "../../../injection-tokens.ts";
import { createWorkerConnection } from "../../../directive/worker/worker.ts";
import {
  instantiateWasm,
  isFunction,
  isString,
  isDefined,
  isObject,
  isArray,
} from "../../../shared/utils.ts";
import { isInjectable } from "../../../shared/predicates.ts";
import { validate, validateRequired } from "../../../shared/validate.ts";
import type { Injectable } from "../../../interface.ts";

type InvokeQueueItem = [string, string, any[]];

type WasmOptions = { raw?: boolean; [key: string]: any };

/**
 * Modules are collections of application configuration information for components:
 * controllers, directives, filters, etc. They provide recipes for the injector
 * to do the actual instantiation. A module itself has no behaviour but only state.
 * A such, it acts as a data structure between the Angular instance and the injector service.
 */
export class NgModule {
  name: string;
  _requires: string[];
  _invokeQueue: InvokeQueueItem[];
  _configBlocks: InvokeQueueItem[];
  _runBlocks: Array<Injectable<(...args: any[]) => any>>;
  _services: string[];
  _restDefinitions: Array<ng.RestDefinition<any>>;

  /**
   * @param {string} name - Name of the module
   * @param {Array<string>} requires - List of modules which the injector will load before the current module
   * @param {ng.Injectable<any>} [configFn]
   */
  constructor(
    name: string,
    requires: string[],
    configFn?: Injectable<(...args: any[]) => any>,
  ) {
    validate(isString, name, "name");
    validate(isArray, requires, "requires");
    /**
     * @public
     * Name of the current module.
     * @type {string}
     */
    this.name = name;

    /**
     * Array of module names that this module depends on.
     * @ignore
     * @type {string[]}
     */
    this._requires = requires;

    /**
     * Holds a collection of tasks, required to instantiate an angular component
     * @ignore
     * @type {!Array<Array<*>>}
     */
    this._invokeQueue = [];

    /**
     * @ignore
     * @type {!Array<Array<*>>}
     */
    this._configBlocks = [];

    /** @ignore @type {!Array.<ng.Injectable<any>>} */
    this._runBlocks = [];

    if (configFn) {
      this.config(configFn);
    }

    /** @ignore @type {!Array.<ng.Injectable<any>>} */
    this._services = [];

    /** @ignore @type {!Array.<ng.RestDefinition<any>>} */
    this._restDefinitions = [];
  }

  /**
   * @param {string} name
   * @param {any} object - Allows undefined
   * @returns {NgModule}
   */
  value(name: string, object: any): NgModule {
    validate(isString, name, "name");

    this._invokeQueue.push([$t._provide, "value", [name, object]]);

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

    this._invokeQueue.unshift([$t._provide, "constant", [name, object]]);

    return this;
  }

  /**
   *
   * @param {ng.Injectable<any>} configFn
   * @returns {NgModule}
   */
  config(configFn: Injectable<(...args: any[]) => any>): NgModule {
    validate(isInjectable, configFn, "configFn");

    this._configBlocks.push([$t._injector, "invoke", [configFn]]);

    return this;
  }

  /**
   * @param {ng.Injectable<any>} block
   * @returns {NgModule}
   */
  run(block: Injectable<(...args: any[]) => any>): NgModule {
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

    this._invokeQueue.push([$t._compileProvider, "component", [name, options]]);

    return this;
  }

  /**
   * @param {string} name
   * @param {ng.Injectable<any>} providerFunction
   * @returns {NgModule}
   */
  factory(
    name: string,
    providerFunction: Injectable<(...args: any[]) => any>,
  ): NgModule {
    validate(isString, name, "name");
    validateRequired(providerFunction, "providerFunction");
    this._invokeQueue.push([$t._provide, "factory", [name, providerFunction]]);

    return this;
  }

  /**
   * @param {string} name
   * @param {ng.Injectable<any>} serviceFunction
   * @returns {NgModule}
   */
  service(
    name: string,
    serviceFunction: Injectable<(...args: any[]) => any>,
  ): NgModule {
    validate(isString, name, "name");
    validateRequired(serviceFunction, "serviceFunction");
    this._services.push(name);
    this._invokeQueue.push([$t._provide, "service", [name, serviceFunction]]);

    return this;
  }

  /**
   * @param {string} name
   * @param {ng.Injectable<any>} providerType
   * @returns {NgModule}
   */
  provider(
    name: string,
    providerType: Injectable<(...args: any[]) => any>,
  ): NgModule {
    validate(isString, name, "name");
    validateRequired(providerType, "providerType");
    this._invokeQueue.push([$t._provide, "provider", [name, providerType]]);

    return this;
  }

  /**
   * @param {string} name
   * @param {ng.Injectable<any>} decorFn
   * @returns {NgModule}
   */
  decorator(
    name: string,
    decorFn: Injectable<(...args: any[]) => any>,
  ): NgModule {
    validate(isString, name, "name");
    validateRequired(decorFn, "decorFn");
    this._configBlocks.push([$t._provide, "decorator", [name, decorFn]]);

    return this;
  }

  /**
   * @param {string} name
   * @param {ng.Injectable<any>} directiveFactory
   * @returns {NgModule}
   */
  directive(
    name: string,
    directiveFactory: Injectable<(...args: any[]) => any>,
  ): NgModule {
    validate(isString, name, "name");
    validateRequired(directiveFactory, "directiveFactory");
    this._invokeQueue.push([
      $t._compileProvider,
      "directive",
      [name, directiveFactory],
    ]);

    return this;
  }

  /**
   * @param {string} name
   * @param {ng.Injectable<any>} animationFactory
   * @returns {NgModule}
   */
  animation(
    name: string,
    animationFactory: Injectable<(...args: any[]) => any>,
  ): NgModule {
    validate(isString, name, "name");
    validateRequired(animationFactory, "animationFactory");
    this._invokeQueue.push([
      $t._animateProvider,
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
    this._invokeQueue.push([$t._filterProvider, "register", [name, filterFn]]);

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
    this._invokeQueue.push([$t._controllerProvider, "register", [name, ctlFn]]);

    return this;
  }

  /**
   * Register a named WebAssembly module that will be instantiated via $provide.
   *
   * @param {string} name - The injectable name used to access the instantiated WebAssembly module.
   *
   * @param {string} src - URL of the `.wasm` file to fetch and instantiate.
   *
   * @param {Object<string, any>} [imports] WebAssembly import object, passed to `WebAssembly.instantiate` or  `WebAssembly.instantiateStreaming`.
   *
   * @param {Object<string, any>} [opts] - Configuration object.
   *
   *   Supported keys:
   *   - **raw**: `boolean`
   *       - `false` (default): the injectable resolves to `instance.exports`
   *         (ideal for plain WASM modules).
   *       - `true`: the injectable resolves to the full instantiation result:
   *         `{ instance, exports, module }`
   *         (required for runtimes such as Go, Emscripten, wasm-bindgen, etc).
   *
   * @returns {NgModule}
   */
  wasm(
    name: string,
    src: string,
    imports: Record<string, any> = {},
    opts: WasmOptions = {},
  ): NgModule {
    validate(isString, name, "name");
    validate(isString, src, "src");
    const raw = !!opts.raw;

    this._invokeQueue.push([
      $t._provide,
      "provider",
      [
        name,
        class {
          $get() {
            return instantiateWasm(src, imports).then((result) =>
              raw ? result : result.exports,
            );
          }
        },
      ],
    ]);

    return this;
  }

  /**
   * Register a named worker that will be instantiated via $provide.
   *
   * @param {string} name
   * @param {string | URL} scriptPath
   * @param {ng.WorkerConfig} [config]
   * @returns {NgModule}
   */
  worker(
    name: string,
    scriptPath: string | URL,
    config?: ng.WorkerConfig,
  ): NgModule {
    validate(isString, name, "name");
    validate(isString, scriptPath, "scriptPath");
    this._invokeQueue.push([
      $t._provide,
      "provider",
      [
        name,
        class {
          $get = () => createWorkerConnection(scriptPath, config);
        },
      ],
    ]);

    return this;
  }

  /**
   * @param {string} name
   * @param {Function|Object} ctor - A regular function, an arrow function or an object
   * @param {ng.StorageType} type
   * @param {ng.StorageBackend} [backendOrConfig]
   * @returns {NgModule}
   */
  store(
    name: string,
    ctor: Function | object,
    type: ng.StorageType,
    backendOrConfig?: ng.StorageBackend,
  ): NgModule {
    validate(isString, name, "name");
    validateRequired(ctor, "ctor");
    this._invokeQueue.push([
      $t._provide,
      "store",
      [name, isObject(ctor) ? () => ctor : ctor, type, backendOrConfig],
    ]);

    return this;
  }

  /**
   * @template T, ID
   * Register a REST resource during module configuration.
   * @param {string} name - Service name
   * @param {string} url - Base URL or URI template
   * @param {ng.EntityClass<T>} entityClass - Optional constructor for mapping JSON
   * @param {Object=} options - Optional RestService options (interceptors, etc)
   * @returns {NgModule}
   */
  rest<T, ID>(
    name: string,
    url: string,
    entityClass: ng.EntityClass<T>,
    options: Record<string, any> = {},
  ): NgModule {
    validate(isString, name, "name");
    validate(isString, url, "url");
    validate(isFunction, entityClass, "entityClass");
    /** @type {ng.RestDefinition<T>} */
    const def = { name, url, entityClass, options };

    this._restDefinitions.push(def);

    // push provider/factory to invokeQueue
    this._invokeQueue.push([
      $t._provide,
      "factory",
      [
        name,
        [
          $t._rest,
          (
            $rest: (
              baseUrl: string,
              entityClass?: Function,
              options?: object,
            ) => ng.RestService<T, ID>,
          ) => $rest(url, entityClass, options),
        ],
      ],
    ]);

    return this;
  }

  /**
   * Register a pre-configured SSE connection during module configuration.
   *
   * @param {string} name - Injectable name
   * @param {string} url - SSE endpoint
   * @param {ng.SseConfig} [options] - Optional SSE config
   * @returns {NgModule}
   */
  sse(name: string, url: string, options: ng.SseConfig = {}): NgModule {
    validate(isString, name, "name");
    validate(isString, url, "url");

    this._invokeQueue.push([
      $t._provide,
      "factory",
      [name, [$t._sse, ($sse: ng.SseService) => $sse(url, options)]],
    ]);

    return this;
  }

  /**
   * Register a pre-configured WebSocket connection during module configuration.
   *
   * @param {string} name - Injectable name
   * @param {string} url - WebSocket endpoint
   * @param {string[]} [protocols] - Optional subprotocols
   * @param {ng.WebSocketConfig} [options] - Optional WebSocket configuration
   * @returns {NgModule}
   */
  websocket(
    name: string,
    url: string,
    protocols: string[] = [],
    options: ng.WebSocketConfig = {},
  ): NgModule {
    validate(isString, name, "name");
    validate(isString, url, "url");

    this._invokeQueue.push([
      $t._provide,
      "factory",
      [
        name,
        [
          $t._websocket,
          ($ws: ng.WebSocketService) => $ws(url, protocols, options),
        ],
      ],
    ]);

    return this;
  }
}
