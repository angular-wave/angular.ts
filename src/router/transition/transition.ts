import { stringify } from "../../shared/strings.ts";
import { assign, isObject, isUndefined, keys } from "../../shared/utils.ts";
import { TransitionHook, TransitionHookPhase } from "./transition-hook.ts";
import { buildHooksForPhase } from "./hook-builder.ts";
import {
  applyViewConfigs,
  buildToPath,
  matching,
  nonDynamicParams,
  treeChanges,
} from "../path/path-utils.ts";
import { Param } from "../params/param.ts";
import { Rejection } from "./reject-factory.ts";
import type { TransitionOptions, TreeChanges } from "./interface.ts";
import type { PathNode } from "../path/path-node.ts";
import type { StateObject } from "../state/state-object.ts";
import type { TargetState } from "../state/target-state.ts";
import type { TransitionService } from "./transition-service.ts";
import type { StateDeclaration } from "../state/interface.ts";
import type { RawParams } from "../params/interface.ts";
import type { RouterProvider } from "../router.ts";

export interface Transition {
  promise: Promise<StateDeclaration>;
  $id: number;
  /** @internal */
  _aborted?: boolean;
  /** @internal */
  _routerState: RouterProvider;
  /** @internal */
  _transitionService: TransitionService;
  /** @internal */
  _treeChanges: TreeChanges;
  entering(): StateDeclaration[];
  exiting(): StateDeclaration[];
  params(pathname?: string): RawParams;
  valid(): boolean;
  error(): Rejection | undefined;
  to(): StateDeclaration;
  redirect(targetState: TargetState): Transition;
  run(): Promise<StateDeclaration>;
  isActive(): boolean;
  $to(): StateObject;
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

function resolvedPromise(): Promise<void> {
  return Promise.resolve();
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

  let retainedCount = 0;

  for (let i = 0; i < pathA.length; i++) {
    if (!pathA[i].equals(pathB[i])) break;

    if (!nodeIsReloading(pathA[i], reloadState)) {
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

  keys(params).forEach((key) => {
    if (key !== "#") {
      cleanParams[key] = params[key];
    }
  });

  return cleanParams;
}

function collectPathParams(path: PathNode[]): RawParams {
  const params: RawParams = {};

  path.forEach((node) => {
    const nodeParams = node.paramValues;

    keys(nodeParams).forEach((key) => {
      params[key] = nodeParams[key];
    });
  });

  return params;
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
  _routerState: RouterProvider;
  /** @internal */
  _transitionService: TransitionService;
  /** @internal */
  _treeChanges: TreeChanges;
  /** @internal */
  _deferred: DeferredPromise<StateDeclaration>;
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
    routerState: RouterProvider,
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

  applyViewConfigs() {
    const enteringStates = new Set<StateObject>();

    const { entering } = this._treeChanges;

    entering.forEach((node) => {
      enteringStates.add(node.state);
    });

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
   * @param {string} pathname
   * @returns {RawParams}
   */
  params(pathname = "to"): RawParams {
    const path = (this._treeChanges[pathname] || []) as PathNode[];

    return Object.freeze(collectPathParams(path));
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
    const path = this._treeChanges.exiting;

    const states: StateDeclaration[] = [];

    for (let i = path.length - 1; i >= 0; i--) {
      states.push(path[i].state.self);
    }

    return states;
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

    while ((trans = trans._options.redirectedFrom || null)) {
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
      this._options.source === "url" &&
      targetState.options().location !== false
    ) {
      redirectOpts.location = "replace";
    }
    const newOptions = assign(
      {},
      this._options,
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

    params.forEach((node) => {
      if (!nodeIsReloading(node, reloadState)) {
        matchingEnteringNodes.push(node);
      }
    });

    // Use the existing (possibly pre-resolved) resolvables for the matching entering nodes.
    matchingEnteringNodes.forEach((node, i) => {
      if (originalEnteringNodes[i]) {
        node.resolvables = originalEnteringNodes[i].resolvables;
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
    let pathsDiffer = false;

    for (let i = 0; i < tc.to.length; i++) {
      if (tc.to[i].state !== tc.from[i].state) {
        pathsDiffer = true;
        break;
      }
    }

    if (pathsDiffer) return undefined;

    const changes: Param[] = [];

    tc.to.forEach((node, i) => {
      const fromParamValues = tc.from[i].paramValues;

      node.paramSchema.forEach((param) => {
        if (
          !param.type.equals(
            node.paramValues[param.id],
            fromParamValues[param.id],
          )
        ) {
          changes.push(param);
        }
      });
    });

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

  /** @internal */
  _getHooksFor(phase: TransitionHookPhase): TransitionHook[] {
    return buildHooksForPhase(this, phase);
  }

  /** @internal */
  _startTransition(): Promise<void> {
    const { _routerState } = this;

    _routerState._lastStartedTransitionId = this.$id;
    _routerState._transition = this;
    _routerState._lastStartedTransition = this;

    return Promise.resolve();
  }

  /** @internal */
  _runTransitionHooks(): Promise<unknown> {
    // Wait to build the RUN hook chain until BEFORE hooks have completed.
    // This allows a BEFORE hook to add more RUN hooks dynamically.
    const allRunHooks = this._getHooksFor(TransitionHookPhase._RUN);

    return TransitionHook.invokeHooks(allRunHooks, resolvedPromise);
  }

  /** @internal */
  _resolveTransition(): void {
    this._deferred.resolve(this.to());
  }

  /** @internal */
  _transitionSuccess(): void {
    this.success = true;

    const hooks = this._getHooksFor(TransitionHookPhase._SUCCESS);

    void this._runSuccessHooks(hooks);
  }

  /** @internal */
  async _runSuccessHooks(hooks: TransitionHook[]): Promise<void> {
    try {
      await TransitionHook.invokeHooks(hooks, resolvedPromise);
      this._resolveTransition();
    } catch (reason) {
      this._transitionError(reason);
    }
  }

  /** @internal */
  _transitionError(reason: unknown): void {
    const rejection = Rejection.normalize(reason);

    this.success = false;
    this._deferred.reject(rejection);
    this._error = rejection;

    const hooks = this._getHooksFor(TransitionHookPhase._ERROR);

    hooks.forEach((hook) => {
      hook.invokeHook();
    });
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
    void this._run();

    return this.promise;
  }

  /** @internal */
  async _run(): Promise<void> {
    try {
      const allBeforeHooks = this._getHooksFor(TransitionHookPhase._BEFORE);

      await TransitionHook.invokeHooks(allBeforeHooks, this);
      await this._runTransitionHooks();
      this._transitionSuccess();
    } catch (reason) {
      this._transitionError(reason);
    }
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

    const invalidValueParts: string[] = [];

    paramDefs.forEach((param) => {
      if (!param.validates(values[param.id])) {
        invalidValueParts.push(`[${param.id}:${stringify(values[param.id])}]`);
      }
    });

    if (invalidValueParts.length) {
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

  path.forEach((node) => {
    states.push(node.state.self);
  });

  return states;
}

function pathParams(path: PathNode[]): RawParams {
  return collectPathParams(path);
}

Transition.diToken = Transition;
