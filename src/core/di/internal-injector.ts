import {
  hasOwn,
  isArray,
  isArrowFunction,
  minErr,
} from "../../shared/utils.ts";
import type { AnnotatedFactory } from "../../interface.ts";
import { annotate, isClass } from "./di.ts";
import { $injectTokens } from "../../injection-tokens.ts";
import type { ProviderCache } from "./injector.ts";
import type { NgModule } from "./ng-module/ng-module.ts";

const $injectorMinErr = minErr($injectTokens._injector);

const providerSuffix = "Provider";

const INSTANTIATING = true;
type InjectableFn = Function | AnnotatedFactory<(...args: any[]) => any>;

class AbstractInjector {
  _cache: Record<string, any>;
  strictDi: boolean;
  _path: string[];
  _modules: Record<string, NgModule>;

  /**
   * Creates the base injector state shared by provider and instance injectors.
   */
  constructor(strictDi: boolean) {
    this._cache = {};
    this.strictDi = strictDi;
    this._path = [];
    this._modules = {};
  }

  /**
   * Get a service by name.
   */
  get(serviceName: string): any {
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
   */
  _injectionArgs(
    fn: InjectableFn,
    locals?: Record<string, any>,
    serviceName?: string,
  ): any[] {
    const args: any[] = [];

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
   */
  invoke(
    fn: InjectableFn | string,
    self?: any,
    locals?: Record<string, any> | string,
    serviceName?: string,
  ): any {
    if (typeof locals === "string") {
      serviceName = locals;
      locals = undefined;
    }

    const invocationLocals = locals as Record<string, any> | undefined;
    const args = this._injectionArgs(
      fn as InjectableFn,
      invocationLocals,
      serviceName,
    );

    if (isArray(fn)) {
      fn = fn[fn.length - 1];
    }

    if (isClass(fn as Function)) {
      const boundArgs = [null, ...args] as [any, ...any[]];

      return new (Function.prototype.bind.apply(fn as Function, boundArgs))();
    } else {
      return (fn as Function).apply(self, args);
    }
  }

  /**
   * Instantiate a type constructor with optional locals.
   */
  instantiate(
    type: InjectableFn,
    locals?: Record<string, any>,
    serviceName?: string,
  ): any {
    // Check if type is annotated and use just the given function at n-1 as parameter
    // e.g. someModule.factory('greeter', ['$window', function(renamed$window) {}]);
    const ctor = (isArray(type) ? type[type.length - 1] : type) as Function;

    const args = this._injectionArgs(type, locals, serviceName);

    // Empty object at position 0 is ignored for invocation with `new`, but required.
    const boundArgs = [null, ...args] as [any, ...any[]];

    try {
      return new (Function.prototype.bind.apply(ctor as Function, boundArgs))();
    } catch (err) {
      // try arrow function
      if (isArrowFunction(ctor)) {
        return (ctor as (...args: any[]) => any)(args);
      } else {
        throw err;
      }
    }
  }

  /**
   * @abstract
   * Resolves one service name from the injector-specific backing store.
   */
  // eslint-disable-next-line no-unused-vars
  factory(_serviceName: string): any {
    /* empty */
  }
}

/**
 * Injector for providers
 */
export class ProviderInjector extends AbstractInjector {
  /**
   * Creates the provider injector over the shared provider cache.
   */
  constructor(cache: ProviderCache, strictDi: boolean) {
    super(strictDi);
    this._cache = cache;
  }

  /**
   * Factory method for creating services.
   * @param caller - The name of the caller requesting the service.
   * @throws {Error} If the provider is unknown.
   */
  factory(caller: string): never {
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
  loadNewModules: (
    mods: Array<Function | string | AnnotatedFactory<(...args: any[]) => any>>,
  ) => void = () => {
    /* empty */
  };
  _providerInjector: ProviderInjector;

  /**
   * Creates the runtime injector backed by the provider injector.
   */
  constructor(providerInjector: ProviderInjector, strictDi: boolean) {
    super(strictDi);

    this._providerInjector = providerInjector;
    this._modules = providerInjector._modules;
  }

  /**
   * Instantiates one runtime service from its provider.
   */
  factory(serviceName: string): any {
    const provider = this._providerInjector.get(serviceName + providerSuffix);

    return this.invoke(provider.$get, provider, undefined, serviceName);
  }

  /**
   * Returns whether the injector can provide a service by this name.
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
