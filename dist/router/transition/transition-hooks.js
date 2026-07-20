import { isObject, isString, keys, isInstanceOf, assign, deleteProperty, isFunction } from '../../shared/utils.js';
import { isInjectable } from '../../core/di/injectable.js';
import { Resolvable } from '../resolve/resolvable.js';
import { ResolveContext } from '../resolve/resolve-context.js';
import { TargetState } from '../state/target-state.js';
import { createRetentionPolicyInvocationLocals, createTransitionPolicyInvocationLocals } from '../invocation-context.js';
import { loadViewConfig } from '../view/view.js';
import { Rejection } from './reject-factory.js';
import { Transition } from './transition.js';

function noop() {
    /* empty */
}
async function afterViewCommitTask() {
    return new Promise((resolve) => {
        setTimeout(resolve, 0);
    });
}
/** @internal */
async function afterPaintTask() {
    if (typeof requestAnimationFrame === "undefined") {
        return new Promise((resolve) => {
            setTimeout(resolve, 0);
        });
    }
    return new Promise((resolve) => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                resolve();
            });
        });
    });
}
let viewTransitionActive = false;
async function runWithViewTransition(updateCallback) {
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
    void viewTransition.finished
        .then(() => {
        viewTransitionActive = false;
        return undefined;
    })
        .catch(() => {
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
    registerSecurityNavigationPolicyHook(transitionService);
    registerTransitionLoadingPolicyHook(transitionService);
    registerTransitionPolicyHook(transitionService);
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
    registerRouterUxHook(transitionService);
}
function registerAddCoreResolvables(transitionService) {
    return transitionService._onCreate({}, function addCoreResolvables(trans) {
        addTransitionResolvable(trans, Resolvable.fromData(Transition, trans), "");
        addTransitionResolvable(trans, Resolvable.fromData("$transition$", trans), "");
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
async function ignoredHook(trans) {
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
function internalState(state) {
    return state._state?.();
}
function registerInvalidTransitionHook(transitionService) {
    return transitionService.onBefore({}, invalidTransitionHook, {
        priority: -1e4,
    });
}
function onExitHook(transition, state) {
    return internalState(state)?.onExit?.(transition, state);
}
function onRetainHook(transition, state) {
    return internalState(state)?.onRetain?.(transition, state);
}
function onEnterHook(transition, state) {
    return internalState(state)?.onEnter?.(transition, state);
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
const DEFAULT_RETENTION_MAX = 10;
function appendUnique(target, source) {
    if (source === undefined)
        return;
    const items = Array.isArray(source) ? source : [source];
    items.forEach((item) => {
        if (!target.includes(item)) {
            target.push(item);
        }
    });
}
function applyNavigationPolicy(effective, policy, stateName) {
    effective.states.push(stateName);
    if (policy.public) {
        effective.authenticated = false;
        effective.permissions = [];
        effective.redirectTo = undefined;
        effective.reason = policy.reason;
        effective.public = true;
        return;
    }
    effective.public = false;
    appendUnique(effective.permissions, policy.permissions);
    if (policy.authenticated !== undefined) {
        effective.authenticated = policy.authenticated;
    }
    if (policy.redirectTo !== undefined) {
        effective.redirectTo = policy.redirectTo;
    }
    if (policy.reason !== undefined) {
        effective.reason = policy.reason;
    }
}
function applyRetentionPolicy(effective, policy, stateName) {
    if (stateName !== undefined) {
        effective.states.push(stateName);
    }
    if (policy.mode !== undefined) {
        effective.mode = policy.mode;
    }
    if (policy.key !== undefined) {
        effective.key = policy.key;
    }
    if (policy.max !== undefined) {
        effective.max = policy.max;
    }
    if (policy.pause !== undefined) {
        effective.pause = policy.pause;
    }
    if (policy.evict !== undefined) {
        effective.evict = policy.evict;
    }
}
function applyLoadingPolicy(effective, policy) {
    if (isString(policy) || isInjectable(policy)) {
        effective.policy = policy;
        return;
    }
    if (!policy) {
        effective.policy = false;
        return;
    }
}
/** @internal */
function buildEffectiveRetentionPolicy(transition) {
    return buildEffectiveRetentionPolicyFromPath(transition._treeChanges.to, transition._routerState._retention);
}
function buildEffectiveRetentionPolicyFromPath(path, routerPolicy) {
    const effective = {
        mode: "destroy",
        states: [],
    };
    let hasPolicy = false;
    if (routerPolicy) {
        applyRetentionPolicy(effective, routerPolicy);
        hasPolicy = true;
    }
    path.forEach((node) => {
        const policy = node.state.self.policy?.retention;
        if (!policy)
            return;
        applyRetentionPolicy(effective, policy, node.state.name);
        hasPolicy = true;
    });
    return hasPolicy ? effective : undefined;
}
function buildEffectiveLoadingPolicy(transition) {
    const effective = {
        states: [],
    };
    if (transition._routerState._loading !== undefined) {
        applyLoadingPolicy(effective, transition._routerState._loading);
        effective.state = transition.to();
    }
    transition._treeChanges.to.forEach((node) => {
        const policy = node.state.self.policy?.transition?.loading;
        if (policy === undefined)
            return;
        applyLoadingPolicy(effective, policy);
        effective.state = node.state.self;
        effective.states.push(node.state.name);
    });
    return effective.state && effective.policy !== undefined
        ? {
            policy: effective.policy,
            state: effective.state,
            states: effective.states,
        }
        : undefined;
}
function pathParams(path) {
    const params = {};
    path.forEach((node) => {
        keys(node.paramValues).forEach((key) => {
            params[key] = node.paramValues[key];
        });
    });
    return params;
}
function stableParamsKey(path) {
    const params = pathParams(path);
    return keys(params)
        .sort()
        .map((key) => `${key}:${String(params[key])}`)
        .join("|");
}
function retentionKey(transition, viewConfig, policy) {
    const stateName = viewConfig._path[viewConfig._path.length - 1].state.name;
    let routeKey;
    if (isString(policy.key)) {
        routeKey = policy.key;
    }
    else if (policy.key) {
        const targetState = viewConfig._path[viewConfig._path.length - 1].state;
        const context = {
            transition,
            state: targetState.self,
            params: pathParams(viewConfig._path),
        };
        const result = transition._routerState._injector?.invoke(policy.key, undefined, createRetentionPolicyInvocationLocals(context), "retention key policy");
        if (!isString(result)) {
            throw new Error("Retention key policy must return a string.");
        }
        routeKey = result;
    }
    routeKey ?? (routeKey = `${stateName}?${stableParamsKey(viewConfig._path)}`);
    return `${routeKey}#${viewConfig._targetKey}`;
}
function retentionEviction(policy) {
    return policy.evict;
}
/** @internal */
function applyViewRetention(transition, viewConfig) {
    const policy = buildEffectiveRetentionPolicyFromPath(viewConfig._path, transition._routerState._retention);
    if (!policy) {
        viewConfig._retention = undefined;
        return;
    }
    viewConfig._retention = {
        _mode: policy.mode,
        _key: retentionKey(transition, viewConfig, policy),
        _max: policy.max ?? DEFAULT_RETENTION_MAX,
        _pause: policy.pause,
        _evict: retentionEviction(policy),
        _state: viewConfig._path[viewConfig._path.length - 1].state.name,
    };
}
function buildEffectiveNavigationPolicy(transition) {
    const effective = {
        authenticated: false,
        permissions: [],
        states: [],
    };
    transition._treeChanges.to.forEach((node) => {
        const policy = node.state.self.policy?.navigation;
        if (!policy)
            return;
        applyNavigationPolicy(effective, policy, node.state.name);
    });
    return effective.states.length ? effective : undefined;
}
/**
 * Evaluates the navigation policy for each transition before controller/view hooks.
 */
async function securityNavigationHook(transition) {
    const from = transition.from();
    const to = transition.to();
    const context = {
        operation: "navigation",
        from: {
            name: from.name,
            url: from.url,
        },
        to: {
            name: to.name,
            url: to.url,
            params: transition.params("to"),
        },
        transition: {
            id: String(transition.$id),
        },
        routePolicy: buildEffectiveNavigationPolicy(transition),
        userAgent: typeof navigator === "undefined" ? undefined : navigator.userAgent,
    };
    const decision = await this._security.check(context);
    if (decision.type === "allow") {
        return undefined;
    }
    if (decision.type === "redirect") {
        return this._stateService.target(decision.target, transition.params(), transition._options);
    }
    return Promise.reject(Rejection.errored({
        reason: decision.reason ?? "Security policy denied navigation",
        status: decision.status,
        detail: decision,
    }));
}
function registerSecurityNavigationPolicyHook(transitionService) {
    return transitionService.onBefore({}, securityNavigationHook, {
        bind: transitionService,
        priority: 200,
    });
}
async function transitionLoadingPolicyHook(transition) {
    if (transition._options._loadingFor ||
        transition._options._skipLoadingPolicy) {
        return undefined;
    }
    const effectiveLoadingPolicy = buildEffectiveLoadingPolicy(transition);
    if (!effectiveLoadingPolicy || effectiveLoadingPolicy.policy === false) {
        return undefined;
    }
    if (isString(effectiveLoadingPolicy.policy) ||
        isInstanceOf(effectiveLoadingPolicy.policy, TargetState)) {
        const redirectTarget = handleRedirectToResult(this._stateService, transition, effectiveLoadingPolicy.policy);
        if (!redirectTarget || redirectTarget.name() === transition.to().name) {
            return undefined;
        }
        const options = assign({}, transition._options, {
            _loadingFor: {
                identifier: transition.to(),
                params: transition.params(),
                options: transition._options,
            },
            _skipLoadingPolicy: true,
        });
        return this._stateService.target(redirectTarget.name(), redirectTarget.params(), options);
    }
    const context = {
        operation: "loading",
        transition,
        from: transition.from(),
        to: transition.to(),
        state: effectiveLoadingPolicy.state,
    };
    const target = transition._routerState._injector?.invoke(effectiveLoadingPolicy.policy, undefined, createTransitionPolicyInvocationLocals(context), "route loading policy");
    const redirectTarget = await Promise.resolve(target);
    if (!redirectTarget) {
        return undefined;
    }
    if (redirectTarget === true)
        return undefined;
    const loadingTarget = handleRedirectToResult(this._stateService, transition, redirectTarget);
    if (!loadingTarget || loadingTarget.name() === transition.to().name) {
        return undefined;
    }
    const options = assign({}, transition._options, {
        _loadingFor: {
            identifier: transition.to(),
            params: transition.params(),
            options: transition._options,
        },
        _skipLoadingPolicy: true,
    });
    return this._stateService.target(loadingTarget.name(), loadingTarget.params(), options);
}
function registerTransitionLoadingPolicyHook(transitionService) {
    return transitionService.onBefore({}, transitionLoadingPolicyHook, {
        bind: transitionService,
        priority: 150,
    });
}
/**
 * Evaluates state transition policies for states being exited.
 */
async function transitionPolicyHook(transition) {
    const from = transition.from();
    const to = transition.to();
    for (const state of transition.exiting()) {
        const policy = state.policy?.transition;
        if (!policy)
            continue;
        if (policy.canExit) {
            const context = {
                operation: "canExit",
                transition,
                from,
                to,
                state,
            };
            const result = await Promise.resolve(this._routerState._injector?.invoke(policy.canExit, undefined, createTransitionPolicyInvocationLocals(context), "route canExit policy"));
            if (result === true || result === undefined) ;
            else if (result === false) {
                throw Rejection.aborted("Route canExit policy blocked transition");
            }
            else {
                const redirectTarget = handleRedirectToResult(this._stateService, transition, result);
                if (redirectTarget) {
                    return redirectTarget;
                }
                throw new Error("Route canExit policy must return boolean or redirect.");
            }
        }
        if (!policy.dirty)
            continue;
        const dirtyPolicy = policy.dirty;
        const context = {
            operation: "dirty",
            transition,
            from,
            to,
            state,
        };
        const shouldPrompt = await Promise.resolve(this._routerState._injector?.invoke(dirtyPolicy.when, undefined, createTransitionPolicyInvocationLocals(context), "route dirty policy"));
        if (!shouldPrompt)
            continue;
        if (dirtyPolicy.redirectTo) {
            return this._stateService.target(dirtyPolicy.redirectTo, transition.params(), transition._options);
        }
        const prompt = dirtyPolicy.prompt;
        if (!prompt) {
            throw Rejection.aborted("Route dirty policy blocked transition");
        }
        if (!window.confirm(prompt)) {
            throw Rejection.aborted("Route dirty policy blocked transition");
        }
    }
    return undefined;
}
function registerTransitionPolicyHook(transitionService) {
    return transitionService.onBefore({}, transitionPolicyHook, {
        bind: transitionService,
        priority: 100,
    });
}
async function eagerResolvePath(trans) {
    return new ResolveContext(trans._treeChanges.to, trans._routerState._injector)
        .resolvePath(true, trans)
        .then(noop);
}
function registerEagerResolvePath(transitionService) {
    return transitionService.onStart({}, eagerResolvePath, {
        priority: RESOLVE_HOOK_PRIORITY,
    });
}
async function lazyResolveState(trans, state) {
    const stateObject = internalState(state);
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
async function resolveRemaining(trans) {
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
function updateViewConfigs(viewService, transition, enteringViews, exitingViews) {
    exitingViews.forEach((view) => {
        applyViewRetention(transition, view);
    });
    enteringViews.forEach((view) => {
        applyViewRetention(transition, view);
    });
    exitingViews.forEach((view) => {
        viewService._deactivateViewConfig(view);
    });
    enteringViews.forEach((view) => {
        viewService._activateViewConfig(view);
    });
    viewService._sync();
}
async function activateViewsHook(transition) {
    const viewService = this._view;
    const enteringViews = transitionViews(transition, "entering");
    const exitingViews = transitionViews(transition, "exiting");
    if (!enteringViews.length && !exitingViews.length) {
        return Promise.resolve();
    }
    const updateViews = () => {
        updateViewConfigs(viewService, transition, enteringViews, exitingViews);
    };
    if (transition._options._loadingFor ||
        transition._options._skipLoadingPolicy ||
        transition._options.redirectedFrom ||
        transition._routerState._viewTransitions === false ||
        !hasConnectedNgView(viewService)) {
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
/** @internal */
function resolveScrollTarget(selector, browserDocument = globalThis.document) {
    return browserDocument?.querySelector(selector) ?? null;
}
/** @internal */
function scrollToHash(browserWindow = globalThis.window, browserDocument = globalThis.document) {
    if (!browserDocument || !browserWindow) {
        return false;
    }
    const hash = browserWindow.location.hash;
    if (!hash || hash === "#")
        return false;
    const id = decodeURIComponent(hash.slice(1));
    const target = browserDocument.getElementById(id);
    if (!target)
        return false;
    target.scrollIntoView();
    return true;
}
/** @internal */
function applyRouterScroll(routerState, browserWindow = globalThis.window, browserDocument = globalThis.document) {
    const scroll = routerState._scroll;
    if (!scroll || scroll === "preserve")
        return;
    if (scroll === "hash") {
        if (scrollToHash(browserWindow, browserDocument))
            return;
    }
    if (isObject(scroll)) {
        if (scroll.selector) {
            resolveScrollTarget(scroll.selector, browserDocument)?.scrollIntoView({
                behavior: scroll.behavior,
            });
            return;
        }
        if (browserWindow) {
            browserWindow.scrollTo({
                behavior: scroll.behavior,
                left: scroll.left ?? 0,
                top: scroll.top ?? 0,
            });
        }
        return;
    }
    if (browserWindow) {
        browserWindow.scrollTo({ left: 0, top: 0 });
    }
}
/** @internal */
function resolveFocusTarget(focus, browserDocument = globalThis.document) {
    if (!browserDocument)
        return null;
    if (isString(focus)) {
        return browserDocument.querySelector(focus);
    }
    if (isObject(focus) && focus.selector) {
        return browserDocument.querySelector(focus.selector);
    }
    return browserDocument.querySelector("[autofocus], [data-router-focus], main, h1");
}
/** @internal */
function applyRouterFocus(routerState, browserDocument = globalThis.document) {
    const focus = routerState._focus;
    if (!focus)
        return;
    const target = resolveFocusTarget(focus, browserDocument);
    if (!target)
        return;
    const preventScroll = isObject(focus) ? focus.preventScroll : true;
    target.focus({ preventScroll });
}
async function routerUxHook() {
    await afterViewCommitTask();
    await afterPaintTask();
    applyRouterScroll(this._routerState);
    applyRouterFocus(this._routerState);
}
function registerRouterUxHook(transitionService) {
    return transitionService.onSuccess({}, routerUxHook, {
        bind: transitionService,
        priority: -100,
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
        void trans.promise
            .then(() => {
            clearCurrentTransition();
            return undefined;
        })
            .catch(() => {
            clearCurrentTransition();
        });
    });
    return transitionService.onSuccess({}, updateGlobalState, {
        priority: 10000,
    });
}

export { afterPaintTask, applyRouterFocus, applyRouterScroll, applyViewRetention, buildEffectiveRetentionPolicy, registerCoreTransitionHooks, registerRuntimeTransitionHooks, resolveFocusTarget, resolveScrollTarget, scrollToHash, treeChangesCleanup };
