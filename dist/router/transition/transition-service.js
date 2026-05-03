import { _routerProvider, _exceptionHandlerProvider } from '../../injection-tokens.js';
import { isFunction, keys, assign, isInstanceOf, isString, isObject } from '../../shared/utils.js';
import { Resolvable } from '../resolve/resolvable.js';
import { ResolveContext } from '../resolve/resolve-context.js';
import { TargetState } from '../state/target-state.js';
import { Rejection } from './reject-factory.js';
import { Transition } from './transition.js';
import { makeEvent, registerHook } from './hook-registry.js';
import { TransitionEventType } from './transition-event-type.js';
import { TransitionHookPhase, TransitionHook } from './transition-hook.js';
import { loadViewConfig } from '../view/view.js';
import { PATH_TYPES } from './path-types.js';

const defaultTransOpts = {
    location: true,
    relative: undefined,
    inherit: false,
    reload: false,
    current: () => null,
    source: "unknown",
};
function noop() {
    /* empty */
}
function afterViewCommitTask() {
    return new Promise((resolve) => {
        setTimeout(resolve, 0);
    });
}
let viewTransitionActive = false;
function runWithViewTransition(updateCallback) {
    if (viewTransitionActive) {
        updateCallback();
        return Promise.resolve();
    }
    let hasCallbackError = false;
    let callbackError;
    viewTransitionActive = true;
    const viewTransition = document.startViewTransition(() => {
        try {
            updateCallback();
        }
        catch (error) {
            hasCallbackError = true;
            callbackError = error;
            throw error;
        }
    });
    viewTransition.finished.then(() => {
        viewTransitionActive = false;
    }, () => {
        viewTransitionActive = false;
    });
    if (hasCallbackError) {
        throw callbackError;
    }
    return viewTransition.updateCallbackDone.then(afterViewCommitTask);
}
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
        this._defineCoreEvents();
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
        registerUpdateUrl(this);
        registerRedirectToHook(this);
        registerActivateViews(this);
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
        const paths = PATH_TYPES;
        const NORMAL_SORT = false;
        const REVERSE_SORT = true;
        const SYNCHRONOUS = true;
        this._defineEvent("onCreate", TransitionHookPhase._CREATE, 0, paths.to, NORMAL_SORT, TH._logRejectedResult, TH._throwError, SYNCHRONOUS);
        this._defineEvent("onBefore", TransitionHookPhase._BEFORE, 0, paths.to);
        this._defineEvent("onStart", TransitionHookPhase._RUN, 0, paths.to);
        this._defineEvent("onExit", TransitionHookPhase._RUN, 100, paths.exiting, REVERSE_SORT);
        this._defineEvent("onRetain", TransitionHookPhase._RUN, 200, paths.retained);
        this._defineEvent("onEnter", TransitionHookPhase._RUN, 300, paths.entering);
        this._defineEvent("onFinish", TransitionHookPhase._RUN, 400, paths.to);
        this._defineEvent("onSuccess", TransitionHookPhase._SUCCESS, 0, paths.to, NORMAL_SORT, TH._logRejectedResult, TH._logError, SYNCHRONOUS);
        this._defineEvent("onError", TransitionHookPhase._ERROR, 0, paths.to, NORMAL_SORT, TH._logRejectedResult, TH._logError, SYNCHRONOUS);
    }
    /**
     * Defines one transition event type and exposes its registration helper.
     */
    /** @internal */
    _defineEvent(name, hookPhase, hookOrder, criteriaMatchPath, reverseSort = false, resultHandler = TransitionHook._handleResult, errorHandler = TransitionHook._rejectError, synchronous = false) {
        const eventType = new TransitionEventType(name, hookPhase, hookOrder, criteriaMatchPath, reverseSort, resultHandler, errorHandler, synchronous);
        this._eventTypes.push(eventType);
        makeEvent(this, this, eventType);
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
function registerAddCoreResolvables(transitionService) {
    return transitionService._onCreate({}, function addCoreResolvables(trans) {
        addTransitionResolvable(trans, Resolvable.fromData(Transition, trans), "");
        addTransitionResolvable(trans, Resolvable.fromData("$transition$", trans), "");
        addTransitionResolvable(trans, Resolvable.fromData("$stateParams", trans.params()), "");
        const entering = trans.entering();
        entering.forEach((state) => {
            addTransitionResolvable(trans, Resolvable.fromData("$state$", state), state.name);
        });
    });
}
function addTransitionResolvable(trans, resolvable, stateName) {
    const toPath = trans._treeChanges.to || [];
    let targetNode;
    for (let i = 0; i < toPath.length; i++) {
        const node = toPath[i];
        if (node.state.name === stateName) {
            targetNode = node;
            break;
        }
    }
    if (!targetNode) {
        throw new Error(`targetNode not found ${stateName}`);
    }
    new ResolveContext(toPath, trans._routerState._injector).addResolvables([resolvable], targetNode.state);
}
function transitionViews(trans, pathname) {
    const path = (trans._treeChanges[pathname] || []);
    const viewConfigs = [];
    for (let i = 0; i < path.length; i++) {
        const node = path[i];
        const views = node._views || [];
        for (let j = 0; j < views.length; j++) {
            const view = views[j];
            viewConfigs.push(view);
        }
    }
    return viewConfigs;
}
function treeChangesCleanup(trans) {
    const treeChanges = trans._treeChanges;
    const nodes = new Set();
    collectPathNodes(nodes, treeChanges.from);
    collectPathNodes(nodes, treeChanges.to);
    collectPathNodes(nodes, treeChanges.retained);
    collectPathNodes(nodes, treeChanges.retainedWithToParams);
    collectPathNodes(nodes, treeChanges.exiting);
    collectPathNodes(nodes, treeChanges.entering);
    nodes.forEach((node) => {
        const { resolvables } = node;
        resolvables.forEach((resolve, i) => {
            if (isTransitionToken(resolve.token)) {
                resolvables[i] = Resolvable.fromData(resolve.token, null);
            }
        });
    });
}
function collectPathNodes(nodes, path) {
    for (let i = 0; i < path.length; i++) {
        nodes.add(path[i]);
    }
}
function isTransitionToken(token) {
    return token === "$transition$" || token === Transition;
}
function ignoredHook(trans) {
    const ignoredReason = trans._ignoredReason();
    if (!ignoredReason)
        return undefined;
    const pending = trans._routerState._transition;
    if (ignoredReason === "SameAsCurrent" && pending) {
        pending.abort();
    }
    return Rejection.ignored()._toPromise();
}
function registerIgnoredTransitionHook(transitionService) {
    return transitionService.onBefore({}, ignoredHook, { priority: -9999 });
}
function invalidTransitionHook(trans) {
    if (!trans.valid()) {
        throw new Error(trans.error()?.toString());
    }
}
function registerInvalidTransitionHook(transitionService) {
    return transitionService.onBefore({}, invalidTransitionHook, {
        priority: -1e4,
    });
}
function onExitHook(transition, state) {
    return state._state?.().onExit?.(transition, state);
}
function onRetainHook(transition, state) {
    return state._state?.().onRetain?.(transition, state);
}
function onEnterHook(transition, state) {
    return state._state?.().onEnter?.(transition, state);
}
function registerOnExitHook(transitionService) {
    return transitionService.onExit({
        exiting: (state) => !!state?.onExit,
    }, onExitHook);
}
function registerOnRetainHook(transitionService) {
    return transitionService.onRetain({
        retained: (state) => !!state?.onRetain,
    }, onRetainHook);
}
function registerOnEnterHook(transitionService) {
    return transitionService.onEnter({
        entering: (state) => !!state?.onEnter,
    }, onEnterHook);
}
function hasRedirectTo(state) {
    return !!state.redirectTo;
}
function handleRedirectToResult(stateService, trans, result) {
    if (!result)
        return undefined;
    if (isInstanceOf(result, TargetState)) {
        return result;
    }
    if (isString(result)) {
        return stateService.target(result, trans.params(), trans._options);
    }
    if (isObject(result) && ("state" in result || "params" in result)) {
        return stateService.target(result.state || trans.to(), result.params || trans.params(), trans._options);
    }
    return undefined;
}
async function redirectToHook(trans) {
    const redirect = trans.to().redirectTo;
    if (!redirect)
        return undefined;
    const stateService = this._stateService;
    if (isFunction(redirect)) {
        const result = await Promise.resolve(redirect(trans));
        return handleRedirectToResult(stateService, trans, result);
    }
    return handleRedirectToResult(stateService, trans, redirect);
}
function registerRedirectToHook(transitionService) {
    return transitionService.onStart({
        to: hasRedirectTo,
    }, redirectToHook, { bind: transitionService });
}
const RESOLVE_HOOK_PRIORITY = 1000;
function eagerResolvePath(trans) {
    return new ResolveContext(trans._treeChanges.to, trans._routerState._injector)
        .resolvePath(true, trans)
        .then(noop);
}
function registerEagerResolvePath(transitionService) {
    return transitionService.onStart({}, eagerResolvePath, {
        priority: RESOLVE_HOOK_PRIORITY,
    });
}
function lazyResolveState(trans, state) {
    return new ResolveContext(trans._treeChanges.to, trans._routerState._injector)
        .subContext(state._state())
        .resolvePath(false, trans)
        .then(noop);
}
function matchEnteringState() {
    return true;
}
function registerLazyResolveState(transitionService) {
    return transitionService.onEnter({ entering: matchEnteringState }, lazyResolveState, {
        priority: RESOLVE_HOOK_PRIORITY,
    });
}
function resolveRemaining(trans) {
    return new ResolveContext(trans._treeChanges.to, trans._routerState._injector)
        .resolvePath(false, trans)
        .then(noop);
}
function registerResolveRemaining(transitionService) {
    return transitionService.onFinish({}, resolveRemaining, {
        priority: RESOLVE_HOOK_PRIORITY,
    });
}
function loadEnteringViews(transition) {
    const enteringViews = transitionViews(transition, "entering");
    if (!enteringViews.length)
        return undefined;
    const promises = new Array(enteringViews.length);
    enteringViews.forEach((view, i) => {
        promises[i] = loadViewConfig(view);
    });
    return Promise.all(promises).then(noop);
}
function registerLoadEnteringViews(transitionService) {
    return transitionService.onFinish({}, loadEnteringViews);
}
function updateViewConfigs(viewService, enteringViews, exitingViews) {
    exitingViews.forEach((view) => {
        viewService._deactivateViewConfig(view);
    });
    enteringViews.forEach((view) => {
        viewService._activateViewConfig(view);
    });
    viewService._sync();
}
function activateViewsHook(transition) {
    const viewService = this._view;
    const enteringViews = transitionViews(transition, "entering");
    const exitingViews = transitionViews(transition, "exiting");
    if (!enteringViews.length && !exitingViews.length) {
        return Promise.resolve();
    }
    const updateViews = () => {
        updateViewConfigs(viewService, enteringViews, exitingViews);
    };
    if (!hasConnectedNgView(viewService)) {
        updateViews();
        return Promise.resolve();
    }
    return runWithViewTransition(updateViews);
}
function registerActivateViews(transitionService) {
    return transitionService.onSuccess({}, activateViewsHook, {
        bind: transitionService,
    });
}
function hasConnectedNgView(viewService) {
    const ngViews = viewService._ngViews;
    for (let i = 0; i < ngViews.length; i++) {
        if (ngViews[i]._element.isConnected) {
            return true;
        }
    }
    return false;
}
function updateUrlHook(transition) {
    const options = transition._options;
    const stateService = this._stateService;
    const routerState = this._routerState;
    const navigable = stateService.$current?.navigable;
    if (options.source !== "url" && options.location && navigable?._url) {
        const urlOptions = {
            replace: options.location === "replace",
        };
        routerState._push(navigable._url, stateService._routerState._params, urlOptions);
    }
    routerState._update(true);
}
function registerUpdateUrl(transitionService) {
    return transitionService.onSuccess({}, updateUrlHook, {
        bind: transitionService,
        priority: 9999,
    });
}
function registerUpdateGlobalState(transitionService) {
    const updateGlobalState = (trans) => {
        const routerState = trans._routerState;
        const current = trans.$to();
        routerState._setSuccessfulTransition(trans);
        routerState._currentState = current;
        routerState._current = current?.self;
        const params = routerState._params;
        keys(params).forEach((key) => {
            delete params[key];
        });
        assign(params, trans.params());
    };
    transitionService._onCreate({}, (trans) => {
        const routerState = trans._routerState;
        const clearCurrentTransition = () => {
            if (routerState._transition === trans) {
                routerState._transition = undefined;
            }
        };
        trans.promise.then(clearCurrentTransition, clearCurrentTransition);
    });
    return transitionService.onSuccess({}, updateGlobalState, {
        priority: 10000,
    });
}

export { TransitionProvider, defaultTransOpts };
