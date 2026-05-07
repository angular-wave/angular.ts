import { isString, isArray, isDefined, isFunction, isObject } from '../../../shared/utils.js';
import { _provide, _injector, _compileProvider, _animateProvider, _filterProvider, _controllerProvider, _wasm, _worker, _rest, _sse, _websocket, _webTransport } from '../../../injection-tokens.js';
import { isInjectable } from '../../../shared/predicates.js';
import { validate, validateRequired } from '../../../shared/validate.js';

/**
 * Modules are collections of application configuration information for components:
 * controllers, directives, filters, etc. They provide recipes for the injector
 * to do the actual instantiation. A module itself has no behaviour but only state.
 * A such, it acts as a data structure between the Angular instance and the injector service.
 */
class NgModule {
    /**
     * @param {string} name - Name of the module
     * @param {Array<string>} requires - List of modules which the injector will load before the current module
     * @param {ng.Injectable<any>} [configFn]
     */
    constructor(name, requires, configFn) {
        validate(isString, name, "name");
        validate(isArray, requires, "requires");
        this.name = name;
        this._requires = requires;
        this._invokeQueue = [];
        this._configBlocks = [];
        this._runBlocks = [];
        if (configFn) {
            this.config(configFn);
        }
        this._services = [];
    }
    /**
     * @param {string} name
     * @param {unknown} object - Allows undefined
     * @returns {NgModule}
     */
    value(name, object) {
        validate(isString, name, "name");
        this._invokeQueue.push([_provide, "value", [name, object]]);
        return this;
    }
    /**
     * @param {string} name
     * @param {Object|string|number} object
     * @returns {NgModule}
     */
    constant(name, object) {
        validate(isString, name, "name");
        validate(isDefined, object, "object");
        this._invokeQueue.unshift([_provide, "constant", [name, object]]);
        return this;
    }
    /**
     *
     * @param {ng.Injectable<(...args: unknown[]) => unknown>} configFn
     * @returns {NgModule}
     */
    config(configFn) {
        validate(isInjectable, configFn, "configFn");
        this._configBlocks.push([_injector, "invoke", [configFn]]);
        return this;
    }
    /**
     * @param {ng.Injectable<(...args: unknown[]) => unknown>} block
     * @returns {NgModule}
     */
    run(block) {
        validate(isInjectable, block, "block");
        this._runBlocks.push(block);
        return this;
    }
    /**
     * @param {string} name
     * @param {ng.Component} options
     * @returns {NgModule}
     */
    component(name, options) {
        validate(isString, name, "name");
        validate(isDefined, options, "object");
        this._invokeQueue.push([_compileProvider, "component", [name, options]]);
        return this;
    }
    /**
     * @param {string} name
     * @param {ng.Injectable<(...args: unknown[]) => unknown>} providerFunction
     * @returns {NgModule}
     */
    factory(name, providerFunction) {
        validate(isString, name, "name");
        validateRequired(providerFunction, "providerFunction");
        this._invokeQueue.push([_provide, "factory", [name, providerFunction]]);
        return this;
    }
    /**
     * @param {string} name
     * @param {ng.Injectable<(...args: unknown[]) => unknown>} serviceFunction
     * @returns {NgModule}
     */
    service(name, serviceFunction) {
        validate(isString, name, "name");
        validateRequired(serviceFunction, "serviceFunction");
        this._services.push(name);
        this._invokeQueue.push([_provide, "service", [name, serviceFunction]]);
        return this;
    }
    /**
     * @param {string} name
     * @param {ng.Injectable<(...args: unknown[]) => unknown>} providerType
     * @returns {NgModule}
     */
    provider(name, providerType) {
        validate(isString, name, "name");
        validateRequired(providerType, "providerType");
        this._invokeQueue.push([_provide, "provider", [name, providerType]]);
        return this;
    }
    /**
     * @param {string} name
     * @param {ng.Injectable<(...args: unknown[]) => unknown>} decorFn
     * @returns {NgModule}
     */
    decorator(name, decorFn) {
        validate(isString, name, "name");
        validateRequired(decorFn, "decorFn");
        this._configBlocks.push([_provide, "decorator", [name, decorFn]]);
        return this;
    }
    /**
     * @param {string} name
     * @param {ng.Injectable<(...args: unknown[]) => unknown>} directiveFactory
     * @returns {NgModule}
     */
    directive(name, directiveFactory) {
        validate(isString, name, "name");
        validateRequired(directiveFactory, "directiveFactory");
        this._invokeQueue.push([
            _compileProvider,
            "directive",
            [name, directiveFactory],
        ]);
        return this;
    }
    /**
     * @param {string} name
     * @param {ng.Injectable<(...args: unknown[]) => unknown>} animationFactory
     * @returns {NgModule}
     */
    animation(name, animationFactory) {
        validate(isString, name, "name");
        validateRequired(animationFactory, "animationFactory");
        this._invokeQueue.push([
            _animateProvider,
            "register",
            [name, animationFactory],
        ]);
        return this;
    }
    /**
     * @param {string} name
     * @param {ng.FilterFactory} filterFn
     * @return {NgModule}
     */
    filter(name, filterFn) {
        validate(isString, name, "name");
        validate(isFunction, filterFn, `filterFn`);
        this._invokeQueue.push([_filterProvider, "register", [name, filterFn]]);
        return this;
    }
    /**
     * The $controller service is used by Angular to create new controllers.
     * This provider allows controller registration via the register method.
     *
     * @param {string} name Controller name
     * @param {ng.Injectable<ng.ControllerConstructor>} ctlFn Controller constructor fn (optionally decorated with DI annotations in the array notation)
     * @returns {NgModule}
     */
    controller(name, ctlFn) {
        validate(isString, name, "name");
        validateRequired(ctlFn, `fictlFnlterFn`);
        this._invokeQueue.push([_controllerProvider, "register", [name, ctlFn]]);
        return this;
    }
    /**
     * Register a named WebAssembly module as an injectable service.
     *
     * The actual loading is delegated to the `$wasm` provider, so custom
     * runtimes can decide whether WebAssembly support is included.
     *
     * @param {string} name - Injectable name used to access the module exports.
     * @param {string} src - URL of the `.wasm` file to fetch and instantiate.
     * @param {WebAssembly.Imports} [imports] - WebAssembly import object.
     * @param {WasmOptions} [opts] - WebAssembly provider options.
     *
     * Supported keys:
     * - **raw**: `boolean`
     *   - `false` (default): the injectable resolves to `instance.exports`.
     *   - `true`: the injectable resolves to `{ instance, exports, module }`.
     *
     * @returns {NgModule}
     */
    wasm(name, src, imports = {}, opts = {}) {
        validate(isString, name, "name");
        validate(isString, src, "src");
        this._invokeQueue.push([
            _provide,
            "factory",
            [name, [_wasm, ($wasm) => $wasm(src, imports, opts)]],
        ]);
        return this;
    }
    /**
     * Register a named Web Worker connection as an injectable service.
     *
     * The actual connection is delegated to the `$worker` provider, so worker
     * support remains provider-driven instead of directive-driven.
     *
     * @param {string} name - Injectable name.
     * @param {string | URL} scriptPath - Worker script URL.
     * @param {WorkerConfig} [config] - Worker connection options.
     * @returns {NgModule}
     */
    worker(name, scriptPath, config = {}) {
        validate(isString, name, "name");
        validateRequired(scriptPath, "scriptPath");
        this._invokeQueue.push([
            _provide,
            "factory",
            [
                name,
                [_worker, ($worker) => $worker(scriptPath, config)],
            ],
        ]);
        return this;
    }
    /**
     * Register a persistent object store as an injectable service.
     *
     * Store construction is delegated to `$provide.store`, which creates the
     * service through the injector and persists it through the selected backend.
     *
     * @param {string} name - Service name.
     * @param {Function|Object} ctor - Constructor, factory, or object to persist.
     * @param {ng.StorageType} type - Storage backend type.
     * @param {StorageLike & PersistentStoreConfig} [backendOrConfig] - Custom backend or persistence options.
     * @returns {NgModule}
     */
    store(name, ctor, type, backendOrConfig) {
        validate(isString, name, "name");
        validateRequired(ctor, "ctor");
        this._invokeQueue.push([
            _provide,
            "store",
            [name, isObject(ctor) ? () => ctor : ctor, type, backendOrConfig],
        ]);
        return this;
    }
    /**
     * Register a REST resource as an injectable service.
     *
     * The resource factory is delegated to the `$rest` provider, keeping REST
     * support configurable by custom runtimes.
     *
     * @template T, ID
     * @param {string} name - Service name.
     * @param {string} url - Base URL or URI template.
     * @param {ng.EntityClass<T>} [entityClass] - Optional constructor for mapping JSON.
     * @param {RestOptions} [options] - Optional RestService options.
     * @returns {NgModule}
     */
    rest(name, url, entityClass, options = {}) {
        validate(isString, name, "name");
        validate(isString, url, "url");
        this._invokeQueue.push([
            _provide,
            "factory",
            [
                name,
                [
                    _rest,
                    ($rest) => $rest(url, entityClass, options),
                ],
            ],
        ]);
        return this;
    }
    /**
     * Register a pre-configured SSE connection as an injectable service.
     *
     * The connection is created by `$sse` when the named service is requested.
     *
     * @param {string} name - Injectable name.
     * @param {string} url - SSE endpoint.
     * @param {SseConfig} [config] - SSE connection options.
     * @returns {NgModule}
     */
    sse(name, url, config = {}) {
        validate(isString, name, "name");
        validate(isString, url, "url");
        this._invokeQueue.push([
            _provide,
            "factory",
            [name, [_sse, ($sse) => $sse(url, config)]],
        ]);
        return this;
    }
    /**
     * Register a pre-configured WebSocket connection as an injectable service.
     *
     * The connection is created by `$websocket` when the named service is
     * requested.
     *
     * @param {string} name - Injectable name.
     * @param {string} url - WebSocket endpoint.
     * @param {string[]} [protocols] - Optional subprotocols.
     * @param {WebSocketConfig} [config] - WebSocket connection options.
     * @returns {NgModule}
     */
    websocket(name, url, protocols = [], config = {}) {
        validate(isString, name, "name");
        validate(isString, url, "url");
        this._invokeQueue.push([
            _provide,
            "factory",
            [
                name,
                [
                    _websocket,
                    ($websocket) => $websocket(url, protocols, config),
                ],
            ],
        ]);
        return this;
    }
    /**
     * Register a pre-configured WebTransport connection as an injectable service.
     *
     * The connection is created by `$webTransport` when the named service is
     * requested.
     *
     * @param {string} name - Injectable name.
     * @param {string} url - WebTransport endpoint.
     * @param {WebTransportConfig} [config] - WebTransport connection options.
     * @returns {NgModule}
     */
    webTransport(name, url, config = {}) {
        validate(isString, name, "name");
        validate(isString, url, "url");
        this._invokeQueue.push([
            _provide,
            "factory",
            [
                name,
                [
                    _webTransport,
                    ($webTransport) => $webTransport(url, config),
                ],
            ],
        ]);
        return this;
    }
}

export { NgModule };
