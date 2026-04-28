import { stringify } from '../../shared/strings.js';
import { assign, isInstanceOf, isString, assert, isUndefined, isObject } from '../../shared/utils.js';
import { TransitionHookPhase, TransitionHook } from './transition-hook.js';
import { registerHook } from './hook-registry.js';
import { HookBuilder } from './hook-builder.js';
import { buildToPath, treeChanges, applyViewConfigs, matching, nonDynamicParams } from '../path/path-utils.js';
import { Param } from '../params/param.js';
import { Resolvable } from '../resolve/resolvable.js';
import { ResolveContext } from '../resolve/resolve-context.js';
import { Rejection } from './reject-factory.js';

const REDIRECT_MAX = 20;
function createDeferredPromise() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
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
class Transition {
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
    constructor(fromPath, targetState, transitionService, routerState) {
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
        this._hookBuilder = new HookBuilder(this);
        /** Checks if this transition is currently active/running. */
        this.isActive = () => this._routerState._transition === this;
        this._targetState = targetState;
        if (!targetState.valid()) {
            throw new Error(targetState.error());
        }
        // current() is assumed to come from targetState.options, but provide a naive implementation otherwise.
        this._options = assign({ current: () => this }, targetState.options());
        this.$id = transitionService._transitionCount++;
        const toPath = buildToPath(fromPath, targetState);
        this._treeChanges = treeChanges(fromPath, toPath, this._options.reloadState);
        const onCreateHooks = this._hookBuilder.buildHooksForPhase(TransitionHookPhase._CREATE);
        TransitionHook.invokeHooks(onCreateHooks, () => Promise.resolve());
        this.applyViewConfigs();
    }
    /**
     * @param {string} hookName
     * @returns {RegisteredHook[]}
     */
    getHooks(hookName) {
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
    on(eventName, matchCriteria, callback, options) {
        const eventType = this._getEventType(eventName);
        if (eventType.hookPhase === TransitionHookPhase._CREATE) {
            throw new Error("onCreate hooks can only be registered on the service");
        }
        return registerHook(this, this._transitionService, eventType, matchCriteria, callback, options);
    }
    /**
     * @param {HookMatchCriteria} matchCriteria
     * @param {HookFn} callback
     * @param {HookRegOptions} [options]
     * @returns {DeregisterFn}
     */
    onBefore(matchCriteria, callback, options) {
        return this.on("onBefore", matchCriteria, callback, options);
    }
    /**
     * @param {HookMatchCriteria} matchCriteria
     * @param {HookFn} callback
     * @param {HookRegOptions} [options]
     * @returns {DeregisterFn}
     */
    onStart(matchCriteria, callback, options) {
        return this.on("onStart", matchCriteria, callback, options);
    }
    /**
     * @param {HookMatchCriteria} matchCriteria
     * @param {HookFn} callback
     * @param {HookRegOptions} [options]
     * @returns {DeregisterFn}
     */
    onEnter(matchCriteria, callback, options) {
        return this.on("onEnter", matchCriteria, callback, options);
    }
    /**
     * @param {HookMatchCriteria} matchCriteria
     * @param {HookFn} callback
     * @param {HookRegOptions} [options]
     * @returns {DeregisterFn}
     */
    onRetain(matchCriteria, callback, options) {
        return this.on("onRetain", matchCriteria, callback, options);
    }
    /**
     * @param {HookMatchCriteria} matchCriteria
     * @param {HookFn} callback
     * @param {HookRegOptions} [options]
     * @returns {DeregisterFn}
     */
    onExit(matchCriteria, callback, options) {
        return this.on("onExit", matchCriteria, callback, options);
    }
    /**
     * @param {HookMatchCriteria} matchCriteria
     * @param {HookFn} callback
     * @param {HookRegOptions} [options]
     * @returns {DeregisterFn}
     */
    onFinish(matchCriteria, callback, options) {
        return this.on("onFinish", matchCriteria, callback, options);
    }
    /**
     * @param {HookMatchCriteria} matchCriteria
     * @param {HookFn} callback
     * @param {HookRegOptions} [options]
     * @returns {DeregisterFn}
     */
    onSuccess(matchCriteria, callback, options) {
        return this.on("onSuccess", matchCriteria, callback, options);
    }
    /**
     * @param {HookMatchCriteria} matchCriteria
     * @param {HookFn} callback
     * @param {HookRegOptions} [options]
     * @returns {DeregisterFn}
     */
    onError(matchCriteria, callback, options) {
        return this.on("onError", matchCriteria, callback, options);
    }
    /**
     * @param {string} eventName
     * @returns {TransitionEventType}
     */
    /** @internal */
    _getEventType(eventName) {
        const eventType = this._transitionService
            ._getEvents()
            .find((type) => type.name === eventName);
        if (!eventType) {
            throw new Error(`Unknown Transition hook event: ${eventName}`);
        }
        return eventType;
    }
    applyViewConfigs() {
        const enteringStates = [];
        const { entering } = this._treeChanges;
        for (let i = 0; i < entering.length; i++) {
            enteringStates.push(entering[i].state);
        }
        applyViewConfigs(this._transitionService._view, this._treeChanges.to, enteringStates);
    }
    /**
     * @returns {StateObject} the internal from [State] object
     */
    $from() {
        const fromPath = this._treeChanges.from;
        const fromNode = fromPath.length
            ? fromPath[fromPath.length - 1]
            : undefined;
        return fromNode?.state;
    }
    /**
     * @returns {StateObject} the internal to [State] object
     */
    $to() {
        const toPath = this._treeChanges.to;
        const toNode = toPath.length
            ? toPath[toPath.length - 1]
            : undefined;
        return toNode?.state;
    }
    /**
     * Returns the "from state"
     *
     * Returns the state that the transition is coming *from*.
     *
     * @returns {StateDeclaration} The state declaration object for the Transition's ("from state").
     */
    from() {
        return this.$from().self;
    }
    /**
     * Returns the "to state"
     *
     * Returns the state that the transition is going *to*.
     *
     * @returns {StateDeclaration} The state declaration object for the Transition's target state ("to state").
     */
    to() {
        return this.$to().self;
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
        const path = (this._treeChanges[pathname] || []);
        const params = {};
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
        return new ResolveContext((this._treeChanges[pathname] || []), this._routerState._injector).getTokens();
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
    addResolvable(resolvable, state) {
        if (state === void 0) {
            state = "";
        }
        resolvable = isInstanceOf(resolvable, Resolvable)
            ? resolvable
            : new Resolvable(resolvable);
        const stateName = isString(state) ? state : state.name;
        const topath = this._treeChanges.to || [];
        let targetNode;
        for (let i = 0; i < topath.length; i++) {
            const node = topath[i];
            if (node.state.name === stateName) {
                targetNode = node;
                break;
            }
        }
        assert(!!targetNode, `targetNode not found ${stateName}`);
        const resolveContext = new ResolveContext(topath, this._routerState._injector);
        resolveContext.addResolvables([resolvable], targetNode.state);
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
    originalTransition() {
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
    exiting() {
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
    retained() {
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
    views(pathname = "entering", state) {
        const path = (this._treeChanges[pathname] || []);
        const viewConfigs = [];
        for (let i = 0; i < path.length; i++) {
            const node = path[i];
            if (state && node.state !== state)
                continue;
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
    treeChanges(pathname) {
        return pathname
            ? (this._treeChanges[pathname] || [])
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
    redirect(targetState) {
        let redirects = 1;
        let trans = this;
        while ((trans = trans.redirectedFrom())) {
            if (++redirects > REDIRECT_MAX) {
                throw new Error(`Too many consecutive Transition redirects (20+)`);
            }
        }
        const redirectOpts = {
            redirectedFrom: this,
            source: "redirect",
        };
        // If the original transition was caused by URL sync, then use { location: 'replace' }
        // on the new transition (unless the target state explicitly specifies location: false).
        // This causes the original url to be replaced with the url for the redirect target
        // so the original url disappears from the browser history.
        if (this.options().source === "url" &&
            targetState.options().location !== false) {
            redirectOpts.location = "replace";
        }
        const newOptions = assign({}, this.options(), targetState.options(), redirectOpts);
        targetState = targetState.withOptions(newOptions, true);
        const newTransition = this._transitionService.create(this._treeChanges.from, targetState);
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
        const params = matching(redirectEnteringNodes, originalEnteringNodes, nonDynamicParams);
        // Find any "entering" nodes in the redirect path that match the original path and aren't being reloaded
        const matchingEnteringNodes = [];
        const isReloading = nodeIsReloading(targetState.options().reloadState);
        for (let i = 0; i < params.length; i++) {
            if (!isReloading(params[i])) {
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
        if (this._options.reload)
            return undefined;
        // If any states are exiting or entering
        if (tc.exiting.length || tc.entering.length)
            return undefined;
        // If to/from path lengths differ
        if (tc.to.length !== tc.from.length)
            return undefined;
        // If the to/from paths are different
        let pathsDiffer = false;
        for (let i = 0; i < tc.to.length; i++) {
            if (tc.to[i].state !== tc.from[i].state) {
                pathsDiffer = true;
                break;
            }
        }
        if (pathsDiffer)
            return undefined;
        const changes = [];
        for (let i = 0; i < tc.to.length; i++) {
            const nodeChanges = Param.changed(tc.to[i].paramSchema, tc.to[i].paramValues, tc.from[i].paramValues);
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
        if (!changes)
            return false;
        for (let i = 0; i < changes.length; i++) {
            if (changes[i].dynamic)
                return true;
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
        const same = (pathA, pathB) => {
            if (pathA.length !== pathB.length)
                return false;
            const pathPrefix = matching(pathA, pathB);
            let retainedCount = 0;
            for (let i = 0; i < pathPrefix.length; i++) {
                const node = pathPrefix[i];
                if (!reloadState || !node.state.includes[reloadState.name]) {
                    retainedCount++;
                }
            }
            return pathA.length === retainedCount;
        };
        const newTC = this._treeChanges;
        const pendTC = pending && pending._treeChanges;
        if (pendTC &&
            same(pendTC.to, newTC.to) &&
            same(pendTC.exiting, newTC.exiting))
            return "SameAsPending";
        if (newTC.exiting.length === 0 &&
            newTC.entering.length === 0 &&
            same(newTC.from, newTC.to))
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
        const getHooksFor = (phase) => this._hookBuilder.buildHooksForPhase(phase);
        // When the chain is complete, then resolve or reject the deferred
        const transitionSuccess = () => {
            this.success = true;
            this._deferred.resolve(this.to());
            const hooks = this._hookBuilder.buildHooksForPhase(TransitionHookPhase._SUCCESS);
            for (let i = 0; i < hooks.length; i++) {
                hooks[i].invokeHook();
            }
        };
        const transitionError = (reason) => {
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
            return Rejection.invalid(`Cannot transition to abstract state '${state.name}'`);
        }
        const paramDefs = state.parameters();
        const values = this.params();
        const invalidParams = [];
        for (let i = 0; i < paramDefs.length; i++) {
            const param = paramDefs[i];
            if (!param.validates(values[param.id])) {
                invalidParams.push(param);
            }
        }
        if (invalidParams.length) {
            const invalidValueParts = [];
            for (let i = 0; i < invalidParams.length; i++) {
                const param = invalidParams[i];
                invalidValueParts.push(`[${param.id}:${stringify(values[param.id])}]`);
            }
            const invalidValues = invalidValueParts.join(", ");
            const detail = `The following parameter values are not valid for state '${state.name}': ${invalidValues}`;
            return Rejection.invalid(detail);
        }
        if (this.success === false)
            return this._error;
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
        const avoidEmptyHash = (params) => {
            if (params["#"] !== null && params["#"] !== undefined) {
                return params;
            }
            const cleanParams = {};
            for (const key in params) {
                if (key !== "#") {
                    cleanParams[key] = params[key];
                }
            }
            return cleanParams;
        };
        // (X) means the to state is invalid.
        const id = this.$id, from = isObject(fromStateOrName) ? fromStateOrName.name : fromStateOrName, fromParams = stringify(avoidEmptyHash(pathParams(this._treeChanges.from))), toValid = this.valid() ? "" : "(X) ", to = isObject(toStateOrName) ? toStateOrName.name : toStateOrName, toParams = stringify(avoidEmptyHash(this.params()));
        return `Transition#${id}( '${from}'${fromParams} -> ${toValid}'${to}'${toParams} )`;
    }
}
function pathStates(path) {
    const states = [];
    for (let i = 0; i < path.length; i++) {
        states.push(path[i].state.self);
    }
    return states;
}
function pathParams(path) {
    const params = {};
    for (let i = 0; i < path.length; i++) {
        assign(params, path[i].paramValues);
    }
    return params;
}
Transition.diToken = Transition;

export { Transition };
