import { hasOwn, minErr } from "../../shared/utils.js";
import { annotate, isClass } from "./di.js";
import { INJECTOR_LITERAL } from "./ng-module/ng-module.js";

const $injectorMinErr = minErr(INJECTOR_LITERAL);

const providerSuffix = "Provider";
const INSTANTIATING = true;

class AbstractInjector {
  /**
   * @param {boolean} strictDi - Indicates if strict dependency injection is enforced.
   */
  constructor(strictDi) {
    /**
     * @type {Object<String, Function>}
     */
    this.cache = {};
    /** @type {boolean} */
    this.strictDi = strictDi;
    /** @type {string[]} */
    this.path = [];
    /** @type {Object.<string, ng.NgModule>} */
    this.modules = {};
  }

  /**
   * Get a service by name.
   *
   * @param {string} serviceName
   * @returns {any}
   */
  get(serviceName) {
    if (hasOwn(this.cache, serviceName)) {
      if (this.cache[serviceName] === INSTANTIATING) {
        throw $injectorMinErr(
          "cdep",
          "Circular dependency found: {0}",
          `${serviceName} <- ${this.path.join(" <- ")}`,
        );
      }
      return this.cache[serviceName];
    }

    this.path.unshift(serviceName);
    this.cache[serviceName] = INSTANTIATING;
    try {
      this.cache[serviceName] = this.factory(serviceName);
    } catch (err) {
      // this is for the error handling being thrown by the providerCache multiple times
      delete this.cache[serviceName];
      throw err;
    }
    return this.cache[serviceName];
  }

  /**
   * Get the injection arguments for a function.
   *
   * @param {Function|Array} fn
   * @param {Object} locals
   * @param {string} serviceName
   * @returns
   */
  injectionArgs(fn, locals, serviceName) {
    const args = [];
    const $inject = annotate(fn, this.strictDi, serviceName);

    for (let i = 0, { length } = $inject; i < length; i++) {
      const key = $inject[i];
      if (typeof key !== "string") {
        throw $injectorMinErr(
          "itkn",
          "Incorrect injection token! Expected service name as string, got {0}",
          key,
        );
      }
      args.push(locals && hasOwn(locals, key) ? locals[key] : this.get(key));
    }
    return args;
  }

  /**
   * Invoke a function with optional context and locals.
   *
   * @param {Function|String|Array<any>} fn
   * @param {*} [self]
   * @param {Object} [locals]
   * @param {string} [serviceName]
   * @returns {*}
   */
  invoke(fn, self, locals, serviceName) {
    if (typeof locals === "string") {
      serviceName = locals;
      locals = null;
    }

    const args = this.injectionArgs(
      /** @type {Function} */ (fn),
      locals,
      serviceName,
    );
    if (Array.isArray(fn)) {
      fn = fn[fn.length - 1];
    }

    if (isClass(/** @type {Function} */ (fn))) {
      args.unshift(null);
      return new (Function.prototype.bind.apply(fn, args))();
    } else {
      return /** @type {Function} */ (fn).apply(self, args);
    }
  }

  /**
   * Instantiate a type constructor with optional locals.
   * @param {Function|Array} type
   * @param {*} [locals]
   * @param {string} [serviceName]
   */
  instantiate(type, locals, serviceName) {
    // Check if type is annotated and use just the given function at n-1 as parameter
    // e.g. someModule.factory('greeter', ['$window', function(renamed$window) {}]);
    const ctor = Array.isArray(type) ? type[type.length - 1] : type;
    const args = this.injectionArgs(type, locals, serviceName);
    // Empty object at position 0 is ignored for invocation with `new`, but required.
    args.unshift(null);
    return new (Function.prototype.bind.apply(ctor, args))();
  }

  /**
   * @abstract
   */
  loadNewModules() {}

  /**
   * @abstract
   * @param {string} _serviceName
   * @returns {any}
   */
  factory(_serviceName) {
    console.error(`Unhandled ${_serviceName}`);
  }
}

/**
 * Injector for providers
 */
export class ProviderInjector extends AbstractInjector {
  /**
   * @param {Object} cache
   * @param {boolean} strictDi - Indicates if strict dependency injection is enforced.
   */
  constructor(cache, strictDi) {
    super(strictDi);
    this.cache = cache;
  }

  /**
   * Factory method for creating services.
   * @param {string} caller - The name of the caller requesting the service.
   * @throws {Error} If the provider is unknown.
   */
  factory(caller) {
    this.path.push(caller);
    // prevents lookups to providers through get
    throw $injectorMinErr(
      "unpr",
      "Unknown provider: {0}",
      this.path.join(" <- "),
    );
  }

  loadNewModules() {}
}

/**
 * Injector for factories and services
 */
export class InjectorService extends AbstractInjector {
  /**
   * @param {ProviderInjector} providerInjector
   * @param {boolean} strictDi - Indicates if strict dependency injection is enforced.
   */
  constructor(providerInjector, strictDi) {
    super(strictDi);

    /** @type {ProviderInjector} */
    this.providerInjector = providerInjector;
    /** @type {Object.<string, ng.NgModule>} */
    this.modules = providerInjector.modules;
  }

  /**
   * @param {string} serviceName
   * @returns {*}
   */
  factory(serviceName) {
    const provider = this.providerInjector.get(serviceName + providerSuffix);
    return this.invoke(provider.$get, provider, undefined, serviceName);
  }

  /**
   *
   * @param {string} name
   * @returns {boolean}
   */
  has(name) {
    const hasProvider = hasOwn(
      this.providerInjector.cache,
      name + providerSuffix,
    );
    const hasCache = hasOwn(this.cache, name);
    return hasProvider || hasCache;
  }

  loadNewModules() {}
}
