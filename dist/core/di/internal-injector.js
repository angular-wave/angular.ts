import { _injector } from '../../injection-tokens.js';
import { hasOwn, deleteProperty, isString, isArray, callFunction, isArrowFunction, createErrorFactory } from '../../shared/utils.js';
import { annotate, isClass } from './di.js';

const $injectorError = createErrorFactory(_injector);
const providerSuffix = "Provider";
const defaultLoadNewModules = () => {
    /* empty */
};
class AbstractInjector {
    constructor() {
        this._cache = {};
        this._path = [];
        this._modules = {};
    }
    get(serviceName) {
        if (hasOwn(this._cache, serviceName)) {
            if (this._cache[serviceName] === true) {
                throw $injectorError("cdep", "Circular dependency found: {0}", `${serviceName} <- ${this._path.join(" <- ")}`);
            }
            return this._cache[serviceName];
        }
        this._path.unshift(serviceName);
        this._cache[serviceName] = true;
        try {
            this._cache[serviceName] = this._factory(serviceName);
        }
        catch (err) {
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
    _injectionArgs(fn, locals, serviceName) {
        const args = [];
        const $inject = annotate(fn, serviceName);
        $inject.forEach((key) => {
            if (!isString(key)) {
                throw $injectorError("itkn", "Incorrect injection token! Expected service name as string, got {0}", key);
            }
            const localValues = locals;
            args.push(localValues && hasOwn(localValues, key)
                ? localValues[key]
                : this.get(key));
        });
        return args;
    }
    invoke(fn, self, locals, serviceName) {
        if (isString(locals)) {
            serviceName = locals;
            locals = undefined;
        }
        const invocationLocals = locals;
        const args = this._injectionArgs(fn, invocationLocals, serviceName);
        if (isArray(fn)) {
            fn = fn[fn.length - 1];
        }
        if (isClass(fn)) {
            return Reflect.construct(fn, args);
        }
        else {
            return callFunction(fn, self, ...args);
        }
    }
    instantiate(type, locals, serviceName) {
        // Check if type is annotated and use just the given function at n-1 as parameter
        // e.g. someModule.factory('greeter', ['$window', function(renamed$window) {}]);
        const ctor = (isArray(type) ? type[type.length - 1] : type);
        const args = this._injectionArgs(type, locals, serviceName);
        try {
            return Reflect.construct(ctor, args);
        }
        catch (err) {
            // try arrow function
            if (isArrowFunction(ctor)) {
                return callFunction(ctor, undefined, args);
            }
            else {
                throw err;
            }
        }
    }
}
/**
 * Injector for providers
 */
class ProviderInjector extends AbstractInjector {
    /**
     * @param {ProviderCache} cache
     */
    constructor(cache) {
        super();
        this._cache = cache;
    }
    /**
     * @internal
     * Factory method for creating services.
     * @param {string} caller - The name of the caller requesting the service.
     * @throws {Error} If the provider is unknown.
     */
    _factory(caller) {
        this._path.push(caller);
        // prevents lookups to providers through get
        throw $injectorError("unpr", "Unknown provider: {0}", this._path.join(" <- "));
    }
}
/**
 * Injector for factories and services
 */
class InjectorService extends AbstractInjector {
    /**
     * @param {ProviderInjector} providerInjector
     */
    constructor(providerInjector) {
        super();
        this.loadNewModules = defaultLoadNewModules;
        this._providerInjector = providerInjector;
        this._modules = providerInjector._modules;
    }
    /**
     * @param {string} serviceName
     * @returns {*}
     */
    /** @internal */
    _factory(serviceName) {
        const provider = this._providerInjector.get(serviceName + providerSuffix);
        return this.invoke(provider.$get, provider, undefined, serviceName);
    }
    /**
     *
     * @param {string} name
     * @returns {boolean}
     */
    has(name) {
        const hasProvider = hasOwn(this._providerInjector._cache, name + providerSuffix);
        const hasCache = hasOwn(this._cache, name);
        return hasProvider || hasCache;
    }
}

export { InjectorService, ProviderInjector, providerSuffix };
