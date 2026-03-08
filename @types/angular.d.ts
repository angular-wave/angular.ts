import { errorHandlingConfig } from "./shared/utils.js";
import { getController, getInjector, getScope } from "./shared/dom.ts";
import type { AngularBootstrapConfig } from "./interface.ts";
import { NgModule } from "./core/di/ng-module/ng-module.ts";
/**
 * Main Angular runtime entry point.
 *
 * It owns module registration, application bootstrap, injector access,
 * and the lightweight event-based invocation helpers exposed on `window.angular`.
 */
export declare class Angular extends EventTarget {
  private subapps;
  private _bootsrappedModules;
  $eventBus: ng.PubSubService;
  $injector: ng.InjectorService;
  $rootScope: ng.Scope;
  version: string;
  getController: typeof getController;
  getInjector: typeof getInjector;
  getScope: typeof getScope;
  errorHandlingConfig: typeof errorHandlingConfig;
  $t: ng.InjectionTokens;
  /**
   * Creates the Angular runtime singleton or a sub-application instance.
   *
   * @param subapp when `true`, skips assigning the instance to `window.angular`
   */
  constructor(subapp?: boolean);
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
  ): NgModule;
  /**
   * Dispatches an invocation event to either an injectable service or a named scope.
   *
   * The event `type` identifies the target and the payload contains the expression
   * to evaluate against that target.
   */
  dispatchEvent(event: Event): boolean;
  /**
   * Fire-and-forget. Accepts a single string: `"<target>.<expression>"`
   */
  emit(input: string): void;
  /**
   * Await result. Accepts a single string: `"<target>.<expression>"`
   */
  call(input: string): Promise<any>;
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
    config?: AngularBootstrapConfig,
  ): ng.InjectorService;
  /**
   * Creates a standalone injector without bootstrapping the DOM.
   */
  injector(modules: any[], strictDi?: boolean): ng.InjectorService;
  /**
   * Finds `ng-app` roots under the provided element and bootstraps them.
   */
  init(element: HTMLElement | HTMLDocument): void;
  /**
   * Finds a scope by its registered `$scopename`.
   */
  getScopeByName(name: string): ng.Scope | undefined;
  /**
   * Splits `"target.expression"` into the dispatch target and parse expression.
   */
  private splitInvocation;
}
