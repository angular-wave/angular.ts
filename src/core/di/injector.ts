import { _cookie, _injector } from "../../injection-tokens.ts";
import {
  assert,
  assertArgFn,
  assertNotHasOwnProperty,
  callFunction,
  entries,
  isArray,
  isFunction,
  isInstanceOf,
  isNullOrUndefined,
  isObject,
  isUndefined,
  createErrorFactory,
  isString,
  assertDefined,
} from "../../shared/utils.ts";
import {
  InjectorService,
  providerSuffix,
  ProviderInjector,
} from "./internal-injector.ts";
import { createPersistentProxy } from "../../services/storage/storage.ts";
import { validateArray } from "../../shared/validate.ts";
import type { CookieService } from "../../services/cookie/cookie.ts";
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
const $injectorError = createErrorFactory(_injector);

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

  const loadedModules = new Map<string | Function, boolean>();

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

  instanceInjector = protoInstanceInjector.get(_injector);

  runBlocks.forEach((fn) => {
    if (fn) {
      instanceInjector.invoke(fn);
    }
  });

  instanceInjector.loadNewModules = (mods: ModuleLike[]) => {
    loadModules(mods).forEach((fn) => {
      if (fn) {
        instanceInjector.invoke(fn);
      }
    });
  };

  return instanceInjector;

  ////////////////////////////////////
  // $provide methods
  ////////////////////////////////////

  /**
   * Registers a provider.
   */
  function provider(
    name: string,
    providerDefinition: ServiceProvider | Injectable<(...args: any[]) => any>,
  ): ServiceProvider {
    assertNotHasOwnProperty(name, "service");
    let newProvider: ServiceProvider;

    if (isFunction(providerDefinition) || isArray(providerDefinition)) {
      newProvider = providerInjector.instantiate(providerDefinition as any);
    } else {
      newProvider = providerDefinition as ServiceProvider;
    }

    if (!newProvider.$get) {
      throw $injectorError(
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
   */
  function factory(
    name: string,
    factoryFn: ng.AnnotatedFactory<any>,
  ): ServiceProvider {
    return provider(name, {
      $get() {
        const result = instanceInjector.invoke(factoryFn, this);

        if (isUndefined(result)) {
          throw $injectorError(
            "undef",
            "Provider '{0}' must return a value from $get factory method.",
            name,
          );
        }

        return result as unknown;
      },
    });
  }

  /**
   * Registers a service constructor.
   * @param {string} name
   * @param {Function} constructor
   * @returns {ServiceProvider}
   */
  function service(name: string, constructor: Function): ServiceProvider {
    return factory(name, [
      _injector,
      ($injector: InjectorService) =>
        $injector.instantiate(constructor) as unknown,
    ]);
  }

  /**
   * Register a fixed value as a service.
   * @param {String} name
   * @param {any} val
   * @returns {ng.ServiceProvider}
   */
  function value(name: string, val: any): ServiceProvider {
    return (providerCache[name + providerSuffix] = {
      $get: () => val as unknown,
    });
  }

  /**
   * Register a constant value (available during config).
   */
  function constant(name: string, constantValue: any): void {
    assertNotHasOwnProperty(name, "constant");
    providerInjector._cache[name] = constantValue;
    protoInstanceInjector._cache[name] = constantValue;
  }

  /**
   * Register a decorator function to modify or replace an existing service.
   * @param serviceName - The name of the service to decorate.
   * @param decorFn - A function that takes `$delegate` and returns a decorated service.
   */
  function decorator(
    serviceName: string,
    decorFn: Injectable<(...args: any[]) => any>,
  ): void {
    const origProvider = providerInjector.get(
      serviceName + providerSuffix,
    ) as ServiceProvider;

    const origGet = origProvider.$get;

    origProvider.$get = function () {
      const origInstance = instanceInjector.invoke(origGet, origProvider);

      return instanceInjector.invoke(decorFn, null, {
        $delegate: origInstance,
      }) as unknown;
    };
  }

  /**
   * Registers a service persisted in a storage
   *
   * @param name - Service name
   * @param ctor - Constructor for the service
   * @param type - Type of storage to be instantiated
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

            return createPersistentProxy(
              instance,
              name,
              sessionStorage,
            ) as unknown;
          }
          case "local": {
            const instance = $injector.instantiate(ctor);

            return createPersistentProxy(
              instance,
              name,
              localStorage,
            ) as unknown;
          }
          case "cookie": {
            const instance = $injector.instantiate(ctor);

            const $cookie = $injector.get(_cookie) as CookieService;

            const serialize = backendOrConfig?.serialize ?? JSON.stringify;

            const deserialize = backendOrConfig?.deserialize ?? JSON.parse;

            const cookieOpts = backendOrConfig?.cookie ?? {};

            return createPersistentProxy(
              instance,
              name,
              {
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
              },
              {
                serialize,
                deserialize,
              },
            ) as unknown;
          }
          case "custom": {
            const instance = $injector.instantiate(ctor);

            let backend: StorageLike = localStorage;

            let serialize = JSON.stringify;

            let deserialize = JSON.parse;

            if (backendOrConfig) {
              if (isFunction(backendOrConfig.getItem)) {
                // raw Storage object
                backend = backendOrConfig;
              } else if (isObject(backendOrConfig)) {
                backend =
                  assertDefined(backendOrConfig.backend) || localStorage;
                const {
                  serialize: configSerialize,
                  deserialize: configDeserialize,
                } = backendOrConfig;

                if (configSerialize) serialize = configSerialize;

                if (configDeserialize) deserialize = configDeserialize;
              }
            } else {
              // fallback default
              backend = localStorage;
            }

            return createPersistentProxy(instance, name, backend, {
              serialize,
              deserialize,
            }) as unknown;
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
      const moduleKey: string | Function = isArray(module)
        ? module[module.length - 1]
        : module;

      if (loadedModules.get(moduleKey)) return;
      loadedModules.set(moduleKey, true);

      try {
        if (isString(module)) {
          const moduleFn = window.angular.module(module);

          instanceInjector._modules[module] = moduleFn;

          moduleRunBlocks = moduleRunBlocks
            .concat(loadModules(moduleFn._requires))
            .concat(moduleFn._runBlocks);

          const invokeQueue = moduleFn._invokeQueue.concat(
            moduleFn._configBlocks,
          );

          invokeQueue.forEach((invokeArgs: any[]) => {
            const invokeName = invokeArgs[1] as string;

            const providerInstance = providerInjector.get(
              invokeArgs[0],
            ) as Record<string, (...args: any[]) => unknown>;

            callFunction(
              providerInstance[invokeName],
              providerInstance,
              ...invokeArgs[2],
            );
          });
        } else if (isFunction(module)) {
          moduleRunBlocks.push(providerInjector.invoke(module));
        } else if (isArray(module)) {
          moduleRunBlocks.push(providerInjector.invoke(module));
        } else {
          assertArgFn(module, "module");
        }
      } catch (err) {
        // If module is array, fallback to last element for error message
        const moduleName = isArray(module) ? module[module.length - 1] : module;

        throw $injectorError(
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
      entries(key).forEach(([k, v]) => {
        delegate(k, v);
      });

      return undefined;
    } else {
      return delegate(key, value as V);
    }
  };
}
