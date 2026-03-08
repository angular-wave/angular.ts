import {
  assert,
  assertArgFn,
  assertNotHasOwnProperty,
  entries,
  isArray,
  isFunction,
  isInstanceOf,
  isNullOrUndefined,
  isObject,
  isString,
  isUndefined,
  minErr,
} from "../../shared/utils.js";
import { InjectorService, ProviderInjector } from "./internal-injector.ts";
import { createPersistentProxy } from "../../services/storage/storage.ts";
import { $injectTokens } from "../../injection-tokens.ts";
import { validateArray } from "../../shared/validate.ts";
import type {
  Constructor,
  Injectable,
  ServiceProvider,
} from "../../interface.ts";
import type {
  PersistentStoreConfig,
  ProviderCache,
  StorageLike,
} from "./interface.ts";
import type { NgModule } from "./ng-module/ng-module.ts";

const $injectorMinErr = minErr($injectTokens._injector);

const providerSuffix = "Provider";
type ModuleLike = string | Function | Injectable<(...args: any[]) => any>;

/**
 *
 * @param {Array<String|Function>} modulesToLoad
 * @param {boolean} [strictDi]
 * @returns {InjectorService}
 */
export function createInjector(
  modulesToLoad: ModuleLike[],
  strictDi = false,
): InjectorService {
  assert(isArray(modulesToLoad), "modules required");

  /** @type {Map<String|Function, boolean>} */
  const loadedModules = new Map(); // Keep track of loaded modules to avoid circular dependencies

  /** @type {ng.ProviderCache} */
  const providerCache: ProviderCache = {
    $provide: {
      provider: supportObject(provider),
      factory: supportObject(factory),
      service: supportObject(service),
      value: supportObject(value),
      constant: supportObject(constant),
      store,
      decorator,
    },
  };

  const providerInjector = (providerCache.$injector = new ProviderInjector(
    providerCache,
    strictDi,
  ));

  const protoInstanceInjector = new InjectorService(providerInjector, strictDi);

  providerCache.$injectorProvider = {
    // $injectionProvider return instance injector
    $get: () => protoInstanceInjector,
  };

  let instanceInjector: InjectorService = protoInstanceInjector;

  const runBlocks = loadModules(modulesToLoad);

  instanceInjector = protoInstanceInjector.get($injectTokens._injector);

  runBlocks.forEach((fn) => fn && instanceInjector.invoke(fn));

  instanceInjector.loadNewModules = (mods: ModuleLike[]) =>
    loadModules(mods).forEach((fn) => fn && instanceInjector.invoke(fn));

  return instanceInjector;

  ////////////////////////////////////
  // $provide methods
  ////////////////////////////////////

  /**
   * Registers a provider.
   * @param {string} name
   * @param {import('../../interface.ts').ServiceProvider | import('../../interface.ts').Injectable<any>} provider
   * @returns {import('../../interface.ts').ServiceProvider}
   */
  // eslint-disable-next-line no-shadow
  function provider(
    name: string,
    provider: ServiceProvider | Injectable<(...args: any[]) => any>,
  ): ServiceProvider {
    assertNotHasOwnProperty(name, "service");
    let newProvider: ServiceProvider;

    if (isFunction(provider) || isArray(provider)) {
      newProvider = providerInjector.instantiate(provider as any);
    } else {
      newProvider = provider;
    }

    if (!newProvider.$get) {
      throw $injectorMinErr(
        "pget",
        "Provider '{0}' must define $get factory method.",
        name,
      );
    }
    providerCache[name + providerSuffix] = newProvider;

    return newProvider;
  }

  /**
   * Registers a factory.
   * @param {string} name
   * @param {ng.AnnotatedFactory<any>} factoryFn
   * @returns {import('../../interface.ts').ServiceProvider}
   */
  function factory(
    name: string,
    factoryFn: Injectable<(...args: any[]) => any>,
  ): ServiceProvider {
    return provider(name, {
      $get() {
        const result = instanceInjector.invoke(factoryFn, this);

        if (isUndefined(result)) {
          throw $injectorMinErr(
            "undef",
            "Provider '{0}' must return a value from $get factory method.",
            name,
          );
        }

        return result;
      },
    });
  }

  /**
   * Registers a service constructor.
   * @param {string} name
   * @param {Function} constructor
   * @returns {import('../../interface.ts').ServiceProvider}
   */
  function service(name: string, constructor: Function): ServiceProvider {
    return factory(name, [
      $injectTokens._injector,
      ($injector: InjectorService) => $injector.instantiate(constructor),
    ]);
  }

  /**
   * Register a fixed value as a service.
   * @param {String} name
   * @param {any} val
   * @returns {ng.ServiceProvider}
   */
  function value(name: string, val: any): ServiceProvider {
    return (providerCache[name + providerSuffix] = { $get: () => val });
  }

  /**
   * Register a constant value (available during config).
   * @param {string} name
   * @param {any} value
   * @returns {void}
   */
  // eslint-disable-next-line no-shadow
  function constant(name: string, value: any): void {
    assertNotHasOwnProperty(name, "constant");
    providerInjector._cache[name] = value;
    protoInstanceInjector._cache[name] = value;
  }

  /**
   * Register a decorator function to modify or replace an existing service.
   * @param {string} serviceName - The name of the service to decorate.
   * @param {Function} decorFn - A function that takes `$delegate` and returns a decorated service.
   * @returns {void}
   */
  function decorator(
    serviceName: string,
    decorFn: Injectable<(...args: any[]) => any>,
  ): void {
    const origProvider = providerInjector.get(serviceName + providerSuffix);

    const origGet = origProvider.$get;

    origProvider.$get = function () {
      const origInstance = instanceInjector.invoke(origGet, origProvider);

      return instanceInjector.invoke(decorFn, null, {
        $delegate: origInstance,
      });
    };
  }

  /**
   * Registers a service persisted in a storage
   *
   * @param {string} name - Service name
   * @param {import("../../interface.ts").Constructor} ctor - Constructor for the service
   * @param {ng.StorageType} type - Type of storage to be instantiated
   * @param {import("./interface.ts").StorageLike & import("./interface.ts").PersistentStoreConfig} [backendOrConfig]
   */
  function store(
    name: string,
    ctor: Constructor | Function,
    type: ng.StorageType,
    backendOrConfig?: StorageLike & PersistentStoreConfig,
  ): ServiceProvider {
    return provider(name, {
      $get: ($injector: InjectorService) => {
        switch (type) {
          case "session": {
            const instance = $injector.instantiate(ctor);

            return createPersistentProxy(instance, name, sessionStorage);
          }
          case "local": {
            const instance = $injector.instantiate(ctor);

            return createPersistentProxy(instance, name, localStorage);
          }
          case "cookie": {
            const instance = $injector.instantiate(ctor);

            const $cookie = $injector.get($injectTokens._cookie);

            const serialize = backendOrConfig?.serialize ?? JSON.stringify;

            const deserialize = backendOrConfig?.deserialize ?? JSON.parse;

            const cookieOpts = backendOrConfig?.cookie ?? {};

            return createPersistentProxy(instance, name, {
              getItem(key: string) {
                const raw = $cookie.get(key);

                return isNullOrUndefined(raw) ? null : raw;
              },

              setItem(k: string, v: string) {
                $cookie.put(k, v, cookieOpts);
              },

              removeItem(k: string) {
                $cookie.remove(k, cookieOpts);
              },

              serialize,
              deserialize,
            });
          }
          case "custom": {
            const instance = $injector.instantiate(ctor);

            let backend: StorageLike = localStorage;

            let serialize = JSON.stringify;

            let deserialize = JSON.parse;

            if (backendOrConfig) {
              if (typeof backendOrConfig.getItem === "function") {
                // raw Storage object
                backend = backendOrConfig;
              } else if (isObject(backendOrConfig)) {
                backend =
                  (backendOrConfig.backend as StorageLike) || localStorage;

                if (backendOrConfig.serialize)
                  // eslint-disable-next-line prefer-destructuring
                  serialize = backendOrConfig.serialize;

                if (backendOrConfig.deserialize)
                  // eslint-disable-next-line prefer-destructuring
                  deserialize = backendOrConfig.deserialize;
              }
            } else {
              // fallback default
              backend = localStorage;
            }

            return createPersistentProxy(
              instance,
              name,
              backend as StorageLike,
              {
                serialize,
                deserialize,
              },
            );
          }
        }

        return undefined;
      },
    });
  }

  /**
   * Loads and instantiates AngularJS modules with proper type handling.
   *
   * @param {Array<string | Function | ng.AnnotatedFactory<any>>} modules - Modules to load
   * @returns {Array<any>} - Array of run block results
   */
  function loadModules(modules: ModuleLike[]): any[] {
    validateArray(modules, "modules");

    let moduleRunBlocks: any[] = [];

    modules.forEach((module: ModuleLike) => {
      // Determine a key suitable for Map: string | Function
      /** @type {string | Function} */
      const moduleKey = Array.isArray(module)
        ? module[module.length - 1]
        : module;

      if (loadedModules.get(moduleKey)) return;
      loadedModules.set(moduleKey, true);

      try {
        if (isString(module)) {
          const moduleFn = window.angular.module(module as string) as NgModule;

          instanceInjector._modules[module] = moduleFn;

          moduleRunBlocks = moduleRunBlocks
            .concat(loadModules(moduleFn._requires))
            .concat(moduleFn._runBlocks);

          const invokeQueue = moduleFn._invokeQueue.concat(
            moduleFn._configBlocks,
          );

          invokeQueue.forEach((invokeArgs: any[]) => {
            const providerInstance = providerInjector.get(invokeArgs[0]);

            providerInstance[invokeArgs[1]].apply(
              providerInstance,
              invokeArgs[2],
            );
          });
        } else if (isFunction(module)) {
          moduleRunBlocks.push(providerInjector.invoke(module));
        } else if (isArray(module)) {
          moduleRunBlocks.push(
            providerInjector.invoke(
              /** @type {Function | ng.AnnotatedFactory<any>} */ module,
            ),
          );
        } else {
          assertArgFn(module, "module");
        }
      } catch (err) {
        // If module is array, fallback to last element for error message
        const moduleName = isArray(module) ? module[module.length - 1] : module;

        throw $injectorMinErr(
          "modulerr",
          "Failed to instantiate module {0} due to:\n{1}",
          moduleName,
          isInstanceOf(err, Error) ? err.stack || err.message : String(err),
        );
      }
    });

    return moduleRunBlocks;
  }
}

/**
 * Wraps a delegate function to support object-style arguments.
 *
 * @template V
 * @param {(key: string, value: V) => any} delegate - The original function accepting (key, value)
 * @returns {(key: string | Record<string, V>, value?: V) => any}
 */
function supportObject<V>(
  delegate: (key: string, value: V) => any,
): (key: string | Record<string, V>, value?: V) => any {
  return function (key: string | Record<string, V>, value?: V): any {
    if (isObject(key)) {
      entries(key as Record<string, V>).forEach(([k, v]) => {
        delegate(k, v);
      });

      return undefined;
    } else {
      return delegate(key, value as V);
    }
  };
}
