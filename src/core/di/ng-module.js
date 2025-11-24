import { $injectTokens as $t } from "../../injection-tokens.js";
import {
  isFunction,
  isString,
  assert,
  instantiateWasm,
} from "../../shared/utils.js";

/** @private */
export const INJECTOR_LITERAL = "$injector";
/** @private */
export const COMPILE_LITERAL = "$compileProvider";
/** @private */
export const ANIMATION_LITERAL = "$animateProvider";
/** @private */
export const FILTER_LITERAL = "$filterProvider";
/** @private */
export const CONTROLLER_LITERAL = "$controllerProvider";

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
   * @param {import("../../interface.ts").Injectable<any>} [configFn]
   */
  constructor(name, requires, configFn) {
    assert(isString(name), "name required");
    assert(Array.isArray(requires), "requires array required");
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

    /** @type {!Array.<import("../../interface.ts").Injectable<any>>} */
    this.runBlocks = [];

    if (configFn) {
      this.config(configFn);
    }

    this.services = [];

    this.wasmModules = [];
  }

  /**
   * @param {string} name
   * @param {any} object
   * @returns {NgModule}
   */
  value(name, object) {
    this.invokeQueue.push([$t.$provide, "value", [name, object]]);
    return this;
  }

  /**
   * @param {string} name
   * @param {any} object
   * @returns {NgModule}
   */
  constant(name, object) {
    this.invokeQueue.unshift([$t.$provide, "constant", [name, object]]);
    return this;
  }

  /**
   *
   * @param {import("../../interface.ts").Injectable<any>} configFn
   * @returns {NgModule}
   */
  config(configFn) {
    this.configBlocks.push([INJECTOR_LITERAL, "invoke", [configFn]]);
    return this;
  }

  /**
   * @param {import("../../interface.ts").Injectable<any>} block
   * @returns {NgModule}
   */
  run(block) {
    this.runBlocks.push(block);
    return this;
  }

  /**
   * @param {string} name
   * @param {import("../../interface.ts").Component} options
   * @returns {NgModule}
   */
  component(name, options) {
    if (options && isFunction(options)) {
      options["$$moduleName"] = name;
    }
    this.invokeQueue.push([COMPILE_LITERAL, "component", [name, options]]);
    return this;
  }

  /**
   * @param {string} name
   * @param {import("../../interface.ts").Injectable<any>} providerFunction
   * @returns {NgModule}
   */
  factory(name, providerFunction) {
    if (providerFunction && isFunction(providerFunction)) {
      providerFunction["$$moduleName"] = name;
    }
    this.invokeQueue.push([$t.$provide, "factory", [name, providerFunction]]);
    return this;
  }

  /**
   * @param {string} name
   * @param {import("../../interface.ts").Injectable<any>} serviceFunction
   * @returns {NgModule}
   */
  service(name, serviceFunction) {
    if (serviceFunction && isFunction(serviceFunction)) {
      serviceFunction["$$moduleName"] = name;
    }
    this.services.push(name);
    this.invokeQueue.push([$t.$provide, "service", [name, serviceFunction]]);
    return this;
  }

  /**
   * @param {string} name
   * @param {import("../../interface.ts").Injectable<any>} providerType
   * @returns {NgModule}
   */
  provider(name, providerType) {
    if (providerType && isFunction(providerType)) {
      providerType["$$moduleName"] = name;
    }
    this.invokeQueue.push([$t.$provide, "provider", [name, providerType]]);
    return this;
  }

  /**
   * @param {string} name
   * @param {import("../../interface.ts").Injectable<any>} decorFn
   * @returns {NgModule}
   */
  decorator(name, decorFn) {
    if (decorFn && isFunction(decorFn)) {
      decorFn["$$moduleName"] = name;
    }
    this.configBlocks.push([$t.$provide, "decorator", [name, decorFn]]);
    return this;
  }

  /**
   * @param {string} name
   * @param {import("../../interface.ts").Injectable<any>} directiveFactory
   * @returns {NgModule}
   */
  directive(name, directiveFactory) {
    if (directiveFactory && isFunction(directiveFactory)) {
      directiveFactory["$$moduleName"] = name;
    }
    this.invokeQueue.push([
      COMPILE_LITERAL,
      "directive",
      [name, directiveFactory],
    ]);
    return this;
  }

  /**
   * @param {string} name
   * @param {import("../../interface.ts").Injectable<any>} animationFactory
   * @returns {NgModule}
   */
  animation(name, animationFactory) {
    if (animationFactory && isFunction(animationFactory)) {
      animationFactory["$$moduleName"] = name;
    }
    this.invokeQueue.push([
      ANIMATION_LITERAL,
      "register",
      [name, animationFactory],
    ]);
    return this;
  }

  /**
   * @param {string} name
   * @param {import("../../interface.ts").Injectable<any>} filterFn
   * @return {NgModule}
   */
  filter(name, filterFn) {
    if (filterFn && isFunction(filterFn)) {
      filterFn["$$moduleName"] = name;
    }
    this.invokeQueue.push([FILTER_LITERAL, "register", [name, filterFn]]);
    return this;
  }

  /**
   * @param {string} name
   * @param {import("../../interface.ts").Injectable<any>} ctlFn
   * @returns {NgModule}
   */
  controller(name, ctlFn) {
    if (ctlFn && isFunction(ctlFn)) {
      ctlFn["$$moduleName"] = name;
    }
    this.invokeQueue.push([CONTROLLER_LITERAL, "register", [name, ctlFn]]);
    return this;
  }

  /**
   * @param {string} name
   * @param {string} src
   * @returns {NgModule}
   */
  wasm(name, src) {
    this.invokeQueue.push([
      $t.$provide,
      "wasm",
      [name, (async () => instantiateWasm(src))()],
    ]);
    return this;
  }
}
