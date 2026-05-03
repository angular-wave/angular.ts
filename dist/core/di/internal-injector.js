import { _injector } from '../../injection-tokens.js';
import { hasOwn, isString, isArray, isArrowFunction, minErr } from '../../shared/utils.js';
import { annotate, isClass } from './di.js';

const $injectorMinErr = minErr(_injector);
const providerSuffix = "Provider";
class AbstractInjector {
    /**
     * @param {boolean} strictDi - Indicates if strict dependency injection is enforced.
     */
    constructor(strictDi) {
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
    get(serviceName) {
        if (hasOwn(this._cache, serviceName)) {
            if (this._cache[serviceName] === true) {
                throw $injectorMinErr("cdep", "Circular dependency found: {0}", `${serviceName} <- ${this._path.join(" <- ")}`);
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
            delete this._cache[serviceName];
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
        const $inject = annotate(fn, this.strictDi, serviceName);
        $inject.forEach((key) => {
            if (!isString(key)) {
                throw $injectorMinErr("itkn", "Incorrect injection token! Expected service name as string, got {0}", key);
            }
            args.push(locals && hasOwn(locals, key) ? locals[key] : this.get(key));
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
            const boundArgs = [null, ...args];
            return new (Function.prototype.bind.apply(fn, boundArgs))();
        }
        else {
            return fn.apply(self, args);
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
        const ctor = (isArray(type) ? type[type.length - 1] : type);
        const args = this._injectionArgs(type, locals, serviceName);
        // Empty object at position 0 is ignored for invocation with `new`, but required.
        const boundArgs = [null, ...args];
        try {
            return new (Function.prototype.bind.apply(ctor, boundArgs))();
        }
        catch (err) {
            // try arrow function
            if (isArrowFunction(ctor)) {
                return ctor(args);
            }
            else {
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
    _factory(serviceName) {
        return undefined;
    }
}
/**
 * Injector for providers
 */
class ProviderInjector extends AbstractInjector {
    /**
     * @param {ProviderCache} cache
     * @param {boolean} strictDi - Indicates if strict dependency injection is enforced.
     */
    constructor(cache, strictDi) {
        super(strictDi);
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
        throw $injectorMinErr("unpr", "Unknown provider: {0}", this._path.join(" <- "));
    }
}
/**
 * Injector for factories and services
 */
class InjectorService extends AbstractInjector {
    /**
     * @param {ProviderInjector} providerInjector
     * @param {boolean} strictDi - Indicates if strict dependency injection is enforced.
     */
    constructor(providerInjector, strictDi) {
        super(strictDi);
        this.loadNewModules = () => {
            /* empty */
        };
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
