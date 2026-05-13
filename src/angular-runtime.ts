import {
  _compile,
  _injector,
  _parse,
  _rootElement,
  _rootScope,
} from "./injection-tokens.ts";
import {
  assertNotHasOwnProperty,
  errorHandlingConfig,
  hasOwn,
  isArray,
  isInstanceOf,
  isObject,
  createErrorFactory,
  ngAttrPrefixes,
  values,
  isString,
} from "./shared/utils.ts";
import {
  getController,
  getInjector,
  getScope,
  setCacheData,
} from "./shared/dom.ts";
import type { AngularBootstrapConfig, InvocationDetail } from "./interface.ts";
import { createInjector } from "./core/di/injector.ts";
import { NgModule } from "./core/di/ng-module/ng-module.ts";
import { validateIsString } from "./shared/validate.ts";

const ngError = createErrorFactory("ng");

const $injectorError = createErrorFactory("$injector");

const rootScopeCleanupByElement = new WeakMap<Element | Document, () => void>();

type ModuleRegistry = Record<string, NgModule | null>;

/** @internal */
interface AppElement {
  _element: HTMLElement;
  _module: string | null;
}

const moduleRegistry: ModuleRegistry = {};

export interface AngularRuntimeOptions {
  /**
   * Treat this instance as a sub-application. Sub-applications do not attach to
   * `window.angular` by default.
   */
  subapp?: boolean;
  /**
   * Assign the runtime instance to `window.angular`.
   *
   * Defaults to `true` for root apps and `false` for sub-applications.
   */
  attachToWindow?: boolean;
  /**
   * Register the configured built-in `ng` module during construction.
   *
   * Custom builds should pass `false` and register their own `ng` module.
   */
  registerBuiltins?: boolean;
}

export type AngularRuntimeConstructorInput = boolean | AngularRuntimeOptions;

export type BuiltinNgModuleRegistrar = (angular: ng.Angular) => ng.NgModule;

let builtinNgModuleRegistrar: BuiltinNgModuleRegistrar | undefined;

let runtimeInjectionTokens: Readonly<Record<string, string>> | undefined;

/**
 * Configures how the runtime registers the default built-in `ng` module.
 *
 * The browser entrypoint installs the full registrar. Custom runtime entrypoints
 * intentionally skip this so they can assemble smaller builds.
 */
export function configureBuiltinRuntime(
  registrar: BuiltinNgModuleRegistrar,
): void {
  builtinNgModuleRegistrar = registrar;
}

export function configureRuntimeInjectionTokens(
  tokens: Readonly<Record<string, string>>,
): void {
  runtimeInjectionTokens = tokens;
}

/**
 * Main Angular runtime entry point.
 *
 * It owns module registration, application bootstrap, injector access,
 * and the lightweight event-based invocation helpers exposed on `window.angular`.
 */
export class AngularRuntime extends EventTarget {
  /** Sub-application instances created when multiple `ng-app` roots are initialized. */
  public subapps: AngularRuntime[] = [];
  /** @internal */
  public _subapp: boolean;
  /** @internal */
  public _bootsrappedModules: any[] = [];

  /** Application-wide event bus, available after bootstrap providers are created. */
  public $eventBus!: ng.PubSubService;
  /** Application injector, available after `bootstrap()` or `injector()` completes. */
  public $injector!: ng.InjectorService;
  /** Root scope for the bootstrapped application. */
  public $rootScope!: ng.Scope;
  /** AngularTS version string replaced at build time. */
  public version = "[VI]{version}[/VI]";
  /** Retrieve the controller instance cached on a compiled DOM element. */
  public getController = getController;
  /** Retrieve the injector cached on a bootstrapped DOM element. */
  public getInjector = getInjector;
  /** Retrieve the scope cached on a compiled DOM element. */
  public getScope = getScope;
  /** Global framework error-handling configuration. */
  public errorHandlingConfig = errorHandlingConfig;
  /** Public injection token names keyed by token value. */
  public $t: ng.InjectionTokens = {} as ng.InjectionTokens;

  /**
   * Creates the Angular runtime singleton or a sub-application instance.
   *
   * @param subapp when `true`, skips assigning the instance to `window.angular`
   */
  constructor(options: AngularRuntimeConstructorInput = false) {
    super();
    const runtimeOptions = normalizeRuntimeOptions(options);

    this._subapp = runtimeOptions.subapp;

    if (runtimeInjectionTokens) {
      values(runtimeInjectionTokens).forEach((token) => {
        (this.$t as Record<string, string>)[token] = token;
      });
    }

    if (runtimeOptions.attachToWindow) {
      (window as any).angular = this;
    }

    if (runtimeOptions.registerBuiltins) {
      this.registerNgModule();
    }
  }

  /**
   * Registers the configured built-in `ng` module for this runtime instance.
   */
  registerNgModule(): ng.NgModule {
    if (!builtinNgModuleRegistrar) {
      throw ngError(
        "nobuiltins",
        "Built-in AngularTS modules are not configured for this runtime. Import the full runtime entrypoint or construct with registerBuiltins: false.",
      );
    }

    return builtinNgModuleRegistrar(this as unknown as ng.Angular);
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
  module(
    name: string,
    requires?: string[],
    configFn?: ng.Injectable<any>,
  ): NgModule {
    assertNotHasOwnProperty(name, "module");

    if (requires && hasOwn(moduleRegistry, name)) {
      moduleRegistry[name] = null;
    }

    return ensure(moduleRegistry, name, () => {
      if (!requires) {
        throw $injectorError(
          "nomod",
          "Module '{0}' is not available. Possibly misspelled or not loaded",
          name,
        );
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
  dispatchEvent(event: Event): boolean {
    const customEvent = event as CustomEvent<string | InvocationDetail>;

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
        Promise.resolve(result).then(
          detail._reply.resolve,
          detail._reply.reject,
        );
      }
    } catch (err) {
      if (isInvocationDetail(detail) && detail._reply) {
        detail._reply.reject(err);
      }
    }

    return true;
  }

  /**
   * Fire-and-forget. Accepts a single string: `"<target>.<expression>"`
   */
  emit(input: string): void {
    const { type, expr } = this.splitInvocation(input);

    this.dispatchEvent(new CustomEvent(type, { detail: expr }));
  }

  /**
   * Await result. Accepts a single string: `"<target>.<expression>"`
   */
  call(input: string): Promise<any> {
    const { type, expr } = this.splitInvocation(input);

    return new Promise((resolve, reject) => {
      const ok = this.dispatchEvent(
        new CustomEvent(type, {
          detail: { expr, __reply: { resolve, reject } } as never,
        }),
      );

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
  bootstrap(
    element: string | HTMLElement | HTMLDocument,
    modules?: any[],
    config: AngularBootstrapConfig = { strictDi: false },
  ): ng.InjectorService {
    if (isInstanceOf(element, Element) || isInstanceOf(element, Document)) {
      rootScopeCleanupByElement.get(element)?.();
    }

    if (
      (isInstanceOf(element, Element) || isInstanceOf(element, Document)) &&
      getInjector(element as unknown as Element)
    ) {
      throw ngError("btstrpd", "App already bootstrapped");
    }

    if (isArray(modules)) {
      this._bootsrappedModules = modules;
    }

    this._bootsrappedModules.unshift([
      "$provide",
      ($provide: ng.ProvideService) => {
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
      (
        scope: ng.Scope,
        el: HTMLElement,
        compile: ng.CompileService,
        $injector: ng.InjectorService,
      ) => {
        this.$rootScope = scope;
        this.$injector = $injector;

        const rootElement = el as Element;

        rootScopeCleanupByElement.set(rootElement, () => {
          const existingScope = getScope(rootElement);

          if (existingScope?.$handler && !existingScope.$handler._destroyed) {
            existingScope.$destroy();
          } else if (scope.$handler && !scope.$handler._destroyed) {
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
          } catch (error) {
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
  injector(modules: any[], strictDi?: boolean): ng.InjectorService {
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
  init(element: HTMLElement | HTMLDocument): void {
    const appElements: AppElement[] = [];

    let multimode = false;

    ngAttrPrefixes.forEach((prefix) => {
      const name = `${prefix}app`;

      let candidates: HTMLElement[] | NodeListOf<Element>;

      if (
        element.nodeType === 1 &&
        (element as HTMLElement).hasAttribute(name)
      ) {
        candidates = [element as HTMLElement];
      } else {
        candidates = element.querySelectorAll(`[${name}]`);
      }

      candidates.forEach((el) => {
        appElements.push({
          _element: el as HTMLElement,
          _module: (el as HTMLElement).getAttribute(name),
        });
      });
    });

    appElements.forEach((app) => {
      const strictDi =
        app._element.hasAttribute("strict-di") ||
        app._element.hasAttribute("data-strict-di");

      if (multimode) {
        const RuntimeCtor = this.constructor as new (
          options: AngularRuntimeConstructorInput,
        ) => AngularRuntime;

        const submodule = new RuntimeCtor(true);

        this.subapps.push(submodule);
        submodule.bootstrap(app._element, app._module ? [app._module] : [], {
          strictDi,
        });
      } else {
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
  getScopeByName(name: string): ng.Scope | undefined {
    validateIsString(name, "name");

    const $rootScope = this.$injector.get(_rootScope) as ng.RootScopeService;

    const scope = $rootScope.$searchByName(name);

    return scope ? (scope.$proxy as unknown as ng.Scope) : undefined;
  }

  /**
   * Splits `"target.expression"` into the dispatch target and parse expression.
   */
  private splitInvocation(input: string): { type: string; expr: string } {
    if (!isString(input)) {
      throw new TypeError("Invocation must be a string.");
    }

    const trimmed = input.trim();

    const parts = trimmed.split(".");

    if (parts.length < 2) {
      throw new Error(
        `Invalid invocation "${input}". Expected "<target>.<expression>".`,
      );
    }

    const type = String(parts.shift()).trim();

    const expr = parts.join(".").trim();

    if (!type || !expr) {
      throw new Error(
        `Invalid invocation "${input}". Expected "<target>.<expression>".`,
      );
    }

    return { type, expr };
  }
}

/**
 * Returns the existing module instance for `name` or creates it via `factory`.
 */
function ensure(
  obj: ModuleRegistry,
  name: string,
  factory: () => NgModule,
): NgModule {
  return obj[name] || (obj[name] = factory());
}

function normalizeRuntimeOptions(
  options: AngularRuntimeConstructorInput,
): Required<AngularRuntimeOptions> {
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
function isInvocationDetail(value: unknown): value is InvocationDetail {
  return isObject(value) && isString((value as InvocationDetail).expr);
}
