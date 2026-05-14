import { _injector, _routerProvider } from '../../injection-tokens.js';
import { StateMatcher } from './state-matcher.js';
import { StateBuilder } from './state-builder.js';
import { StateObject } from './state-object.js';
import { annotate } from '../../core/di/di.js';
import { isString, hasOwn, deleteProperty, keys } from '../../shared/utils.js';

function stateOrNameToString(stateOrName) {
    return isString(stateOrName) ? stateOrName : stateOrName.name;
}
/**
 * A registry for all of the application's [[StateDeclaration]]s
 *
 * This API is found at `$stateRegistry`.
 *
 */
class StateRegistryProvider {
    constructor(routerState) {
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
        this._routerState = routerState;
        this._$injector = undefined;
        this._listeners = [];
        this._matcher = new StateMatcher(this._states);
        this._builder = new StateBuilder(this._matcher, routerState);
        this._queue = [];
        this.registerRoot();
        routerState._currentState = this.root();
        routerState._current = routerState._currentState.self;
    }
    /** @internal */
    _annotateDeferredResolvables(strictDi) {
        const states = this.getAll();
        states.forEach((state) => {
            const { resolvables } = state._state();
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
        this._root = this._register(rootStateDef);
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
     * @param {StateDeclarationInput} stateDefinition the definition of the state to register.
     * @returns the internal [[StateObject]] object.
     *          If the state was successfully registered, then the object is fully built (See: [[StateBuilder]]).
     *          If the state was only queued, then the object is not fully built.
     */
    register(stateDefinition) {
        return this._register(stateDefinition);
    }
    /** @internal */
    _register(stateDeclaration) {
        const state = new StateObject(stateDeclaration);
        const { name } = state;
        if (!isString(name))
            throw new Error("State must have a valid name");
        if (hasOwn(this._states, name) || this._isQueued(name)) {
            throw new Error(`State '${name}' is already defined`);
        }
        this._queue.push(state);
        this._flush();
        return state;
    }
    /** @internal */
    _isQueued(name) {
        const { _queue } = this;
        for (let i = 0; i < _queue.length; i++) {
            if (_queue[i].name === name)
                return true;
        }
        return false;
    }
    /** @internal */
    _flush() {
        const { _queue, _states, _builder } = this;
        const registered = [];
        const orphans = [];
        const previousQueueLength = {};
        while (_queue.length) {
            const state = _queue.shift();
            if (!state)
                continue;
            const { name } = state;
            const result = _builder._build(state);
            const orphanIndex = orphans.indexOf(state);
            if (result) {
                const existingState = hasOwn(_states, name) ? _states[name] : undefined;
                if (existingState?.name === name) {
                    throw new Error(`State '${name}' is already defined`);
                }
                _states[name] = state;
                this._attachRoute(state);
                if (orphanIndex >= 0)
                    orphans.splice(orphanIndex, 1);
                registered.push(state);
                continue;
            }
            const previousLength = previousQueueLength[name];
            previousQueueLength[name] = _queue.length;
            if (orphanIndex >= 0 && previousLength === _queue.length) {
                _queue.push(state);
                this._notifyRegistered(registered);
                return _states;
            }
            if (orphanIndex < 0) {
                orphans.push(state);
            }
            _queue.push(state);
        }
        this._notifyRegistered(registered);
        return _states;
    }
    /** @internal */
    _notifyRegistered(registered) {
        if (!registered.length)
            return;
        const declarations = [];
        registered.forEach((state) => declarations.push(state.self));
        this._notifyListeners("registered", declarations);
    }
    /** @internal */
    _notifyListeners(event, states) {
        this._listeners.forEach((listener) => {
            listener(event, states);
        });
    }
    /** @internal */
    _attachRoute(state) {
        if (!state.self.abstract && state._url) {
            this._routerState._routeTable._add(state);
        }
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
        const deregistered = children.slice().reverse();
        deregistered.push(state);
        deregistered.forEach((_state) => {
            this._routerState._routeTable._remove(_state);
            // Remove state from registry
            deleteProperty(this._states, _state.name);
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
        if (!state) {
            throw new Error(`Can't deregister state; not found: ${stateOrNameToString(stateOrName)}`);
        }
        const deregisteredStates = this._deregisterTree(state._state());
        const deregisteredDeclarations = [];
        deregisteredStates.forEach((stateDeclaration) => {
            deregisteredDeclarations.push(stateDeclaration.self);
        });
        this._notifyListeners("deregistered", deregisteredDeclarations);
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
        const found = stateOrName === undefined
            ? undefined
            : this._matcher.find(stateOrName, base);
        return found?.self ?? null;
    }
}
/* @ignore */ StateRegistryProvider.$inject = [_routerProvider];
function getLocals(ctx) {
    const tokens = ctx.getTokens();
    const locals = {};
    tokens.forEach((key) => {
        if (isString(key)) {
            locals[key] = ctx.getResolvable(key).data;
        }
    });
    return locals;
}

export { StateRegistryProvider, getLocals };
