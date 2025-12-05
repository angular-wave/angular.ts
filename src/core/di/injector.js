import {
  assert,
  assertArg,
  assertArgFn,
  assertNotHasOwnProperty,
  isFunction,
  isNullOrUndefined,
  isObject,
  isString,
  isUndefined,
  minErr,
} from "../../shared/utils.js";
import { InjectorService, ProviderInjector } from "./internal-injector.js";
import { createPersistentProxy } from "../../services/storage/storage.js";
import { $injectTokens } from "../../injection-tokens";

const $injectorMinErr = minErr($injectTokens.$injector);

const providerSuffix = "Provider";

/**
 *
 * @param {Array<String|Function>} modulesToLoad
 * @param {boolean} [strictDi]
 * @returns {InjectorService}
 */
export function createInjector(modulesToLoad, strictDi = false) {
  assert(Array.isArray(modulesToLoad), "modules required");

  /** @type {Map<String|Function, boolean>} */
  const loadedModules = new Map(); // Keep track of loaded modules to avoid circular dependencies

  const providerCache = {
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

  let instanceInjector = protoInstanceInjector;

  const runBlocks = loadModules(modulesToLoad);

  instanceInjector = protoInstanceInjector.get($injectTokens.$injector);

  runBlocks.forEach((fn) => fn && instanceInjector.invoke(fn));

  instanceInjector.loadNewModules = (mods) =>
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
  function provider(name, provider) {
    assertNotHasOwnProperty(name, "service");
    let newProvider;

    if (isFunction(provider) || Array.isArray(provider)) {
      newProvider = providerInjector.instantiate(
        /** @type {Function} */ (provider),
      );
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
   * @param {(string|(function(*): *))[]} factoryFn
   * @returns {import('../../interface.ts').ServiceProvider}
   */
  function factory(name, factoryFn) {
    return provider(name, {
      $get: () => {
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
  function service(name, constructor) {
    return factory(name, [
      $injectTokens.$injector,
      ($injector) => $injector.instantiate(constructor),
    ]);
  }

  /**
   * Register a fixed value as a service.
   * @param {String} name
   * @param {any} val
   * @returns {import('../../interface.ts').ServiceProvider}
   */
  function value(name, val) {
    return (providerCache[name + providerSuffix] = { $get: () => val });
  }

  /**
   * Register a constant value (available during config).
   * @param {string} name
   * @param {any} value
   * @returns {void}
   */
  function constant(name, value) {
    assertNotHasOwnProperty(name, "constant");
    providerInjector.cache[name] = value;
    protoInstanceInjector.cache[name] = value;
  }

  /**
   * Register a decorator function to modify or replace an existing service.
   * @param name - The name of the service to decorate.
   * @param fn - A function that takes `$delegate` and returns a decorated service.
   * @returns {void}
   */
  function decorator(serviceName, decorFn) {
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
   * @param {Function} ctor - Constructor for the service
   * @param {ng.StorageType} type - Type of storage to be instantiated
   * @param {Storage|Object} backendOrConfig - Either a Storage-like object (getItem/setItem) or a config object
   *                                           with { backend, serialize, deserialize }
   */
  function store(name, ctor, type, backendOrConfig = {}) {
    return provider(name, {
      $get: /** @param {ng.InjectorService} $injector */ ($injector) => {
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

            const $cookie = $injector.get($injectTokens.$cookie);

            const serialize = backendOrConfig.serialize ?? JSON.stringify;

            const deserialize = backendOrConfig.deserialize ?? JSON.parse;

            const cookieOpts = backendOrConfig.cookie ?? {};

            return createPersistentProxy(instance, name, {
              getItem(key) {
                const raw = $cookie.get(key);

                return isNullOrUndefined(raw) ? null : raw;
              },

              setItem(k, v) {
                $cookie.put(k, v, cookieOpts);
              },

              removeItem(k) {
                $cookie.remove(k, cookieOpts);
              },

              serialize,
              deserialize,
            });
          }
          case "custom": {
            const instance = $injector.instantiate(ctor);

            let backend;

            let serialize = JSON.stringify;

            let deserialize = JSON.parse;

            if (backendOrConfig) {
              if (typeof backendOrConfig.getItem === "function") {
                // raw Storage object
                backend = backendOrConfig;
              } else if (isObject(backendOrConfig)) {
                backend = backendOrConfig.backend || localStorage;

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

            return createPersistentProxy(instance, name, backend, {
              serialize,
              deserialize,
            });
          }
        }

        return undefined;
      },
    });
  }

  /**
   *
   * @param {Array<String|Function>} modules
   * @returns
   */
  function loadModules(modules) {
    assertArg(
      isUndefined(modules) || Array.isArray(modules),
      "modulesToLoad",
      "not an array",
    );
    let moduleRunBlocks = [];

    modules.forEach((module) => {
      if (loadedModules.get(module)) return;
      loadedModules.set(module, true);

      try {
        if (isString(module)) {
          /** @type {ng.NgModule} */
          const moduleFn = window.angular.module(
            /** @type {string} */ (module),
          );

          instanceInjector.modules[/** @type {string } */ (module)] = moduleFn;
          moduleRunBlocks = moduleRunBlocks
            .concat(loadModules(moduleFn.requires))
            .concat(moduleFn.runBlocks);

          const invokeQueue = moduleFn.invokeQueue.concat(
            moduleFn.configBlocks,
          );

          invokeQueue.forEach((invokeArgs) => {
            const providerInstance = providerInjector.get(invokeArgs[0]);

            providerInstance[invokeArgs[1]].apply(
              providerInstance,
              invokeArgs[2],
            );
          });
        } else if (isFunction(module)) {
          moduleRunBlocks.push(providerInjector.invoke(module));
        } else if (Array.isArray(module)) {
          moduleRunBlocks.push(providerInjector.invoke(module));
        } else {
          assertArgFn(module, "module");
        }
      } catch (err) {
        if (Array.isArray(module)) {
          module = module[module.length - 1];
        }

        if (err.message && err.stack && err.stack.indexOf(err.message) === -1) {
          // Safari & FF's stack traces don't contain error.message content
          // unlike those of Chrome and IE
          // So if stack doesn't contain message, we create a new string that contains both.
          // Since error.stack is read-only in Safari, I'm overriding e and not e.stack here.

          err.message = `${err.message}\n${err.stack}`;
        }
        throw $injectorMinErr(
          "modulerr",
          "Failed to instantiate module {0} due to:\n{1}",
          module,
          err.stack || err.message || err,
        );
      }
    });

    return moduleRunBlocks;
  }
}

function supportObject(delegate) {
  return function (key, value) {
    if (isObject(key)) {
      Object.entries(key).forEach(([k, v]) => {
        delegate(k, v);
      });

      return undefined;
    } else {
      return delegate(key, value);
    }
  };
}
