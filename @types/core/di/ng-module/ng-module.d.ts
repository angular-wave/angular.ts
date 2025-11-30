/** @private */
export const INJECTOR_LITERAL: "$injector";
/** @private */
export const COMPILE_LITERAL: "$compileProvider";
/** @private */
export const ANIMATION_LITERAL: "$animateProvider";
/** @private */
export const FILTER_LITERAL: "$filterProvider";
/** @private */
export const CONTROLLER_LITERAL: "$controllerProvider";
/**
 * Modules are collections of application configuration information for components:
 * controllers, directives, filters, etc. They provide recipes for the injector
 * to do the actual instantiation. A module itself has no behaviour but only state.
 * A such, it acts as a data structure between the Angular instance and the injector service.
 *
 * Since this is an internal structure that is exposed only via the Angular instance,
 * it contains no validation of the items it receives. It is up to the instantiator on
 * modules to do the actual validation.
 */
export class NgModule {
  /**
   * @param {string} name - Name of the module
   * @param {Array<string>} requires - List of modules which the injector will load before the current module
   * @param {ng.Injectable<any>} [configFn]
   */
  constructor(
    name: string,
    requires: Array<string>,
    configFn?: ng.Injectable<any>,
  );
  /**
   * Name of the current module.
   * @type {string}
   */
  name: string;
  /**
   * Array of module names that this module depends on.
   * @type {string[]}
   */
  requires: string[];
  /**
   * Holds a collection of tasks, required to instantiate an angular component
   * @type {!Array<Array<*>>}
   */
  invokeQueue: Array<Array<any>>;
  /** @type {!Array<Array<*>>} */
  configBlocks: Array<Array<any>>;
  /** @type {!Array.<ng.Injectable<any>>} */
  runBlocks: Array<ng.Injectable<any>>;
  services: any[];
  wasmModules: any[];
  restDefinitions: any[];
  /**
   * @param {string} name
   * @param {any} object
   * @returns {NgModule}
   */
  value(name: string, object: any): NgModule;
  /**
   * @param {string} name
   * @param {any} object
   * @returns {NgModule}
   */
  constant(name: string, object: any): NgModule;
  /**
   *
   * @param {ng.Injectable<any>} configFn
   * @returns {NgModule}
   */
  config(configFn: ng.Injectable<any>): NgModule;
  /**
   * @param {ng.Injectable<any>} block
   * @returns {NgModule}
   */
  run(block: ng.Injectable<any>): NgModule;
  /**
   * @param {string} name
   * @param {ng.Component} options
   * @returns {NgModule}
   */
  component(name: string, options: ng.Component): NgModule;
  /**
   * @param {string} name
   * @param {ng.Injectable<any>} providerFunction
   * @returns {NgModule}
   */
  factory(name: string, providerFunction: ng.Injectable<any>): NgModule;
  /**
   * @param {string} name
   * @param {ng.Injectable<any>} serviceFunction
   * @returns {NgModule}
   */
  service(name: string, serviceFunction: ng.Injectable<any>): NgModule;
  /**
   * @param {string} name
   * @param {ng.Injectable<any>} providerType
   * @returns {NgModule}
   */
  provider(name: string, providerType: ng.Injectable<any>): NgModule;
  /**
   * @param {string} name
   * @param {ng.Injectable<any>} decorFn
   * @returns {NgModule}
   */
  decorator(name: string, decorFn: ng.Injectable<any>): NgModule;
  /**
   * @param {string} name
   * @param {ng.Injectable<any>} directiveFactory
   * @returns {NgModule}
   */
  directive(name: string, directiveFactory: ng.Injectable<any>): NgModule;
  /**
   * @param {string} name
   * @param {ng.Injectable<any>} animationFactory
   * @returns {NgModule}
   */
  animation(name: string, animationFactory: ng.Injectable<any>): NgModule;
  /**
   * @param {string} name
   * @param {ng.Injectable<any>} filterFn
   * @return {NgModule}
   */
  filter(name: string, filterFn: ng.Injectable<any>): NgModule;
  /**
   * @param {string} name
   * @param {ng.Injectable<any>} ctlFn
   * @returns {NgModule}
   */
  controller(name: string, ctlFn: ng.Injectable<any>): NgModule;
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
    imports?: {
      [x: string]: any;
    },
    opts?: {
      [x: string]: any;
    },
  ): NgModule;
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
  ): NgModule;
  /**
   * @param {string} name
   * @param {Function} ctor
   * @returns {NgModule}
   */
  session(name: string, ctor: Function): NgModule;
  /**
   * @param {string} name
   * @param {Function} ctor
   * @returns {NgModule}
   */
  local(name: string, ctor: Function): NgModule;
  /**
   * @param {string} name
   * @param {Function} ctor
   * @returns {NgModule}
   */
  cookie(name: string, ctor: Function): NgModule;
  /**
   * @param {string} name
   * @param {Function} ctor
   * @param {ng.StorageBackend} backendOrConfig
   * @returns {NgModule}
   */
  store(
    name: string,
    ctor: Function,
    backendOrConfig: ng.StorageBackend,
  ): NgModule;
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
    options?: any | undefined,
  ): NgModule;
}
