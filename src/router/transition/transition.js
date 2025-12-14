import { trace } from "../common/trace.js";
import { stringify } from "../../shared/strings.js";
import {
  anyTrueR,
  arrayTuples,
  find,
  map,
  omit,
  tail,
  unnestR,
} from "../../shared/common.js";
import {
  assert,
  isNullOrUndefined,
  isObject,
  isUndefined,
} from "../../shared/utils.js";
import { is, propEq, val } from "../../shared/hof.js";
import { TransitionHook, TransitionHookPhase } from "./transition-hook.js";
import { makeEvent, matchState } from "./hook-registry.js";
import { HookBuilder } from "./hook-builder.js";
import { PathUtils } from "../path/path-utils.js";
import { Param } from "../params/param.js";
import { Resolvable } from "../resolve/resolvable.js";
import { ResolveContext } from "../resolve/resolve-context.js";
import { Rejection } from "./reject-factory.js";

/** @typedef {import('./interface.ts').HookRegistry} HookRegistry */

const REDIRECT_MAX = 20;

/**
 * Represents a transition between two states.
 *
 * When navigating to a state, we are transitioning **from** the current state **to** the new state.
 *
 * This object contains all contextual information about the to/from states, parameters, resolves.
 * It has information about all states being entered and exited as a result of the transition.
 * @implements {HookRegistry}
 */
export class Transition {
  /**
   * Creates a new Transition object.
   *
   * If the target state is not valid, an error is thrown.
   *
   * @param {Array<import('../path/path-node.js').PathNode>} fromPath The path of [[PathNode]]s from which the transition is leaving.  The last node in the `fromPath`
   *        encapsulates the "from state".
   * @param {import('../state/target-state.js').TargetState} targetState The target state and parameters being transitioned to (also, the transition options)
   * @param {ng.TransitionProvider} transitionService The [[TransitionService]] instance
   * @param {ng.RouterService} globals
   */
  constructor(fromPath, targetState, transitionService, globals) {
    /**
     * @type {import('../router.js').RouterProvider}
     */
    this._globals = globals;
    this._transitionService = transitionService;
    this._deferred = Promise.withResolvers();

    /**
     * This promise is resolved or rejected based on the outcome of the Transition.
     *
     * When the transition is successful, the promise is resolved
     * When the transition is unsuccessful, the promise is rejected with the [[Rejection]] or javascript error
     */
    this.promise = this._deferred.promise;
    /** @internal Holds the hook registration functions such as those passed to Transition.onStart() */
    this._registeredHooks = {};

    this._hookBuilder = new HookBuilder(this);
    /** Checks if this transition is currently active/running. */
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

    this._treeChanges = PathUtils.treeChanges(
      fromPath,
      toPath,
      this._options.reloadState,
    );
    this.createTransitionHookRegFns();
    const onCreateHooks = this._hookBuilder.buildHooksForPhase(
      TransitionHookPhase._CREATE,
    );

    TransitionHook.invokeHooks(onCreateHooks, () => null);
    this.applyViewConfigs();
    this.onStart = undefined;
    this.onBefore = undefined;
    this.onSuccess = undefined;
    this.onEnter = undefined;
    this.onRetain = undefined;
    this.onExit = undefined;
    this.onFinish = undefined;
    this.onError = undefined;
  }

  /**
   * Creates the transition-level hook registration functions
   * (which can then be used to register hooks)
   */
  createTransitionHookRegFns() {
    this._transitionService
      ._getEvents()
      .filter((type) => type.hookPhase !== TransitionHookPhase._CREATE)
      .forEach((type) => makeEvent(this, this._transitionService, type));
  }

  getHooks(hookName) {
    return this._registeredHooks[hookName];
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
   * @returns {import('../state/state-object.js').StateObject} the internal from [State] object
   */
  $from() {
    return tail(this._treeChanges.from).state;
  }

  /**
   * @returns {import('../state/state-object.js').StateObject} the internal to [State] object
   */
  $to() {
    return tail(this._treeChanges.to).state;
  }

  /**
   * Returns the "from state"
   *
   * Returns the state that the transition is coming *from*.
   *
   * @returns The state declaration object for the Transition's ("from state").
   */
  from() {
    return this.$from().self;
  }

  /**
   * Returns the "to state"
   *
   * Returns the state that the transition is going *to*.
   *
   * @returns The state declaration object for the Transition's target state ("to state").
   */
  to() {
    return this.$to().self;
  }

  /**
   * Gets the Target State
   *
   * A transition's [[TargetState]] encapsulates the [[to]] state, the [[params]], and the [[options]] as a single object.
   *
   * @returns the [[TargetState]] of this Transition
   */
  targetState() {
    return this._targetState;
  }

  /**
   * Determines whether two transitions are equivalent.
   * @deprecated
   */
  is(compare) {
    if (compare instanceof Transition) {
      // TODO: Also compare parameters
      return this.is({ to: compare.$to().name, from: compare.$from().name });
    }

    return !(
      (compare.to && !matchState(this.$to(), compare.to, this)) ||
      (compare.from && !matchState(this.$from(), compare.from, this))
    );
  }

  params(pathname = "to") {
    return Object.freeze(
      this._treeChanges[pathname]
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
    return new ResolveContext(this._treeChanges[pathname]).getTokens();
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
   * @param resolvable a [[ResolvableLiteral]] object (or a [[Resolvable]])
   * @param state the state in the "to path" which should receive the new resolve (otherwise, the root state)
   */
  addResolvable(resolvable, state) {
    if (state === void 0) {
      state = "";
    }
    resolvable = is(Resolvable)(resolvable)
      ? resolvable
      : new Resolvable(resolvable);
    const stateName = typeof state === "string" ? state : state.name;

    const topath = this._treeChanges.to;

    const targetNode = find(topath, (node) => {
      return node.state.name === stateName;
    });

    assert(!!targetNode, `targetNode not found ${stateName}`);
    const resolveContext = new ResolveContext(topath);

    resolveContext.addResolvables(
      [resolvable],
      /** @type {import("../path/path-node.js").PathNode} */ (targetNode).state,
    );
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
   * @returns The previous Transition, or null if this Transition is not the result of a redirection
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
   * @returns The original Transition that started a redirect chain
   */
  originalTransition() {
    const rf = this.redirectedFrom();

    return (rf && rf.originalTransition()) || this;
  }

  /**
   * Get the transition options
   *
   * @returns the options for this Transition.
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
    return map(this._treeChanges.entering, (x) => x.state).map((x) => x.self);
  }

  /**
   * Gets the states being exited.
   *
   * @returns an array of states that will be exited during this transition.
   */
  exiting() {
    return map(this._treeChanges.exiting, (x) => x.state)
      .map((x) => x.self)
      .reverse();
  }

  /**
   * Gets the states being retained.
   *
   * @returns an array of states that are already entered from a previous Transition, that will not be
   *    exited during this Transition
   */
  retained() {
    return map(this._treeChanges.retained, (x) => x.state).map((x) => x.self);
  }

  /**
   * Get the [[ViewConfig]]s associated with this Transition
   *
   * Each state can define one or more views (template/controller), which are encapsulated as `ViewConfig` objects.
   * This method fetches the `ViewConfigs` for a given path in the Transition (e.g., "to" or "entering").
   *
   * @param pathname the name of the path to fetch views for:
   *   (`'to'`, `'from'`, `'entering'`, `'exiting'`, `'retained'`)
   * @param state If provided, only returns the `ViewConfig`s for a single state in the path
   *
   * @returns a list of ViewConfig objects for the given path.
   */
  views(pathname = "entering", state) {
    let path = this._treeChanges[pathname];

    path = !state ? path : path.filter(propEq("state", state));

    return path.map((x) => x.views).reduce(unnestR, []);
  }

  treeChanges(pathname) {
    return pathname ? this._treeChanges[pathname] : this._treeChanges;
  }

  /**
   * Creates a new transition that is a redirection of the current one.
   *
   * This transition can be returned from a [[TransitionService]] hook to
   * redirect a transition to a new state and/or set of parameters.
   *
   * @internal
   *
   * @returns Returns a new [[Transition]] instance.
   */
  redirect(targetState) {
    let redirects = 1,
      trans = this;

    while (!isNullOrUndefined((trans = trans.redirectedFrom()))) {
      if (++redirects > REDIRECT_MAX)
        throw new Error(`Too many consecutive Transition redirects (20+)`);
    }
    const redirectOpts = { redirectedFrom: this, source: "redirect" };

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
    const nodeIsReloading = (reloadState) => (node) => {
      return reloadState && node.state.includes[reloadState.name];
    };

    // Find any "entering" nodes in the redirect path that match the original path and aren't being reloaded
    const matchingEnteringNodes = PathUtils.matching(
      redirectEnteringNodes,
      originalEnteringNodes,
      PathUtils.nonDynamicParams,
    ).filter((x) => !nodeIsReloading(targetState.options().reloadState)(x));

    // Use the existing (possibly pre-resolved) resolvables for the matching entering nodes.
    matchingEnteringNodes.forEach((node, idx) => {
      node.resolvables = originalEnteringNodes[idx].resolvables;
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
      .map(([schema, toVals, fromVals]) =>
        Param.changed(schema, toVals, fromVals),
      )
      .reduce(unnestR, []);
  }

  /**
   * Returns true if the transition is dynamic.
   *
   * A transition is dynamic if no states are entered nor exited, but at least one dynamic parameter has changed.
   *
   * @returns true if the Transition is dynamic
   */
  dynamic() {
    const changes = this._changedParams();

    return !changes
      ? false
      : changes.map((x) => x.dynamic).reduce(anyTrueR, false);
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

    const same = (pathA, pathB) => {
      if (pathA.length !== pathB.length) return false;
      const matching = PathUtils.matching(pathA, pathB);

      return (
        pathA.length ===
        matching.filter(
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
   * @returns {Promise} a promise for a successful transition.
   */
  run() {
    // Gets transition hooks array for the given phase
    const getHooksFor = (phase) => this._hookBuilder.buildHooksForPhase(phase);

    // When the chain is complete, then resolve or reject the deferred
    const transitionSuccess = () => {
      trace.traceSuccess(this.$to(), this);
      this.success = true;
      this._deferred.resolve(this.to());
      const hooks = this._hookBuilder.buildHooksForPhase(
        TransitionHookPhase._SUCCESS,
      );

      hooks.forEach((hook) => {
        hook.invokeHook();
      });
    };

    const transitionError = (reason) => {
      trace.traceError(reason, this);
      this.success = false;
      this._deferred.reject(reason);
      this._error = reason;
      const hooks = getHooksFor(TransitionHookPhase._ERROR);

      hooks.forEach((hook) => hook.invokeHook());
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

      _globals.lastStartedTransitionId = this.$id;
      _globals.transition = this;
      _globals.transitionHistory.enqueue(this);
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
    const state = this.$to();

    if (state.self.abstract) {
      return Rejection.invalid(
        `Cannot transition to abstract state '${state.name}'`,
      );
    }
    const paramDefs = state.parameters();

    const values = this.params();

    const invalidParams = paramDefs.filter(
      (param) => !param.validates(values[param.id]),
    );

    if (invalidParams.length) {
      const invalidValues = invalidParams
        .map((param) => `[${param.id}:${stringify(values[param.id])}]`)
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

    const avoidEmptyHash = (params) =>
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
