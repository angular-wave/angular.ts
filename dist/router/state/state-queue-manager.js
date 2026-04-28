import { isString, hasOwn } from '../../shared/utils.js';
import { StateObject } from './state-object.js';

class StateQueueManager {
    /**
     * @param {ng.UrlService} urlService
     * @param {StateStore} states
     * @param {StateBuilder} builder
     * @param {StateRegistryListener[]} listeners
     */
    constructor(urlService, states, builder, listeners) {
        this._urlService = urlService;
        this._states = states;
        this._builder = builder;
        this._listeners = listeners;
        this._queue = [];
    }
    /**
     * @param {ng.StateDeclaration} stateDecl
     * @returns {StateObject}
     */
    _register(stateDecl) {
        const state = new StateObject(stateDecl);
        const { name } = state;
        if (!isString(name))
            throw new Error("State must have a valid name");
        if (hasOwn(this._states, state.name) ||
            this._queue.map((x) => x.name).includes(state.name))
            throw new Error(`State '${state.name}' is already defined`);
        this._queue.push(state);
        this._flush();
        return state;
    }
    _flush() {
        const { _queue, _states, _builder } = this;
        const registered = []; // states that got registered
        const orphans = []; // states that don't yet have a parent registered
        const previousQueueLength = {}; // keep track of how long the queue when an orphan was first encountered
        const getState = (name) => hasOwn(this._states, name) ? this._states[name] : undefined;
        const notifyListeners = () => {
            if (registered.length) {
                this._listeners.forEach((listener) => listener("registered", registered.map((x) => x.self)));
            }
        };
        while (_queue.length > 0) {
            const state = _queue.shift();
            if (!state)
                continue;
            const { name } = state;
            const result = _builder._build(state);
            const orphanIdx = orphans.indexOf(state);
            if (result) {
                const existingState = getState(name);
                if (existingState && existingState.name === name) {
                    throw new Error(`State '${name}' is already defined`);
                }
                _states[name] = state;
                this._attachRoute(state);
                if (orphanIdx >= 0)
                    orphans.splice(orphanIdx, 1);
                registered.push(state);
                continue;
            }
            const prev = previousQueueLength[name];
            previousQueueLength[name] = _queue.length;
            if (orphanIdx >= 0 && prev === _queue.length) {
                // Wait until two consecutive iterations where no additional states were dequeued successfully.
                // throw new Error(`Cannot register orphaned state '${name}'`);
                _queue.push(state);
                notifyListeners();
                return _states;
            }
            else if (orphanIdx < 0) {
                orphans.push(state);
            }
            _queue.push(state);
        }
        notifyListeners();
        return _states;
    }
    /**
     *
     * @param {StateObject | ng.StateDeclaration} state
     * @returns {void} a function that deregisters the rule
     */
    _attachRoute(state) {
        if (!state.abstract &&
            state.url) {
            this._urlService._registerStateRoute(state);
        }
    }
}

export { StateQueueManager };
