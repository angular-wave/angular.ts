import { _parse, _rootScope, _rootElement, _compile, _injector, _scope } from './injection-tokens.js';
import { errorHandlingConfig, values, assertNotHasOwnProperty, hasOwn, isString, isInstanceOf, isArray, ngAttrPrefixes, createErrorFactory, isObject } from './shared/utils.js';
import { getController, getInjector, getScope, getNormalizedAttr, getNormalizedAttrName, hasNormalizedAttr, getInheritedData, setCacheData } from './shared/dom.js';
import { createInjector } from './core/di/injector.js';
import { NgModule } from './core/di/ng-module/ng-module.js';
import { validateIsString } from './shared/validate.js';
import { createCoreRuntime } from './core/composition/runtime-composition.js';

const ngError = createErrorFactory("ng");
const $injectorError = createErrorFactory("$injector");
const rootScopeCleanupByElement = new WeakMap();
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
     * @param options runtime construction options. Passing `true` creates a
     * sub-application and skips assigning the instance to `window.angular`.
     */
    constructor(options = false) {
        super();
        /** Sub-application instances created when multiple `ng-app` roots are initialized. */
        this.subapps = [];
        /** @internal */
        this._bootsrappedModules = [];
        this._injectorCreated = false;
        /** AngularTS version string replaced at build time. */
        this.version = "[VI]{version}[/VI]";
        /** Retrieve the controller instance cached on a compiled DOM element. */
        this.getController = getController;
        /** Retrieve the injector cached on a bootstrapped DOM element. */
        this.getInjector = getInjector;
        /** Retrieve the scope cached on a compiled DOM element. */
        this.getScope = getScope;
        /** Read an element attribute by normalized directive-style name. */
        this.getNormalizedAttr = getNormalizedAttr;
        /** Return the actual DOM attribute name for a normalized directive-style name. */
        this.getNormalizedAttrName = getNormalizedAttrName;
        /** Return whether an element has an attribute matching a normalized name. */
        this.hasNormalizedAttr = hasNormalizedAttr;
        /** Global framework error-handling configuration. */
        this.errorHandlingConfig = errorHandlingConfig;
        /** Public injection token names keyed by token value. */
        this.$t = {};
        const runtimeOptions = normalizeRuntimeOptions(options);
        this._subapp = runtimeOptions.subapp;
        const hostRuntime = runtimeOptions.subapp
            ? window.angular
            : undefined;
        this._composition = createCoreRuntime({
            appContext: hostRuntime?._composition?.appContext ?? hostRuntime?._appContext,
            document,
            window,
        });
        this._appContext = this._composition.appContext;
        this._moduleRegistry = hostRuntime?._moduleRegistry ?? {};
        if (runtimeInjectionTokens) {
            values(runtimeInjectionTokens).forEach((token) => {
                this.$t[token] = token;
            });
        }
        if (!runtimeOptions.subapp) {
            window.angular = this;
        }
        if (runtimeOptions.registerBuiltins && !hostRuntime?._moduleRegistry) {
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
    module(name, requires, configFn) {
        assertNotHasOwnProperty(name, "module");
        if (requires && hasOwn(this._moduleRegistry, name)) {
            this._moduleRegistry[name] = null;
        }
        return ensure(this._moduleRegistry, name, () => {
            if (!requires) {
                throw $injectorError("nomod", "Module '{0}' is not available. Possibly misspelled or not loaded", name);
            }
            return new NgModule(name, requires, configFn, this._composition.animationRegistry, this._composition.controllerRegistry, this._composition.filterRegistry, this._composition.compileRegistry, this._composition.appContext, this._composition.configRegistry);
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
            if (isInvocationDetail(detail) && detail.reply) {
                detail.reply.reject(new Error(`No target found for "${injectable}"`));
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
            if (isInvocationDetail(detail) && detail.reply) {
                const { reply } = detail;
                void Promise.resolve(result)
                    .then((value) => {
                    reply.resolve(value);
                    return undefined;
                })
                    .catch((reason) => {
                    reply.reject(reason);
                });
            }
        }
        catch (err) {
            if (isInvocationDetail(detail) && detail.reply) {
                detail.reply.reject(err);
            }
        }
        return true;
    }
    /**
     * Fire-and-forget. Accepts a single string: `"<target>.<expression>"`
     */
    emit(input) {
        const { type, expr } = AngularRuntime._splitInvocation(input);
        this.dispatchEvent(new CustomEvent(type, { detail: expr }));
    }
    /**
     * Await result. Accepts a single string: `"<target>.<expression>"`
     */
    async call(input) {
        const { type, expr } = AngularRuntime._splitInvocation(input);
        return new Promise((resolve, reject) => {
            const ok = this.dispatchEvent(new CustomEvent(type, {
                detail: { expr, reply: { resolve, reject } },
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
     * @returns The created injector instance for this application.
     */
    bootstrap(element, modules) {
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
        this._bootsrappedModules.unshift("ng");
        const injector = createInjector(this._bootsrappedModules, (registry) => {
            registry.value(_rootElement, element);
        }, (name) => this.module(name));
        injector.invoke([
            _rootScope,
            _rootElement,
            _compile,
            _injector,
            (scope, el, compile, $injector) => {
                const appContext = this._composition.appContext;
                this._appContext = appContext;
                this.$rootScope = scope;
                this.$injector = $injector;
                this._injectorCreated = true;
                const rootElement = el;
                appContext.attachRoot(scope, {
                    injector: $injector,
                    rootElement,
                });
                rootScopeCleanupByElement.set(rootElement, () => {
                    const existingScope = getInheritedData(rootElement, _scope);
                    if (existingScope?.$handler && !existingScope.$handler._destroyed) {
                        existingScope.$destroy();
                    }
                    else if (!scope.$handler._destroyed) {
                        scope.$destroy();
                    }
                    if (rootScopeCleanupByElement.get(rootElement)) {
                        rootScopeCleanupByElement.delete(rootElement);
                    }
                });
                setCacheData(el, _injector, $injector);
                const compileFn = compile(el);
                compileFn(scope);
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
     * @returns The created injector.
     */
    injector(modules) {
        if (this._injectorCreated) {
            this.$injector.loadNewModules(modules);
            return this.$injector;
        }
        this.$injector = createInjector(modules, undefined, (name) => this.module(name));
        this._injectorCreated = true;
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
            if (multimode) {
                const RuntimeCtor = this.constructor;
                const submodule = new RuntimeCtor(true);
                this.subapps.push(submodule);
                submodule.bootstrap(app._element, app._module ? [app._module] : []);
            }
            else {
                this.bootstrap(app._element, app._module ? [app._module] : []);
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
    static _splitInvocation(input) {
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
    return obj[name] ?? (obj[name] = factory());
}
function normalizeRuntimeOptions(options) {
    if (typeof options === "boolean") {
        return {
            subapp: options,
            registerBuiltins: true,
        };
    }
    const subapp = options.subapp ?? false;
    return {
        subapp,
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
