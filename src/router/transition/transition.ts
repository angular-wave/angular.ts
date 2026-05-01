import { stringify } from "../../shared/strings.ts";
import {
  assign,
  assert,
  isInstanceOf,
  isObject,
  isUndefined,
  isString,
} from "../../shared/utils.ts";
import { TransitionHook, TransitionHookPhase } from "./transition-hook.ts";
import {
  registerHook,
  type RegisteredHook,
  type RegisteredHooks,
} from "./hook-registry.ts";
import { buildHooksForPhase } from "./hook-builder.ts";
import {
  applyViewConfigs,
  buildToPath,
  matching,
  nonDynamicParams,
  treeChanges,
} from "../path/path-utils.ts";
import { Param } from "../params/param.ts";
import { Resolvable } from "../resolve/resolvable.ts";
import { ResolveContext } from "../resolve/resolve-context.ts";
import { Rejection } from "./reject-factory.ts";
import type {
  DeregisterFn,
  HookFn,
  HookMatchCriteria,
  HookRegOptions,
  TransitionOptions,
  TreeChanges,
} from "./interface.ts";
import type { PathNode } from "../path/path-node.ts";
import type { StateObject } from "../state/state-object.ts";
import type { TargetState } from "../state/target-state.ts";
import type { TransitionEventType } from "./transition-event-type.ts";
import type { TransitionService } from "./transition-service.ts";
import type { ResolvableLiteral } from "../resolve/interface.ts";
import type { StateDeclaration, StateOrName } from "../state/interface.ts";
import type { ViewConfig } from "../state/views.ts";
import type { RawParams } from "../params/interface.ts";

export interface Transition {
  promise: Promise<StateDeclaration>;
  $id: number;
  /** @internal */
  _aborted?: boolean;
  /** @internal */
  _routerState: ng._RouterService;
  /** @internal */
  _transitionService: TransitionService;
  /** @internal */
  _treeChanges: TreeChanges;
  addResolvable(
    resolvable: Resolvable | ResolvableLiteral,
    state?: StateOrName,
  ): void;
  entering(): StateDeclaration[];
  exiting(): StateDeclaration[];
  views(pathname?: string, state?: StateObject): ViewConfig[];
  params(pathname?: string): RawParams;
  treeChanges(pathname?: string): TreeChanges | PathNode[];
  valid(): boolean;
  error(): Rejection | undefined;
  originalTransition(): Transition;
  targetState(): TargetState;
  options(): TransitionOptions;
  to(): StateDeclaration;
  redirect(targetState: TargetState): Transition;
  run(): Promise<StateDeclaration>;
  isActive(): boolean;
  onSuccess(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn;
  $to(): StateObject;
  redirectedFrom(): Transition | null;
}

export type { TreeChanges, TransitionOptions } from "./interface.ts";
const REDIRECT_MAX = 20;

type DeferredPromise<T> = {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
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

function nodeIsReloading(node: PathNode, reloadState?: StateObject): boolean {
  return !!reloadState && node.state.includes[reloadState.name];
}

function sameReloadAwarePath(
  pathA: PathNode[],
  pathB: PathNode[],
  reloadState?: StateObject,
): boolean {
  if (pathA.length !== pathB.length) return false;
  const pathPrefix = matching(pathA, pathB);

  let retainedCount = 0;

  for (let i = 0; i < pathPrefix.length; i++) {
    if (!nodeIsReloading(pathPrefix[i], reloadState)) {
      retainedCount++;
    }
  }

  return pathA.length === retainedCount;
}

function avoidEmptyHash(params: RawParams): RawParams {
  if (params["#"] !== null && params["#"] !== undefined) {
    return params;
  }

  const cleanParams: RawParams = {};

  for (const key in params) {
    if (key !== "#") {
      cleanParams[key] = params[key];
    }
  }

  return cleanParams;
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
  promise: Promise<StateDeclaration>;
  $id: number;
  /** @internal */
  _aborted?: boolean;
  /** @internal */
  _routerState: ng._RouterService;
  /** @internal */
  _transitionService: TransitionService;
  /** @internal */
  _treeChanges: TreeChanges;
  /** @internal */
  _deferred: DeferredPromise<StateDeclaration>;
  /** @internal */
  _registeredHooks: RegisteredHooks;
  /** @internal */
  _targetState: TargetState;
  /** @internal */
  _options: TransitionOptions;
  success: boolean | undefined;
  /** @internal */
  _error: Rejection | undefined;

  /**
   * Creates a new Transition object.
   *
   * If the target state is not valid, an error is thrown.
   *
   * @param {Array<PathNode>} fromPath The path of [[PathNode]]s from which the transition is leaving.  The last node in the `fromPath`
   *        encapsulates the "from state".
   * @param {TargetState} targetState The target state and parameters being transitioned to (also, the transition options)
   * @param {TransitionService} transitionService
   * @param routerState
   */
  constructor(
    fromPath: PathNode[],
    targetState: TargetState,
    transitionService: TransitionService,
    routerState: ng._RouterService,
  ) {
    this._routerState = routerState;

    this._transitionService = transitionService;

    this._deferred = createDeferredPromise();

    /**
     * This promise is resolved or rejected based on the outcome of the Transition.
     *
     * When the transition is successful, the promise is resolved
     * When the transition is unsuccessful, the promise is rejected with the [[Rejection]] or javascript error
     */
    this.promise = this._deferred.promise;
    this._registeredHooks = {};

    this._targetState = targetState;

    if (!targetState.valid()) {
      throw new Error(targetState.error());
    }
    // current() is assumed to come from targetState.options, but provide a naive implementation otherwise.
    this._options = assign({ current: () => this }, targetState.options());
    this.$id = transitionService._transitionCount++;
    const toPath = buildToPath(fromPath, targetState);

    this._treeChanges = treeChanges(
      fromPath,
      toPath,
      this._options.reloadState,
    );
    const onCreateHooks = buildHooksForPhase(this, TransitionHookPhase._CREATE);

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
   * @returns {TransitionEventType}
   */
  /** @internal */
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
    const enteringStates: StateObject[] = [];

    const { entering } = this._treeChanges;

    for (let i = 0; i < entering.length; i++) {
      enteringStates.push(entering[i].state);
    }

    applyViewConfigs(
      this._transitionService._view,
      this._treeChanges.to,
      enteringStates,
    );
  }

  /**
   * @returns {StateObject} the internal from [State] object
   */
  $from(): StateObject {
    const fromPath = this._treeChanges.from;

    const fromNode = fromPath.length
      ? (fromPath[fromPath.length - 1] as PathNode)
      : undefined;

    return fromNode?.state as StateObject;
  }

  /**
   * @returns {StateObject} the internal to [State] object
   */
  $to(): StateObject {
    const toPath = this._treeChanges.to;

    const toNode = toPath.length
      ? (toPath[toPath.length - 1] as PathNode)
      : undefined;

    return toNode?.state as StateObject;
  }

  /**
   * Returns the "from state"
   *
   * Returns the state that the transition is coming *from*.
   *
   * @returns {StateDeclaration} The state declaration object for the Transition's ("from state").
   */
  from(): StateDeclaration {
    return this.$from()!.self;
  }

  /**
   * Returns the "to state"
   *
   * Returns the state that the transition is going *to*.
   *
   * @returns {StateDeclaration} The state declaration object for the Transition's target state ("to state").
   */
  to(): StateDeclaration {
    return this.$to()!.self;
  }

  /**
   * Gets the Target State
   *
   * A transition's [[TargetState]] encapsulates the [[to]] state, the [[params]], and the [[options]] as a single object.
   *
   * @returns {TargetState} the [[TargetState]] of this Transition
   */
  targetState(): TargetState {
    return this._targetState;
  }

  /**
   * @param {string} pathname
   * @returns {RawParams}
   */
  params(pathname = "to"): RawParams {
    const path = (this._treeChanges[pathname] || []) as PathNode[];

    const params: RawParams = {};

    for (let i = 0; i < path.length; i++) {
      assign(params, path[i].paramValues);
    }

    return Object.freeze(params);
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
   * @param pathname resolve context's path name (e.g., `to` or `from`)
   *
   * @returns an array of resolve tokens (keys)
   */
  getResolveTokens(pathname = "to") {
    return new ResolveContext(
      (this._treeChanges[pathname] || []) as PathNode[],
      this._routerState._injector,
    ).getTokens();
  }

  /**
   * Dynamically adds a new [[Resolvable]] (i.e., [[StateDeclaration.resolve]]) to this transition.
   *
   * Allows a transition hook to dynamically add a Resolvable to this Transition.
   *
   * Use the [[Transition.injector]] to retrieve the resolved data in subsequent hooks.
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
   * @param {Resolvable | ResolvableLiteral} resolvable a [[ResolvableLiteral]] object (or a [[Resolvable]])
   * @param {StateOrName} state the state in the "to path" which should receive the new resolve (otherwise, the root state)
   */
  addResolvable(
    resolvable: Resolvable | ResolvableLiteral,
    state?: StateOrName,
  ) {
    if (state === void 0) {
      state = "";
    }
    resolvable = isInstanceOf(resolvable, Resolvable)
      ? resolvable
      : new Resolvable(resolvable);
    const stateName = isString(state) ? state : state.name;

    const topath = this._treeChanges.to || [];

    let targetNode: PathNode | undefined;

    for (let i = 0; i < topath.length; i++) {
      const node = topath[i] as PathNode;

      if (node.state.name === stateName) {
        targetNode = node;
        break;
      }
    }

    assert(!!targetNode, `targetNode not found ${stateName}`);
    const resolveContext = new ResolveContext(
      topath,
      this._routerState._injector,
    );

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
   * @returns {TransitionOptions} the options for this Transition.
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
    return pathStates(this._treeChanges.entering);
  }

  /**
   * Gets the states being exited.
   *
   * @returns {StateDeclaration[]} an array of states that will be exited during this transition.
   */
  exiting(): StateDeclaration[] {
    const states = pathStates(this._treeChanges.exiting);

    states.reverse();

    return states;
  }

  /**
   * Gets the states being retained.
   *
   * @returns {StateDeclaration[]} an array of states that are already entered from a previous Transition, that will not be
   *    exited during this Transition
   */
  retained(): StateDeclaration[] {
    return pathStates(this._treeChanges.retained);
  }

  /**
   * Get the [[ViewConfig]]s associated with this Transition
   *
   * Each entered state's view declaration is encapsulated as a `ViewConfig` object.
   * This method fetches the `ViewConfigs` for a given path in the Transition (e.g., "to" or "entering").
   *
   * @param pathname the name of the path to fetch views for:
   *   (`'to'`, `'from'`, `'entering'`, `'exiting'`, `'retained'`)
   * @param state If provided, only returns the `ViewConfig`s for a single state in the path
   *
   * @returns {ViewConfig[]} a list of ViewConfig objects for the given path.
   */
  views(pathname = "entering", state?: StateObject): ViewConfig[] {
    const path = (this._treeChanges[pathname] || []) as PathNode[];

    const viewConfigs: ViewConfig[] = [];

    for (let i = 0; i < path.length; i++) {
      const node = path[i];

      if (state && node.state !== state) continue;

      const views = node._views || [];

      for (let j = 0; j < views.length; j++) {
        viewConfigs.push(views[j]);
      }
    }

    return viewConfigs;
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
   * @returns {PathNode[] | TreeChanges}
   */
  treeChanges(pathname?: string): TreeChanges | PathNode[] {
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
  redirect(targetState: TargetState): Transition {
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
    const newOptions = assign(
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
    const params = matching(
      redirectEnteringNodes,
      originalEnteringNodes,
      nonDynamicParams,
    );

    // Find any "entering" nodes in the redirect path that match the original path and aren't being reloaded
    const matchingEnteringNodes: PathNode[] = [];

    const { reloadState } = targetState.options();

    for (let i = 0; i < params.length; i++) {
      if (!nodeIsReloading(params[i], reloadState)) {
        matchingEnteringNodes.push(params[i]);
      }
    }

    // Use the existing (possibly pre-resolved) resolvables for the matching entering nodes.
    for (let i = 0; i < matchingEnteringNodes.length; i++) {
      const node = matchingEnteringNodes[i];

      if (originalEnteringNodes[i]) {
        node.resolvables = originalEnteringNodes[i].resolvables;
      }
    }

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
    let pathsDiffer = false;

    for (let i = 0; i < tc.to.length; i++) {
      if (tc.to[i].state !== tc.from[i].state) {
        pathsDiffer = true;
        break;
      }
    }

    if (pathsDiffer) return undefined;

    const changes: Param[] = [];

    for (let i = 0; i < tc.to.length; i++) {
      const nodeChanges = Param.changed(
        tc.to[i].paramSchema,
        tc.to[i].paramValues,
        tc.from[i].paramValues,
      );

      for (let j = 0; j < nodeChanges.length; j++) {
        changes.push(nodeChanges[j]);
      }
    }

    return changes;
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

    if (!changes) return false;

    for (let i = 0; i < changes.length; i++) {
      if (changes[i].dynamic) return true;
    }

    return false;
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

  /** @internal */
  _ignoredReason() {
    const pending = this._routerState._transition;

    const { reloadState } = this._options;

    const newTC = this._treeChanges;

    const pendTC = pending && pending._treeChanges;

    if (
      pendTC &&
      sameReloadAwarePath(pendTC.to, newTC.to, reloadState) &&
      sameReloadAwarePath(pendTC.exiting, newTC.exiting, reloadState)
    )
      return "SameAsPending";

    if (
      newTC.exiting.length === 0 &&
      newTC.entering.length === 0 &&
      sameReloadAwarePath(newTC.from, newTC.to, reloadState)
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
   * @returns {Promise<StateDeclaration>} a promise for a successful transition.
   */
  run(): Promise<StateDeclaration> {
    // Gets transition hooks array for the given phase
    const getHooksFor = (phase: TransitionHookPhase) =>
      buildHooksForPhase(this, phase);

    // When the chain is complete, then resolve or reject the deferred
    const transitionSuccess = () => {
      this.success = true;
      const hooks = buildHooksForPhase(this, TransitionHookPhase._SUCCESS);

      TransitionHook.invokeHooks(hooks, () => Promise.resolve()).then(
        () => this._deferred.resolve(this.to()),
        (reason) => transitionError(Rejection.normalize(reason)),
      );
    };

    const transitionError = (reason: Rejection) => {
      this.success = false;
      this._deferred.reject(reason);
      this._error = reason;
      const hooks = getHooksFor(TransitionHookPhase._ERROR);

      for (let i = 0; i < hooks.length; i++) {
        hooks[i].invokeHook();
      }
    };

    const runTransition = () => {
      // Wait to build the RUN hook chain until the BEFORE hooks are done
      // This allows a BEFORE hook to dynamically add additional RUN hooks via the Transition object.
      const allRunHooks = getHooksFor(TransitionHookPhase._RUN);

      const resolved = Promise.resolve();

      return TransitionHook.invokeHooks(allRunHooks, () => resolved);
    };

    const startTransition = () => {
      const { _routerState } = this;

      _routerState._lastStartedTransitionId = this.$id;
      _routerState._transition = this;
      _routerState._transitionHistory._enqueue(this);

      return Promise.resolve();
    };

    const allBeforeHooks = getHooksFor(TransitionHookPhase._BEFORE);

    TransitionHook.invokeHooks(allBeforeHooks, startTransition)
      .then(runTransition)
      .then(transitionSuccess, transitionError);

    return this.promise;
  }

  /** Checks if this transition is currently active/running. */
  isActive(): boolean {
    return this._routerState._transition === this;
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
  error(): Rejection | undefined {
    const state = this.$to() as StateObject;

    if (state.self.abstract) {
      return Rejection.invalid(
        `Cannot transition to abstract state '${state.name}'`,
      );
    }
    const paramDefs = state.parameters();

    const values = this.params();

    const invalidParams: Param[] = [];

    for (let i = 0; i < paramDefs.length; i++) {
      const param = paramDefs[i];

      if (!param.validates(values[param.id])) {
        invalidParams.push(param);
      }
    }

    if (invalidParams.length) {
      const invalidValueParts: string[] = [];

      for (let i = 0; i < invalidParams.length; i++) {
        const param = invalidParams[i];

        invalidValueParts.push(`[${param.id}:${stringify(values[param.id])}]`);
      }

      const invalidValues = invalidValueParts.join(", ");

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

    // (X) means the to state is invalid.
    const id = this.$id,
      from = isObject(fromStateOrName) ? fromStateOrName.name : fromStateOrName,
      fromParams = stringify(
        avoidEmptyHash(pathParams(this._treeChanges.from)),
      ),
      toValid = this.valid() ? "" : "(X) ",
      to = isObject(toStateOrName) ? toStateOrName.name : toStateOrName,
      toParams = stringify(avoidEmptyHash(this.params()));

    return `Transition#${id}( '${from}'${fromParams} -> ${toValid}'${to}'${toParams} )`;
  }
}

function pathStates(path: PathNode[]): StateDeclaration[] {
  const states: StateDeclaration[] = [];

  for (let i = 0; i < path.length; i++) {
    states.push(path[i].state.self);
  }

  return states;
}

function pathParams(path: PathNode[]): RawParams {
  const params: RawParams = {};

  for (let i = 0; i < path.length; i++) {
    assign(params, path[i].paramValues);
  }

  return params;
}

Transition.diToken = Transition;
