import { trace } from "../common/trace.ts";
import { stringify } from "../../shared/strings.ts";
import {
  anyTrueR,
  arrayTuples,
  find,
  omit,
  tail,
  unnestR,
} from "../../shared/common.ts";
import { assert, isObject, isUndefined } from "../../shared/utils.ts";
import { is, propEq, val } from "../../shared/hof.ts";
import { TransitionHook, TransitionHookPhase } from "./transition-hook.ts";
import {
  registerHook,
  type RegisteredHook,
  type RegisteredHooks,
} from "./hook-registry.ts";
import { HookBuilder } from "./hook-builder.ts";
import { PathUtils } from "../path/path-utils.ts";
import { Param } from "../params/param.ts";
import { Resolvable } from "../resolve/resolvable.ts";
import { ResolveContext } from "../resolve/resolve-context.ts";
import { Rejection } from "./reject-factory.ts";
import type {
  DeregisterFn,
  HookFn,
  HookMatchCriteria,
  HookRegOptions,
  TreeChanges,
  TransitionOptions,
} from "./interface.ts";
import type { PathNode } from "../path/path-node.ts";
import type { StateObject } from "../state/state-object.ts";
import type { TargetState } from "../state/target-state.ts";
import type { TransitionEventType } from "./transition-event-type.ts";
import type { TransitionService } from "./transition-service.ts";

export interface Transition {
  promise: Promise<any>;
  $id: number;
  _aborted?: boolean;
  _globals: ng.RouterService & Record<string, any>;
  _transitionService: import("./transition-service.ts").TransitionService;
  _treeChanges: import("./interface.ts").TreeChanges;
  addResolvable(
    resolvable:
      | import("../resolve/resolvable.ts").Resolvable
      | import("../resolve/interface.ts").ResolvableLiteral,
    state?: any,
  ): void;
  entering(): ng.StateDeclaration[];
  exiting(): ng.StateDeclaration[];
  views(pathname?: string, state?: any): any[];
  params(pathname?: string): Record<string, any>;
  treeChanges(pathname?: string): any;
  valid(): boolean;
  error(): any;
  originalTransition(): Transition;
  targetState(): import("../state/target-state.ts").TargetState;
  options(): import("./interface.ts").TransitionOptions;
  to(): any;
  redirect(targetState: import("../state/target-state.ts").TargetState): any;
  run(): Promise<any>;
  isActive(): boolean;
  onSuccess(matchCriteria: any, callback: any, options?: any): any;
  $to(): any;
  redirectedFrom(): Transition | null;
}

export type { TreeChanges, TransitionOptions } from "./interface.ts";

/** @typedef {import('./interface.ts').DeregisterFn} DeregisterFn */
/** @typedef {import('./interface.ts').HookFn} HookFn */
/** @typedef {import('./interface.ts').HookMatchCriteria} HookMatchCriteria */
/** @typedef {import('./interface.ts').HookRegOptions} HookRegOptions */
/** @typedef {import("../state/interface.ts").BuiltStateDeclaration} BuiltStateDeclaration */
/** @typedef {import("./interface.ts").RegisteredHooks} RegisteredHooks */
/** @typedef {import("./hook-registry.js").RegisteredHook} RegisteredHook */
/** @typedef {import('../state/target-state.ts').TargetState} TargetState */
/** @typedef {import("../transition/interface.ts").TreeChanges} TreeChanges */
/** @typedef {import("../path/path-node.ts").PathNode} PathNode */
/** @typedef {import("../state/state-object.ts").StateObject} StateObject */
/** @typedef {import("../state/interface.ts").StateDeclaration} StateDeclaration */

const REDIRECT_MAX = 20;

type DeferredPromise<T> = {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
};

function createDeferredPromise<T>(): DeferredPromise<T> {
  let resolve!: DeferredPromise<T>["resolve"];

  let reject!: DeferredPromise<T>["reject"];

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

/**
 * Represents a transition between two states.
 *
 * When navigating to a state, we are transitioning **from** the current state **to** the new state.
 *
 * This object contains all contextual information about the to/from states, parameters, resolves.
 * It has information about all states being entered and exited as a result of the transition.
 */
export class Transition {
  static diToken: typeof Transition;
  promise: Promise<any>;
  $id: number;
  _aborted?: boolean;
  _globals: ng.RouterService & Record<string, any>;
  _transitionService: TransitionService;
  _treeChanges: TreeChanges;
  _deferred: DeferredPromise<any>;
  _registeredHooks: RegisteredHooks;
  _hookBuilder: HookBuilder;
  _targetState: TargetState;
  _options: TransitionOptions;
  success: boolean | undefined;
  _error: any;
  isActive: () => boolean;

  /**
   * Creates a new Transition object.
   *
   * If the target state is not valid, an error is thrown.
   *
   * @param {Array<PathNode>} fromPath The path of [[PathNode]]s from which the transition is leaving.  The last node in the `fromPath`
   *        encapsulates the "from state".
   * @param {TargetState} targetState The target state and parameters being transitioned to (also, the transition options)
   * @param {import("./transition-service.ts").TransitionProvider} transitionService
   * @param {ng.RouterService} globals
   */
  constructor(
    fromPath: PathNode[],
    targetState: TargetState,
    transitionService: TransitionService,
    globals: ng.RouterService & Record<string, any>,
  ) {
    /**
     * @type {import('../router.js').RouterProvider}
     */
    this._globals = globals;

    this._transitionService = transitionService;

    /** @type {DeferredPromise<any>} */
    this._deferred = createDeferredPromise();

    /**
     * This promise is resolved or rejected based on the outcome of the Transition.
     *
     * When the transition is successful, the promise is resolved
     * When the transition is unsuccessful, the promise is rejected with the [[Rejection]] or javascript error
     */
    this.promise = this._deferred.promise;
    /** @type {RegisteredHooks} Holds the hook registration functions such as those passed to Transition.onStart() */
    this._registeredHooks = {};

    /** @type {HookBuilder} */
    this._hookBuilder = new HookBuilder(this);

    /** Checks if this transition is currently active/running. */
    /** @type {() => boolean} */
    this.isActive = () => this._globals.transition === this;

    this._targetState = targetState;

    if (!targetState.valid()) {
      throw new Error(targetState.error());
    }
    // current() is assumed to come from targetState.options, but provide a naive implementation otherwise.
    this._options = Object.assign(
      { current: val(this) },
      targetState.options(),
    );
    this.$id = transitionService._transitionCount++;
    const toPath = PathUtils.buildToPath(fromPath, targetState);

    /** @type {TreeChanges} */
    this._treeChanges = PathUtils.treeChanges(
      fromPath,
      /** @type {PathNode[]} */ toPath,
      this._options.reloadState as StateObject,
    );
    const onCreateHooks = this._hookBuilder.buildHooksForPhase(
      TransitionHookPhase._CREATE,
    );

    TransitionHook.invokeHooks(onCreateHooks, () => Promise.resolve());
    this.applyViewConfigs();
  }

  /**
   * @param {string} hookName
   * @returns {RegisteredHook[]}
   */
  getHooks(hookName: string): RegisteredHook[] {
    return this._registeredHooks[hookName] || [];
  }

  /**
   * Registers a hook by event name.
   * @param {string} eventName
   * @param {HookMatchCriteria} matchCriteria
   * @param {HookFn} callback
   * @param {HookRegOptions} [options]
   * @returns {DeregisterFn}
   */
  on(
    eventName: string,
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn {
    const eventType = this._getEventType(eventName);

    if (eventType.hookPhase === TransitionHookPhase._CREATE) {
      throw new Error("onCreate hooks can only be registered on the service");
    }

    return registerHook(
      this,
      this._transitionService,
      eventType,
      matchCriteria,
      callback,
      options,
    );
  }

  /**
   * @param {HookMatchCriteria} matchCriteria
   * @param {HookFn} callback
   * @param {HookRegOptions} [options]
   * @returns {DeregisterFn}
   */
  onBefore(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ) {
    return this.on("onBefore", matchCriteria, callback, options);
  }

  /**
   * @param {HookMatchCriteria} matchCriteria
   * @param {HookFn} callback
   * @param {HookRegOptions} [options]
   * @returns {DeregisterFn}
   */
  onStart(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ) {
    return this.on("onStart", matchCriteria, callback, options);
  }

  /**
   * @param {HookMatchCriteria} matchCriteria
   * @param {HookFn} callback
   * @param {HookRegOptions} [options]
   * @returns {DeregisterFn}
   */
  onEnter(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ) {
    return this.on("onEnter", matchCriteria, callback, options);
  }

  /**
   * @param {HookMatchCriteria} matchCriteria
   * @param {HookFn} callback
   * @param {HookRegOptions} [options]
   * @returns {DeregisterFn}
   */
  onRetain(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ) {
    return this.on("onRetain", matchCriteria, callback, options);
  }

  /**
   * @param {HookMatchCriteria} matchCriteria
   * @param {HookFn} callback
   * @param {HookRegOptions} [options]
   * @returns {DeregisterFn}
   */
  onExit(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ) {
    return this.on("onExit", matchCriteria, callback, options);
  }

  /**
   * @param {HookMatchCriteria} matchCriteria
   * @param {HookFn} callback
   * @param {HookRegOptions} [options]
   * @returns {DeregisterFn}
   */
  onFinish(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ) {
    return this.on("onFinish", matchCriteria, callback, options);
  }

  /**
   * @param {HookMatchCriteria} matchCriteria
   * @param {HookFn} callback
   * @param {HookRegOptions} [options]
   * @returns {DeregisterFn}
   */
  onSuccess(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ) {
    return this.on("onSuccess", matchCriteria, callback, options);
  }

  /**
   * @param {HookMatchCriteria} matchCriteria
   * @param {HookFn} callback
   * @param {HookRegOptions} [options]
   * @returns {DeregisterFn}
   */
  onError(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ) {
    return this.on("onError", matchCriteria, callback, options);
  }

  /**
   * @param {string} eventName
   * @returns {import("./transition-event-type.js").TransitionEventType}
   */
  _getEventType(eventName: string): TransitionEventType {
    const eventType = this._transitionService
      ._getEvents()
      .find((type) => type.name === eventName);

    if (!eventType) {
      throw new Error(`Unknown Transition hook event: ${eventName}`);
    }

    return eventType;
  }

  applyViewConfigs() {
    const enteringStates = this._treeChanges.entering.map((node) => node.state);

    PathUtils.applyViewConfigs(
      this._transitionService.$view,
      this._treeChanges.to,
      enteringStates,
    );
  }

  /**
   * @returns {StateObject} the internal from [State] object
   */
  $from() {
    const fromNode = tail(this._treeChanges.from) as PathNode | undefined;

    return /** @type {StateObject} */ fromNode?.state;
  }

  /**
   * @returns {StateObject} the internal to [State] object
   */
  $to() {
    const toNode = tail(this._treeChanges.to) as PathNode | undefined;

    return /** @type {StateObject} */ toNode?.state;
  }

  /**
   * Returns the "from state"
   *
   * Returns the state that the transition is coming *from*.
   *
   * @returns {StateDeclaration} The state declaration object for the Transition's ("from state").
   */
  from() {
    return this.$from()!.self;
  }

  /**
   * Returns the "to state"
   *
   * Returns the state that the transition is going *to*.
   *
   * @returns {StateDeclaration} The state declaration object for the Transition's target state ("to state").
   */
  to() {
    return this.$to()!.self;
  }

  /**
   * Gets the Target State
   *
   * A transition's [[TargetState]] encapsulates the [[to]] state, the [[params]], and the [[options]] as a single object.
   *
   * @returns {TargetState} the [[TargetState]] of this Transition
   */
  targetState() {
    return this._targetState;
  }

  /**
   * @param {string} pathname
   * @returns {any}
   */
  params(pathname = "to") {
    const path = (this._treeChanges[pathname] || []) as PathNode[];

    return Object.freeze(
      path
        .map((x) => x.paramValues)
        .reduce((acc, obj) => ({ ...acc, ...obj }), {}),
    );
  }

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
  getResolveTokens(pathname = "to") {
    return new ResolveContext(
      (this._treeChanges[pathname] || []) as PathNode[],
    ).getTokens();
  }

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
    state?: import("../state/interface.ts").StateOrName,
  ) {
    if (state === void 0) {
      state = "";
    }
    resolvable = is(Resolvable)(resolvable)
      ? resolvable
      : new Resolvable(resolvable);
    const stateName = typeof state === "string" ? state : state.name;

    const topath = this._treeChanges.to || [];

    const targetNode = find(topath, (/** @type {PathNode} */ node) => {
      return node.state.name === stateName;
    });

    assert(!!targetNode, `targetNode not found ${stateName}`);
    const resolveContext = new ResolveContext(topath);

    resolveContext.addResolvables([resolvable], (targetNode as PathNode).state);
  }

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
  redirectedFrom() {
    return this._options.redirectedFrom || null;
  }

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
  originalTransition(): Transition {
    const rf = this.redirectedFrom();

    return (rf && rf.originalTransition()) || this;
  }

  /**
   * Get the transition options
   *
   * @returns {import("./interface.ts").TransitionOptions} the options for this Transition.
   */
  options() {
    return this._options;
  }

  /**
   * Gets the states being entered.
   *
   * @returns an array of states that will be entered during this transition.
   */
  entering() {
    return this._treeChanges.entering.map((node) => node.state.self);
  }

  /**
   * Gets the states being exited.
   *
   * @returns {import("../state/interface.ts").StateDeclaration[]} an array of states that will be exited during this transition.
   */
  exiting() {
    return this._treeChanges.exiting.map((node) => node.state.self).reverse();
  }

  /**
   * Gets the states being retained.
   *
   * @returns {import("../state/interface.ts").StateDeclaration[]} an array of states that are already entered from a previous Transition, that will not be
   *    exited during this Transition
   */
  retained() {
    return this._treeChanges.retained.map((node) => node.state.self);
  }

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
   * @returns {import("../state/views.ts").ViewConfig[]} a list of ViewConfig objects for the given path.
   */
  views(pathname = "entering", state?: ng.StateObject) {
    let path = (this._treeChanges[pathname] || []) as PathNode[];

    path = !state ? path : (path.filter(propEq("state", state)) as PathNode[]);

    return path.map((x) => x.views || []).reduce(unnestR, []);
  }

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
   * @returns {import('../path/path-node.ts').PathNode[] | import("./interface.ts").TreeChanges}
   */
  treeChanges(pathname?: string) {
    return pathname
      ? ((this._treeChanges[pathname] || []) as PathNode[])
      : this._treeChanges;
  }

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
  redirect(targetState: TargetState) {
    let redirects = 1;

    let trans: Transition | null = this;

    while ((trans = trans.redirectedFrom())) {
      if (++redirects > REDIRECT_MAX) {
        throw new Error(`Too many consecutive Transition redirects (20+)`);
      }
    }
    const redirectOpts: TransitionOptions = {
      redirectedFrom: this,
      source: "redirect",
    };

    // If the original transition was caused by URL sync, then use { location: 'replace' }
    // on the new transition (unless the target state explicitly specifies location: false).
    // This causes the original url to be replaced with the url for the redirect target
    // so the original url disappears from the browser history.
    if (
      this.options().source === "url" &&
      targetState.options().location !== false
    ) {
      redirectOpts.location = "replace";
    }
    const newOptions = Object.assign(
      {},
      this.options(),
      targetState.options(),
      redirectOpts,
    );

    targetState = targetState.withOptions(newOptions, true);
    const newTransition = this._transitionService.create(
      this._treeChanges.from,
      targetState,
    );

    const originalEnteringNodes = this._treeChanges.entering;

    const redirectEnteringNodes = newTransition._treeChanges.entering;

    // --- Re-use resolve data from original transition ---
    // When redirecting from a parent state to a child state where the parent parameter values haven't changed
    // (because of the redirect), the resolves fetched by the original transition are still valid in the
    // redirected transition.
    //
    // This allows you to define a redirect on a parent state which depends on an async resolve value.
    // You can wait for the resolve, then redirect to a child state based on the result.
    // The redirected transition does not have to re-fetch the resolve.
    // ---------------------------------------------------------
    const nodeIsReloading =
      (reloadState?: ng.StateObject) => (node: PathNode) => {
        return reloadState && node.state.includes[reloadState.name];
      };

    const params = /** @type {PathNode[]} */ PathUtils.matching(
      redirectEnteringNodes,
      originalEnteringNodes,
      PathUtils.nonDynamicParams,
    );

    // Find any "entering" nodes in the redirect path that match the original path and aren't being reloaded
    const matchingEnteringNodes = params.filter(
      (x: PathNode) =>
        !nodeIsReloading(
          /** @type {ng.StateObject} */ targetState.options().reloadState,
        )(x),
    );

    // Use the existing (possibly pre-resolved) resolvables for the matching entering nodes.
    matchingEnteringNodes.forEach((node, idx) => {
      if (originalEnteringNodes[idx]) {
        node.resolvables = originalEnteringNodes[idx].resolvables;
      }
    });

    return newTransition;
  }

  /** @internal If a transition doesn't exit/enter any states, returns any [[Param]] whose value changed */
  _changedParams() {
    const tc = this._treeChanges;

    /** Return undefined if it's not a "dynamic" transition, for the following reasons */
    // If user explicitly wants a reload
    if (this._options.reload) return undefined;

    // If any states are exiting or entering
    if (tc.exiting.length || tc.entering.length) return undefined;

    // If to/from path lengths differ
    if (tc.to.length !== tc.from.length) return undefined;
    // If the to/from paths are different
    const pathsDiffer = arrayTuples(tc.to, tc.from)
      .map((tuple) => tuple[0].state !== tuple[1].state)
      .reduce(anyTrueR, false);

    if (pathsDiffer) return undefined;
    // Find any parameter values that differ
    const nodeSchemas = tc.to.map((node) => node.paramSchema);

    const [toValues, fromValues] = [tc.to, tc.from].map((path) =>
      path.map((x) => x.paramValues),
    );

    const tuples = arrayTuples(nodeSchemas, toValues, fromValues);

    return tuples
      .map((tuple) => Param.changed(tuple[0], tuple[1], tuple[2]))
      .reduce(unnestR, []);
  }

  /**
   * Returns true if the transition is dynamic.
   *
   * A transition is dynamic if no states are entered nor exited, but at least one dynamic parameter has changed.
   *
   * @returns {boolean} true if the Transition is dynamic
   */
  dynamic() {
    const changes = this._changedParams();

    return !changes
      ? false
      : changes.map((x: Param) => x.dynamic).reduce(anyTrueR, false);
  }

  /**
   * Returns true if the transition is ignored.
   *
   * A transition is ignored if no states are entered nor exited, and no parameter values have changed.
   *
   * @returns true if the Transition is ignored.
   */
  ignored() {
    return !!this._ignoredReason();
  }

  _ignoredReason() {
    const pending = this._globals.transition;

    const { reloadState } = this._options;

    const same = (pathA: PathNode[], pathB: PathNode[]) => {
      if (pathA.length !== pathB.length) return false;
      const matching = PathUtils.matching(pathA, pathB);

      return (
        pathA.length ===
        /** @type {PathNode[]} */ matching.filter(
          (node) => !reloadState || !node.state.includes[reloadState.name],
        ).length
      );
    };

    const newTC = this._treeChanges;

    const pendTC = pending && pending._treeChanges;

    if (
      pendTC &&
      same(pendTC.to, newTC.to) &&
      same(pendTC.exiting, newTC.exiting)
    )
      return "SameAsPending";

    if (
      newTC.exiting.length === 0 &&
      newTC.entering.length === 0 &&
      same(newTC.from, newTC.to)
    )
      return "SameAsCurrent";

    return undefined;
  }

  /**
   * Runs the transition
   *
   * This method is generally called from the [[StateService.transitionTo]]
   *
   * @internal
   *
   * @returns {Promise<any>} a promise for a successful transition.
   */
  run() {
    // Gets transition hooks array for the given phase
    const getHooksFor = (phase: TransitionHookPhase) =>
      this._hookBuilder.buildHooksForPhase(phase);

    // When the chain is complete, then resolve or reject the deferred
    const transitionSuccess = () => {
      trace.traceSuccess(this.$to()!, this);
      this.success = true;
      this._deferred.resolve(this.to());
      const hooks = this._hookBuilder.buildHooksForPhase(
        TransitionHookPhase._SUCCESS,
      );

      hooks.forEach((hook: TransitionHook) => {
        hook.invokeHook();
      });
    };

    const transitionError = (reason: Rejection) => {
      trace.traceError(reason, this);
      this.success = false;
      this._deferred.reject(reason);
      this._error = reason;
      const hooks = getHooksFor(TransitionHookPhase._ERROR);

      hooks.forEach((hook: TransitionHook) => hook.invokeHook());
    };

    const runTransition = () => {
      // Wait to build the RUN hook chain until the BEFORE hooks are done
      // This allows a BEFORE hook to dynamically add additional RUN hooks via the Transition object.
      const allRunHooks = getHooksFor(TransitionHookPhase._RUN);

      const resolved = Promise.resolve();

      return TransitionHook.invokeHooks(allRunHooks, () => resolved);
    };

    const startTransition = () => {
      const { _globals } = this;

      _globals._lastStartedTransitionId = this.$id;
      _globals.transition = this;
      _globals._transitionHistory.enqueue(this);
      trace.traceTransitionStart(this);

      return Promise.resolve();
    };

    const allBeforeHooks = getHooksFor(TransitionHookPhase._BEFORE);

    TransitionHook.invokeHooks(allBeforeHooks, startTransition)
      .then(runTransition)
      .then(transitionSuccess, transitionError);

    return this.promise;
  }

  /**
   * Checks if the Transition is valid
   *
   * @returns true if the Transition is valid
   */
  valid() {
    return !this.error() || this.success !== undefined;
  }

  /**
   * Aborts this transition
   *
   * Imperative API to abort a Transition.
   * This only applies to Transitions that are not yet complete.
   */
  abort() {
    // Do not set flag if the transition is already complete
    if (isUndefined(this.success)) {
      this._aborted = true;
    }
  }

  /**
   * The Transition error reason.
   *
   * If the transition is invalid (and could not be run), returns the reason the transition is invalid.
   * If the transition was valid and ran, but was not successful, returns the reason the transition failed.
   *
   * @returns a transition rejection explaining why the transition is invalid, or the reason the transition failed.
   */
  error() {
    const state = this.$to() as StateObject;

    if (state.self.abstract) {
      return Rejection.invalid(
        `Cannot transition to abstract state '${state.name}'`,
      );
    }
    const paramDefs = state.parameters();

    const values = this.params();

    const invalidParams = paramDefs.filter(
      (param: Param) => !param.validates(values[param.id]),
    );

    if (invalidParams.length) {
      const invalidValues = invalidParams
        .map((param: Param) => `[${param.id}:${stringify(values[param.id])}]`)
        .join(", ");

      const detail = `The following parameter values are not valid for state '${state.name}': ${invalidValues}`;

      return Rejection.invalid(detail);
    }

    if (this.success === false) return this._error;

    return undefined;
  }

  /**
   * A string representation of the Transition
   *
   * @returns A string representation of the Transition
   */
  toString() {
    const fromStateOrName = this.from();

    const toStateOrName = this.to();

    const avoidEmptyHash = (
      params: import("../params/interface.ts").RawParams,
    ) =>
      params["#"] !== null && params["#"] !== undefined
        ? params
        : omit(params, ["#"]);

    // (X) means the to state is invalid.
    const id = this.$id,
      from = isObject(fromStateOrName) ? fromStateOrName.name : fromStateOrName,
      fromParams = stringify(
        avoidEmptyHash(
          this._treeChanges.from
            .map((x) => x.paramValues)
            .reduce((acc, obj) => ({ ...acc, ...obj }), {}),
        ),
      ),
      toValid = this.valid() ? "" : "(X) ",
      to = isObject(toStateOrName) ? toStateOrName.name : toStateOrName,
      toParams = stringify(avoidEmptyHash(this.params()));

    return `Transition#${id}( '${from}'${fromParams} -> ${toValid}'${to}'${toParams} )`;
  }
}

Transition.diToken = Transition;
