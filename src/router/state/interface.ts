import { ParamDeclaration, RawParams } from "../params/interface.ts";
import type { Param } from "../params/param.ts";
import { StateObject } from "./state-object.ts";
import { ViewContext } from "../view/view.ts";
import { ControllerConstructor, Injectable } from "../../interface.ts";
import type { UrlMatcher } from "../url/url-matcher.ts";
import type { Transition } from "../transition/transition.ts";
import {
  TransitionStateHookFn,
  TransitionOptions,
  HookResult,
} from "../transition/interface.ts";
import { ResolvableLiteral } from "../resolve/interface.ts";
import { Resolvable } from "../resolve/resolvable.ts";
import { TargetState } from "./target-state.ts";
import { Glob } from "../glob/glob.ts";

export type StateOrName = string | StateDeclaration | StateObject;

export type StateStore = Record<string, StateObject | BuiltStateDeclaration>;

export type StateTransitionResult = StateDeclaration | undefined;

export interface TransitionPromise extends Promise<StateTransitionResult> {
  transition: Transition;
}

export interface TargetStateDef {
  state: StateOrName;
  params?: RawParams;
  options?: TransitionOptions;
}

export type RouterInjectable = Injectable<(...args: unknown[]) => unknown>;

export type TemplateFactory = (params?: RawParams) => string;

export type TemplateUrlFactory = (
  params?: RawParams,
) => string | null | undefined;

/**
 * Object-style state resolves.
 *
 * Use this when resolve tokens are string keys and each value is a normal
 * AngularTS injectable function or annotated factory.
 *
 * Example:
 * ```js
 * resolve: {
 *   user: ["UserService", (UserService) => UserService.current()],
 *   featureFlags: () => fetchFlags(),
 * }
 * ```
 */
export type StateResolveObject = { [key: string]: RouterInjectable };

/**
 * Array-style state resolves.
 *
 * Use this when you need explicit resolve metadata such as `token`, `deps`,
 * `eager`, or pre-resolved `data`.
 *
 * Example:
 * ```js
 * resolve: [
 *   {
 *     token: "user",
 *     deps: ["UserService", Transition],
 *     resolveFn: (UserService, trans) =>
 *       UserService.fetchUser(trans.params().userId),
 *     eager: true,
 *   },
 * ]
 * ```
 */
export type StateResolveArray = ResolvableLiteral[];

export type RawViewConfig = ViewDeclaration | string;

/**
 * Public view options shared by state-level view shorthand and named view declarations.
 */
export interface ViewDeclarationCommon {
  /**
   * The name of the component to use for this view.
   *
   * The name of an AngularTS `.component()` which will be used for this view.
   *
   * Resolve data can be provided to the component via the component's `bindings` object.
   * For each binding declared on the component, any resolve with the same name is set on
   * the component's controller instance.
   *
   * Note: Mapping from resolve names to component inputs may be specified using [[bindings]].
   *
   * #### Example:
   * ```js
   * .state('profile', {
   *   // Use the <my-profile></my-profile> component for this state.
   *   component: 'MyProfile',
   * }
   * ```
   *
   *
   * Note: When using `component` to define a view, you may _not_ use any of: `template`, `templateUrl`, `controller`.
   */
  component?: string;

  /**
   * An object which maps `resolve`s to [[component]] `bindings`.
   *
   * When using a [[component]] declaration (`component: 'myComponent'`), each input binding for the component is supplied
   * data from a resolve of the same name, by default.  You may supply data from a different resolve name by mapping it here.
   *
   * Each key in this object is the name of one of the component's input bindings.
   * Each value is the name of the resolve that should be provided to that binding.
   *
   * Any component bindings that are omitted from this map get the default behavior of mapping to a resolve of the
   * same name.
   *
   * #### Example:
   * ```js
   * $stateProvider.state('foo', {
   *   resolve: {
   *     foo: function(FooService) { return FooService.get(); },
   *     bar: function(BarService) { return BarService.get(); }
   *   },
   *   component: 'Baz',
   *   // The component's `baz` binding gets data from the `bar` resolve
   *   // The component's `foo` binding gets data from the `foo` resolve (default behavior)
   *   bindings: {
   *     baz: 'bar'
   *   }
   * });
   *
   * app.component('Baz', {
   *   templateUrl: 'baz.html',
   *   controller: 'BazController',
   *   bindings: {
   *     foo: '<', // foo binding
   *     baz: '<'  // baz binding
   *   }
   * });
   * ```
   *
   */
  bindings?: { [key: string]: string };

  /**
   * The view's controller function or name
   *
   * The controller function, or the name of a registered controller.  The controller function will be used
   * to control the contents of the [[directives.ngVIew]] directive.
   *
   * See: [[Ng1Controller]] for information about component-level router hooks.
   */
  controller?: Injectable<ControllerConstructor> | string;

  /**
   * The HTML template for the view.
   *
   * HTML template as a string, or a function which returns an html template as a string.
   * This template will be used to render the corresponding [[directives.ngVIew]] directive.
   *
   * This property takes precedence over templateUrl.
   *
   * If `template` is a function, it will be called with the Transition parameters as the first argument.
   *
   * #### Example:
   * ```js
   * template: "<h1>inline template definition</h1><div ng-view></div>"
   * ```
   *
   * #### Example:
   * ```js
   * template: function(params) {
   *   return "<h1>generated template</h1>";
   * }
   * ```
   */
  template?: TemplateFactory | string;

  /**
   * The URL for the HTML template for the view.
   *
   * A path or a function that returns a path to an html template.
   * The template will be fetched and used to render the corresponding [[directives.ngVIew]] directive.
   *
   * If `templateUrl` is a function, it will be called with the Transition parameters as the first argument.
   *
   * #### Example:
   * ```js
   * templateUrl: "/templates/home.html"
   * ```
   *
   * #### Example:
   * ```js
   * templateUrl: function(params) {
   *   return myTemplates[params.pageId];
   * }
   * ```
   */
  templateUrl?: string | TemplateUrlFactory;
}

/**
 * Interface for declaring a view
 *
 * This interface defines the basic data that a normalized view declaration will have on it.
 */
export interface ViewDeclaration extends ViewDeclarationCommon {
  /**
   * The raw view declaration name from [[StateDeclaration.views]].
   */
  $name?: string;

  /**
   * The normalized address for the targeted `ng-view`.
   *
   * A view target is matched relative to the `$ngViewContextAnchor`.
   * @example `header`, `messagecontent`, or `$default`
   */
  $ngViewName?: string;

  /**
   * The normalized context anchor (state name) for the `ngVIewName`
   *
   * When targeting a `ng-view`, the `ngVIewName` address is anchored to a context name (state name).
   */
  $ngViewContextAnchor?: string;

  /**
   * The context that this view is declared within.
   */
  $context?: ViewContext;
}

/**
 * The return value of a [[redirectTo]] function
 *
 * - string: a state name
 * - TargetState: a target state, parameters, and options
 * - object: an object with a state name and parameters
 */
export type RedirectToResult =
  | string
  | TargetState
  | { state?: string; params?: RawParams }
  | void;

/**
 * The StateDeclaration object is used to define a state or nested state.
 *
 *
 * #### Example:
 * ```js
 * // StateDeclaration object
 * var foldersState = {
 *   name: 'folders',
 *   url: '/folders',
 *   component: FoldersComponent,
 *   resolve: {
 *     allfolders: function(FolderService) {
 *       return FolderService.list();
 *     }
 *   },
 * }
 *
 * registry.register(foldersState);
 * ```
 */
export interface StateDeclaration extends ViewDeclarationCommon {
  /**
   * The state name (required)
   *
   * A unique state name, e.g. `"home"`, `"about"`, `"contacts"`.
   * To create a parent/child state use a dot, e.g. `"about.sales"`, `"home.newest"`.
   *
   * Note: [State] objects require unique names.
   * The name is used like an id.
   */
  name: string;

  /**
   * Abstract state indicator
   *
   * An abstract state can never be directly activated.
   * Use an abstract state to provide inherited properties (url, resolve, data, etc) to children states.
   */
  abstract?: boolean;

  /**
   * The parent state
   *
   * Normally, a state's parent is implied from the state's [[name]], e.g., `"parentstate.childstate"`.
   *
   * Alternatively, you can explicitly set the parent state using this property.
   * This allows shorter state names, e.g., `<a ng-sref="childstate">Child</a>`
   * instead of `<a ng-sref="parentstate.childstate">Child</a>
   *
   * When using this property, the state's name should not have any dots in it.
   *
   * #### Example:
   * ```js
   * var parentstate = {
   *   name: 'parentstate'
   * }
   * var childstate = {
   *   name: 'childstate',
   *   parent: 'parentstate'
   *   // or use a JS var which is the parent StateDeclaration, i.e.:
   *   // parent: parentstate
   * }
   * ```
   */
  parent?: string | StateDeclaration;

  /**
   * Gets the internal State object API
   *
   * Gets the *internal API* for a registered state.
   *
   * Note: the internal [[StateObject]] API is subject to change without notice
   * @internal
   */
  _state?: () => BuiltStateDeclaration;

  /**
   * Named view declarations for this state.
   *
   * Each key targets an `ng-view`; each value is either a full view declaration or
   * a string shorthand for `{ component: "componentName" }`.
   *
   * Examples:
   * ```js
   * views: {
   *   mymessages: "mymessages",
   *   messagelist: { component: "messageList" },
   *   "^.^.messagecontent": "message"
   * }
   * ```
   */
  views?: Record<string, RawViewConfig>;

  /**
   * Resolve - a mechanism to asynchronously fetch data, participating in the Transition lifecycle
   *
   * The `resolve:` property defines data (or other dependencies) to be fetched asynchronously when the state is being entered.
   * After the data is fetched, it may be used in views, transition hooks or other resolves that belong to this state.
   * The data may also be used in any views or resolves that belong to nested states.
   *
   * ### As an array
   *
   * Each array element should be a [[ResolvableLiteral]] object.
   *
   * #### Example:
   * The `user` resolve injects the current `Transition` and the `UserService` (using its token, which is a string).
   * The [[ResolvableLiteral.eager]] flag controls whether the resolve starts
   * at transition start instead of when the owning state is entered.
   * The `user` data, fetched asynchronously, can then be used in a view.
   * ```js
   * var state = {
   *   name: 'user',
   *   url: '/user/:userId
   *   resolve: [
   *     {
   *       token: 'user',
   *       eager: true,
   *       deps: ['UserService', Transition],
   *       resolveFn: (userSvc, trans) => userSvc.fetchUser(trans.params().userId) },
   *     }
   *   ]
   * }
   * ```
   *
   * ### As an object
   *
   * The `resolve` property may be an object where:
   * - Each key (string) is the name of the dependency.
   * - Each value (function) is an injectable function which returns the dependency, or a promise for the dependency.
   *
   * This style is based on AngularTS injectable functions.
   * If your code will be minified, the function should be ["annotated" in the AngularTS manner](https://docs.angularjs.org/guide/di#dependency-annotation).
   *
   * #### AngularTS Example:
   * ```js
   * resolve: {
   *   // If you inject `myStateDependency` into a controller, you'll get "abc"
   *   myStateDependency: function() {
   *     return "abc";
   *   },
   *   // Dependencies are annotated in "Inline Array Annotation"
   *   myAsyncData: ['$http', '$transition$' function($http, $transition$) {
   *     // Return a promise (async) for the data
   *     return $http.get("/foos/" + $transition$.params().foo);
   *   }]
   * }
   * ```
   *
   * Note: You cannot mark individual entries as eager, nor can you use non-string
   * tokens when using the object style `resolve:` block.
   *
   * ### Lifecycle
   *
   * Since a resolve function can return a promise, the router will delay entering the state until the promises are ready.
   * If any of the promises are rejected, the Transition is aborted with an Error.
   *
   * By default, resolves for a state are fetched just before that state is entered.
   * Note that only states which are being *entered* during the `Transition` have their resolves fetched.
   * States that are "retained" do not have their resolves re-fetched.
   *
   * If you are currently in a parent state `parent` and are transitioning to a child state `parent.child`, the
   * previously resolved data for state `parent` can be injected into `parent.child` without delay.
   *
   * Any resolved data for `parent.child` is retained until `parent.child` is exited, e.g., by transitioning back to the `parent` state.
   *
   * Because of this scoping and lifecycle, resolves are a great place to fetch your application's primary data.
   *
   * ### Injecting resolves into other things
   *
   * During a transition, Resolve data can be injected into:
   *
   * - Views (the components which fill a `ng-view` tag)
   * - Transition Hooks
   * - Other resolves (a resolve may depend on asynchronous data from a different resolve)
   *
   * ### Injecting other things into resolves
   *
   * Resolve functions usually have dependencies on some other API(s).
   * The dependencies are usually declared and injected into the resolve function.
   * A common pattern is to inject a custom service such as `UserService`.
   * The resolve then delegates to a service method, such as `UserService.list()`;
   *
   * #### Special injectable tokens
   *
   * - `Transition`: The current [[Transition]] object; information and API about the current transition, such as
   *    "to" and "from" State Parameters and transition options.
   * - `'$transition$'`: A string alias for the `Transition` injectable
   * - `'$state$'`: For `onEnter`/`onExit`/`onRetain`, the state being entered/exited/retained.
   * - Other resolve tokens: A resolve can depend on another resolve, either from the same state, or from any parent state.
   *
   * #### Example:
   * ```js
   * // Injecting a resolve into another resolve
   * resolve: [
   *   // Define a resolve 'allusers' which delegates to the UserService.list()
   *   // which returns a promise (async) for all the users
   *   { token: 'allusers', resolveFn: (UserService) => UserService.list(), deps: [UserService] },
   *
   *   // Define a resolve 'user' which depends on the allusers resolve.
   *   // This resolve function is not called until 'allusers' is ready.
   *   { token: 'user', resolveFn: (allusers, trans) => _.find(allusers, trans.params().userId), deps: ['allusers', Transition] }
   * }
   * ```
   */
  resolve?: StateResolveArray | StateResolveObject;

  /**
   * The url fragment for the state
   *
   * A URL fragment (with optional parameters) which is used to match the browser location with this state.
   *
   * This fragment will be appended to the parent state's URL in order to build up the overall URL for this state.
   * See [[UrlMatcher]] for details on acceptable patterns.
   *
   * @example
   * ```js
   *
   * url: "/home"
   * // Define a parameter named 'userid'
   * url: "/users/:userid"
   * // param 'bookid' has a custom regexp
   * url: "/books/{bookid:[a-zA-Z_-]}"
   * // param 'categoryid' is of type 'int'
   * url: "/books/{categoryid:int}"
   * // two parameters for this state
   * url: "/books/{publishername:string}/{categoryid:int}"
   * // Query parameters
   * url: "/messages?before&after"
   * // Query parameters of type 'date'
   * url: "/messages?{before:date}&{after:date}"
   * // Path and query parameters
   * url: "/messages/:mailboxid?{before:date}&{after:date}"
   * ```
   */
  url?: string;

  /**
   * Params configuration
   *
   * An object which optionally configures parameters declared in the url, or defines additional non-url
   * parameters. For each parameter being configured, add a [[ParamDeclaration]] keyed to the name of the parameter.
   *
   * #### Example:
   * ```js
   * params: {
   *   param1: {
   *    type: "int",
   *    array: true,
   *    value: []
   *   },
   *   param2: {
   *     value: "index"
   *   }
   * }
   * ```
   */
  params?: { [key: string]: ParamDeclaration | unknown };

  /**
   * An inherited property to store state data
   *
   * This is a spot for you to store inherited state metadata.
   * Child states' `data` object will prototypally inherit from their parent state.
   *
   * This is a good spot to put metadata such as `requiresAuth`.
   *
   * Note: because prototypal inheritance is used, changes to parent `data` objects reflect in the child `data` objects.
   * Care should be taken if you are using `hasOwnProperty` on the `data` object.
   * Properties from parent objects will return false for `hasOwnProperty`.
   */
  data?: unknown;

  /**
   * Synchronously or asynchronously redirects Transitions to a different state/params
   *
   * If this property is defined, a Transition directly to this state will be redirected based on the property's value.
   *
   * - If the value is a `string`, the Transition is redirected to the state named by the string.
   *
   * - If the property is an object with a `state` and/or `params` property,
   *   the Transition is redirected to the named `state` and/or `params`.
   *
   * - If the value is a [[TargetState]] the Transition is redirected to the `TargetState`
   *
   * - If the property is a function:
   *   - The function is called with the current [[Transition]]
   *   - The return value is processed using the previously mentioned rules.
   *   - If the return value is a promise, the promise is waited for, then the resolved async value is processed using the same rules.
   *
   * Note: `redirectTo` is processed as an `onStart` hook, before non-eager resolves.
   * If your redirect function relies on resolve data, get the [[Transition.injector]] and request
   * the resolve data with `getAsync()`.
   *
   * #### Example:
   * ```js
   * // a string
   * .state('A', {
   *   redirectTo: 'A.B'
   * })
   *
   * // a {state, params} object
   * .state('C', {
   *   redirectTo: { state: 'C.D', params: { foo: 'index' } }
   * })
   *
   * // a fn
   * .state('E', {
   *   redirectTo: () => "A"
   * })
   *
   * // a fn conditionally returning a {state, params}
   * .state('F', {
   *   redirectTo: (trans) => {
   *     if (trans.params().foo < 10)
   *       return { state: 'F', params: { foo: 10 } };
   *   }
   * })
   *
   * // a fn returning a promise for a redirect
   * .state('G', {
   *   redirectTo: (trans) => {
   *     let svc = trans.injector().get('SomeAsyncService')
   *     let promise = svc.getAsyncRedirectTo(trans.params.foo);
   *     return promise;
   *   }
   * })
   *
   * // a fn that fetches resolve data
   * .state('G', {
   *   redirectTo: (trans) => {
   *     // getAsync tells the resolve to load
   *     let resolvePromise = trans.injector().getAsync('SomeResolve')
   *     return resolvePromise.then(resolveData => resolveData === 'login' ? 'login' : null);
   *   }
   * })
   * ```
   */
  redirectTo?:
    | RedirectToResult
    | ((transition: Transition) => RedirectToResult)
    | ((transition: Transition) => Promise<RedirectToResult>);

  /**
   * A state hook invoked when a state is being entered.
   *
   * The hook can inject global services.
   * It can also inject `$transition$` or `$state$` (from the current transition).
   *
   * ### Example:
   * ```js
   * $stateProvider.state({
   *   name: 'mystate',
   *   onEnter: (MyService, $transition$, $state$) => {
   *     return MyService.doSomething($state$.name, $transition$.params());
   *   }
   * });
   * ```
   *
   * #### Example:`
   * ```js
   * $stateProvider.state({
   *   name: 'mystate',
   *   onEnter: [ 'MyService', '$transition$', '$state$', function (MyService, $transition$, $state$) {
   *     return MyService.doSomething($state$.name, $transition$.params());
   *   } ]
   * });
   * ```
   */
  onEnter?: TransitionStateHookFn | RouterInjectable;
  /**
   * A state hook invoked when a state is being retained.
   *
   * The hook can inject global services.
   * It can also inject `$transition$` or `$state$` (from the current transition).
   *
   * #### Example:
   * ```js
   * $stateProvider.state({
   *   name: 'mystate',
   *   onRetain: (MyService, $transition$, $state$) => {
   *     return MyService.doSomething($state$.name, $transition$.params());
   *   }
   * });
   * ```
   *
   * #### Example:`
   * ```js
   * $stateProvider.state({
   *   name: 'mystate',
   *   onRetain: [ 'MyService', '$transition$', '$state$', function (MyService, $transition$, $state$) {
   *     return MyService.doSomething($state$.name, $transition$.params());
   *   } ]
   * });
   * ```
   */
  onRetain?: TransitionStateHookFn | RouterInjectable;
  /**
   * A state hook invoked when a state is being exited.
   *
   * The hook can inject global services.
   * It can also inject `$transition$` or `$state$` (from the current transition).
   *
   * ### Example:
   * ```js
   * $stateProvider.state({
   *   name: 'mystate',
   *   onExit: (MyService, $transition$, $state$) => {
   *     return MyService.doSomething($state$.name, $transition$.params());
   *   }
   * });
   * ```
   *
   * #### Example:`
   * ```js
   * $stateProvider.state({
   *   name: 'mystate',
   *   onExit: [ 'MyService', '$transition$', '$state$', function (MyService, $transition$, $state$) {
   *     return MyService.doSomething($state$.name, $transition$.params());
   *   } ]
   * });
   * ```
   */
  onExit?: TransitionStateHookFn | RouterInjectable;

  /**
   * Marks all the state's parameters as `dynamic`.
   *
   * All parameters on the state will use this value for `dynamic` as a default.
   * Individual parameters may override this default using [[ParamDeclaration.dynamic]] in the [[params]] block.
   *
   * Note: this value overrides the `dynamic` value on a custom parameter type ([[ParamTypeDefinition.dynamic]]).
   */
  dynamic?: boolean;
}

/**
 * Represents a fully built StateObject after registration in the StateRegistry.
 */
export type BuiltStateDeclaration = StateDeclaration & {
  /** Reference to the original StateDeclaration */
  self: StateDeclaration;

  /**
   * Gets the internal State object API
   *
   * Gets the *internal API* for a registered state.
   *
   * Note: the internal [[StateObject]] API is subject to change without notice
   * @internal
   */
  _state: () => BuiltStateDeclaration;

  /** Array of Resolvables built from the state's resolve declarations */
  resolvables: Resolvable[];

  /** Full path from root down to this state */
  path: BuiltStateDeclaration[];

  /** Fast lookup of included states for $state.includes() */
  includes: Record<string, boolean>;

  /** Closest ancestor state that has a URL (navigable) */
  navigable?: BuiltStateDeclaration | null;

  /** URL object built from url / parent / root */
  url?: UrlMatcher;

  /** Computed parameters of this state */
  params?: Record<string, Param>;

  /** Optional parent state */
  parent?: StateDeclaration | null;

  /** Optional inherited data */
  data?: unknown;

  /** Built state hook invoked when the state is entered. */
  onEnter?: TransitionStateHookFn;

  /** Built state hook invoked when the state is retained. */
  onRetain?: TransitionStateHookFn;

  /** Built state hook invoked when the state is exited. */
  onExit?: TransitionStateHookFn;

  /** @internal */
  _stateObjectCache?: { nameGlob: Glob } | null;
};

/**
 * An options object for [[StateService.href]]
 */
export interface HrefOptions {
  /**
   * Defines what state to be "relative from"
   *
   * When a relative path is found (e.g `^` or `.bar`), defines which state to be relative from.
   */
  relative?: StateOrName;

  /**
   * If true, and if there is no url associated with the state provided in the
   *    first parameter, then the constructed href url will be built from the first
   *    ancestor which has a url.
   */
  lossy?: boolean;

  /**
   * If `true` will inherit parameters from the current parameter values.
   */
  inherit?: boolean;

  /**
   * If true will generate an absolute url, e.g. `http://www.example.com/fullurl`.
   */
  absolute?: boolean;
}

/**
 * Either a [[StateDeclaration]] or an ES6 class that implements [[StateDeclaration]]
 * The ES6 class constructor should have no arguments.
 */
export type _StateDeclaration = StateDeclaration | { new (): StateDeclaration };

/**
 * The signature for the callback function provided to [[StateRegistry.onStatesChanged]].
 *
 * This callback receives two parameters:
 *
 * @param event a string; either "registered" or "deregistered"
 * @param states the list of [[StateDeclaration]]s that were registered (or deregistered).
 */
export type StateRegistryListener = (
  event: "registered" | "deregistered",
  states: StateDeclaration[],
) => void;

export type OnInvalidCallback = (
  toState?: TargetState,
  fromState?: TargetState,
  injector?: ng.InjectorService,
) => HookResult;
