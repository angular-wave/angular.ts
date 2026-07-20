import { _injector, _cookie } from '../../injection-tokens.js';
import { assert, isArray, assertNotHasOwnProperty, isFunction, isUndefined, isObject, isString, callFunction, assertArgFn, isInstanceOf, createErrorFactory, isNullOrUndefined } from '../../shared/utils.js';
import { ProviderInjector, InjectorService, providerSuffix } from './internal-injector.js';
import { createPersistentProxy } from '../../services/storage/storage.js';
import { validateArray } from '../../shared/validate.js';
import { isProviderRegistrationCommand } from './interface.js';
import { createServiceDecorationInvocationLocals } from './invocation-context.js';

const $injectorError = createErrorFactory(_injector);
// Module registry commands mutate runtime-owned registries shared by its injectors.
const appliedRuntimeCommands = new WeakSet();
/**
 *
 * @param {Array<String|Function>} modulesToLoad
 * @returns {InjectorService}
 */
function createInjector(modulesToLoad, configure, resolveModule = (name) => window.angular.module(name)) {
    assert(isArray(modulesToLoad), "modules required");
    const loadedModules = new Map();
    const providerCache = {};
    const providerInjector = (providerCache.$injector = new ProviderInjector(providerCache));
    const protoInstanceInjector = new InjectorService(providerInjector);
    providerCache.$injectorProvider = {
        // $injectionProvider return instance injector
        $get: () => protoInstanceInjector,
    };
    let instanceInjector = protoInstanceInjector;
    const providerRegistry = {
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
        if (fn)
            instanceInjector.invoke(fn);
    });
    instanceInjector.loadNewModules = (mods) => {
        loadModules(mods).forEach((fn) => {
            if (fn)
                instanceInjector.invoke(fn);
        });
    };
    return instanceInjector;
    ////////////////////////////////////
    // Provider registry methods
    ////////////////////////////////////
    /**
     * Registers a provider.
     */
    function provider(name, providerDefinition) {
        assertNotHasOwnProperty(name, "service");
        let newProvider;
        if (isFunction(providerDefinition) || isArray(providerDefinition)) {
            newProvider = providerInjector.instantiate(providerDefinition);
        }
        else {
            newProvider = providerDefinition;
        }
        if (!newProvider.$get) {
            throw $injectorError("pget", "Provider '{0}' must define $get factory method.", name);
        }
        providerCache[name + providerSuffix] = newProvider;
        return newProvider;
    }
    /**
     * Registers a factory.
     */
    function factory(name, factoryFn) {
        return provider(name, {
            $get() {
                const result = instanceInjector.invoke(factoryFn, this);
                if (isUndefined(result)) {
                    throw $injectorError("undef", "Provider '{0}' must return a value from $get factory method.", name);
                }
                return result;
            },
        });
    }
    /**
     * Registers a service constructor.
     * @param {string} name
     * @param {Function} constructor
     * @returns {ServiceProvider}
     */
    function service(name, constructor) {
        return factory(name, [
            _injector,
            ($injector) => $injector.instantiate(constructor),
        ]);
    }
    /**
     * Register a fixed value as a service.
     * @param {String} name
     * @param {any} val
     * @returns {ServiceProvider}
     */
    function value(name, val) {
        return (providerCache[name + providerSuffix] = {
            $get: () => val,
        });
    }
    /**
     * Register a constant value (available during config).
     */
    function constant(name, constantValue) {
        assertNotHasOwnProperty(name, "constant");
        providerInjector._cache[name] = constantValue;
        protoInstanceInjector._cache[name] = constantValue;
    }
    /**
     * Register a decorator function to modify or replace an existing service.
     * @param serviceName - The name of the service to decorate.
     * @param decorFn - A function that takes `$delegate` and returns a decorated service.
     */
    function decorator(serviceName, decorFn) {
        const origProvider = providerInjector.get(serviceName + providerSuffix);
        const origGet = origProvider.$get;
        origProvider.$get = function () {
            const origInstance = instanceInjector.invoke(origGet, origProvider);
            return instanceInjector.invoke(decorFn, null, createServiceDecorationInvocationLocals(origInstance));
        };
    }
    /**
     * Registers a service persisted in a storage
     *
     * @param name - Service name
     * @param ctor - Constructor for the service
     * @param type - Type of storage to be instantiated
     */
    function store(name, ctor, type, backendOrConfig) {
        return provider(name, {
            $get: [
                _injector,
                ($injector) => {
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
                            const $cookie = $injector.get(_cookie);
                            const serialize = backendOrConfig?.serialize ?? JSON.stringify;
                            const deserialize = backendOrConfig?.deserialize ?? JSON.parse;
                            const cookieOpts = backendOrConfig?.cookie ?? {};
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
                            }, {
                                serialize,
                                deserialize,
                            });
                        }
                        case "custom": {
                            const instance = $injector.instantiate(ctor);
                            let backend = localStorage;
                            let serialize = JSON.stringify;
                            let deserialize = JSON.parse;
                            if (backendOrConfig) {
                                if (isFunction(Reflect.get(backendOrConfig, "getItem"))) {
                                    // raw Storage object
                                    backend = backendOrConfig;
                                }
                                else if (isObject(backendOrConfig)) {
                                    backend = backendOrConfig.backend ?? localStorage;
                                    const { serialize: configSerialize, deserialize: configDeserialize, } = backendOrConfig;
                                    if (configSerialize)
                                        serialize = configSerialize;
                                    if (configDeserialize)
                                        deserialize = configDeserialize;
                                }
                            }
                            else {
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
            ],
        });
    }
    /**
     * Loads and instantiates AngularJS modules with proper type handling.
     *
     * @param {Array<string | Function | ng.AnnotatedFactory<any>>} modules - Modules to load
     * @returns {Array<any>} - Array of run block results
     */
    function loadModules(modules) {
        validateArray(modules, "modules");
        let moduleRunBlocks = [];
        modules.forEach((module) => {
            const moduleKey = isArray(module)
                ? module[module.length - 1]
                : module;
            if (loadedModules.get(moduleKey))
                return;
            loadedModules.set(moduleKey, true);
            try {
                if (isString(module)) {
                    const moduleFn = resolveModule(module);
                    instanceInjector._modules[module] = moduleFn;
                    moduleRunBlocks = moduleRunBlocks
                        .concat(loadModules(moduleFn._requires))
                        .concat(moduleFn._runBlocks);
                    const invokeQueue = moduleFn._invokeQueue.concat(moduleFn._configBlocks);
                    invokeQueue.forEach((invokeArgs) => {
                        if (isProviderRegistrationCommand(invokeArgs)) {
                            invokeArgs.register(providerRegistry);
                            return;
                        }
                        const [, invokeName] = invokeArgs;
                        const invocationTarget = invokeArgs[0];
                        if (!isString(invocationTarget) &&
                            appliedRuntimeCommands.has(invokeArgs)) {
                            return;
                        }
                        const providerInstance = isString(invocationTarget)
                            ? providerInjector.get(invocationTarget)
                            : invocationTarget;
                        callFunction(providerInstance[invokeName], providerInstance, ...invokeArgs[2]);
                        if (!isString(invocationTarget)) {
                            appliedRuntimeCommands.add(invokeArgs);
                        }
                    });
                }
                else if (isFunction(module)) {
                    moduleRunBlocks.push(providerInjector.invoke(module));
                }
                else if (isArray(module)) {
                    moduleRunBlocks.push(providerInjector.invoke(module));
                }
                else {
                    assertArgFn(module, "module");
                }
            }
            catch (err) {
                // If module is array, fallback to last element for error message
                const moduleName = isArray(module) ? module[module.length - 1] : module;
                throw $injectorError("modulerr", "Failed to instantiate module {0} due to:\n{1}", moduleName, isInstanceOf(err, Error) ? (err.stack ?? err.message) : String(err));
            }
        });
        return moduleRunBlocks;
    }
}

export { createInjector };
