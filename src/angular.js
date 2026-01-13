import {
  assertNotHasOwnProperty,
  errorHandlingConfig,
  hasOwn,
  isArray,
  minErr,
  ngAttrPrefixes,
} from "./shared/utils.js";
import {
  getController,
  getInjector,
  getScope,
  setCacheData,
} from "./shared/dom.js";
import { createInjector } from "./core/di/injector.js";
import { NgModule } from "./core/di/ng-module/ng-module.js";
import { registerNgModule } from "./ng.js";
import { unnestR } from "./shared/common.js";
import { $injectTokens as $t } from "./injection-tokens.js";
import { annotate } from "./core/di/di.js";
import { validateIsString } from "./shared/validate.js";

const ngMinErr = minErr("ng");

const $injectorMinErr = minErr("$injector");

const STRICT_DI = "strict-di";

/** @typedef {Object.<string, NgModule|null>} ModuleRegistry */

/** @type {ModuleRegistry} */
const moduleRegistry = {};

export class Angular extends EventTarget {
  constructor(submodule = false) {
    super();

    /** @private @type {boolean} */
    this._submodule = submodule;

    /** @private @type {!Array<string|any>} */
    this._bootsrappedModules = [];

    /** @public @type {ng.PubSubService} */
    this.$eventBus;

    /** @public @type {ng.InjectorService} */
    this.$injector;

    /**
     * @public
     * @type {string} `version` from `package.json`
     */
    this.version = "[VI]{version}[/VI]"; //inserted via rollup plugin

    /**
     * Gets the controller instance for a given element, if exists. Defaults to "ngControllerController"
     *
     * @type {typeof getController}
     */
    this.getController = getController;

    /**
     * Return instance of InjectorService attached to element
     * @type {typeof getInjector}
     */
    this.getInjector = getInjector;

    /**
     * Gets scope for a given element.
     *  @type {typeof getScope}
     */
    this.getScope = getScope;

    /** @type {typeof errorHandlingConfig} */
    this.errorHandlingConfig = errorHandlingConfig;

    /** @type {ng.InjectionTokens} */
    this.$t = /** @type {ng.InjectionTokens} */ ({});
    Object.values($t).forEach((i) => {
      /** @type {any} */ (this.$t)[i] = i;
    });

    if (!submodule) {
      window.angular = this;
    }
    registerNgModule(this);
  }

  /**
   *
   * The `angular.module` is a global place for creating, registering and retrieving AngularTS
   * modules.
   * All modules (AngularTS core or 3rd party) that should be available to an application must be
   * registered using this mechanism.
   *
   * Passing one argument retrieves an existing {@link ng.NgModule},
   * whereas passing more than one argument creates a new {@link ng.NgModule}
   *
   *
   * # Module
   *
   * A module is a collection of services, directives, controllers, filters, workers, WebAssembly modules, and configuration information.
   * `angular.module` is used to configure the {@link auto.$injector $injector}.
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
   * @param {string} name The name of the module to create or retrieve.
   * @param {Array.<string>} [requires] If specified then new module is being created. If
   *        unspecified then the module is being retrieved for further configuration.
   * @param {ng.Injectable<any>} [configFn] Optional configuration function for the module that gets
   *        passed to {@link NgModule.config NgModule.config()}.
   * @returns {NgModule} A newly registered module.
   */
  module(name, requires, configFn) {
    assertNotHasOwnProperty(name, "module");

    if (requires && hasOwn(moduleRegistry, name)) {
      moduleRegistry[name] = null; // force ensure to recreate the module
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
   * @param {CustomEvent} event
   */
  dispatchEvent(event) {
    const $parse = this.$injector.get($t._parse);

    const injectable = event.type;

    const target = this.$injector.has(injectable)
      ? this.$injector.get(injectable)
      : this.getScopeByName(injectable);

    if (!target) return false;

    $parse(event.detail)(target);

    return true;
  }

  /**
   * Use this function to manually start up AngularTS application.
   *
   * AngularTS will detect if it has been loaded into the browser more than once and only allow the
   * first loaded script to be bootstrapped and will report a warning to the browser console for
   * each of the subsequent scripts. This prevents strange results in applications, where otherwise
   * multiple instances of AngularTS try to work on the DOM.
   *   *
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
   * @param {string | HTMLElement | HTMLDocument} element DOM element which is the root of AngularTS application.
   * @param {Array<String|any>} [modules] an array of modules to load into the application.
   *     Each item in the array should be the name of a predefined module or a (DI annotated)
   *     function that will be invoked by the injector as a `config` block.
   *     See: {@link angular.module modules}
   * @param {import("./interface.ts").AngularBootstrapConfig} [config]
   * @returns {ng.InjectorService} The created injector instance for this application.
   */
  bootstrap(element, modules, config) {
    config = config || {
      strictDi: false,
    };

    if (
      (element instanceof Element || element instanceof Document) &&
      getInjector(/** @type {Element} */ (element))
    ) {
      throw ngMinErr("btstrpd", "App already bootstrapped");
    }

    if (isArray(modules)) {
      this._bootsrappedModules = modules;
    }

    this._bootsrappedModules.unshift([
      "$provide",
      /**
       * @param {import('./interface.ts').Provider} $provide
       */
      ($provide) => {
        $provide.value("$rootElement", element);
      },
    ]);

    this._bootsrappedModules.unshift("ng");

    const injector = createInjector(this._bootsrappedModules, config.strictDi);

    injector.invoke([
      $t._rootScope,
      $t._rootElement,
      $t._compile,
      $t._injector,
      /**
       * @param {ng.Scope} scope
       * @param {HTMLElement} el
       * @param {ng.CompileService} compile
       * @param {ng.InjectorService} $injector
       */
      (scope, el, compile, $injector) => {
        this.$rootScope = scope;
        // ng-route deps
        this.$injector = $injector; // TODO refactor away as this as this prevents multiple apps from being used

        setCacheData(el, "$injector", $injector);

        const compileFn = compile(el);

        compileFn(scope);

        // https://github.com/angular-ui/ui-router/issues/3678
        if (!hasOwn($injector, "strictDi")) {
          try {
            $injector.invoke(() => {
              /* empty */
            });
          } catch (error) {
            /** @type {string} */
            const errorStr =
              error instanceof Error ? error.toString() : String(error);

            $injector.strictDi = !!/strict mode/.exec(errorStr);
          }
        }

        /** @type {import("./router/state/state-registry.js").StateRegistryProvider} */
        const stateRegistry = $injector.get($t._stateRegistry);

        stateRegistry
          .getAll()
          .map((x) => {
            return x._state().resolvables;
          })
          .reduce(unnestR, [])
          .filter(
            /** @param {import("./router/resolve/resolvable.js").Resolvable} x */ (
              x,
            ) => {
              return x.deps === "deferred";
            },
          )
          .forEach(
            /** @param {import("./router/resolve/resolvable.js").Resolvable} resolvable */
            (resolvable) =>
              (resolvable.deps = annotate(
                resolvable.resolveFn,
                $injector.strictDi,
              )),
          );
      },
    ]);

    return injector;
  }

  /**
   * @param {any[]} modules
   * @param {boolean} [strictDi]
   * @returns {ng.InjectorService}
   */
  injector(modules, strictDi) {
    this.$injector = createInjector(modules, strictDi);

    return this.$injector;
  }

  /**
   * @param {HTMLElement|HTMLDocument} element
   */
  init(element) {
    /** @type {HTMLElement|undefined} */
    let appElement;

    let module;

    const config = {};

    // The element `element` has priority over any other element.
    ngAttrPrefixes.forEach((prefix) => {
      const name = `${prefix}app`;

      if (
        /** @type {HTMLElement} */ (element).hasAttribute &&
        /** @type {HTMLElement} */ (element).hasAttribute(name)
      ) {
        appElement = /** @type {HTMLElement} */ (element);
        module = appElement.getAttribute(name);
      }

      /** @type {HTMLElement} */
      let candidate;

      if (
        !appElement &&
        (candidate = /** @type {HTMLElement} */ (
          element.querySelector(`[${name.replace(":", "\\:")}]`)
        ))
      ) {
        appElement = candidate;
        module = candidate.getAttribute(name);
      }
    });

    if (appElement) {
      config.strictDi =
        appElement.hasAttribute(STRICT_DI) ||
        appElement.hasAttribute(`data-${STRICT_DI}`);
      this.bootstrap(appElement, module ? [module] : [], config);
    }
  }

  /**
   * Retrieves a scope by its registered name and returns its Proxy wrapper.
   *
   * Internally, this walks down the `Scope` tree starting from `$rootScope`
   * and checks for a matching `$scopename` property. The `$scopename` property
   * may be defined statically on controllers using `as` syntax, assigned via the `ngScope` directive,
   * or defined on `$scope` injectable.
   *
   * @param {string} name
   * @returns {Proxy<ng.Scope>|undefined}
   */
  getScopeByName(name) {
    validateIsString(name, "name");
    /** @type {ng.RootScopeService} */
    const $rootScope = this.$injector.get("$rootScope");

    const scope = $rootScope.$searchByName(name);

    if (scope) {
      return scope.$proxy;
    }

    return undefined;
  }
}

/**
 * @param {ModuleRegistry} obj
 * @param {string} name
 * @param {Function} factory
 * @returns {NgModule}
 */
function ensure(obj, name, factory) {
  return obj[name] || (obj[name] = factory());
}
