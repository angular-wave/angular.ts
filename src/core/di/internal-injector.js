import {
  hasOwn,
  isArray,
  isArrowFunction,
  minErr,
} from "../../shared/utils.js";
import { annotate, isClass } from "./di.js";
import { $injectTokens } from "../../injection-tokens.js";

const $injectorMinErr = minErr($injectTokens._injector);

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
    this._cache = {};
    /** @type {boolean} */
    this.strictDi = strictDi;
    /** @type {string[]} */
    this._path = [];
    /** @type {Object.<string, ng.NgModule>} */
    this._modules = {};
  }

  /**
   * Get a service by name.
   *
   * @param {string} serviceName
   * @returns {any}
   */
  get(serviceName) {
    if (hasOwn(this._cache, serviceName)) {
      if (this._cache[serviceName] === INSTANTIATING) {
        throw $injectorMinErr(
          "cdep",
          "Circular dependency found: {0}",
          `${serviceName} <- ${this._path.join(" <- ")}`,
        );
      }

      return this._cache[serviceName];
    }

    this._path.unshift(serviceName);
    this._cache[serviceName] = INSTANTIATING;

    try {
      this._cache[serviceName] = this.factory(serviceName);
    } catch (err) {
      // this is for the error handling being thrown by the providerCache multiple times
      delete this._cache[serviceName];
      throw err;
    }

    return this._cache[serviceName];
  }

  /**
   * Get the injection arguments for a function.
   *
   * @param {Function|ng.AnnotatedFactory<any>} fn
   * @param {Object & Record<string, any>} [locals]
   * @param {string} [serviceName]
   * @returns
   */
  _injectionArgs(fn, locals, serviceName) {
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
   * @param {Function|String|ng.AnnotatedFactory<any>} fn
   * @param {*} [self]
   * @param {Object} [locals]
   * @param {string} [serviceName]
   * @returns {*}
   */
  invoke(fn, self, locals, serviceName) {
    if (typeof locals === "string") {
      serviceName = locals;
      locals = undefined;
    }

    const args = this._injectionArgs(
      /** @type {Function} */ (fn),
      locals,
      serviceName,
    );

    if (isArray(fn)) {
      fn = fn[fn.length - 1];
    }

    if (isClass(/** @type {Function} */ (fn))) {
      args.unshift(null);

      return new (Function.prototype.bind.apply(
        /** @type {Function} */ (fn),
        /** @type {[any, ...any[]]} */ (args),
      ))();
    } else {
      return /** @type {Function} */ (fn).apply(self, args);
    }
  }

  /**
   * Instantiate a type constructor with optional locals.
   * @param {Function|ng.AnnotatedFactory<any>} type
   * @param {*} [locals]
   * @param {string} [serviceName]
   */
  instantiate(type, locals, serviceName) {
    // Check if type is annotated and use just the given function at n-1 as parameter
    // e.g. someModule.factory('greeter', ['$window', function(renamed$window) {}]);
    const ctor = isArray(type) ? type[type.length - 1] : type;

    const args = this._injectionArgs(type, locals, serviceName);

    // Empty object at position 0 is ignored for invocation with `new`, but required.
    args.unshift(null);

    try {
      return new (Function.prototype.bind.apply(
        ctor,
        /** @type {[any, ...any[]]} */ (args),
      ))();
    } catch (err) {
      // try arrow function
      if (isArrowFunction(ctor)) {
        return ctor(args);
      } else {
        throw err;
      }
    }
  }

  /**
   * @abstract
   * @param {string} _serviceName
   * @returns {any}
   */
  // eslint-disable-next-line no-unused-vars
  factory(_serviceName) {
    /* empty */
  }
}

/**
 * Injector for providers
 */
export class ProviderInjector extends AbstractInjector {
  /**
   * @param {import('./interface.ts').ProviderCache} cache
   * @param {boolean} strictDi - Indicates if strict dependency injection is enforced.
   */
  constructor(cache, strictDi) {
    super(strictDi);
    this._cache = cache;
  }

  /**
   * Factory method for creating services.
   * @param {string} caller - The name of the caller requesting the service.
   * @throws {Error} If the provider is unknown.
   */
  factory(caller) {
    this._path.push(caller);
    // prevents lookups to providers through get
    throw $injectorMinErr(
      "unpr",
      "Unknown provider: {0}",
      this._path.join(" <- "),
    );
  }
}

/**
 * Injector for factories and services
 */
export class InjectorService extends AbstractInjector {
  /** @type {(mods: Array<Function | string | ng.AnnotatedFactory<any>>) => void} */
  loadNewModules = () => {
    /* empty */
  };

  /**
   * @param {ProviderInjector} providerInjector
   * @param {boolean} strictDi - Indicates if strict dependency injection is enforced.
   */
  constructor(providerInjector, strictDi) {
    super(strictDi);

    /** @private @type {ProviderInjector} */
    this._providerInjector = providerInjector;
    /** @private @type {Object.<string, ng.NgModule>} */
    this._modules = providerInjector._modules;
  }

  /**
   * @param {string} serviceName
   * @returns {*}
   */
  factory(serviceName) {
    const provider = this._providerInjector.get(serviceName + providerSuffix);

    return this.invoke(provider.$get, provider, undefined, serviceName);
  }

  /**
   *
   * @param {string} name
   * @returns {boolean}
   */
  has(name) {
    const hasProvider = hasOwn(
      this._providerInjector._cache,
      name + providerSuffix,
    );

    const hasCache = hasOwn(this._cache, name);

    return hasProvider || hasCache;
  }
}
