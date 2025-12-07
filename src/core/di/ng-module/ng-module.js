import { $injectTokens as $t } from "../../../injection-tokens.js";
import { createWorkerConnection } from "../../../directive/worker/worker.js";
import {
  instantiateWasm,
  isFunction,
  isString,
  isDefined,
  isObject,
  isArray,
} from "../../../shared/utils.js";
import { isInjectable } from "../../../shared/predicates.js";
import { validate, validateRequired } from "../../../shared/validate.js";

/**
 * Modules are collections of application configuration information for components:
 * controllers, directives, filters, etc. They provide recipes for the injector
 * to do the actual instantiation. A module itself has no behaviour but only state.
 * A such, it acts as a data structure between the Angular instance and the injector service.
 */
export class NgModule {
  /**
   * @param {string} name - Name of the module
   * @param {Array<string>} requires - List of modules which the injector will load before the current module
   * @param {ng.Injectable<any>} [configFn]
   */
  constructor(name, requires, configFn) {
    validate(isString, name, "name");
    validate(isArray, requires, "requires");
    /**
     * Name of the current module.
     * @type {string}
     */
    this.name = name;

    /**
     * Array of module names that this module depends on.
     * @type {string[]}
     */
    this.requires = requires;

    /**
     * Holds a collection of tasks, required to instantiate an angular component
     * @type {!Array<Array<*>>}
     */
    this.invokeQueue = [];

    /** @type {!Array<Array<*>>} */
    this.configBlocks = [];

    /** @type {!Array.<ng.Injectable<any>>} */
    this.runBlocks = [];

    if (configFn) {
      this.config(configFn);
    }

    this.services = [];

    this.restDefinitions = [];
  }

  /**
   * @param {string} name
   * @param {any} object - Allows undefined
   * @returns {NgModule}
   */
  value(name, object) {
    validate(isString, name, "name");

    this.invokeQueue.push([$t.$provide, "value", [name, object]]);

    return this;
  }

  /**
   * @param {string} name
   * @param {Object|string|number} object
   * @returns {NgModule}
   */
  constant(name, object) {
    validate(isString, name, "name");
    validate(isDefined, object, "object");

    this.invokeQueue.unshift([$t.$provide, "constant", [name, object]]);

    return this;
  }

  /**
   *
   * @param {ng.Injectable<any>} configFn
   * @returns {NgModule}
   */
  config(configFn) {
    validate(isInjectable, configFn, "configFn");

    this.configBlocks.push([$t.$injector, "invoke", [configFn]]);

    return this;
  }

  /**
   * @param {ng.Injectable<any>} block
   * @returns {NgModule}
   */
  run(block) {
    validate(isInjectable, block, "block");

    this.runBlocks.push(block);

    return this;
  }

  /**
   * @param {string} name
   * @param {ng.Component} options
   * @returns {NgModule}
   */
  component(name, options) {
    validate(isString, name, "name");
    validate(isDefined, options, "object");

    this.invokeQueue.push([$t.$compileProvider, "component", [name, options]]);

    return this;
  }

  /**
   * @param {string} name
   * @param {ng.Injectable<any>} providerFunction
   * @returns {NgModule}
   */
  factory(name, providerFunction) {
    validate(isString, name, "name");
    validateRequired(providerFunction, "providerFunction");
    this.invokeQueue.push([$t.$provide, "factory", [name, providerFunction]]);

    return this;
  }

  /**
   * @param {string} name
   * @param {ng.Injectable<any>} serviceFunction
   * @returns {NgModule}
   */
  service(name, serviceFunction) {
    validate(isString, name, "name");
    validateRequired(serviceFunction, "serviceFunction");
    this.services.push(name);
    this.invokeQueue.push([$t.$provide, "service", [name, serviceFunction]]);

    return this;
  }

  /**
   * @param {string} name
   * @param {ng.Injectable<any>} providerType
   * @returns {NgModule}
   */
  provider(name, providerType) {
    validate(isString, name, "name");
    validateRequired(providerType, "providerType");
    this.invokeQueue.push([$t.$provide, "provider", [name, providerType]]);

    return this;
  }

  /**
   * @param {string} name
   * @param {ng.Injectable<any>} decorFn
   * @returns {NgModule}
   */
  decorator(name, decorFn) {
    validate(isString, name, "name");
    validateRequired(decorFn, "decorFn");
    this.configBlocks.push([$t.$provide, "decorator", [name, decorFn]]);

    return this;
  }

  /**
   * @param {string} name
   * @param {ng.Injectable<any>} directiveFactory
   * @returns {NgModule}
   */
  directive(name, directiveFactory) {
    validate(isString, name, "name");
    validateRequired(directiveFactory, "directiveFactory");
    this.invokeQueue.push([
      $t.$compileProvider,
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
  animation(name, animationFactory) {
    validate(isString, name, "name");
    validateRequired(animationFactory, "animationFactory");
    this.invokeQueue.push([
      $t.$animateProvider,
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
  filter(name, filterFn) {
    validate(isString, name, "name");
    validate(isFunction, filterFn, `filterFn`);
    this.invokeQueue.push([$t.$filterProvider, "register", [name, filterFn]]);

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
  controller(name, ctlFn) {
    validate(isString, name, "name");
    validateRequired(ctlFn, `fictlFnlterFn`);
    this.invokeQueue.push([$t.$controllerProvider, "register", [name, ctlFn]]);

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
  wasm(name, src, imports = {}, opts = {}) {
    validate(isString, name, "name");
    validate(isString, src, "src");
    const raw = !!opts.raw;

    this.invokeQueue.push([
      $t.$provide,
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
  worker(name, scriptPath, config) {
    validate(isString, name, "name");
    validate(isString, scriptPath, "scriptPath");
    this.invokeQueue.push([
      $t.$provide,
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
  store(name, ctor, type, backendOrConfig) {
    validate(isString, name, "name");
    validateRequired(ctor, "ctor");
    this.invokeQueue.push([
      $t.$provide,
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
  rest(name, url, entityClass, options = {}) {
    validate(isString, name, "name");
    validate(isString, url, "url");
    validate(isFunction, entityClass, "entityClass");
    const def = { name, url, entityClass, options };

    this.restDefinitions.push(def);

    // push provider/factory to invokeQueue
    this.invokeQueue.push([
      $t.$provide,
      "factory",
      [
        name,
        [
          $t.$rest,
          /** @param {(baseUrl:string, entityClass?:Function, options?:object) => ng.RestService<T, ID>} $rest */ (
            $rest,
          ) => $rest(url, entityClass, options),
        ],
      ],
    ]);

    return this;
  }
}
