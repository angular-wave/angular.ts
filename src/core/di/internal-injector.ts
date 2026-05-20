import { _injector } from "../../injection-tokens.ts";
import {
  callFunction,
  hasOwn,
  isArray,
  isArrowFunction,
  createErrorFactory,
  deleteProperty,
  isString,
} from "../../shared/utils.ts";
import type { AnnotatedFactory, Constructor } from "../../interface.ts";
import type { RuntimeFunction } from "../../shared/utils.ts";
import { annotate, isClass } from "./di.ts";
import type { ProviderCache } from "./interface.ts";
import type { NgModule } from "./ng-module/ng-module.ts";

const $injectorError = createErrorFactory(_injector);

export const providerSuffix = "Provider";

type Dynamic = ReturnType<typeof JSON.parse>;

type Callable = (...args: Dynamic[]) => unknown;

type InjectableFn =
  | Callable
  | Constructor
  | AnnotatedFactory<Callable>
  | (string | Callable | Constructor)[];

const defaultLoadNewModules = (): void => {
  /* empty */
};

abstract class AbstractInjector {
  /** @internal */
  _cache: Record<string, unknown>;
  strictDi: boolean;
  /** @internal */
  _path: string[];
  /** @internal */
  _modules: Record<string, NgModule>;

  /**
   * @param {boolean} strictDi - Indicates if strict dependency injection is enforced.
   */
  constructor(strictDi: boolean) {
    this._cache = {};
    this.strictDi = strictDi;
    this._path = [];
    this._modules = {};
  }

  /**
   * Get a service by name.
   *
   * @param {string} serviceName
   * @returns {any}
   */
  get(serviceName: string): unknown {
    if (hasOwn(this._cache, serviceName)) {
      if (this._cache[serviceName] === true) {
        throw $injectorError(
          "cdep",
          "Circular dependency found: {0}",
          `${serviceName} <- ${this._path.join(" <- ")}`,
        );
      }

      return this._cache[serviceName];
    }

    this._path.unshift(serviceName);
    this._cache[serviceName] = true;

    try {
      this._cache[serviceName] = this._factory(serviceName);
    } catch (err) {
      // this is for the error handling being thrown by the providerCache multiple times
      deleteProperty(this._cache, serviceName);
      throw err;
    }

    return this._cache[serviceName];
  }

  /**
   * @internal
   * Get the injection arguments for a function.
   *
   * @param {Function|ng.AnnotatedFactory<any>} fn
   * @param {Object & Record<string, any>} [locals]
   * @param {string} [serviceName]
   * @returns
   */
  _injectionArgs(
    fn: InjectableFn,
    locals?: object,
    serviceName?: string,
  ): unknown[] {
    const args: unknown[] = [];

    const $inject = annotate(fn, this.strictDi, serviceName);

    $inject.forEach((key) => {
      if (!isString(key)) {
        throw $injectorError(
          "itkn",
          "Incorrect injection token! Expected service name as string, got {0}",
          key,
        );
      }
      const localValues = locals as Record<string, unknown> | undefined;

      args.push(
        localValues && hasOwn(localValues, key)
          ? localValues[key]
          : this.get(key),
      );
    });

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
  invoke(
    fn: InjectableFn | string,
    self?: unknown,
    locals?: object | string,
    serviceName?: string,
  ): unknown {
    if (isString(locals)) {
      serviceName = locals;
      locals = undefined;
    }

    const invocationLocals = locals;

    const args = this._injectionArgs(
      fn as InjectableFn,
      invocationLocals,
      serviceName,
    );

    if (isArray(fn)) {
      fn = fn[fn.length - 1];
    }

    if (isClass(fn as RuntimeFunction)) {
      return Reflect.construct(fn as Callable, args) as unknown;
    } else {
      return callFunction(fn as RuntimeFunction, self, ...args);
    }
  }

  /**
   * Instantiate a type constructor with optional locals.
   * @param {Function|ng.AnnotatedFactory<any>} type
   * @param {*} [locals]
   * @param {string} [serviceName]
   */
  instantiate(
    type: InjectableFn,
    locals?: object,
    serviceName?: string,
  ): unknown {
    // Check if type is annotated and use just the given function at n-1 as parameter
    // e.g. someModule.factory('greeter', ['$window', function(renamed$window) {}]);
    const ctor = (isArray(type) ? type[type.length - 1] : type) as Callable;

    const args = this._injectionArgs(type, locals, serviceName);

    try {
      return Reflect.construct(ctor, args) as unknown;
    } catch (err) {
      // try arrow function
      if (isArrowFunction(ctor)) {
        return callFunction(ctor, undefined, args);
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

  /** @internal */
  abstract _factory(serviceName: string): unknown;
}

/**
 * Injector for providers
 */
export class ProviderInjector extends AbstractInjector {
  /**
   * @param {ProviderCache} cache
   * @param {boolean} strictDi - Indicates if strict dependency injection is enforced.
   */
  constructor(cache: ProviderCache, strictDi: boolean) {
    super(strictDi);
    this._cache = cache;
  }

  /**
   * @internal
   * Factory method for creating services.
   * @param {string} caller - The name of the caller requesting the service.
   * @throws {Error} If the provider is unknown.
   */
  _factory(caller: string): never {
    this._path.push(caller);
    // prevents lookups to providers through get
    throw $injectorError(
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
  loadNewModules: (
    mods: (string | Callable | AnnotatedFactory<Callable>)[],
  ) => void = defaultLoadNewModules;

  /** @internal */
  _providerInjector: ProviderInjector;

  /**
   * @param {ProviderInjector} providerInjector
   * @param {boolean} strictDi - Indicates if strict dependency injection is enforced.
   */
  constructor(providerInjector: ProviderInjector, strictDi: boolean) {
    super(strictDi);

    this._providerInjector = providerInjector;
    this._modules = providerInjector._modules;
  }

  /**
   * @param {string} serviceName
   * @returns {*}
   */
  /** @internal */
  _factory(serviceName: string): unknown {
    const provider = this._providerInjector.get(
      serviceName + providerSuffix,
    ) as { $get: InjectableFn };

    return this.invoke(provider.$get, provider, undefined, serviceName);
  }

  /**
   *
   * @param {string} name
   * @returns {boolean}
   */
  has(name: string): boolean {
    const hasProvider = hasOwn(
      this._providerInjector._cache,
      name + providerSuffix,
    );

    const hasCache = hasOwn(this._cache, name);

    return hasProvider || hasCache;
  }
}
