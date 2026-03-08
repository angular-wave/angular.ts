import {
  assertNotHasOwnProperty,
  errorHandlingConfig,
  hasOwn,
  isArray,
  isObject,
  isString,
  minErr,
  ngAttrPrefixes,
  values,
} from "./shared/utils.ts";
import {
  getController,
  getInjector,
  getScope,
  setCacheData,
} from "./shared/dom.ts";
import type {
  AngularBootstrapConfig,
  InvocationDetail,
  Provider,
} from "./interface.ts";
import { createInjector } from "./core/di/injector.ts";
import { NgModule } from "./core/di/ng-module/ng-module.ts";
import { registerNgModule } from "./ng.ts";
import { unnestR } from "./shared/common.ts";
import { $injectTokens as $t } from "./injection-tokens.ts";
import { annotate } from "./core/di/di.ts";
import { validateIsString } from "./shared/validate.ts";
import type { StateRegistryProvider } from "./router/state/state-registry.ts";
import type { Resolvable } from "./router/resolve/resolvable.ts";

const ngMinErr = minErr("ng");
const $injectorMinErr = minErr("$injector");
const STRICT_DI = "strict-di";

type ModuleRegistry = Record<string, NgModule | null>;
type AppElement = { _element: HTMLElement; _module: string | null };
type WindowWithAngular = Window & typeof globalThis & { angular?: Angular };

const moduleRegistry: ModuleRegistry = {};

/**
 * Main Angular runtime entry point.
 *
 * It owns module registration, application bootstrap, injector access,
 * and the lightweight event-based invocation helpers exposed on `window.angular`.
 */
export class Angular extends EventTarget {
  private subapps: Angular[] = [];
  private _bootsrappedModules: Array<string | any> = [];

  public $eventBus!: ng.PubSubService;
  public $injector!: ng.InjectorService;
  public $rootScope!: ng.Scope;
  public version = "[VI]{version}[/VI]";
  public getController = getController;
  public getInjector = getInjector;
  public getScope = getScope;
  public errorHandlingConfig = errorHandlingConfig;
  public $t: ng.InjectionTokens = {} as ng.InjectionTokens;

  /**
   * Creates the Angular runtime singleton or a sub-application instance.
   *
   * @param subapp when `true`, skips assigning the instance to `window.angular`
   */
  constructor(subapp = false) {
    super();

    values($t).forEach((token) => {
      (this.$t as Record<string, string>)[token] = token;
    });

    if (!subapp) {
      (window as WindowWithAngular).angular = this;
    }

    registerNgModule(this);
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
   * However it's more likely that you'll just use
   * `ng-app` directive or
   * {@link bootstrap} to simplify this process for you.
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
        throw $injectorMinErr(
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
    const $parse = this.$injector.get($t._parse);
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
   * <div class="alert alert-warning">
   * **Note:** Do not bootstrap the app on an element with a directive that uses {@link ng.$compile#transclusion transclusion},
   * such as {@link ng.ngIf `ngIf`}, {@link ng.ngInclude `ngInclude`} and {@link ngRoute.ngView `ngView`}.
   * Doing this misplaces the app {@link ng.$rootElement `$rootElement`} and the app's {@link auto.$injector injector},
   * causing animations to stop working and making the injector inaccessible from outside the app.
   * </div>
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
   *     See: {@link angular.module modules}
   * @param config
   * @returns The created injector instance for this application.
   */
  bootstrap(
    element: string | HTMLElement | HTMLDocument,
    modules?: Array<string | any>,
    config: AngularBootstrapConfig = { strictDi: false },
  ): ng.InjectorService {
    if (element instanceof Element && getInjector(element)) {
      throw ngMinErr("btstrpd", "App already bootstrapped");
    }

    if (isArray(modules)) {
      this._bootsrappedModules = modules;
    }

    this._bootsrappedModules.unshift([
      "$provide",
      ($provide: Provider) => {
        $provide.value($t._rootElement, element);
      },
    ]);

    this._bootsrappedModules.unshift("ng");

    const injector = createInjector(this._bootsrappedModules, config.strictDi);

    injector.invoke([
      $t._rootScope,
      $t._rootElement,
      $t._compile,
      $t._injector,
      (
        scope: ng.Scope,
        el: HTMLElement,
        compile: ng.CompileService,
        $injector: ng.InjectorService,
      ) => {
        this.$rootScope = scope;
        this.$injector = $injector;

        setCacheData(el, $t._injector, $injector);

        const compileFn = compile(el);
        compileFn(scope);

        if (!hasOwn($injector, "strictDi")) {
          try {
            $injector.invoke(() => {
              /* empty */
            });
          } catch (error) {
            const errorStr =
              error instanceof Error ? error.toString() : String(error);

            $injector.strictDi = !!/strict mode/.exec(errorStr);
          }
        }

        const stateRegistry = $injector.get(
          $t._stateRegistry,
        ) as StateRegistryProvider;

        stateRegistry
          .getAll()
          .map((state) => state._state().resolvables)
          .reduce(unnestR, [])
          .filter((resolvable: Resolvable) => resolvable.deps === "deferred")
          .forEach((resolvable: Resolvable) => {
            resolvable.deps = annotate(
              resolvable.resolveFn,
              $injector.strictDi,
            );
          });
      },
    ]);

    return injector;
  }

  /**
   * Creates a standalone injector without bootstrapping the DOM.
   */
  injector(modules: any[], strictDi?: boolean): ng.InjectorService {
    this.$injector = createInjector(modules, strictDi);
    return this.$injector;
  }

  /**
   * Finds `ng-app` roots under the provided element and bootstraps them.
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
        app._element.hasAttribute(STRICT_DI) ||
        app._element.hasAttribute(`data-${STRICT_DI}`);

      if (multimode) {
        const submodule = new Angular(true);
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
   * Finds a scope by its registered `$scopename`.
   */
  getScopeByName(name: string): ng.Scope | undefined {
    validateIsString(name, "name");

    const $rootScope = this.$injector.get($t._rootScope) as ng.RootScopeService;
    const scope = $rootScope.$searchByName(name);

    return scope ? (scope.$proxy as unknown as ng.Scope) : undefined;
  }

  /**
   * Splits `"target.expression"` into the dispatch target and parse expression.
   */
  private splitInvocation(input: string): { type: string; expr: string } {
    if (typeof input !== "string") {
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

/**
 * Narrows a custom event payload to the internal invocation shape.
 */
function isInvocationDetail(value: unknown): value is InvocationDetail {
  return (
    isObject(value) && typeof (value as InvocationDetail).expr === "string"
  );
}
