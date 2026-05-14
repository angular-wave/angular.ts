import { keys, deleteProperty, assign, isFunction, isInstanceOf, isString, isObject } from '../../shared/utils.js';
import { Resolvable } from '../resolve/resolvable.js';
import { ResolveContext } from '../resolve/resolve-context.js';
import { TargetState } from '../state/target-state.js';
import { loadViewConfig } from '../view/view.js';
import { Rejection } from './reject-factory.js';
import { Transition } from './transition.js';

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
    const callbackState = {
        hasError: false,
    };
    viewTransitionActive = true;
    const viewTransition = document.startViewTransition(() => {
        try {
            updateCallback();
        }
        catch (error) {
            callbackState.hasError = true;
            callbackState.error = error;
            throw error;
        }
    });
    viewTransition.finished.then(() => {
        viewTransitionActive = false;
    }, () => {
        viewTransitionActive = false;
    });
    if (callbackState.hasError) {
        throw callbackState.error;
    }
    return viewTransition.updateCallbackDone.then(afterViewCommitTask);
}
/** @internal */
function registerCoreTransitionHooks(transitionService) {
    registerAddCoreResolvables(transitionService);
    registerIgnoredTransitionHook(transitionService);
    registerInvalidTransitionHook(transitionService);
    registerOnExitHook(transitionService);
    registerOnRetainHook(transitionService);
    registerOnEnterHook(transitionService);
    registerEagerResolvePath(transitionService);
    registerLazyResolveState(transitionService);
    registerResolveRemaining(transitionService);
    registerLoadEnteringViews(transitionService);
    registerUpdateGlobalState(transitionService);
}
/** @internal */
function registerRuntimeTransitionHooks(transitionService) {
    registerUpdateUrl(transitionService);
    registerRedirectToHook(transitionService);
    registerActivateViews(transitionService);
}
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
    const toPath = trans._treeChanges.to;
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
    const path = trans._treeChanges[pathname] ?? [];
    const viewConfigs = [];
    for (let i = 0; i < path.length; i++) {
        const node = path[i];
        const views = node._views ?? [];
        for (let j = 0; j < views.length; j++) {
            const view = views[j];
            viewConfigs.push(view);
        }
    }
    return viewConfigs;
}
/** @internal */
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
        return stateService.target(result.state ?? trans.to(), result.params ?? trans.params(), trans._options);
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
    const stateObject = state._state?.();
    if (!stateObject) {
        throw new Error(`State '${state.name}' is not built`);
    }
    return new ResolveContext(trans._treeChanges.to, trans._routerState._injector)
        .subContext(stateObject)
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
        routerState._urlRuntime._push(navigable._url, stateService._routerState._params, urlOptions);
    }
    routerState._urlRuntime._update(true);
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
        routerState._current = current.self;
        const params = routerState._params;
        keys(params).forEach((key) => {
            deleteProperty(params, key);
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

export { registerCoreTransitionHooks, registerRuntimeTransitionHooks, treeChangesCleanup };
