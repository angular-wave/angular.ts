export class Angular {
  $cache: Map<number, import("./interface.ts").ExpandoStore>;
  /** @type {ng.PubSubService} */
  $eventBus: ng.PubSubService;
  /**
   * @type {string} `version` from `package.json`
   */
  version: string;
  /** @type {!Array<string|any>} */
  bootsrappedModules: Array<string | any>;
  /**
   * Gets the controller instance for a given element, if exists. Defaults to "ngControllerController"
   *
   * @type {(element: Element, name: string?) => ng.Scope|undefined}
   */
  getController: (
    element: Element,
    name: string | null,
  ) => ng.Scope | undefined;
  /**
   * Return instance of InjectorService attached to element
   * @type {(Element) => ng.InjectorService}
   */
  getInjector: (Element: any) => ng.InjectorService;
  /**
   * Gets scope for a given element.
   * @type {(Element) => ng.Scope}
   */
  getScope: (Element: any) => ng.Scope;
  errorHandlingConfig: typeof errorHandlingConfig;
  $t: Readonly<Record<string, string>>;
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
  module(
    name: string,
    requires?: Array<string>,
    configFn?: ng.Injectable<any>,
  ): NgModule;
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
   * @param {string | Element | Document} element DOM element which is the root of AngularTS application.
   * @param {Array<String|any>} [modules] an array of modules to load into the application.
   *     Each item in the array should be the name of a predefined module or a (DI annotated)
   *     function that will be invoked by the injector as a `config` block.
   *     See: {@link angular.module modules}
   * @param {import("./interface.ts").AngularBootstrapConfig} [config]
   * @returns {ng.InjectorService} The created injector instance for this application.
   */
  bootstrap(
    element: string | Element | Document,
    modules?: Array<string | any>,
    config?: import("./interface.ts").AngularBootstrapConfig,
  ): ng.InjectorService;
  $rootScope: ng.Scope;
  $injector: import("./interface.ts").InjectorService;
  /**
   * @param {any[]} modules
   * @param {boolean?} strictDi
   * @returns {import("./core/di/internal-injector.js").InjectorService}
   */
  injector(
    modules: any[],
    strictDi: boolean | null,
  ): import("./core/di/internal-injector.js").InjectorService;
  /**
   * @param {Element|Document} element
   */
  init(element: Element | Document): void;
  /**
   * Retrieves a scope by its registered name and returns its Proxy wrapper.
   *
   * Internally, this walks down the `Scope` tree starting from `$rootScope`
   * and checks for a matching `$scopename` property. The `$scopename` property
   * may be defined statically on controllers using `as` syntax, assigned via the `ngScope` directive,
   * or defined on `$scope` injectable.
   *
   * @param {string} name
   * @returns {ProxyHandler<ng.Scope>|undefined}
   */
  getScopeByName(name: string): ProxyHandler<ng.Scope> | undefined;
}
import { errorHandlingConfig } from "./shared/utils.js";
import { NgModule } from "./core/di/ng-module/ng-module.js";
