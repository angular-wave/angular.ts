import { _routerProvider, _exceptionHandlerProvider } from '../../injection-tokens.js';
import { Transition } from './transition.js';
import { registerHook } from './hook-registry.js';
import { defineCoreTransitionEvents } from './transition-events.js';
import { treeChangesCleanup, registerRuntimeTransitionHooks, registerCoreTransitionHooks } from './transition-hooks.js';

const defaultTransOpts = {
    location: true,
    relative: undefined,
    inherit: false,
    reload: false,
    current: () => null,
    source: "unknown",
};
/**
 * Central registry and factory for transition events, hooks, and transition instances.
 *
 * @internal
 */
class TransitionProvider {
    constructor(routerState, $exceptionHandler) {
        this._transitionCount = 0;
        this._eventTypes = [];
        this._registeredHooks = {};
        this._routerState = routerState;
        defineCoreTransitionEvents(this);
        this._registerCoreTransitionHooks();
        this._exceptionHandler = $exceptionHandler.handler;
        routerState._successfulTransitionCleanup = treeChangesCleanup;
    }
    /**
     * Wires runtime services into the transition service and registers the
     * hooks that depend on state/url/view services.
     */
    $get() {
        return this;
    }
    /** @internal */
    _initRuntimeHooks(stateService, viewService) {
        this._view = viewService;
        this._stateService = stateService;
        registerRuntimeTransitionHooks(this);
    }
    /**
     * Creates a new transition from the current path to a target state.
     */
    create(fromPath, targetState) {
        return new Transition(fromPath, targetState, this, this._routerState);
    }
    /**
     * Returns known transition event types, optionally filtered by phase.
     */
    /** @internal */
    _getEvents(phase) {
        const transitionHookTypes = [];
        this._eventTypes.forEach((eventType) => {
            if (phase === undefined || eventType._hookPhase === phase) {
                transitionHookTypes.push(eventType);
            }
        });
        return transitionHookTypes;
    }
    /**
     * Returns hooks registered for a specific transition event name.
     */
    /** @internal */
    _getHooks(hookName) {
        return this._registeredHooks[hookName] ?? [];
    }
    /**
     * Registers a transition hook by event name.
     */
    on(eventName, matchCriteria, callback, options) {
        const eventType = this._getEventType(eventName);
        return registerHook(this, this, eventType, matchCriteria, callback, options);
    }
    /**
     * Registers an internal hook that runs while a transition is being constructed.
     */
    /** @internal */
    _onCreate(matchCriteria, callback, options) {
        return this.on("onCreate", matchCriteria, callback, options);
    }
    /**
     * Registers an `onBefore` transition hook.
     */
    onBefore(matchCriteria, callback, options) {
        return this.on("onBefore", matchCriteria, callback, options);
    }
    /**
     * Registers an `onStart` transition hook.
     */
    onStart(matchCriteria, callback, options) {
        return this.on("onStart", matchCriteria, callback, options);
    }
    /**
     * Registers an `onEnter` transition hook.
     */
    onEnter(matchCriteria, callback, options) {
        return this.on("onEnter", matchCriteria, callback, options);
    }
    /**
     * Registers an `onRetain` transition hook.
     */
    onRetain(matchCriteria, callback, options) {
        return this.on("onRetain", matchCriteria, callback, options);
    }
    /**
     * Registers an `onExit` transition hook.
     */
    onExit(matchCriteria, callback, options) {
        return this.on("onExit", matchCriteria, callback, options);
    }
    /**
     * Registers an `onFinish` transition hook.
     */
    onFinish(matchCriteria, callback, options) {
        return this.on("onFinish", matchCriteria, callback, options);
    }
    /**
     * Registers an `onSuccess` transition hook.
     */
    onSuccess(matchCriteria, callback, options) {
        return this.on("onSuccess", matchCriteria, callback, options);
    }
    /**
     * Registers an `onError` transition hook.
     */
    onError(matchCriteria, callback, options) {
        return this.on("onError", matchCriteria, callback, options);
    }
    /**
     * Looks up one known transition event type by name.
     */
    /** @internal */
    _getEventType(eventName) {
        for (let i = 0; i < this._eventTypes.length; i++) {
            const eventType = this._eventTypes[i];
            if (eventType._name === eventName)
                return eventType;
        }
        throw new Error(`Unknown Transition hook event: ${eventName}`);
    }
    /**
     * Installs the built-in transition hooks that power router behavior.
     */
    /** @internal */
    _registerCoreTransitionHooks() {
        registerCoreTransitionHooks(this);
    }
}
TransitionProvider.$inject = [_routerProvider, _exceptionHandlerProvider];

export { TransitionProvider, defaultTransOpts };
