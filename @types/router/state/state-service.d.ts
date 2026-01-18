export function silentRejection<E = unknown>(error: E): Promise<never>;
/**
 * Provides services related to ng-router states.
 *
 * This API is located at `router.stateService` ([[UIRouter.stateService]])
 */
export class StateProvider {
  static $inject: string[];
  /**
   *
   * @param {ng.RouterProvider} globals
   * @param {ng.TransitionProvider} transitionService
   * @param {ng.ExceptionHandlerProvider} exceptionHandlerProvider
   */
  constructor(
    globals: ng.RouterProvider,
    transitionService: ng.TransitionProvider,
    exceptionHandlerProvider: ng.ExceptionHandlerProvider,
  );
  /**
   * The latest successful state parameters
   *
   * @deprecated This is a passthrough through to [[Router.params]]
   */
  get params(): import("../params/state-params.js").StateParams;
  /**
   * The current [[StateDeclaration]]
   */
  get current(): import("./interface.ts").StateDeclaration;
  /**
   * The current [[StateObject]] (an internal API)
   */
  get $current(): import("./state-object.js").StateObject;
  /**
   * @type {ng.RouterProvider}
   */
  globals: ng.RouterProvider;
  /**
   * @type {ng.TransitionProvider}
   */
  transitionService: ng.TransitionProvider;
  /**
   * @type {StateRegistryProvider | undefined}
   */
  stateRegistry: StateRegistryProvider | undefined;
  /** @type {ng.UrlService | undefined } */
  urlService: ng.UrlService | undefined;
  /** @type {ng.InjectorService | undefined } */
  $injector: ng.InjectorService | undefined;
  invalidCallbacks: any[];
  /** @type {ng.ExceptionHandlerService} */
  _defaultErrorHandler: ng.ExceptionHandlerService;
  $get: (
    | string
    | (($injector: ng.InjectorService, $url: any) => StateProvider)
  )[];
  /**
   * Decorates states when they are registered
   *
   * Allows you to extend (carefully) or override (at your own peril) the
   * `stateBuilder` object used internally by [[StateRegistry]].
   * This can be used to add custom functionality to ng-router,
   * for example inferring templateUrl based on the state name.
   *
   * When passing only a name, it returns the current (original or decorated) builder
   * function that matches `name`.
   *
   * The builder functions that can be decorated are listed below. Though not all
   * necessarily have a good use case for decoration, that is up to you to decide.
   *
   * In addition, users can attach custom decorators, which will generate new
   * properties within the state's internal definition. There is currently no clear
   * use-case for this beyond accessing internal states (i.e. $state.$current),
   * however, expect this to become increasingly relevant as we introduce additional
   * meta-programming features.
   *
   * **Warning**: Decorators should not be interdependent because the order of
   * execution of the builder functions in non-deterministic. Builder functions
   * should only be dependent on the state definition object and super function.
   *
   *
   * Existing builder functions and current return values:
   *
   * - **parent** `{object}` - returns the parent state object.
   * - **data** `{object}` - returns state data, including any inherited data that is not
   *   overridden by own values (if any).
   * - **url** `{object}` - returns a {@link ui.router.util.type:UrlMatcher UrlMatcher}
   *   or `null`.
   * - **navigable** `{object}` - returns closest ancestor state that has a URL (aka is
   *   navigable).
   * - **params** `{object}` - returns an array of state params that are ensured to
   *   be a super-set of parent's params.
   * - **views** `{object}` - returns a views object where each key is an absolute view
   *   name (i.e. "viewName@stateName") and each value is the urlConfig object
   *   (template, controller) for the view. Even when you don't use the views object
   *   explicitly on a state urlConfig, one is still created for you internally.
   *   So by decorating this builder function you have access to decorating template
   *   and controller properties.
   * - **ownParams** `{object}` - returns an array of params that belong to the state,
   *   not including any params defined by ancestor states.
   * - **path** `{string}` - returns the full path from the root down to this state.
   *   Needed for state activation.
   * - **includes** `{object}` - returns an object that includes every state that
   *   would pass a `$state.includes()` test.
   *
   * #### Example:
   * Override the internal 'views' builder with a function that takes the state
   * definition, and a reference to the internal function being overridden:
   * ```js
   * $stateProvider.decorator('views', function (state, parent) {
   *   let result = {},
   *       views = parent(state);
   *
   *   angular.forEach(views, function (urlConfig, name) {
   *     let autoName = (state.name + '.' + name).replace('.', '/');
   *     urlConfig.templateUrl = urlConfig.templateUrl || '/partials/' + autoName + '.html';
   *     result[name] = urlConfig;
   *   });
   *   return result;
   * });
   *
   * $stateProvider.state('home', {
   *   views: {
   *     'contact.list': { controller: 'ListController' },
   *     'contact.item': { controller: 'ItemController' }
   *   }
   * });
   * ```
   *
   *
   * ```js
   * // Auto-populates list and item views with /partials/home/contact/list.html,
   * // and /partials/home/contact/item.html, respectively.
   * $state.go('home');
   * ```
   *
   * @param {string} name The name of the builder function to decorate.
   * @param {object} func A function that is responsible for decorating the original
   * builder function. The function receives two parameters:
   *
   *   - `{object}` - state - The state urlConfig object.
   *   - `{object}` - super - The original builder function.
   *
   * @return {object} $stateProvider - $stateProvider instance
   */
  decorator(name: string, func: object): object;
  /**
   *
   * @param {import("./interface.ts").StateDeclaration} definition
   */
  state(definition: import("./interface.ts").StateDeclaration): this;
  /**
   * Handler for when [[transitionTo]] is called with an invalid state.
   *
   * Invokes the [[onInvalid]] callbacks, in natural order.
   * Each callback's return value is checked in sequence until one of them returns an instance of TargetState.
   * The results of the callbacks are wrapped in Promise.resolve(), so the callbacks may return promises.
   *
   * If a callback returns an TargetState, then it is used as arguments to $state.transitionTo() and the result returned.
   *
   * @internal
   */
  _handleInvalidTargetState(fromPath: any, toState: any): any;
  /**
   * Registers an Invalid State handler
   *
   * Registers a [[OnInvalidCallback]] function to be invoked when [[StateService.transitionTo]]
   * has been called with an invalid state reference parameter
   *
   * Example:
   * ```js
   * stateService.onInvalid(function(to, from, injector) {
   *   if (to.name() === 'foo') {
   *     let lazyLoader = injector.get('LazyLoadService');
   *     return lazyLoader.load('foo')
   *         .then(() => stateService.target('foo'));
   *   }
   * });
   * ```
   *
   * @param {function} callback invoked when the toState is invalid
   *   This function receives the (invalid) toState, the fromState, and an injector.
   *   The function may optionally return a [[TargetState]] or a Promise for a TargetState.
   *   If one is returned, it is treated as a redirect.
   *
   * @returns a function which deregisters the callback
   */
  onInvalid(callback: Function): () => void;
  /**
   * Reloads the current state
   *
   * A method that force reloads the current state, or a partial state hierarchy.
   * All resolves are re-resolved, and components reinstantiated.
   *
   * #### Example:
   * ```js
   * let app angular.module('app', ['ui.router']);
   *
   * app.controller('ctrl', function ($scope, $state) {
   *   $scope.reload = function(){
   *     $state.reload();
   *   }
   * });
   * ```
   *
   * Note: `reload()` is just an alias for:
   *
   * ```js
   * $state.transitionTo($state.current, $state.params, {
   *   reload: true, inherit: false
   * });
   * ```
   *
   * @param {string | StateDeclaration | StateObject;} [reloadState] A state name or a state object.
   *    If present, this state and all its children will be reloaded, but ancestors will not reload.
   *
   * #### Example:
   * ```js
   * //assuming app application consists of 3 states: 'contacts', 'contacts.detail', 'contacts.detail.item'
   * //and current state is 'contacts.detail.item'
   * let app angular.module('app', ['ui.router']);
   *
   * app.controller('ctrl', function ($scope, $state) {
   *   $scope.reload = function(){
   *     //will reload 'contact.detail' and nested 'contact.detail.item' states
   *     $state.reload('contact.detail');
   *   }
   * });
   * ```
   *
   * @returns A promise representing the state of the new transition. See [[StateService.go]]
   */
  reload(reloadState: any): any;
  /**
   * Transition to a different state and/or parameters
   *
   * Convenience method for transitioning to a new state.
   *
   * `$state.go` calls `$state.transitionTo` internally but automatically sets options to
   * `{ location: true, inherit: true, relative: router.globals.$current, notify: true }`.
   * This allows you to use either an absolute or relative `to` argument (because of `relative: router.globals.$current`).
   * It also allows you to specify * only the parameters you'd like to update, while letting unspecified parameters
   * inherit from the current parameter values (because of `inherit: true`).
   *
   * #### Example:
   * ```js
   * let app = angular.module('app', ['ui.router']);
   *
   * app.controller('ctrl', function ($scope, $state) {
   *   $scope.changeState = function () {
   *     $state.go('contact.detail');
   *   };
   * });
   * ```
   *
   * @param {string} to Absolute state name, state object, or relative state path (relative to current state).
   *
   * Some examples:
   *
   * - `$state.go('contact.detail')` - will go to the `contact.detail` state
   * - `$state.go('^')` - will go to the parent state
   * - `$state.go('^.sibling')` - if current state is `home.child`, will go to the `home.sibling` state
   * - `$state.go('.child.grandchild')` - if current state is home, will go to the `home.child.grandchild` state
   *
   * @param {*} [params] A map of the parameters that will be sent to the state, will populate $stateParams.
   *
   *    Any parameters that are not specified will be inherited from current parameter values (because of `inherit: true`).
   *    This allows, for example, going to a sibling state that shares parameters defined by a parent state.
   *
   * @param {*} [options] Transition options
   *
   * @returns {Promise<any>} A promise representing the state of the new transition.
   */
  go(to: string, params?: any, options?: any): Promise<any>;
  /**
   * Creates a [[TargetState]]
   *
   * This is a factory method for creating a TargetState
   *
   * This may be returned from a Transition Hook to redirect a transition, for example.
   */
  target(identifier: any, params: any, options?: {}): TargetState;
  getCurrentPath(): PathNode[];
  /**
   * Low-level method for transitioning to a new state.
   *
   * The [[go]] method (which uses `transitionTo` internally) is recommended in most situations.
   *
   * #### Example:
   * ```js
   * let app = angular.module('app', ['ui.router']);
   *
   * app.controller('ctrl', function ($scope, $state) {
   *   $scope.changeState = function () {
   *     $state.transitionTo('contact.detail');
   *   };
   * });
   * ```
   *
   * @param {string | StateDeclaration | StateObject} to State name or state object.
   * @param toParams A map of the parameters that will be sent to the state,
   *      will populate $stateParams.
   * @param options Transition options
   *
   * @returns A promise representing the state of the new transition. See [[go]]
   */
  transitionTo(
    to: string | StateDeclaration | StateObject,
    toParams?: {},
    options?: {},
  ): any;
  /**
   * Checks if the current state *is* the provided state
   *
   * Similar to [[includes]] but only checks for the full state name.
   * If params is supplied then it will be tested for strict equality against the current
   * active params object, so all params must match with none missing and no extras.
   *
   * #### Example:
   * ```js
   * $state.$current.name = 'contacts.details.item';
   *
   * // absolute name
   * $state.is('contact.details.item'); // returns true
   * $state.is(contactDetailItemStateObject); // returns true
   * ```
   *
   * // relative name (. and ^), typically from a template
   * // E.g. from the 'contacts.details' template
   * ```html
   * <div ng-class="{highlighted: $state.is('.item')}">Item</div>
   * ```
   *
   * @param stateOrName The state name (absolute or relative) or state object you'd like to check.
   * @param params A param object, e.g. `{sectionId: section.id}`, that you'd like
   * to test against the current active state.
   * @param options An options object. The options are:
   *   - `relative`: If `stateOrName` is a relative state name and `options.relative` is set, .is will
   *     test relative to `options.relative` state (or name).
   *
   * @returns Returns true if it is the state.
   */
  is(stateOrName: any, params: any, options: any): boolean;
  /**
   * Checks if the current state *includes* the provided state
   *
   * A method to determine if the current active state is equal to or is the child of the
   * state stateName. If any params are passed then they will be tested for a match as well.
   * Not all the parameters need to be passed, just the ones you'd like to test for equality.
   *
   * #### Example when `$state.$current.name === 'contacts.details.item'`
   * ```js
   * // Using partial names
   * $state.includes("contacts"); // returns true
   * $state.includes("contacts.details"); // returns true
   * $state.includes("contacts.details.item"); // returns true
   * $state.includes("contacts.list"); // returns false
   * $state.includes("about"); // returns false
   * ```
   *
   * #### Glob Examples when `* $state.$current.name === 'contacts.details.item.url'`:
   * ```js
   * $state.includes("*.details.*.*"); // returns true
   * $state.includes("*.details.**"); // returns true
   * $state.includes("**.item.**"); // returns true
   * $state.includes("*.details.item.url"); // returns true
   * $state.includes("*.details.*.url"); // returns true
   * $state.includes("*.details.*"); // returns false
   * $state.includes("item.**"); // returns false
   * ```
   *
   * @param stateOrName A partial name, relative name, glob pattern,
   *   or state object to be searched for within the current state name.
   * @param params A param object, e.g. `{sectionId: section.id}`,
   *   that you'd like to test against the current active state.
   * @param options An options object. The options are:
   *   - `relative`: If `stateOrName` is a relative state name and `options.relative` is set, .is will
   *     test relative to `options.relative` state (or name).
   *
   * @returns {boolean} Returns true if it does include the state
   */
  includes(stateOrName: any, params: any, options: any): boolean;
  /**
   * Generates a URL for a state and parameters
   *
   * Returns the url for the given state populated with the given params.
   *
   * #### Example:
   * ```js
   * expect($state.href("about.person", { person: "bob" })).toEqual("/about/bob");
   * ```
   *
   * @param stateOrName The state name or state object you'd like to generate a url from.
   * @param params An object of parameter values to fill the state's required parameters.
   * @param options Options object. The options are:
   *
   * @returns {string} compiled state url
   */
  href(stateOrName: any, params: any, options: any): string;
  /**
   * Sets or gets the default [[transitionTo]] error handler.
   *
   * The error handler is called when a [[Transition]] is rejected or when any error occurred during the Transition.
   * This includes errors caused by resolves and transition hooks.
   *
   * Note:
   * This handler does not receive certain Transition rejections.
   * Redirected and Ignored Transitions are not considered to be errors by [[StateService.transitionTo]].
   *
   * The built-in default error handler logs the error to the console.
   *
   * You can provide your own custom handler.
   *
   * #### Example:
   * ```js
   * stateService.defaultErrorHandler(function() {
   *   // Do not log transitionTo errors
   * });
   * ```
   *
   * @param handler a global error handler function
   * @returns the current global error handler
   */
  defaultErrorHandler(handler: any): any;
  get(
    stateOrName: any,
    base: any,
    ...args: any[]
  ):
    | import("./interface.ts").StateDeclaration
    | (
        | import("./interface.ts").StateDeclaration
        | import("./interface.ts").BuiltStateDeclaration
      )[];
  /**
   * Lazy loads a state
   *
   * Explicitly runs a state's [[StateDeclaration.lazyLoad]] function.
   *
   * @param stateOrName the state that should be lazy loaded
   * @param transition the optional Transition context to use (if the lazyLoad function requires an injector, etc)
   * Note: If no transition is provided, a noop transition is created using the from the current state to the current state.
   * This noop transition is not actually run.
   *
   * @returns a promise to lazy load
   */
  lazyLoad(stateOrName: any, transition: any): any;
}
export type StateRegistryProvider =
  import("./state-registry.js").StateRegistryProvider;
export type StateDeclaration = import("./interface.ts").StateDeclaration;
export type StateObject = import("./state-object.js").StateObject;
import { TargetState } from "./target-state.js";
import { PathNode } from "../path/path-node.js";
