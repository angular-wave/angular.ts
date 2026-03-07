import type { Injectable } from "../../../interface.ts";
type InvokeQueueItem = [string, string, any[]];
type WasmOptions = {
  raw?: boolean;
  [key: string]: any;
};
/**
 * Modules are collections of application configuration information for components:
 * controllers, directives, filters, etc. They provide recipes for the injector
 * to do the actual instantiation. A module itself has no behaviour but only state.
 * A such, it acts as a data structure between the Angular instance and the injector service.
 */
export declare class NgModule {
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
  );
  /**
   * @param {string} name
   * @param {any} object - Allows undefined
   * @returns {NgModule}
   */
  value(name: string, object: any): NgModule;
  /**
   * @param {string} name
   * @param {Object|string|number} object
   * @returns {NgModule}
   */
  constant(name: string, object: object | string | number): NgModule;
  /**
   *
   * @param {ng.Injectable<any>} configFn
   * @returns {NgModule}
   */
  config(configFn: Injectable<(...args: any[]) => any>): NgModule;
  /**
   * @param {ng.Injectable<any>} block
   * @returns {NgModule}
   */
  run(block: Injectable<(...args: any[]) => any>): NgModule;
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
  factory(
    name: string,
    providerFunction: Injectable<(...args: any[]) => any>,
  ): NgModule;
  /**
   * @param {string} name
   * @param {ng.Injectable<any>} serviceFunction
   * @returns {NgModule}
   */
  service(
    name: string,
    serviceFunction: Injectable<(...args: any[]) => any>,
  ): NgModule;
  /**
   * @param {string} name
   * @param {ng.Injectable<any>} providerType
   * @returns {NgModule}
   */
  provider(
    name: string,
    providerType: Injectable<(...args: any[]) => any>,
  ): NgModule;
  /**
   * @param {string} name
   * @param {ng.Injectable<any>} decorFn
   * @returns {NgModule}
   */
  decorator(
    name: string,
    decorFn: Injectable<(...args: any[]) => any>,
  ): NgModule;
  /**
   * @param {string} name
   * @param {ng.Injectable<any>} directiveFactory
   * @returns {NgModule}
   */
  directive(
    name: string,
    directiveFactory: Injectable<(...args: any[]) => any>,
  ): NgModule;
  /**
   * @param {string} name
   * @param {ng.Injectable<any>} animationFactory
   * @returns {NgModule}
   */
  animation(
    name: string,
    animationFactory: Injectable<(...args: any[]) => any>,
  ): NgModule;
  /**
   * @param {string} name
   * @param {ng.FilterFactory} filterFn
   * @return {NgModule}
   */
  filter(name: string, filterFn: ng.FilterFactory): NgModule;
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
  ): NgModule;
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
    imports?: Record<string, any>,
    opts?: WasmOptions,
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
    options?: Record<string, any>,
  ): NgModule;
  /**
   * Register a pre-configured SSE connection during module configuration.
   *
   * @param {string} name - Injectable name
   * @param {string} url - SSE endpoint
   * @param {ng.SseConfig} [options] - Optional SSE config
   * @returns {NgModule}
   */
  sse(name: string, url: string, options?: ng.SseConfig): NgModule;
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
    protocols?: string[],
    options?: ng.WebSocketConfig,
  ): NgModule;
}
export {};
