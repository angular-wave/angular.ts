import { _cookie, _injector } from "../../injection-tokens.ts";
import {
  assert,
  assertArgFn,
  assertNotHasOwnProperty,
  callFunction,
  isArray,
  isFunction,
  isInstanceOf,
  isNullOrUndefined,
  isObject,
  isUndefined,
  createErrorFactory,
  isString,
} from "../../shared/utils.ts";
import {
  InjectorService,
  providerSuffix,
  ProviderInjector,
} from "./internal-injector.ts";
import { createPersistentProxy } from "../../services/storage/storage.ts";
import { validateArray } from "../../shared/validate.ts";
import type {
  Constructor,
  Injectable,
  ServiceProvider,
} from "../../interface.ts";
import type { RuntimeFunction } from "../../shared/utils.ts";
import type {
  PersistentStoreConfig,
  ProviderCache,
  ProviderRegistry,
  StorageLike,
} from "./interface.ts";
import { isProviderRegistrationCommand } from "./interface.ts";
import { createServiceDecorationInvocationLocals } from "./invocation-context.ts";
import type { NgModule } from "./ng-module/ng-module.ts";
const $injectorError = createErrorFactory(_injector);
// Module registry commands mutate runtime-owned registries shared by its injectors.
const appliedRuntimeCommands = new WeakSet<object>();

type Dynamic = ReturnType<typeof JSON.parse>;

export type InjectableFunction = (...args: Dynamic[]) => unknown;

export type RunBlock = Injectable<InjectableFunction>;

export type ModuleLike = string | RunBlock;

export type ModuleResolver = (name: string) => NgModule;

/**
 *
 * @param {Array<String|Function>} modulesToLoad
 * @param {boolean} [strictDi]
 * @returns {InjectorService}
 */
export function createInjector(
  modulesToLoad: ModuleLike[],
  strictDi = false,
  configure?: (registry: ProviderRegistry) => void,
  resolveModule: ModuleResolver = (name) => window.angular.module(name),
): InjectorService {
  assert(isArray(modulesToLoad), "modules required");

  const loadedModules = new Map<unknown, boolean>();

  const providerCache: ProviderCache = {};

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

  const providerRegistry: ProviderRegistry = {
    provider,
    factory,
    service,
    value,
    constant,
    store,
    decorator,
  };

  configure?.(providerRegistry);

  const runBlocks = loadModules(modulesToLoad);

  instanceInjector = protoInstanceInjector.get(_injector);

  runBlocks.forEach((fn) => {
    if (fn) instanceInjector.invoke(fn);
  });

  instanceInjector.loadNewModules = (mods: ModuleLike[]) => {
    loadModules(mods).forEach((fn) => {
      if (fn) instanceInjector.invoke(fn);
    });
  };

  return instanceInjector;

  ////////////////////////////////////
  // Provider registry methods
  ////////////////////////////////////

  /**
   * Registers a provider.
   */
  function provider(
    name: string,
    providerDefinition: ServiceProvider | Injectable<InjectableFunction>,
  ): ServiceProvider {
    assertNotHasOwnProperty(name, "service");
    let newProvider: Partial<ServiceProvider>;

    if (isFunction(providerDefinition) || isArray(providerDefinition)) {
      newProvider = providerInjector.instantiate(
        providerDefinition as Parameters<
          typeof providerInjector.instantiate
        >[0],
      ) as ServiceProvider;
    } else {
      newProvider = providerDefinition;
    }

    if (!newProvider.$get) {
      throw $injectorError(
        "pget",
        "Provider '{0}' must define $get factory method.",
        name,
      );
    }
    providerCache[name + providerSuffix] = newProvider as ServiceProvider;

    return newProvider as ServiceProvider;
  }

  /**
   * Registers a factory.
   */
  function factory(name: string, factoryFn: RunBlock): ServiceProvider {
    return provider(name, {
      $get() {
        const result: unknown = instanceInjector.invoke(factoryFn, this);

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
  function service(
    name: string,
    constructor:
      | Injectable<Constructor>
      | Injectable<(...args: Dynamic[]) => unknown>,
  ): ServiceProvider {
    return factory(name, [
      _injector,
      ($injector: InjectorService) =>
        $injector.instantiate(
          constructor as Parameters<typeof $injector.instantiate>[0],
        ),
    ]);
  }

  /**
   * Register a fixed value as a service.
   * @param {String} name
   * @param {any} val
   * @returns {ServiceProvider}
   */
  function value(name: string, val: unknown): ServiceProvider {
    return (providerCache[name + providerSuffix] = {
      $get: () => val,
    });
  }

  /**
   * Register a constant value (available during config).
   */
  function constant(name: string, constantValue: unknown): void {
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
    decorFn: Injectable<InjectableFunction>,
  ): void {
    const origProvider = providerInjector.get<ServiceProvider>(
      serviceName + providerSuffix,
    );

    const origGet = origProvider.$get as Parameters<
      typeof instanceInjector.invoke
    >[0];

    origProvider.$get = function () {
      const origInstance: unknown = instanceInjector.invoke(
        origGet,
        origProvider,
      );

      return instanceInjector.invoke(
        decorFn,
        null,
        createServiceDecorationInvocationLocals(origInstance),
      );
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
    ctor: Constructor | RuntimeFunction,
    type: ng.StorageType,
    backendOrConfig?: StorageLike & PersistentStoreConfig,
  ): ServiceProvider {
    return provider(name, {
      $get: ($injector: InjectorService) => {
        switch (type) {
          case "session": {
            const instance: unknown = $injector.instantiate(ctor);

            return createPersistentProxy(
              instance as Record<PropertyKey, unknown>,
              name,
              sessionStorage,
            ) as unknown;
          }
          case "local": {
            const instance: unknown = $injector.instantiate(ctor);

            return createPersistentProxy(
              instance as Record<PropertyKey, unknown>,
              name,
              localStorage,
            ) as unknown;
          }
          case "cookie": {
            const instance: unknown = $injector.instantiate(ctor);

            const $cookie = $injector.get(_cookie);

            const serialize = backendOrConfig?.serialize ?? JSON.stringify;

            const deserialize = backendOrConfig?.deserialize ?? JSON.parse;

            const cookieOpts = backendOrConfig?.cookie ?? {};

            return createPersistentProxy(
              instance as Record<PropertyKey, unknown>,
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
            const instance: unknown = $injector.instantiate(ctor);

            let backend: StorageLike = localStorage;

            let serialize = JSON.stringify;

            let deserialize = JSON.parse;

            if (backendOrConfig) {
              if (isFunction(Reflect.get(backendOrConfig, "getItem"))) {
                // raw Storage object
                backend = backendOrConfig;
              } else if (isObject(backendOrConfig)) {
                backend = backendOrConfig.backend ?? localStorage;
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

            return createPersistentProxy(
              instance as Record<PropertyKey, unknown>,
              name,
              backend,
              {
                serialize,
                deserialize,
              },
            ) as unknown;
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
  function loadModules(modules: ModuleLike[]): (RunBlock | undefined)[] {
    validateArray(modules, "modules");

    let moduleRunBlocks: (RunBlock | undefined)[] = [];

    modules.forEach((module: ModuleLike) => {
      const moduleKey: unknown = isArray(module)
        ? module[module.length - 1]
        : module;

      if (loadedModules.get(moduleKey)) return;
      loadedModules.set(moduleKey, true);

      try {
        if (isString(module)) {
          const moduleFn = resolveModule(module);

          instanceInjector._modules[module] = moduleFn;

          moduleRunBlocks = moduleRunBlocks
            .concat(loadModules(moduleFn._requires))
            .concat(moduleFn._runBlocks);

          const invokeQueue = moduleFn._invokeQueue.concat(
            moduleFn._configBlocks,
          );

          invokeQueue.forEach((invokeArgs) => {
            if (isProviderRegistrationCommand(invokeArgs)) {
              invokeArgs.register(providerRegistry);

              return;
            }

            const [, invokeName] = invokeArgs;

            const invocationTarget = invokeArgs[0];

            if (
              !isString(invocationTarget) &&
              appliedRuntimeCommands.has(invokeArgs)
            ) {
              return;
            }

            const providerInstance = isString(invocationTarget)
              ? providerInjector.get<
                  Record<string, (...args: unknown[]) => unknown>
                >(invocationTarget)
              : (invocationTarget as unknown as Record<
                  string,
                  (...args: unknown[]) => unknown
                >);

            callFunction(
              providerInstance[invokeName],
              providerInstance,
              ...(invokeArgs[2] as unknown[]),
            );

            if (!isString(invocationTarget)) {
              appliedRuntimeCommands.add(invokeArgs);
            }
          });
        } else if (isFunction(module)) {
          moduleRunBlocks.push(
            providerInjector.invoke(
              module as unknown as Parameters<
                typeof providerInjector.invoke
              >[0],
            ) as RunBlock,
          );
        } else if (isArray(module)) {
          moduleRunBlocks.push(
            providerInjector.invoke(
              module as unknown as Parameters<
                typeof providerInjector.invoke
              >[0],
            ) as RunBlock,
          );
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
          isInstanceOf(err, Error) ? (err.stack ?? err.message) : String(err),
        );
      }
    });

    return moduleRunBlocks;
  }
}
