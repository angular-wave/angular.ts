import { _parse, _rootElement, _rootScope, _compile, _injector, _scope } from './injection-tokens.js';
import { errorHandlingConfig, values, assertNotHasOwnProperty, hasOwn, isString, isInstanceOf, isArray, ngAttrPrefixes, createErrorFactory, isObject } from './shared/utils.js';
import { getController, getInjector, getScope, getInheritedData, setCacheData } from './shared/dom.js';
import { createInjector } from './core/di/injector.js';
import { NgModule } from './core/di/ng-module/ng-module.js';
import { validateIsString } from './shared/validate.js';

const ngError = createErrorFactory("ng");
const $injectorError = createErrorFactory("$injector");
const rootScopeCleanupByElement = new WeakMap();
const moduleRegistry = {};
let builtinNgModuleRegistrar;
let runtimeInjectionTokens;
/**
 * Configures how the runtime registers the default built-in `ng` module.
 *
 * The browser entrypoint installs the full registrar. Custom runtime entrypoints
 * intentionally skip this so they can assemble smaller builds.
 */
function configureBuiltinRuntime(registrar) {
    builtinNgModuleRegistrar = registrar;
}
function configureRuntimeInjectionTokens(tokens) {
    runtimeInjectionTokens = tokens;
}
/**
 * Main Angular runtime entry point.
 *
 * It owns module registration, application bootstrap, injector access,
 * and the lightweight event-based invocation helpers exposed on `window.angular`.
 */
class AngularRuntime extends EventTarget {
    /**
     * Creates the Angular runtime singleton or a sub-application instance.
     *
     * @param subapp when `true`, skips assigning the instance to `window.angular`
     */
    constructor(options = false) {
        super();
        /** Sub-application instances created when multiple `ng-app` roots are initialized. */
        this.subapps = [];
        /** @internal */
        this._bootsrappedModules = [];
        /** AngularTS version string replaced at build time. */
        this.version = "[VI]{version}[/VI]";
        /** Retrieve the controller instance cached on a compiled DOM element. */
        this.getController = getController;
        /** Retrieve the injector cached on a bootstrapped DOM element. */
        this.getInjector = getInjector;
        /** Retrieve the scope cached on a compiled DOM element. */
        this.getScope = getScope;
        /** Global framework error-handling configuration. */
        this.errorHandlingConfig = errorHandlingConfig;
        /** Public injection token names keyed by token value. */
        this.$t = {};
        const runtimeOptions = normalizeRuntimeOptions(options);
        this._subapp = runtimeOptions.subapp;
        if (runtimeInjectionTokens) {
            values(runtimeInjectionTokens).forEach((token) => {
                this.$t[token] = token;
            });
        }
        if (runtimeOptions.attachToWindow) {
            window.angular = this;
        }
        if (runtimeOptions.registerBuiltins) {
            this.registerNgModule();
        }
    }
    /**
     * Registers the configured built-in `ng` module for this runtime instance.
     */
    registerNgModule() {
        if (!builtinNgModuleRegistrar) {
            throw ngError("nobuiltins", "Built-in AngularTS modules are not configured for this runtime. Import the full runtime entrypoint or construct with registerBuiltins: false.");
        }
        return builtinNgModuleRegistrar(this);
    }
    /**
     * The `angular.module` is a global place for creating, registering and retrieving AngularTS
     * modules.
     * All modules (AngularTS core or 3rd party) that should be available to an application must be
     * registered using this mechanism.
     *
     * Passing one argument retrieves an existing ng.NgModule,
     * whereas passing more than one argument creates a new ng.NgModule
     *
     * # Module
     *
     * A module is a collection of services, directives, controllers, filters, workers, WebAssembly modules, and configuration information.
     * `angular.module` is used to configure the auto.$injector `$injector`.
     *
     * ```js
     * // Create a new module
     * let myModule = angular.module('myModule', []);
     *
     * // register a new service
     * myModule.value('appName', 'MyCoolApp');
     *
     * // configure existing services inside initialization blocks.
     * myModule.config(['$locationProvider', function($locationProvider) {
     *   // Configure existing providers
     *   $locationProvider.hashPrefix('!');
     * }]);
     * ```
     *
     * Then you can create an injector and load your modules like this:
     *
     * ```js
     * let injector = angular.injector(['ng', 'myModule'])
     * ```
     *
     * However it's more likely that you'll use the `ng-app` directive or
     * `bootstrap()` to simplify this process.
     *
     * @param name The name of the module to create or retrieve.
     * @param requires If specified then new module is being created. If
     * unspecified then the module is being retrieved for further configuration.
     * @param configFn Optional configuration function for the module that gets
     * passed to `NgModule.config()`.
     * @returns A newly registered module.
     */
    module(name, requires, configFn) {
        assertNotHasOwnProperty(name, "module");
        if (requires && hasOwn(moduleRegistry, name)) {
            moduleRegistry[name] = null;
        }
        return ensure(moduleRegistry, name, () => {
            if (!requires) {
                throw $injectorError("nomod", "Module '{0}' is not available. Possibly misspelled or not loaded", name);
            }
            return new NgModule(name, requires, configFn);
        });
    }
    /**
     * Dispatches an invocation event to either an injectable service or a named scope.
     *
     * The event `type` identifies the target and the payload contains the expression
     * to evaluate against that target.
     */
    dispatchEvent(event) {
        const customEvent = event;
        const $parse = this.$injector.get(_parse);
        const injectable = customEvent.type;
        const target = this.$injector.has(injectable)
            ? this.$injector.get(injectable)
            : this.getScopeByName(injectable);
        if (!target) {
            const { detail } = customEvent;
            if (isInvocationDetail(detail) && detail._reply) {
                detail._reply.reject(new Error(`No target found for "${injectable}"`));
            }
            return false;
        }
        const { detail } = customEvent;
        const expr = isString(detail)
            ? detail
            : isInvocationDetail(detail)
                ? detail.expr
                : "";
        try {
            const result = $parse(expr)(target);
            if (isInvocationDetail(detail) && detail._reply) {
                Promise.resolve(result).then(detail._reply.resolve, detail._reply.reject);
            }
        }
        catch (err) {
            if (isInvocationDetail(detail) && detail._reply) {
                detail._reply.reject(err);
            }
        }
        return true;
    }
    /**
     * Fire-and-forget. Accepts a single string: `"<target>.<expression>"`
     */
    emit(input) {
        const { type, expr } = this.splitInvocation(input);
        this.dispatchEvent(new CustomEvent(type, { detail: expr }));
    }
    /**
     * Await result. Accepts a single string: `"<target>.<expression>"`
     */
    call(input) {
        const { type, expr } = this.splitInvocation(input);
        return new Promise((resolve, reject) => {
            const ok = this.dispatchEvent(new CustomEvent(type, {
                detail: { expr, __reply: { resolve, reject } },
            }));
            if (!ok) {
                reject(new Error(`Dispatch failed for "${type}"`));
            }
        });
    }
    /**
     * Use this function to manually start up AngularTS application.
     *
     * AngularTS will detect if it has been loaded into the browser more than once and only allow the
     * first loaded script to be bootstrapped and will report a warning to the browser console for
     * each of the subsequent scripts. This prevents strange results in applications, where otherwise
     * multiple instances of AngularTS try to work on the DOM.
     *
     * **Note:** Do not bootstrap the app on an element with a directive that uses
     * transclusion, such as `ng-if`, `ng-include`, or `ng-view`. Doing this
     * misplaces the app root element and injector, causing animations to stop
     * working and making the injector inaccessible from outside the app.
     *
     * ```html
     * <!doctype html>
     * <html>
     * <body>
     * <div ng-controller="WelcomeController">
     *   {{greeting}}
     * </div>
     *
     * <script src="angular.js"></script>
     * <script>
     *   let app = angular.module('demo', [])
     *   .controller('WelcomeController', function($scope) {
     *       $scope.greeting = 'Welcome!';
     *   });
     *   angular.bootstrap(document, ['demo']);
     * </script>
     * </body>
     * </html>
     * ```
     *
     * @param element DOM element which is the root of AngularTS application.
     * @param modules an array of modules to load into the application.
     *     Each item in the array should be the name of a predefined module or a (DI annotated)
     *     function that will be invoked by the injector as a `config` block.
     *     See `angular.module()`.
     * `config` controls bootstrap behavior such as `strictDi`.
     * @returns The created injector instance for this application.
     */
    bootstrap(element, modules, config = { strictDi: false }) {
        if (isInstanceOf(element, Element) || isInstanceOf(element, Document)) {
            rootScopeCleanupByElement.get(element)?.();
        }
        if ((isInstanceOf(element, Element) || isInstanceOf(element, Document)) &&
            getInheritedData(element, _injector)) {
            throw ngError("btstrpd", "App already bootstrapped");
        }
        if (isArray(modules)) {
            this._bootsrappedModules = modules;
        }
        this._bootsrappedModules.unshift([
            "$provide",
            ($provide) => {
                $provide.value(_rootElement, element);
            },
        ]);
        this._bootsrappedModules.unshift("ng");
        const injector = createInjector(this._bootsrappedModules, config.strictDi);
        injector.invoke([
            _rootScope,
            _rootElement,
            _compile,
            _injector,
            (scope, el, compile, $injector) => {
                this.$rootScope = scope;
                this.$injector = $injector;
                const rootElement = el;
                rootScopeCleanupByElement.set(rootElement, () => {
                    const existingScope = getInheritedData(rootElement, _scope);
                    if (existingScope?.$handler && !existingScope.$handler._destroyed) {
                        existingScope.$destroy();
                    }
                    else if (scope.$handler && !scope.$handler._destroyed) {
                        scope.$destroy();
                    }
                    if (rootScopeCleanupByElement.get(rootElement)) {
                        rootScopeCleanupByElement.delete(rootElement);
                    }
                });
                setCacheData(el, _injector, $injector);
                const compileFn = compile(el);
                compileFn(scope);
                if (!hasOwn($injector, "strictDi")) {
                    try {
                        $injector.invoke(() => {
                            /* empty */
                        });
                    }
                    catch (error) {
                        const errorStr = isInstanceOf(error, Error)
                            ? error.toString()
                            : String(error);
                        $injector.strictDi = !!/strict mode/.exec(errorStr);
                    }
                }
                scope.$on("$destroy", () => {
                    if (rootScopeCleanupByElement.get(rootElement)) {
                        rootScopeCleanupByElement.delete(rootElement);
                    }
                });
            },
        ]);
        return injector;
    }
    /**
     * Create a standalone injector without bootstrapping the DOM.
     *
     * @param modules - Module names or config functions to load.
     * @param strictDi - Require explicit dependency annotations.
     * @returns The created injector.
     */
    injector(modules, strictDi) {
        this.$injector = createInjector(modules, strictDi);
        return this.$injector;
    }
    /**
     * Find `ng-app` roots under the provided element and bootstrap them.
     *
     * The first root uses this instance. Additional roots are bootstrapped as
     * sub-applications and stored in {@link subapps}.
     *
     * @param element - Root element or document to scan.
     */
    init(element) {
        const appElements = [];
        let multimode = false;
        ngAttrPrefixes.forEach((prefix) => {
            const name = `${prefix}app`;
            let candidates;
            if (element.nodeType === 1 &&
                element.hasAttribute(name)) {
                candidates = [element];
            }
            else {
                candidates = element.querySelectorAll(`[${name}]`);
            }
            candidates.forEach((el) => {
                appElements.push({
                    _element: el,
                    _module: el.getAttribute(name),
                });
            });
        });
        appElements.forEach((app) => {
            const strictDi = app._element.hasAttribute("strict-di") ||
                app._element.hasAttribute("data-strict-di");
            if (multimode) {
                const RuntimeCtor = this.constructor;
                const submodule = new RuntimeCtor(true);
                this.subapps.push(submodule);
                submodule.bootstrap(app._element, app._module ? [app._module] : [], {
                    strictDi,
                });
            }
            else {
                this.bootstrap(app._element, app._module ? [app._module] : [], {
                    strictDi,
                });
            }
            multimode = true;
        });
    }
    /**
     * Find a scope by its registered `$scopename`.
     *
     * @param name - Scope name to search for.
     * @returns The matching scope proxy, or `undefined`.
     */
    getScopeByName(name) {
        validateIsString(name, "name");
        const $rootScope = this.$injector.get(_rootScope);
        const scope = $rootScope.$searchByName(name);
        return scope ? scope.$proxy : undefined;
    }
    /**
     * Splits `"target.expression"` into the dispatch target and parse expression.
     */
    splitInvocation(input) {
        if (!isString(input)) {
            throw new TypeError("Invocation must be a string.");
        }
        const trimmed = input.trim();
        const parts = trimmed.split(".");
        if (parts.length < 2) {
            throw new Error(`Invalid invocation "${input}". Expected "<target>.<expression>".`);
        }
        const type = String(parts.shift()).trim();
        const expr = parts.join(".").trim();
        if (!type || !expr) {
            throw new Error(`Invalid invocation "${input}". Expected "<target>.<expression>".`);
        }
        return { type, expr };
    }
}
/**
 * Returns the existing module instance for `name` or creates it via `factory`.
 */
function ensure(obj, name, factory) {
    return obj[name] || (obj[name] = factory());
}
function normalizeRuntimeOptions(options) {
    if (typeof options === "boolean") {
        return {
            subapp: options,
            attachToWindow: !options,
            registerBuiltins: true,
        };
    }
    const subapp = options.subapp ?? false;
    return {
        subapp,
        attachToWindow: options.attachToWindow ?? !subapp,
        registerBuiltins: options.registerBuiltins ?? true,
    };
}
/**
 * Narrows a custom event payload to the internal invocation shape.
 */
function isInvocationDetail(value) {
    return isObject(value) && isString(value.expr);
}

export { AngularRuntime, configureBuiltinRuntime, configureRuntimeInjectionTokens };
