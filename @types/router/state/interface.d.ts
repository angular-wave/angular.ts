import { ParamDeclaration, RawParams } from "../params/interface.ts";
import { StateObject } from "./state-object.js";
import { ViewContext } from "../view/interface.ts";
import { Injectable } from "../../interface.ts";
import { Transition } from "../transition/transition.js";
import {
  TransitionStateHookFn,
  TransitionOptions,
  HookResult,
} from "../transition/interface.ts";
import {
  ResolvePolicy,
  ResolvableLiteral,
  ProviderLike,
} from "../resolve/interface.ts";
import { Resolvable } from "../resolve/resolvable.js";
import { TargetState } from "./target-state.js";
import { Glob } from "../glob/glob.js";
export type StateOrName = string | StateDeclaration | StateObject;
export type StateStore = Record<string, StateObject | BuiltStateDeclaration>;
export interface TransitionPromise extends Promise<StateObject> {
  transition: Transition;
}
export interface TargetStateDef {
  state: StateOrName;
  params?: RawParams;
  options?: TransitionOptions;
}
export type ResolveTypes = Resolvable | ResolvableLiteral | ProviderLike;
export type RawViewConfig = ViewDeclaration | string;
/**
 * Interface for declaring a view
 *
 * This interface defines the basic data that a normalized view declaration will have on it.
 */
export interface ViewDeclaration {
  /**
   * The raw name for the view declaration, i.e., the [[StateDeclaration.views]] property name.
   */
  $name?: string;
  /**
   * The normalized address for the `ng-view` which this ViewConfig targets.
   *
   * A ViewConfig targets a `ng-view` in the DOM (relative to the `ngVIewContextAnchor`) which has
   * a specific name.
   * @example `header` or `$default`
   *
   * The `ngVIewName` can also target a _nested view_ by providing a dot-notation address
   * @example `foo.bar` or `foo.$default.bar`
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
  /**
   * The name of the component to use for this view.
   *
   * A property of [[StateDeclaration]] or [[ViewDeclaration]]:
   *
   * The name of an [angular 1.5+ `.component()`](https://docs.angularjs.org/guide/component) (or directive with
   * bindToController and/or scope declaration) which will be used for this view.
   *
   * Resolve data can be provided to the component via the component's `bindings` object (for 1.3+ directives, the
   * `bindToController` is used; for other directives, the `scope` declaration is used).  For each binding declared
   * on the component, any resolve with the same name is set on the component's controller instance.  The binding
   * is provided to the component as a one-time-binding.  In general, components should likewise declare their
   * input bindings as [one-way ("&lt;")](https://docs.angularjs.org/api/ng/service/$compile#-scope-).
   *
   * Note: inside a "views:" block, a bare string `"foo"` is shorthand for `{ component: "foo" }`
   *
   * Note: Mapping from resolve names to component inputs may be specified using [[bindings]].
   *
   * #### Example:
   * ```js
   * .state('profile', {
   *   // Use the <my-profile></my-profile> component for the Unnamed view
   *   component: 'MyProfile',
   * }
   *
   * .state('messages', {
   *   // use the <nav-bar></nav-bar> component for the view named 'header'
   *   // use the <message-list></message-list> component for the view named 'content'
   *   views: {
   *     header: { component: 'NavBar' },
   *     content: { component: 'MessageList' }
   *   }
   * }
   *
   * .state('contacts', {
   *   // Inside a "views:" block, a bare string "NavBar" is shorthand for { component: "NavBar" }
   *   // use the <nav-bar></nav-bar> component for the view named 'header'
   *   // use the <contact-list></contact-list> component for the view named 'content'
   *   views: {
   *     header: 'NavBar',
   *     content: 'ContactList'
   *   }
   * }
   * ```
   *
   *
   * Note: When using `component` to define a view, you may _not_ use any of: `template`, `templateUrl`,
   * `templateProvider`, `controller`, `controllerProvider`, `controllerAs`.
   *
   *
   * See also: Todd Motto's angular 1.3 and 1.4 [backport of .component()](https://github.com/toddmotto/angular-component)
   */
  component?: string;
  /**
   * An object which maps `resolve`s to [[component]] `bindings`.
   *
   * A property of [[StateDeclaration]] or [[ViewDeclaration]]:
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
  bindings?: {
    [key: string]: string;
  };
  /**
   * Dynamic component provider function.
   *
   * A property of [[StateDeclaration]] or [[ViewDeclaration]]:
   *
   * This is an injectable provider function which returns the name of the component to use.
   * The provider will invoked during a Transition in which the view's state is entered.
   * The provider is called after the resolve data is fetched.
   *
   * #### Example:
   * ```js
   * componentProvider: function(MyResolveData, $transition$) {
   *   if (MyResolveData.foo) {
   *     return "fooComponent"
   *   } else if ($transition$.to().name === 'bar') {
   *     return "barComponent";
   *   }
   * }
   * ```
   */
  componentProvider?: Injectable<any>;
  /**
   * The view's controller function or name
   *
   * A property of [[StateDeclaration]] or [[ViewDeclaration]]:
   *
   * The controller function, or the name of a registered controller.  The controller function will be used
   * to control the contents of the [[directives.ngVIew]] directive.
   *
   * If specified as a string, controllerAs can be declared here, i.e., "FooController as foo" instead of in
   * a separate [[controllerAs]] property.
   *
   * See: [[Ng1Controller]] for information about component-level router hooks.
   */
  controller?: Injectable<any> | string;
  /**
   * A controller alias name.
   *
   * A property of [[StateDeclaration]] or [[ViewDeclaration]]:
   *
   * If present, the controller will be published to scope under the `controllerAs` name.
   * See: https://docs.angularjs.org/api/ng/directive/ngController
   */
  controllerAs?: string;
  /**
   * Dynamic controller provider function.
   *
   * A property of [[StateDeclaration]] or [[ViewDeclaration]]:
   *
   * This is an injectable provider function which returns the actual controller function, or the name
   * of a registered controller.  The provider will invoked during a Transition in which the view's state is
   * entered.  The provider is called after the resolve data is fetched.
   *
   * #### Example:
   * ```js
   * controllerProvider: function(MyResolveData, $transition$) {
   *   if (MyResolveData.foo) {
   *     return "FooCtrl"
   *   } else if ($transition$.to().name === 'bar') {
   *     return "BarCtrl";
   *   } else {
   *     return function($scope) {
   *       $scope.baz = "Qux";
   *     }
   *   }
   * }
   * ```
   */
  controllerProvider?: Injectable<any>;
  /**
   * The scope variable name to use for resolve data.
   *
   * A property of [[StateDeclaration]] or [[ViewDeclaration]]:
   *
   * When a view is activated, the resolved data for the state which the view belongs to is put on the scope.
   * This property sets the name of the scope variable to use for the resolved data.
   *
   * Defaults to `$resolve`.
   */
  resolveAs?: string;
  /**
   * The HTML template for the view.
   *
   * A property of [[StateDeclaration]] or [[ViewDeclaration]]:
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
  template?: Function | string;
  /**
   * The URL for the HTML template for the view.
   *
   * A property of [[StateDeclaration]] or [[ViewDeclaration]]:
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
  templateUrl?: string | Function;
  /**
   * Injected function which returns the HTML template.
   *
   * A property of [[StateDeclaration]] or [[ViewDeclaration]]:
   *
   * Injected function which returns the HTML template.
   * The template will be used to render the corresponding [[directives.ngVIew]] directive.
   *
   * #### Example:
   * ```js
   * templateProvider: function(MyTemplateService, $transition$) {
   *   return MyTemplateService.getTemplate($transition$.params().pageId);
   * }
   * ```
   */
  templateProvider?: Injectable<any>;
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
  | {
      state?: string;
      params?: RawParams;
    }
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
export interface StateDeclaration {
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
   * This allows shorter state names, e.g., `<a ui-sref="childstate">Child</a>`
   * instead of `<a ui-sref="parentstate.childstate">Child</a>
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
   * Sets the resolve policy defaults for all resolves on this state
   *
   * This should be an [[ResolvePolicy]] object.
   *
   * It can contain the following optional keys/values:
   *
   * - `when`: (optional) defines when the resolve is fetched. Accepted values: "LAZY" or "EAGER"
   * - `async`: (optional) if the transition waits for the resolve. Accepted values: "WAIT", "NOWAIT", {@link CustomAsyncPolicy}
   *
   * See [[ResolvePolicy]] for more details.
   */
  resolvePolicy?: ResolvePolicy;
  /**
   * The url fragment for the state
   *
   * A URL fragment (with optional parameters) which is used to match the browser location with this state.
   *
   * This fragment will be appended to the parent state's URL in order to build up the overall URL for this state.
   * See [[UrlMatcher]] for details on acceptable patterns.
   *
   * @examples
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
  params?: {
    [key: string]: ParamDeclaration | any;
  };
  /**
   * Named views
   *
   * An optional object which defines multiple views, or explicitly targets specific named ng-views.
   *
   * - What is a view urlConfig
   * - What is a ng-view
   * - Shorthand controller/template
   * - Incompatible with ^
   *
   *  Examples:
   *
   *  Targets three named ng-views in the parent state's template
   *
   * #### Example:
   * ```js
   * views: {
   *   header: {
   *     controller: "headerCtrl",
   *     templateUrl: "header.html"
   *   }, body: {
   *     controller: "bodyCtrl",
   *     templateUrl: "body.html"
   *   }, footer: {
   *     controller: "footCtrl",
   *     templateUrl: "footer.html"
   *   }
   * }
   * ```
   *
   * @example
   * ```js
   * // Targets named ng-view="header" from ancestor state 'top''s template, and
   * // named `ng-view="body" from parent state's template.
   * views: {
   *   'header@top': {
   *     controller: "msgHeaderCtrl",
   *     templateUrl: "msgHeader.html"
   *   }, 'body': {
   *     controller: "messagesCtrl",
   *     templateUrl: "messages.html"
   *   }
   * }
   * ```
   */
  views?: Record<string, RawViewConfig>;
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
  data?: any;
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
   * Note: `redirectTo` is processed as an `onStart` hook, before `LAZY` resolves.
   * If your redirect function relies on resolve data, get the [[Transition.injector]] and get a
   * promise for the resolve data using [[UIInjector.getAsync]].
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
  onEnter?: TransitionStateHookFn | Injectable<any>;
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
  onRetain?: TransitionStateHookFn | Injectable<any>;
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
  onExit?: TransitionStateHookFn | Injectable<any>;
  /**
   * A function used to lazy load code
   *
   * The `lazyLoad` function is invoked before the state is activated.
   * The transition waits while the code is loading.
   *
   * The function should load the code that is required to activate the state.
   * For example, it may load a component class, or some service code.
   * The function must return a promise which resolves when loading is complete.
   *
   * For example, this code lazy loads a service before the `abc` state is activated:
   *
   * ```
   * .state('abc', {
   *   lazyLoad: (transition, state) => import('./abcService')
   * }
   * ```
   *
   * The `abcService` file is imported and loaded
   * (it is assumed that the `abcService` file knows how to register itself as a service).
   *
   * #### Lifecycle
   *
   * - The `lazyLoad` function is invoked if a transition is going to enter the state.
   * - The function is invoked before the transition starts (using an `onBefore` transition hook).
   * - The function is only invoked once; while the `lazyLoad` function is loading code, it will not be invoked again.
   *   For example, if the user double clicks a ui-sref, `lazyLoad` is only invoked once even though there were two transition attempts.
   *   Instead, the existing lazy load promise is re-used.
   * - When the promise resolves successfully, the `lazyLoad` property is deleted from the state declaration.
   * - If the promise resolves to a [[LazyLoadResult]] which has an array of `states`, those states are registered.
   * - The original transition is retried (this time without the `lazyLoad` property present).
   *
   * - If the `lazyLoad` function fails, then the transition also fails.
   *   The failed transition (and the `lazyLoad` function) could potentially be retried by the user.
   *
   * ### Lazy loading state definitions (Future States)
   *
   * State definitions can also be lazy loaded.
   * This might be desirable when building large, multi-module applications.
   *
   * To lazy load state definitions, a Future State should be registered as a placeholder.
   * When the state definitions are lazy loaded, the Future State is deregistered.
   *
   * A future state can act as a placeholder for a single state, or for an entire module of states and substates.
   * A future state should have:
   *
   * - A `name` which ends in `.**`.
   *   A future state's `name` property acts as a wildcard [[Glob]].
   *   It matches any state name that starts with the `name` (including child states that are not yet loaded).
   * - A `url` prefix.
   *   A future state's `url` property acts as a wildcard.
   *   UI-Router matches all paths that begin with the `url`.
   *   It effectively appends `.*` to the internal regular expression.
   *   When the prefix matches, the future state will begin loading.
   * - A `lazyLoad` function.
   *   This function should should return a Promise to lazy load the code for one or more [[StateDeclaration]] objects.
   *   It should return a [[LazyLoadResult]].
   *   Generally, one of the lazy loaded states should have the same name as the future state.
   *   The new state will then **replace the future state placeholder** in the registry.
   *
   * ### Additional resources
   *
   * For in depth information on lazy loading and Future States, see the [Lazy Loading Guide](https://ui-router.github.io/guides/lazyload).
   *
   * #### Example: states.js
   * ```js
   *
   * // This child state is a lazy loaded future state
   * // The `lazyLoad` function loads the final state definition
   * {
   *   name: 'parent.**',
   *   url: '/parent',
   *   lazyLoad: () => import('./lazy.states.js')
   * }
   * ```
   *
   * #### Example: lazy.states.js
   *
   * This file is lazy loaded.  It exports an array of states.
   *
   * ```js
   * import {ChildComponent} from "./child.component.js";
   * import {ParentComponent} from "./parent.component.js";
   *
   * // This fully defined state replaces the future state
   * let parentState = {
   *   // the name should match the future state
   *   name: 'parent',
   *   url: '/parent/:parentId',
   *   component: ParentComponent,
   *   resolve: {
   *     parentData: ($transition$, ParentService) =>
   *         ParentService.get($transition$.params().parentId)
   *   }
   * }
   *
   * let childState = {
   *   name: 'parent.child',
   *   url: '/child/:childId',
   *   params: {
   *     childId: "default"
   *   },
   *   resolve: {
   *     childData: ($transition$, ChildService) =>
   *         ChildService.get($transition$.params().childId)
   *   }
   * };
   *
   * // This array of states will be registered by the lazyLoad hook
   * let lazyLoadResults = {
   *   states: [ parentState, childState ]
   * };
   *
   * export default lazyLoadResults;
   * ```
   *
   * @param transition the [[Transition]] that is activating the future state
   * @param state the [[StateDeclaration]] that the `lazyLoad` function is declared on
   * @return a Promise to load the states.
   *         Optionally, if the promise resolves to a [[LazyLoadResult]],
   *         the states will be registered with the [[StateRegistry]].
   */
  lazyLoad?: (
    transition: Transition,
    state: StateDeclaration,
  ) => Promise<LazyLoadResult>;
  /**
   * Marks all the state's parameters as `dynamic`.
   *
   * All parameters on the state will use this value for `dynamic` as a default.
   * Individual parameters may override this default using [[ParamDeclaration.dynamic]] in the [[params]] block.
   *
   * Note: this value overrides the `dynamic` value on a custom parameter type ([[ParamTypeDefinition.dynamic]]).
   */
  dynamic?: boolean;
  /**
   * Marks all query parameters as [[ParamDeclaration.dynamic]]
   *
   * @deprecated use either [[dynamic]] or [[ParamDeclaration.dynamic]]
   */
  reloadOnSearch?: boolean;
}
/**
 * Represents a fully built StateObject, after registration in the StateRegistry
 * and application of all StateBuilder decorators.
 */
export type BuiltStateDeclaration = StateDeclaration & {
  /** Reference to the original StateDeclaration */
  self: StateDeclaration;
  /** Array of Resolvables built from the resolve / resolvePolicy */
  resolvables: Resolvable[];
  /** Full path from root down to this state */
  path: BuiltStateDeclaration[];
  /** Fast lookup of included states for $state.includes() */
  includes: Record<string, boolean>;
  /** Closest ancestor state that has a URL (navigable) */
  navigable?: BuiltStateDeclaration | null;
  /** URL object built from url / parent / root */
  url?: any;
  /** Computed parameters of this state */
  params?: Record<string, any>;
  /** Optional parent state */
  parent?: StateDeclaration | null;
  /** Optional inherited data */
  data?: any;
  _stateObjectCache?: {
    nameGlob: Glob;
  } | null;
};
/**
 * The return type of a [[StateDeclaration.lazyLoad]] function
 *
 * If your state has a `lazyLoad` function, it should return a promise.
 * If promise resolves to an object matching this interface, then the `states` array
 * of [[StateDeclaration]] objects will be automatically registered.
 */
export interface LazyLoadResult {
  states?: StateDeclaration[];
}
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
export type _StateDeclaration =
  | StateDeclaration
  | {
      new (): StateDeclaration;
    };
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
/**
 * A function that builds the final value for a specific field on a [[StateObject]].
 *
 * A series of builder functions for a given field are chained together.
 * The final value returned from the chain of builders is applied to the built [[StateObject]].
 * Builder functions should call the [[parent]] function either first or last depending on the desired composition behavior.
 *
 * @param state the _partially built_ [[StateObject]]. The [[StateDeclaration]] can be inspected via [[StateObject.self]]
 * @param parent the previous builder function in the series.
 */
export type BuilderFunction = (
  state: StateObject,
  parent?: BuilderFunction,
) => any;
export type OnInvalidCallback = (
  toState?: TargetState,
  fromState?: TargetState,
  injector?: ng.InjectorService,
) => HookResult;
