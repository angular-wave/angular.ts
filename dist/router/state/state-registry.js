import { _injector, _urlProvider, _routerProvider } from '../../injection-tokens.js';
import { StateMatcher } from './state-matcher.js';
import { StateBuilder } from './state-builder.js';
import { StateQueueManager } from './state-queue-manager.js';
import { annotate } from '../../core/di/di.js';
import { keys, isString } from '../../shared/utils.js';

/**
 * A registry for all of the application's [[StateDeclaration]]s
 *
 * This API is found at `$stateRegistry`.
 *
 */
class StateRegistryProvider {
    constructor(urlService, routerState) {
        this.$get = [
            _injector,
            /**
             * @param {InjectorService} $injector
             * @returns {StateRegistryProvider}
             */
            ($injector) => {
                this._$injector = $injector;
                this._builder._$injector = $injector;
                this._annotateDeferredResolvables($injector.strictDi);
                return this;
            },
        ];
        this._states = {};
        this._urlService = urlService;
        this._$injector = undefined;
        this._listeners = [];
        this._matcher = new StateMatcher(this._states);
        this._builder = new StateBuilder(this._matcher, urlService);
        this._stateQueue = new StateQueueManager(this._urlService, this._states, this._builder, this._listeners);
        this.registerRoot();
        routerState._currentState = this.root();
        routerState._current = routerState._currentState.self;
    }
    /** @internal */
    _annotateDeferredResolvables(strictDi) {
        const states = this.getAll();
        states.forEach((state) => {
            const resolvables = state._state().resolvables || [];
            resolvables.forEach((resolvable) => {
                if (resolvable.deps === "deferred") {
                    resolvable.deps = annotate(resolvable.resolveFn, strictDi);
                }
            });
        });
    }
    /**
     * @private
     */
    registerRoot() {
        const rootStateDef = {
            name: "",
            url: "^",
            params: {
                "#": { value: null, type: "hash", dynamic: true },
            },
            abstract: true,
        };
        this._root = this._stateQueue._register(rootStateDef);
        this._root.navigable = null;
    }
    /**
     * Listen for a State Registry events
     *
     * Adds a callback that is invoked when states are registered or deregistered with the StateRegistry.
     *
     * #### Example:
     * ```js
     * let allStates = registry.get();
     *
     * // Later, invoke deregisterFn() to remove the listener
     * let deregisterFn = registry.onStatesChanged((event, states) => {
     *   switch(event) {
     *     case: 'registered':
     *       states.forEach(state => allStates.push(state));
     *       break;
     *     case: 'deregistered':
     *       states.forEach(state => {
     *         let idx = allStates.indexOf(state);
     *         if (idx !== -1) allStates.splice(idx, 1);
     *       });
     *       break;
     *   }
     * });
     * ```
     *
     * @param {StateRegistryListener} listener a callback function invoked when the registered states changes.
     *        The function receives two parameters, `event` and `state`.
     *        See [[StateRegistryListener]]
     * @return a function that deregisters the listener
     */
    onStatesChanged(listener) {
        this._listeners.push(listener);
        return () => {
            const index = this._listeners.indexOf(listener);
            if (index !== -1) {
                this._listeners.splice(index, 1);
            }
        };
    }
    /**
     * Gets the implicit root state
     *
     * Gets the root of the state tree.
     * The root state is implicitly created by ng-router.
     * Note: this returns the internal [[StateObject]] representation, not a [[StateDeclaration]]
     *
     * @return the root [[StateObject]]
     */
    root() {
        return this._root;
    }
    /**
     * Adds a state to the registry
     *
     * Registers a [[StateDeclaration]] or queues it for registration.
     *
     * Note: a state will be queued if the state's parent isn't yet registered.
     *
     * @param {_StateDeclaration} stateDefinition the definition of the state to register.
     * @returns the internal [[StateObject]] object.
     *          If the state was successfully registered, then the object is fully built (See: [[StateBuilder]]).
     *          If the state was only queued, then the object is not fully built.
     */
    register(stateDefinition) {
        return this._stateQueue._register(stateDefinition);
    }
    /**
     *
     * @param {BuiltStateDeclaration} state
     * @returns {BuiltStateDeclaration[]}
     */
    /** @internal */
    _deregisterTree(state) {
        const allDeclarations = this.getAll();
        const all = [];
        allDeclarations.forEach((declaration) => {
            all.push(declaration._state());
        });
        const children = [];
        const queue = [state];
        for (let i = 0; i < queue.length; i++) {
            const parent = queue[i];
            for (let j = 0; j < all.length; j++) {
                const candidate = all[j];
                if (candidate.parent === parent) {
                    children.push(candidate);
                    queue.push(candidate);
                }
            }
        }
        const deregistered = [state].concat(children).reverse();
        deregistered.forEach((_state) => {
            this._urlService._removeStateRoute(_state);
            // Remove state from registry
            delete this._states[_state.name];
        });
        return deregistered;
    }
    /**
     * Removes a state from the registry
     *
     * This removes a state from the registry.
     * If the state has children, they are are also removed from the registry.
     *
     * @param {StateOrName} stateOrName the state's name or object representation
     * @returns {BuiltStateDeclaration[]} a list of removed states
     */
    deregister(stateOrName) {
        const state = this.get(stateOrName);
        if (!state)
            throw new Error(`Can't deregister state; not found: ${stateOrName}`);
        const deregisteredStates = this._deregisterTree(state._state());
        const deregisteredDeclarations = [];
        deregisteredStates.forEach((stateDeclaration) => {
            deregisteredDeclarations.push(stateDeclaration.self);
        });
        this._listeners.forEach((listener) => {
            listener("deregistered", deregisteredDeclarations);
        });
        return deregisteredStates;
    }
    /**
     * @return {ng.BuiltStateDeclaration[]}
     */
    getAll() {
        const stateNames = keys(this._states);
        const states = [];
        stateNames.forEach((name) => {
            states.push(this._states[name].self);
        });
        return states;
    }
    /**
     *
     * @param {StateOrName} [stateOrName]
     * @param {StateOrName} [base]
     * @returns {StateDeclaration | StateDeclaration[] | null}
     */
    get(stateOrName, base) {
        if (arguments.length === 0) {
            const stateNames = keys(this._states);
            const states = [];
            stateNames.forEach((name) => {
                states.push(this._states[name].self);
            });
            return states;
        }
        const found = this._matcher.find(stateOrName, base);
        return (found && found.self) || null;
    }
}
/* @ignore */ StateRegistryProvider.$inject = [_urlProvider, _routerProvider];
const getLocals = (ctx) => {
    const tokens = ctx.getTokens();
    const locals = {};
    for (let i = 0; i < tokens.length; i++) {
        const key = tokens[i];
        if (isString(key)) {
            locals[key] = ctx.getResolvable(key).data;
        }
    }
    return locals;
};

export { StateRegistryProvider, getLocals };
