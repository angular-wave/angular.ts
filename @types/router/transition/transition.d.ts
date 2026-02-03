/**
 * Represents a transition between two states.
 *
 * When navigating to a state, we are transitioning **from** the current state **to** the new state.
 *
 * This object contains all contextual information about the to/from states, parameters, resolves.
 * It has information about all states being entered and exited as a result of the transition.
 * @extends {HookRegistry}
 */
export class Transition {
  /**
   * Creates a new Transition object.
   *
   * If the target state is not valid, an error is thrown.
   *
   * @param {Array<PathNode>} fromPath The path of [[PathNode]]s from which the transition is leaving.  The last node in the `fromPath`
   *        encapsulates the "from state".
   * @param {TargetState} targetState The target state and parameters being transitioned to (also, the transition options)
   * @param {ng.TransitionService} transitionService
   * @param {ng.RouterService} globals
   */
  constructor(
    fromPath: Array<PathNode>,
    targetState: TargetState,
    transitionService: ng.TransitionService,
    globals: ng.RouterService,
  );
  /**
   * @type {import('../router.js').RouterProvider}
   */
  _globals: import("../router.js").RouterProvider;
  _transitionService: import("./interface.ts").TransitionService;
  /** @type {PromiseWithResolvers<any>} */
  _deferred: PromiseWithResolvers<any>;
  /**
   * This promise is resolved or rejected based on the outcome of the Transition.
   *
   * When the transition is successful, the promise is resolved
   * When the transition is unsuccessful, the promise is rejected with the [[Rejection]] or javascript error
   */
  promise: any;
  /** @type {RegisteredHooks} Holds the hook registration functions such as those passed to Transition.onStart() */
  _registeredHooks: RegisteredHooks;
  /** @type {HookBuilder} */
  _hookBuilder: HookBuilder;
  /** Checks if this transition is currently active/running. */
  /** @type {() => boolean} */
  isActive: () => boolean;
  _targetState: import("../state/target-state.js").TargetState;
  _options: any;
  $id: number;
  /** @type {TreeChanges} */
  _treeChanges: TreeChanges;
  /**
   * Creates the transition-level hook registration functions
   * (which can then be used to register hooks)
   */
  createTransitionHookRegFns(): void;
  /**
   * @param {string} hookName
   * @returns {RegisteredHook[]}
   */
  getHooks(hookName: string): RegisteredHook[];
  applyViewConfigs(): void;
  /**
   * @returns {StateObject} the internal from [State] object
   */
  $from(): StateObject;
  /**
   * @returns {StateObject} the internal to [State] object
   */
  $to(): StateObject;
  /**
   * Returns the "from state"
   *
   * Returns the state that the transition is coming *from*.
   *
   * @returns {StateDeclaration} The state declaration object for the Transition's ("from state").
   */
  from(): StateDeclaration;
  /**
   * Returns the "to state"
   *
   * Returns the state that the transition is going *to*.
   *
   * @returns {StateDeclaration} The state declaration object for the Transition's target state ("to state").
   */
  to(): StateDeclaration;
  /**
   * Gets the Target State
   *
   * A transition's [[TargetState]] encapsulates the [[to]] state, the [[params]], and the [[options]] as a single object.
   *
   * @returns {TargetState} the [[TargetState]] of this Transition
   */
  targetState(): TargetState;
  /**
   * @param {string} pathname
   * @returns {any}
   */
  params(pathname?: string): any;
  /**
   * Gets all available resolve tokens (keys)
   *
   * This method can be used in conjunction with [[injector]] to inspect the resolve values
   * available to the Transition.
   *
   * This returns all the tokens defined on [[StateDeclaration.resolve]] blocks, for the states
   * in the Transition's [[TreeChanges.to]] path.
   *
   * #### Example:
   * This example logs all resolve values
   * ```js
   * let tokens = trans.getResolveTokens();
   * tokens.forEach(token => console.log(token + " = " + trans.injector().get(token)));
   * ```
   *
   * #### Example:
   * This example creates promises for each resolve value.
   * This triggers fetches of resolves (if any have not yet been fetched).
   * When all promises have all settled, it logs the resolve values.
   * ```js
   * let tokens = trans.getResolveTokens();
   * let promise = tokens.map(token => trans.injector().getAsync(token));
   * Promise.all(promises).then(values => console.log("Resolved values: " + values));
   * ```
   *
   * Note: Angular 1 users whould use `$q.all()`
   *
   * @param pathname resolve context's path name (e.g., `to` or `from`)
   *
   * @returns an array of resolve tokens (keys)
   */
  getResolveTokens(pathname?: string): any;
  /**
   * Dynamically adds a new [[Resolvable]] (i.e., [[StateDeclaration.resolve]]) to this transition.
   *
   * Allows a transition hook to dynamically add a Resolvable to this Transition.
   *
   * Use the [[Transition.injector]] to retrieve the resolved data in subsequent hooks ([[UIInjector.get]]).
   *
   * If a `state` argument is provided, the Resolvable is processed when that state is being entered.
   * If no `state` is provided then the root state is used.
   * If the given `state` has already been entered, the Resolvable is processed when any child state is entered.
   * If no child states will be entered, the Resolvable is processed during the `onFinish` phase of the Transition.
   *
   * The `state` argument also scopes the resolved data.
   * The resolved data is available from the injector for that `state` and any children states.
   *
   * #### Example:
   * ```js
   * transitionService.onBefore({}, transition => {
   *   transition.addResolvable({
   *     token: 'myResolve',
   *     deps: ['MyService'],
   *     resolveFn: myService => myService.getData()
   *   });
   * });
   * ```
   *
   * @param {Resolvable | import("../resolve/interface.ts").ResolvableLiteral} resolvable a [[ResolvableLiteral]] object (or a [[Resolvable]])
   * @param {import("../state/interface.ts").StateOrName} state the state in the "to path" which should receive the new resolve (otherwise, the root state)
   */
  addResolvable(
    resolvable:
      | Resolvable
      | import("../resolve/interface.ts").ResolvableLiteral,
    state: import("../state/interface.ts").StateOrName,
  ): void;
  /**
   * Gets the transition from which this transition was redirected.
   *
   * If the current transition is a redirect, this method returns the transition that was redirected.
   *
   * #### Example:
   * ```js
   * let transitionA = $state.go('A').transition
   * transitionA.onStart({}, () => $state.target('B'));
   * $transitions.onSuccess({ to: 'B' }, (trans) => {
   *   trans.to().name === 'B'; // true
   *   trans.redirectedFrom() === transitionA; // true
   * });
   * ```
   *
   * @returns {Transition} The previous Transition, or null if this Transition is not the result of a redirection
   */
  redirectedFrom(): Transition;
  /**
   * Gets the original transition in a redirect chain
   *
   * A transition might belong to a long chain of multiple redirects.
   * This method walks the [[redirectedFrom]] chain back to the original (first) transition in the chain.
   *
   * #### Example:
   * ```js
   * // states
   * registry.register({ name: 'A', redirectTo: 'B' });
   * registry.register({ name: 'B', redirectTo: 'C' });
   * registry.register({ name: 'C', redirectTo: 'D' });
   * registry.register({ name: 'D' });
   *
   * let transitionA = $state.go('A').transition
   *
   * $transitions.onSuccess({ to: 'D' }, (trans) => {
   *   trans.to().name === 'D'; // true
   *   trans.redirectedFrom().to().name === 'C'; // true
   *   trans.originalTransition() === transitionA; // true
   *   trans.originalTransition().to().name === 'A'; // true
   * });
   * ```
   *
   * @returns {Transition} The original Transition that started a redirect chain
   */
  originalTransition(): Transition;
  /**
   * Get the transition options
   *
   * @returns {import("./interface.ts").TransitionOptions} the options for this Transition.
   */
  options(): import("./interface.ts").TransitionOptions;
  /**
   * Gets the states being entered.
   *
   * @returns an array of states that will be entered during this transition.
   */
  entering(): import("../state/interface.ts").StateDeclaration[];
  /**
   * Gets the states being exited.
   *
   * @returns {import("../state/interface.ts").StateDeclaration[]} an array of states that will be exited during this transition.
   */
  exiting(): import("../state/interface.ts").StateDeclaration[];
  /**
   * Gets the states being retained.
   *
   * @returns {import("../state/interface.ts").StateDeclaration[]} an array of states that are already entered from a previous Transition, that will not be
   *    exited during this Transition
   */
  retained(): import("../state/interface.ts").StateDeclaration[];
  /**
   * Get the [[ViewConfig]]s associated with this Transition
   *
   * Each state can define one or more views (template/controller), which are encapsulated as `ViewConfig` objects.
   * This method fetches the `ViewConfigs` for a given path in the Transition (e.g., "to" or "entering").
   *
   * @param pathname the name of the path to fetch views for:
   *   (`'to'`, `'from'`, `'entering'`, `'exiting'`, `'retained'`)
   * @param {ng.StateObject} [state] If provided, only returns the `ViewConfig`s for a single state in the path
   *
   * @returns {import("../state/views.js").ViewConfig[]} a list of ViewConfig objects for the given path.
   */
  views(
    pathname?: string,
    state?: ng.StateObject,
  ): import("../state/views.js").ViewConfig[];
  /**
   * Return the transition's tree changes
   *
   * A transition goes from one state/parameters to another state/parameters.
   * During a transition, states are entered and/or exited.
   *
   * This function returns various branches (paths) which represent the changes to the
   * active state tree that are caused by the transition.
   *
   * @param {string} [pathname] The name of the tree changes path to get:
   *   (`'to'`, `'from'`, `'entering'`, `'exiting'`, `'retained'`)
   * @returns {import('../path/path-node.js').PathNode[] | import("./interface.ts").TreeChanges}
   */
  treeChanges(
    pathname?: string,
  ):
    | import("../path/path-node.js").PathNode[]
    | import("./interface.ts").TreeChanges;
  /**
   * Creates a new transition that is a redirection of the current one.
   *
   * This transition can be returned from a [[TransitionService]] hook to
   * redirect a transition to a new state and/or set of parameters.
   *
   * @param {TargetState} targetState the new target state for the redirected transition
   *
   * @returns {Transition} Returns a new [[Transition]] instance.
   */
  redirect(targetState: TargetState): Transition;
  /** @internal If a transition doesn't exit/enter any states, returns any [[Param]] whose value changed */
  _changedParams(): any;
  /**
   * Returns true if the transition is dynamic.
   *
   * A transition is dynamic if no states are entered nor exited, but at least one dynamic parameter has changed.
   *
   * @returns {boolean} true if the Transition is dynamic
   */
  dynamic(): boolean;
  /**
   * Returns true if the transition is ignored.
   *
   * A transition is ignored if no states are entered nor exited, and no parameter values have changed.
   *
   * @returns true if the Transition is ignored.
   */
  ignored(): boolean;
  _ignoredReason(): "SameAsPending" | "SameAsCurrent";
  /**
   * Runs the transition
   *
   * This method is generally called from the [[StateService.transitionTo]]
   *
   * @internal
   *
   * @returns {Promise<any>} a promise for a successful transition.
   */
  run(): Promise<any>;
  success: boolean;
  _error: Rejection;
  /**
   * Checks if the Transition is valid
   *
   * @returns true if the Transition is valid
   */
  valid(): boolean;
  /**
   * Aborts this transition
   *
   * Imperative API to abort a Transition.
   * This only applies to Transitions that are not yet complete.
   */
  abort(): void;
  _aborted: boolean;
  /**
   * The Transition error reason.
   *
   * If the transition is invalid (and could not be run), returns the reason the transition is invalid.
   * If the transition was valid and ran, but was not successful, returns the reason the transition failed.
   *
   * @returns a transition rejection explaining why the transition is invalid, or the reason the transition failed.
   */
  error(): Rejection;
  /**
   * A string representation of the Transition
   *
   * @returns A string representation of the Transition
   */
  toString(): string;
}
export namespace Transition {
  export { Transition as diToken };
}
export type HookRegistry = import("./interface.ts").HookRegistry;
export type BuiltStateDeclaration =
  import("../state/interface.ts").BuiltStateDeclaration;
export type RegisteredHooks = import("./interface.ts").RegisteredHooks;
export type RegisteredHook = import("./hook-registry.js").RegisteredHook;
export type TargetState = import("../state/target-state.js").TargetState;
export type TreeChanges = import("../transition/interface.ts").TreeChanges;
export type PathNode = import("../path/path-node.js").PathNode;
export type StateObject = import("../state/state-object.js").StateObject;
export type StateDeclaration = import("../state/interface.ts").StateDeclaration;
import { HookBuilder } from "./hook-builder.js";
import { Resolvable } from "../resolve/resolvable.js";
import { Rejection } from "./reject-factory.js";
