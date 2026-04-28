import { _routerProvider, _exceptionHandlerProvider } from '../../injection-tokens.js';
import { isDefined, assign } from '../../shared/utils.js';
import { treeChangesCleanup, registerAddCoreResolvables } from '../hooks/core-resolvables.js';
import { registerIgnoredTransitionHook } from '../hooks/ignored-transition.js';
import { registerInvalidTransitionHook } from '../hooks/invalid-transition.js';
import { registerOnExitHook, registerOnRetainHook, registerOnEnterHook } from '../hooks/on-enter-exit-retain.js';
import { registerRedirectToHook } from '../hooks/redirect-to.js';
import { registerEagerResolvePath, registerLazyResolveState, registerResolveRemaining } from '../hooks/resolve.js';
import { registerActivateViews, registerLoadEnteringViews } from '../hooks/views.js';
import { makeEvent, registerHook } from './hook-registry.js';
import { TransitionEventType } from './transition-event-type.js';
import { TransitionHookPhase, TransitionHook, TransitionHookScope } from './transition-hook.js';
import { Transition } from './transition.js';

const defaultTransOpts = {
    location: true,
    relative: undefined,
    inherit: false,
    notify: true,
    reload: false,
    supercede: true,
    custom: {},
    current: () => null,
    source: "unknown",
};
/**
 * Central registry and factory for transition events, hooks, and transition instances.
 */
class TransitionProvider {
    constructor(routerState, $exceptionHandler) {
        this._transitionCount = 0;
        this._eventTypes = [];
        this._registeredHooks = {};
        this._criteriaPaths = {};
        this._routerState = routerState;
        this._defineCorePaths();
        this._defineCoreEvents();
        this._registerCoreTransitionHooks();
        this._exceptionHandler = $exceptionHandler.handler;
        routerState._successfulTransitions._onEvict(treeChangesCleanup);
    }
    /**
     * Wires runtime services into the transition service and registers the
     * hooks that depend on state/url/view services.
     */
    $get() {
        return this;
    }
    /** @internal */
    _initRuntimeHooks(stateService, urlService, viewService) {
        this._view = viewService;
        registerUpdateUrl(this, stateService, urlService);
        registerRedirectToHook(this, stateService);
        registerActivateViews(this, viewService);
    }
    /**
     * Creates a new transition from the current path to a target state.
     */
    create(fromPath, targetState) {
        return new Transition(fromPath, targetState, this, this._routerState);
    }
    /**
     * Defines the built-in transition lifecycle events and their execution order.
     */
    /** @internal */
    _defineCoreEvents() {
        const TH = TransitionHook;
        const paths = this._criteriaPaths;
        const NORMAL_SORT = false;
        const REVERSE_SORT = true;
        const SYNCHRONOUS = true;
        this._defineEvent("onCreate", TransitionHookPhase._CREATE, 0, paths.to, NORMAL_SORT, TH.LOG_REJECTED_RESULT, TH.THROW_ERROR, SYNCHRONOUS);
        this._defineEvent("onBefore", TransitionHookPhase._BEFORE, 0, paths.to);
        this._defineEvent("onStart", TransitionHookPhase._RUN, 0, paths.to);
        this._defineEvent("onExit", TransitionHookPhase._RUN, 100, paths.exiting, REVERSE_SORT);
        this._defineEvent("onRetain", TransitionHookPhase._RUN, 200, paths.retained);
        this._defineEvent("onEnter", TransitionHookPhase._RUN, 300, paths.entering);
        this._defineEvent("onFinish", TransitionHookPhase._RUN, 400, paths.to);
        this._defineEvent("onSuccess", TransitionHookPhase._SUCCESS, 0, paths.to, NORMAL_SORT, TH.LOG_REJECTED_RESULT, TH.LOG_ERROR, SYNCHRONOUS);
        this._defineEvent("onError", TransitionHookPhase._ERROR, 0, paths.to, NORMAL_SORT, TH.LOG_REJECTED_RESULT, TH.LOG_ERROR, SYNCHRONOUS);
    }
    /** @internal */
    _defineCorePaths() {
        const { _STATE: STATE, _TRANSITION: TRANSITION } = TransitionHookScope;
        this._definePathType("to", TRANSITION);
        this._definePathType("from", TRANSITION);
        this._definePathType("exiting", STATE);
        this._definePathType("retained", STATE);
        this._definePathType("entering", STATE);
    }
    /**
     * Defines one transition event type and exposes its registration helper.
     */
    /** @internal */
    _defineEvent(name, hookPhase, hookOrder, criteriaMatchPath, reverseSort = false, getResultHandler = TransitionHook.HANDLE_RESULT, getErrorHandler = TransitionHook.REJECT_ERROR, synchronous = false) {
        const eventType = new TransitionEventType(name, hookPhase, hookOrder, criteriaMatchPath, reverseSort, getResultHandler, getErrorHandler, synchronous);
        this._eventTypes.push(eventType);
        makeEvent(this, this, eventType);
    }
    /**
     * Returns known transition event types, optionally filtered by phase.
     */
    /** @internal */
    _getEvents(phase) {
        const transitionHookTypes = isDefined(phase)
            ? this._eventTypes.filter((type) => type.hookPhase === phase)
            : this._eventTypes.slice();
        return transitionHookTypes.sort((left, right) => {
            const cmpByPhase = left.hookPhase - right.hookPhase;
            return cmpByPhase === 0 ? left.hookOrder - right.hookOrder : cmpByPhase;
        });
    }
    /**
     * Defines one path selector used by transition hook matching.
     */
    /** @internal */
    _definePathType(name, hookScope) {
        this._criteriaPaths[name] = { name, scope: hookScope };
    }
    /**
     * Returns the configured transition hook path selectors.
     */
    /** @internal */
    _getPathTypes() {
        return this._criteriaPaths;
    }
    /**
     * Returns hooks registered for a specific transition event name.
     */
    getHooks(hookName) {
        return this._registeredHooks[hookName] || [];
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
        const eventType = this._eventTypes.find((type) => type.name === eventName);
        if (!eventType) {
            throw new Error(`Unknown Transition hook event: ${eventName}`);
        }
        return eventType;
    }
    /**
     * Installs the built-in transition hooks that power router behavior.
     */
    /** @internal */
    _registerCoreTransitionHooks() {
        registerAddCoreResolvables(this);
        registerIgnoredTransitionHook(this);
        registerInvalidTransitionHook(this);
        registerOnExitHook(this);
        registerOnRetainHook(this);
        registerOnEnterHook(this);
        registerEagerResolvePath(this);
        registerLazyResolveState(this);
        registerResolveRemaining(this);
        registerLoadEnteringViews(this);
        registerUpdateGlobalState(this);
    }
}
TransitionProvider.$inject = [_routerProvider, _exceptionHandlerProvider];
function registerUpdateUrl(transitionService, stateService, urlService) {
    const updateUrl = (transition) => {
        const options = transition.options();
        const $state = stateService;
        if (options.source !== "url" &&
            options.location &&
            $state.$current?.navigable) {
            const urlOptions = {
                replace: options.location === "replace",
            };
            urlService.push($state.$current.navigable.url, $state._routerState._params, urlOptions);
        }
        urlService.update(true);
    };
    return transitionService.onSuccess({}, updateUrl, { priority: 9999 });
}
function registerUpdateGlobalState(transitionService) {
    return transitionService._onCreate({}, (trans) => {
        const routerState = trans._routerState;
        const transitionSuccessful = () => {
            const current = trans.$to();
            routerState._successfulTransitions._enqueue(trans);
            routerState._currentState = current;
            routerState._current = current?.self;
            const params = routerState._params;
            for (const key in params) {
                delete params[key];
            }
            assign(params, trans.params());
        };
        const clearCurrentTransition = () => {
            if (routerState._transition === trans) {
                routerState._transition = undefined;
            }
        };
        trans.onSuccess({}, transitionSuccessful, { priority: 10000 });
        trans.promise.then(clearCurrentTransition, clearCurrentTransition);
    });
}

export { TransitionProvider, defaultTransOpts };
