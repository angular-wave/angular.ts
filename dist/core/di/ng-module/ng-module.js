import { isString, isArray, isDefined, isFunction, isObject } from '../../../shared/utils.js';
import { AnimationRegistry } from '../../../animations/animate.js';
import { ControllerRegistry } from '../../controller/controller.js';
import { _injector, _anchorScroll, _aria, _cookie, _exceptionHandler, _eventBus, _htmlCanvas, _http, _interpolate, _log, _location, _sce, _sceDelegate, _templateCache, _templateRequest, _webComponent, _rest, _security, _sse, _websocket, _webTransport, _serviceWorker, _compile, _animate, _controller, _element, _rootElement, _rootScope, _scope, _state, _stateRegistry, _transitions, _machine, _workflow, _wasm, _worker } from '../../../injection-tokens.js';
import { isInjectable } from '../injectable.js';
import { FilterRegistry } from '../../filter/filter.js';
import { validate, validateRequired } from '../../../shared/validate.js';
import { setStateDeclarationSource } from '../../../router/state/state-object.js';
import { createWorkflowSupervisor } from '../../../services/workflow/workflow.js';
import { CompileRegistry, CompileLifecycle } from '../../compile/compile.js';
import { RuntimeConfigRegistry } from '../../composition/runtime-composition.js';
import { AppContext } from '../../app-context/app-context.js';
import { annotate } from '../di.js';
import { providerRegistration } from '../interface.js';

const rootScopedModelFactoryDependencies = new Set([
    _anchorScroll,
    _animate,
    _compile,
    _controller,
    _element,
    _rootElement,
    _rootScope,
    _scope,
    _state,
    _stateRegistry,
    _transitions,
    _webComponent,
]);
const routerConfigKey = "$router";
const angularConfigKeys = new Set([
    _anchorScroll,
    _aria,
    _compile,
    _cookie,
    _eventBus,
    _exceptionHandler,
    _htmlCanvas,
    _http,
    _interpolate,
    _location,
    _log,
    _rest,
    routerConfigKey,
    _sce,
    _sceDelegate,
    _security,
    _sse,
    _templateCache,
    _templateRequest,
    _webComponent,
    _webTransport,
    _websocket,
]);
function assertKnownAngularConfigKey(key) {
    if (!angularConfigKeys.has(key)) {
        throw new Error(`Unknown AngularTS config key '${key}'.`);
    }
}
function setAngularConfig(target, key, value) {
    validate(isObject, value, key);
    target[key] = value;
}
function isStringOrUrl(value) {
    return isString(value) || value instanceof URL;
}
function isDynamicConfig(value, isStatic) {
    return isInjectable(value) || isStatic(value);
}
function resolveDynamicConfig(value, injector) {
    if (!isInjectable(value)) {
        return value;
    }
    return injector.invoke(value);
}
function cloneWorkflowSupervisorModuleConfig(config) {
    return {
        ...config,
        workflows: cloneWorkflowSupervisorDefinitions(config.workflows),
    };
}
function cloneWorkflowSupervisorDefinitions(workflows) {
    if (!isObject(workflows) || isArray(workflows)) {
        return workflows;
    }
    const cloned = {};
    for (const [name, definition] of Object.entries(workflows)) {
        cloned[name] = cloneWorkflowSupervisorDefinition(definition);
    }
    return cloned;
}
function cloneWorkflowSupervisorDefinition(definition) {
    if (!isObject(definition) ||
        isWorkflowInstanceLike(definition) ||
        !hasOwnData(definition)) {
        return definition;
    }
    return {
        ...definition,
        data: structuredClone(definition.data),
    };
}
function isWorkflowInstanceLike(value) {
    const candidate = value;
    return (isFunction(candidate.restore) &&
        isFunction(candidate.run) &&
        isFunction(candidate.snapshot));
}
function hasOwnData(value) {
    return Object.prototype.hasOwnProperty.call(value, "data");
}
function isPlainModelRoot(value) {
    if (!isObject(value) || isArray(value)) {
        return false;
    }
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}
function cloneModelRoot(value) {
    try {
        return structuredClone(value);
    }
    catch {
        return { ...value };
    }
}
function getModelFactoryDependencies(name, initial) {
    if (!isFunction(initial)) {
        return annotate(initial, `model ${name}`);
    }
    const factory = initial;
    const hadOwnInject = Object.prototype.hasOwnProperty.call(factory, "$inject");
    const previousInject = factory.$inject;
    try {
        return annotate(factory, `model ${name}`);
    }
    finally {
        if (hadOwnInject) {
            factory.$inject = previousInject;
        }
        else {
            delete factory.$inject;
        }
    }
}
function assertAppSafeModelFactoryDependencies(name, initial) {
    const dependencies = getModelFactoryDependencies(name, initial);
    const rootScopedDependency = dependencies.find((dependency) => rootScopedModelFactoryDependencies.has(dependency));
    if (rootScopedDependency) {
        throw new Error(`Model '${name}' factory cannot inject root-scoped dependency '${rootScopedDependency}'.`);
    }
}
function createModelFactory(initial, getInjector) {
    if (!isInjectable(initial)) {
        return () => cloneModelRoot(initial);
    }
    return () => {
        const injector = getInjector();
        if (!injector) {
            throw new Error("Injectable model factories require an active AngularTS injector.");
        }
        return injector.invoke(initial, undefined, undefined, "model");
    };
}
function registerValue(name, value) {
    return providerRegistration((registry) => {
        registry.value(name, value);
    });
}
function registerConstant(name, value) {
    return providerRegistration((registry) => {
        registry.constant(name, value);
    });
}
function registerFactory(name, factory) {
    return providerRegistration((registry) => {
        registry.factory(name, factory);
    });
}
function registerService(name, service) {
    return providerRegistration((registry) => {
        registry.service(name, service);
    });
}
function registerProvider(name, provider) {
    return providerRegistration((registry) => {
        registry.provider(name, provider);
    });
}
function registerDecorator(name, decorator) {
    return providerRegistration((registry) => {
        registry.decorator(name, decorator);
    });
}
function registerStore(name, constructor, type, config) {
    return providerRegistration((registry) => {
        registry.store(name, constructor, type, config);
    });
}
/**
 * Modules are collections of application configuration information for components:
 * controllers, directives, filters, etc. They provide recipes for the injector
 * to do the actual instantiation. A module itself has no behaviour but only state.
 * A such, it acts as a data structure between the Angular instance and the injector service.
 */
class NgModule {
    constructor(name, requires, configFn, animationRegistry, controllerRegistry, filterRegistry, compileRegistry, appContext, runtimeConfig) {
        validate(isString, name, "name");
        validate(isArray, requires, "requires");
        this.name = name;
        this._requires = requires;
        this._invokeQueue = [];
        this._configBlocks = [];
        this._runBlocks = [];
        this._animationRegistry = animationRegistry ?? new AnimationRegistry();
        this._controllerRegistry = controllerRegistry ?? new ControllerRegistry();
        this._filterRegistry = filterRegistry ?? new FilterRegistry();
        this._compileRegistry =
            compileRegistry ?? new CompileRegistry(new CompileLifecycle());
        this._appContext = appContext ?? new AppContext();
        this._runtimeConfig = runtimeConfig ?? new RuntimeConfigRegistry();
        if (configFn) {
            this._config(configFn);
        }
        this._services = [];
        this._models = new Map();
    }
    /**
     * @param {string} name
     * @param {unknown} object - Allows undefined
     * @returns {NgModule}
     */
    value(name, object) {
        validate(isString, name, "name");
        this._invokeQueue.push(registerValue(name, object));
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
        this._invokeQueue.unshift(registerConstant(name, object));
        return this;
    }
    /**
     *
     * @param {ng.Injectable<(...args: unknown[]) => unknown>} configFn
     * @returns {NgModule}
     */
    /** @internal */
    _config(configFn) {
        validate(isInjectable, configFn, "configFn", "notinjectable");
        this._configBlocks.push([_injector, "invoke", [configFn]]);
        return this;
    }
    /** @internal */
    _registerProviders(register) {
        validate(isFunction, register, "register");
        this._invokeQueue.push(providerRegistration(register));
        return this;
    }
    config(config) {
        const normalized = {};
        validate(isObject, config, "config");
        for (const key of Object.keys(config)) {
            assertKnownAngularConfigKey(key);
            setAngularConfig(normalized, key, config[key]);
        }
        const compileConfig = normalized.$compile;
        if (compileConfig) {
            this._configBlocks.push([
                this._compileRegistry,
                "configure",
                [compileConfig],
            ]);
        }
        const anchorScrollConfig = normalized.$anchorScroll;
        if (anchorScrollConfig) {
            this._configBlocks.push([
                this._runtimeConfig,
                "configure",
                [_anchorScroll, anchorScrollConfig],
            ]);
        }
        const ariaConfig = normalized.$aria;
        if (ariaConfig) {
            this._configBlocks.push([
                this._runtimeConfig,
                "configure",
                [_aria, ariaConfig],
            ]);
        }
        const cookieConfig = normalized.$cookie;
        if (cookieConfig) {
            this._configBlocks.push([
                this._runtimeConfig,
                "configure",
                [_cookie, cookieConfig],
            ]);
        }
        const exceptionHandlerConfig = normalized.$exceptionHandler;
        if (exceptionHandlerConfig) {
            this._configBlocks.push([
                this._runtimeConfig,
                "configure",
                [_exceptionHandler, exceptionHandlerConfig],
            ]);
        }
        const eventBusConfig = normalized.$eventBus;
        if (eventBusConfig) {
            this._configBlocks.push([
                this._runtimeConfig,
                "configure",
                [_eventBus, eventBusConfig],
            ]);
        }
        const htmlCanvasConfig = normalized.$htmlCanvas;
        if (htmlCanvasConfig) {
            this._configBlocks.push([
                this._runtimeConfig,
                "configure",
                [_htmlCanvas, htmlCanvasConfig],
            ]);
        }
        const httpConfig = normalized.$http;
        if (httpConfig) {
            this._configBlocks.push([
                this._runtimeConfig,
                "configure",
                [_http, httpConfig],
            ]);
        }
        const interpolateConfig = normalized.$interpolate;
        if (interpolateConfig) {
            this._configBlocks.push([
                this._runtimeConfig,
                "configure",
                [_interpolate, interpolateConfig],
            ]);
        }
        const logConfig = normalized.$log;
        if (logConfig) {
            this._configBlocks.push([
                this._runtimeConfig,
                "configure",
                [_log, logConfig],
            ]);
        }
        const locationConfig = normalized.$location;
        if (locationConfig) {
            this._configBlocks.push([
                this._runtimeConfig,
                "configure",
                [_location, locationConfig],
            ]);
        }
        const sceConfig = normalized.$sce;
        if (sceConfig) {
            this._configBlocks.push([
                this._runtimeConfig,
                "configure",
                [_sce, sceConfig],
            ]);
        }
        const sceDelegateConfig = normalized.$sceDelegate;
        if (sceDelegateConfig) {
            this._configBlocks.push([
                this._runtimeConfig,
                "configure",
                [_sceDelegate, sceDelegateConfig],
            ]);
        }
        const templateCacheConfig = normalized.$templateCache;
        if (templateCacheConfig) {
            this._configBlocks.push([
                this._runtimeConfig,
                "configure",
                [_templateCache, templateCacheConfig],
            ]);
        }
        const templateRequestConfig = normalized.$templateRequest;
        if (templateRequestConfig) {
            this._configBlocks.push([
                this._runtimeConfig,
                "configure",
                [_templateRequest, templateRequestConfig],
            ]);
        }
        const webComponentConfig = normalized.$webComponent;
        if (webComponentConfig) {
            this._configBlocks.push([
                this._runtimeConfig,
                "configure",
                [_webComponent, webComponentConfig],
            ]);
        }
        const restConfig = normalized.$rest;
        if (restConfig) {
            this._configBlocks.push([
                this._runtimeConfig,
                "configure",
                [_rest, restConfig],
            ]);
        }
        const routerConfig = normalized.$router;
        if (routerConfig) {
            this._configBlocks.push([
                this._runtimeConfig,
                "configure",
                [
                    routerConfigKey,
                    {
                        type: "config",
                        config: routerConfig,
                    },
                ],
            ]);
        }
        const securityConfig = normalized.$security;
        if (securityConfig) {
            this._configBlocks.push([
                this._runtimeConfig,
                "configure",
                [_security, securityConfig],
            ]);
        }
        const sseConfig = normalized.$sse;
        if (sseConfig) {
            this._configBlocks.push([
                this._runtimeConfig,
                "configure",
                [_sse, sseConfig],
            ]);
        }
        const webSocketConfig = normalized.$websocket;
        if (webSocketConfig) {
            this._configBlocks.push([
                this._runtimeConfig,
                "configure",
                [_websocket, webSocketConfig],
            ]);
        }
        const webTransportConfig = normalized.$webTransport;
        if (webTransportConfig) {
            this._configBlocks.push([
                this._runtimeConfig,
                "configure",
                [_webTransport, webTransportConfig],
            ]);
        }
        return this;
    }
    /**
     * @param {ng.Injectable<(...args: unknown[]) => unknown>} block
     * @returns {NgModule}
     */
    run(block) {
        validate(isInjectable, block, "block", "notinjectable");
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
        this._invokeQueue.push([
            this._compileRegistry,
            "component",
            [name, options],
        ]);
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
        this._invokeQueue.push(registerFactory(name, providerFunction));
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
        this._invokeQueue.push(registerService(name, serviceFunction));
        return this;
    }
    /**
     * @param {string} name
     * @param {ng.ProviderDefinition} providerType
     * @returns {NgModule}
     */
    provider(name, providerType) {
        validate(isString, name, "name");
        validateRequired(providerType, "providerType");
        this._invokeQueue.push(registerProvider(name, providerType));
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
        this._configBlocks.push(registerDecorator(name, decorFn));
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
            this._compileRegistry,
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
            this._animationRegistry,
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
        validate(isInjectable, filterFn, `filterFn`);
        this._invokeQueue.push([
            this._filterRegistry,
            "register",
            [name, filterFn],
        ]);
        return this;
    }
    /**
     * The $controller service is used by Angular to create new controllers.
     * Named controllers are stored in the owning runtime's controller registry.
     *
     * @param {string} name Controller name
     * @param {ng.Injectable<ng.ControllerConstructor>} ctlFn Controller constructor fn (optionally decorated with DI annotations in the array notation)
     * @returns {NgModule}
     */
    controller(name, ctlFn) {
        validate(isString, name, "name");
        validateRequired(ctlFn, "controller");
        this._invokeQueue.push([
            this._controllerRegistry,
            "register",
            [name, ctlFn],
        ]);
        return this;
    }
    /**
     * Register a named reactive model as an injectable app-owned service.
     *
     * The model is created lazily by the owning `AppContext` when the service is
     * first injected. Models are shared across every root scope managed by the
     * same `AppContext`; they are not children of `$rootScope`.
     *
     * Assign an injected model to a controller or scope property to bind it in a
     * template. DOM interpolation, `ng-bind`, directive expressions, nested
     * object reads, and array length reads update when the app model changes.
     * Mutating the model proxy schedules every affected observer.
     *
     * The injected `Model<T>` value is proxy-backed. It exposes scope-proxy
     * methods such as `$watch`, `$batch`, `$merge`, `$on`, `$emit`, `$broadcast`,
     * and `$destroy`, plus `$snapshot`, `$restore`, and `$sync` for model
     * lifecycle and synchronization.
     *
     * Prefer the factory form for nontrivial initial state:
     *
     * ```ts
     * app.model("user", () => ({ name: "John", authenticated: false }));
     * ```
     *
     * @param {string} name - Injectable model name.
     * @param {Object|Function|Array} initial - Plain object state or an
     * injectable factory that returns plain object state.
     * @returns {NgModule}
     */
    model(name, initial) {
        validate(isString, name, "name");
        validate((value) => isInjectable(value) || isPlainModelRoot(value), initial, "initial");
        if (this._models.has(name)) {
            throw new Error(`Model '${name}' is already registered.`);
        }
        if (isInjectable(initial)) {
            assertAppSafeModelFactoryDependencies(name, initial);
        }
        let modelInjector;
        const modelFactory = createModelFactory(initial, () => modelInjector);
        this._models.set(name, modelFactory);
        this._invokeQueue.push(registerFactory(name, [
            _injector,
            (injector) => {
                modelInjector ?? (modelInjector = injector);
                return this._appContext.registerModel(name, modelFactory, {
                    injector,
                });
            },
        ]));
        return this;
    }
    machine(name, config) {
        validate(isString, name, "name");
        validate(isDynamicConfig.bind(null, config, isObject), config, "config");
        this._invokeQueue.push(registerFactory(name, [
            _machine,
            _injector,
            ($machine, $injector) => {
                const resolvedConfig = resolveDynamicConfig(config, $injector);
                let resolvedData = resolvedConfig.data;
                // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- null must reach runtime validation
                if (resolvedData === undefined) {
                    resolvedData = {};
                }
                const data = structuredClone(resolvedData);
                return $machine({
                    ...resolvedConfig,
                    data,
                });
            },
        ]));
        return this;
    }
    workflow(name, config) {
        validate(isString, name, "name");
        validate(isDynamicConfig.bind(null, config, isObject), config, "config");
        this._invokeQueue.push(registerFactory(name, [
            _workflow,
            _injector,
            ($workflow, $injector) => {
                const resolvedConfig = resolveDynamicConfig(config, $injector);
                let resolvedData = resolvedConfig.data;
                // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- null must reach runtime validation
                if (resolvedData === undefined) {
                    resolvedData = {};
                }
                return $workflow({
                    ...resolvedConfig,
                    id: resolvedConfig.id ?? name,
                    data: structuredClone(resolvedData),
                });
            },
        ]));
        return this;
    }
    /**
     * Register a named workflow supervisor as an injectable service.
     *
     * The supervisor is created when the named service is requested. It composes
     * existing workflow configs or workflow instances and keeps persistence and
     * recovery policy local to the supervisor config.
     *
     * @param name - Injectable name.
     * @param config - Supervisor configuration or a resolvable config factory.
     * @returns {NgModule}
     */
    workflowSupervisor(name, config) {
        validate(isString, name, "name");
        validate(isDynamicConfig.bind(null, config, isObject), config, "config");
        this._invokeQueue.push(registerFactory(name, [
            _workflow,
            _injector,
            ($workflow, $injector) => {
                const resolvedConfig = resolveDynamicConfig(config, $injector);
                return createWorkflowSupervisor($workflow, cloneWorkflowSupervisorModuleConfig({
                    ...resolvedConfig,
                    id: resolvedConfig.id ?? name,
                }));
            },
        ]));
        return this;
    }
    router(declaration) {
        const states = flattenRouterModuleDeclaration(declaration);
        for (const state of states) {
            this._configBlocks.push([
                this._runtimeConfig,
                "configure",
                [
                    routerConfigKey,
                    { type: "state", definition: state },
                ],
            ]);
        }
        return this;
    }
    /**
     * Register a lazy router state namespace during module configuration.
     *
     * Lazy route declarations use the same composed router runtime as static
     * module routes.
     *
     * @param prefix - State name prefix to load on demand.
     * @param loader - Loader invoked by the router when a transition targets the prefix.
     * @returns {NgModule}
     */
    lazyState(prefix, loader) {
        validate(isString, prefix, "prefix");
        validate(isFunction, loader, "loader");
        this._configBlocks.push([
            this._runtimeConfig,
            "configure",
            [
                routerConfigKey,
                { type: "lazy", prefix, loader },
            ],
        ]);
        return this;
    }
    /**
     * Register a named WebAssembly module as an injectable resource.
     *
     * The actual loading is delegated to the `$wasm` service, so custom
     * runtimes can decide whether WebAssembly support is included.
     *
     * @param {string} name - Injectable name used to access the resource.
     * @param config - Module source and imports, optionally produced by DI.
     *
     * @returns {NgModule}
     */
    wasm(name, config) {
        validate(isString, name, "name");
        validate((value) => isDynamicConfig(value, isObject), config, "config");
        this._invokeQueue.push(registerFactory(name, [
            _wasm,
            _injector,
            ($wasm, $injector) => $wasm.load(resolveDynamicConfig(config, $injector)),
        ]));
        return this;
    }
    /**
     * Register a named Web Worker connection as an injectable service.
     *
     * The actual connection is delegated to the `$worker` provider, so worker
     * support remains provider-driven instead of directive-driven.
     *
     * @param {string} name - Injectable name.
     * @param {string|URL|ng.Injectable<(...args: never[]) => string|URL>}
     *   [scriptPath] Worker script URL, optionally produced by DI.
     * @param {WorkerConfig|ng.Injectable<(...args: never[]) => WorkerConfig>}
     *   [config] Worker connection options, optionally produced by DI.
     * @returns {NgModule}
     */
    worker(name, scriptPath, config = {}) {
        validate(isString, name, "name");
        validate((value) => isDynamicConfig(value, isStringOrUrl), scriptPath, "scriptPath");
        validate((value) => isDynamicConfig(value, isObject), config, "config");
        this._invokeQueue.push(registerFactory(name, [
            _worker,
            _injector,
            ($worker, $injector) => $worker(resolveDynamicConfig(scriptPath, $injector), resolveDynamicConfig(config, $injector)),
        ]));
        return this;
    }
    /** Configure the singleton `$serviceWorker` for this application. */
    serviceWorker(scriptUrl, config = {}) {
        validate(isStringOrUrl, scriptUrl, "scriptUrl");
        validate(isObject, config, "config");
        this._configBlocks.push([
            this._runtimeConfig,
            "configure",
            [_serviceWorker, { scriptUrl, config }],
        ]);
        return this;
    }
    /**
     * Register a persistent object store as an injectable service.
     *
     * Store construction is delegated to the internal provider registry, which
     * creates the service through the injector and persists it through the
     * selected backend.
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
        this._invokeQueue.push(registerStore(name, isObject(ctor) ? () => ctor : ctor, type, backendOrConfig));
        return this;
    }
    /**
     * Register a REST resource as an injectable service.
     *
     * The resource factory is delegated to the injected `$rest` service, keeping
     * REST support configurable by custom runtimes.
     *
     * @template T, ID
     * @param {string} name - Service name.
     * @param {string} url - Base URL or URI template.
     * @param {ng.EntityClass<T>} [entityClass] - Optional constructor for mapping JSON.
     * @param {RestOptions|ng.Injectable<(...args: never[]) => RestOptions>} [options]
     *   Optional RestService options, optionally produced by DI.
     * @returns {NgModule}
     */
    rest(name, url, entityClass, options = {}) {
        validate(isString, name, "name");
        validate(isString, url, "url");
        validate((value) => isDynamicConfig(value, isObject), options, "options");
        this._invokeQueue.push(registerFactory(name, [
            _rest,
            _injector,
            ($rest, $injector) => $rest(url, entityClass, resolveDynamicConfig(options, $injector)),
        ]));
        return this;
    }
    /**
     * Register a pre-configured SSE connection as an injectable service.
     *
     * The connection is created by `$sse` when the named service is requested.
     *
     * @param {string} name - Injectable name.
     * @param {string} url - SSE endpoint.
     * @param {SseConfig|ng.Injectable<(...args: never[]) => SseConfig>} [config]
     *   SSE connection options, optionally produced by DI.
     * @returns {NgModule}
     */
    sse(name, url, config = {}) {
        validate(isString, name, "name");
        validate(isString, url, "url");
        validate((value) => isDynamicConfig(value, isObject), config, "config");
        this._invokeQueue.push(registerFactory(name, [
            _sse,
            _injector,
            ($sse, $injector) => $sse(url, resolveDynamicConfig(config, $injector)),
        ]));
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
     * @param {WebSocketConfig|ng.Injectable<(...args: never[]) => WebSocketConfig>}
     *   [config] WebSocket connection options, optionally produced by DI.
     * @returns {NgModule}
     */
    websocket(name, url, config = {}) {
        validate(isString, name, "name");
        validate(isString, url, "url");
        validate((value) => isDynamicConfig(value, isObject), config, "config");
        this._invokeQueue.push(registerFactory(name, [
            _websocket,
            _injector,
            ($websocket, $injector) => $websocket(url, resolveDynamicConfig(config, $injector)),
        ]));
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
     * @param {WebTransportConfig|ng.Injectable<(...args: never[]) => WebTransportConfig>}
     *   [config] WebTransport connection options, optionally produced by DI.
     * @returns {NgModule}
     */
    webTransport(name, url, config = {}) {
        validate(isString, name, "name");
        validate(isString, url, "url");
        validate((value) => isDynamicConfig(value, isObject), config, "config");
        this._invokeQueue.push(registerFactory(name, [
            _webTransport,
            _injector,
            ($webTransport, $injector) => $webTransport(url, resolveDynamicConfig(config, $injector)),
        ]));
        return this;
    }
    /**
     * Register an options-backed application host custom element.
     *
     * The definition is installed when the module runs. The host element is a
     * native custom element backed by an AngularTS child scope.
     *
     * @param {string} name - Custom element tag name.
     * @param {AppComponentOptions} options - App component options.
     * @returns {NgModule}
     */
    appComponent(name, options) {
        validate(isString, name, "name");
        validate(isObject, options, "options");
        this._runBlocks.push([
            _webComponent,
            ($webComponent) => $webComponent.defineAppComponent(name, options),
        ]);
        return this;
    }
    /**
     * Register a user-authored native custom element backed by an AngularTS scope.
     *
     * The element class must extend `ScopeElement`. Its static template, shadow,
     * scope, inputs, and isolate properties configure the AngularTS wiring.
     *
     * @param {string} name - Custom element tag name.
     * @param {ScopeElementConstructor} elementClass - Custom element class.
     * @returns {NgModule}
     */
    webComponent(name, elementClass) {
        validate(isString, name, "name");
        validate(isFunction, elementClass, "elementClass");
        this._runBlocks.push([
            _webComponent,
            ($webComponent) => $webComponent.defineElement(name, elementClass),
        ]);
        return this;
    }
}
function flattenRouterModuleDeclaration(declaration) {
    const states = [];
    if (isRouterModuleForest(declaration)) {
        for (const route of declaration) {
            appendRouterModuleDeclaration(route, undefined, states);
        }
    }
    else {
        appendRouterModuleDeclaration(declaration, undefined, states);
    }
    return states;
}
function isRouterModuleForest(declaration) {
    return isArray(declaration);
}
function appendRouterModuleDeclaration(declaration, parentName, states) {
    validate(isObject, declaration, "declaration");
    validate(isString, declaration.name, "name");
    const { children, ...stateDeclaration } = declaration;
    const name = resolveRouterStateName(parentName, declaration.name);
    const canUseSource = children === undefined && name === declaration.name;
    const flattened = canUseSource
        ? declaration
        : { ...stateDeclaration, name };
    if (!canUseSource) {
        setStateDeclarationSource(flattened, declaration);
    }
    states.push(flattened);
    if (children === undefined) {
        return;
    }
    validate(isArray, children, "children");
    for (const child of children) {
        appendRouterModuleDeclaration(child, name, states);
    }
}
function resolveRouterStateName(parentName, childName) {
    if (parentName === undefined || childName.includes(".")) {
        return childName;
    }
    return `${parentName}.${childName}`;
}

export { NgModule };
