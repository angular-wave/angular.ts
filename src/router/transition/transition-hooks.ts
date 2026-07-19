import {
  assign,
  deleteProperty,
  isFunction,
  isInstanceOf,
  isObject,
  isString,
  keys,
} from "../../shared/utils.ts";
import { isInjectable } from "../../core/di/injectable.ts";
import { Resolvable } from "../resolve/resolvable.ts";
import { ResolveContext } from "../resolve/resolve-context.ts";
import { TargetState } from "../state/target-state.ts";
import {
  createRetentionPolicyInvocationLocals,
  createTransitionPolicyInvocationLocals,
} from "../invocation-context.ts";
import {
  loadViewConfig,
  type ViewConfig,
  type ViewRetentionAssignment,
  type ViewService,
} from "../view/view.ts";
import { Rejection } from "./reject-factory.ts";
import { Transition } from "./transition.ts";
import type {
  NavigationPolicyContext,
  NavigationPolicyRequirements,
} from "../../services/security/security.ts";
import type {
  BuiltStateDeclaration,
  InternalStateDeclaration,
  RedirectToResult,
  StateNavigationPolicyDeclaration,
  StateRetentionPolicyDeclaration,
  StateRetentionPolicyContext,
  StateDeclaration,
  StateTransitionPolicyContext,
  StateTransitionLoadingPolicy,
  StateTransitionLoadingPolicyContext,
} from "../state/interface.ts";
import type { StateObject } from "../state/state-object.ts";
import type { PathNode } from "../path/path-node.ts";
import type { StateRuntime } from "../state/state-service.ts";
import type { DeregisterFn, HookResult } from "./interface.ts";
import type { TransitionService } from "./transition-service.ts";

function noop(): void {
  /* empty */
}

async function afterViewCommitTask(): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}

/** @internal */
export async function afterPaintTask(): Promise<void> {
  if (typeof requestAnimationFrame === "undefined") {
    return new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
  }

  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
  });
}

type ViewTransitionDocument = Document & {
  startViewTransition: (updateCallback: () => void) => {
    updateCallbackDone: Promise<void>;
    finished: Promise<void>;
  };
};

let viewTransitionActive = false;

async function runWithViewTransition(
  updateCallback: () => void,
): Promise<void> {
  if (viewTransitionActive) {
    updateCallback();

    return Promise.resolve();
  }

  const callbackState: { hasError: boolean; error?: unknown } = {
    hasError: false,
  };

  viewTransitionActive = true;

  const viewTransition = (
    document as ViewTransitionDocument
  ).startViewTransition(() => {
    try {
      updateCallback();
    } catch (error) {
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
export function registerCoreTransitionHooks(
  transitionService: TransitionService,
): void {
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
export function registerRuntimeTransitionHooks(
  transitionService: TransitionService,
): void {
  registerUpdateUrl(transitionService);
  registerRedirectToHook(transitionService);
  registerActivateViews(transitionService);
  registerRouterUxHook(transitionService);
}

function registerAddCoreResolvables(
  transitionService: TransitionService,
): DeregisterFn {
  return transitionService._onCreate(
    {},
    function addCoreResolvables(trans: Transition) {
      addTransitionResolvable(
        trans,
        Resolvable.fromData(Transition, trans),
        "",
      );
      addTransitionResolvable(
        trans,
        Resolvable.fromData("$transition$", trans),
        "",
      );
      const entering = trans.entering();

      entering.forEach((state) => {
        addTransitionResolvable(
          trans,
          Resolvable.fromData("$state$", state),
          state.name,
        );
      });
    },
  );
}

function addTransitionResolvable(
  trans: Transition,
  resolvable: Resolvable,
  stateName: string,
): void {
  const toPath = trans._treeChanges.to;

  let targetNode: PathNode | undefined;

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

  new ResolveContext(toPath, trans._routerState._injector).addResolvables(
    [resolvable],
    targetNode.state,
  );
}

function transitionViews(trans: Transition, pathname: string): ViewConfig[] {
  const path = trans._treeChanges[pathname] ?? [];

  const viewConfigs: ViewConfig[] = [];

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
export function treeChangesCleanup(trans: Transition): void {
  const treeChanges = trans._treeChanges;

  const nodes = new Set<PathNode>();

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

function collectPathNodes(nodes: Set<PathNode>, path: PathNode[]): void {
  for (let i = 0; i < path.length; i++) {
    nodes.add(path[i]);
  }
}

function isTransitionToken(token: unknown): boolean {
  return token === "$transition$" || token === Transition;
}

async function ignoredHook(trans: Transition) {
  const ignoredReason = trans._ignoredReason();

  if (!ignoredReason) return undefined;
  const pending = trans._routerState._transition;

  if (ignoredReason === "SameAsCurrent" && pending) {
    pending.abort();
  }

  return Rejection.ignored()._toPromise();
}

function registerIgnoredTransitionHook(
  transitionService: TransitionService,
): DeregisterFn {
  return transitionService.onBefore({}, ignoredHook, { priority: -9999 });
}

function invalidTransitionHook(trans: Transition): void {
  if (!trans.valid()) {
    throw new Error(trans.error()?.toString());
  }
}

function internalState(
  state: StateDeclaration,
): BuiltStateDeclaration | undefined {
  return (state as Partial<InternalStateDeclaration>)._state?.();
}

function registerInvalidTransitionHook(
  transitionService: TransitionService,
): DeregisterFn {
  return transitionService.onBefore({}, invalidTransitionHook, {
    priority: -10000,
  });
}

function onExitHook(
  transition: Transition,
  state: StateDeclaration,
): HookResult {
  return internalState(state)?.onExit?.(transition, state);
}

function onRetainHook(
  transition: Transition,
  state: StateDeclaration,
): HookResult {
  return internalState(state)?.onRetain?.(transition, state);
}

function onEnterHook(
  transition: Transition,
  state: StateDeclaration,
): HookResult {
  return internalState(state)?.onEnter?.(transition, state);
}

function registerOnExitHook(
  transitionService: TransitionService,
): DeregisterFn {
  return transitionService.onExit(
    {
      exiting: (state?: StateObject) => !!state?.onExit,
    },
    onExitHook,
  );
}

function registerOnRetainHook(
  transitionService: TransitionService,
): DeregisterFn {
  return transitionService.onRetain(
    {
      retained: (state?: StateObject) => !!state?.onRetain,
    },
    onRetainHook,
  );
}

function registerOnEnterHook(
  transitionService: TransitionService,
): DeregisterFn {
  return transitionService.onEnter(
    {
      entering: (state?: StateObject) => !!state?.onEnter,
    },
    onEnterHook,
  );
}

function hasRedirectTo(state?: StateObject): boolean {
  return !!(state as BuiltStateDeclaration).redirectTo;
}

function handleRedirectToResult(
  stateService: StateRuntime,
  trans: Transition,
  result: RedirectToResult,
): TargetState | undefined {
  if (!result) return undefined;

  if (isInstanceOf(result, TargetState)) {
    return result;
  }

  if (isString(result)) {
    return stateService.target(result, trans.params(), trans._options);
  }

  if (isObject(result) && ("state" in result || "params" in result)) {
    return stateService.target(
      result.state ?? trans.to(),
      result.params ?? trans.params(),
      trans._options,
    );
  }

  return undefined;
}

async function redirectToHook(
  this: TransitionService,
  trans: Transition,
): Promise<TargetState | undefined> {
  const redirect = trans.to().redirectTo;

  if (!redirect) return undefined;

  const stateService = this._stateService;

  if (isFunction(redirect)) {
    const result = await Promise.resolve(redirect(trans));

    return handleRedirectToResult(stateService, trans, result);
  }

  return handleRedirectToResult(stateService, trans, redirect);
}

function registerRedirectToHook(
  transitionService: TransitionService,
): DeregisterFn {
  return transitionService.onStart(
    {
      to: hasRedirectTo,
    },
    redirectToHook,
    { bind: transitionService },
  );
}

const RESOLVE_HOOK_PRIORITY = 1000;

const DEFAULT_RETENTION_MAX = 10;

type EffectiveNavigationPolicy = {
  -readonly [TKey in keyof NavigationPolicyRequirements]: TKey extends
    | "permissions"
    | "states"
    ? string[]
    : NavigationPolicyRequirements[TKey];
};

interface EffectiveRetentionPolicy {
  mode: NonNullable<StateRetentionPolicyDeclaration["mode"]>;
  key?: StateRetentionPolicyDeclaration["key"];
  max?: number;
  pause?: StateRetentionPolicyDeclaration["pause"];
  evict?: StateRetentionPolicyDeclaration["evict"];
  states: string[];
}

interface EffectiveTransitionLoadingPolicy {
  policy: false | string | StateTransitionLoadingPolicy;
  state: StateDeclaration;
  states: string[];
}

function appendUnique(target: string[], source: string | string[] | undefined) {
  if (source === undefined) return;

  const items = Array.isArray(source) ? source : [source];

  items.forEach((item) => {
    if (!target.includes(item)) {
      target.push(item);
    }
  });
}

function applyNavigationPolicy(
  effective: EffectiveNavigationPolicy,
  policy: StateNavigationPolicyDeclaration,
  stateName: string,
): void {
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

function applyRetentionPolicy(
  effective: EffectiveRetentionPolicy,
  policy: StateRetentionPolicyDeclaration,
  stateName?: string,
): void {
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

function applyLoadingPolicy(
  effective: { policy?: false | string | StateTransitionLoadingPolicy },
  policy: boolean | string | StateTransitionLoadingPolicy,
): void {
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
export function buildEffectiveRetentionPolicy(
  transition: Transition,
): EffectiveRetentionPolicy | undefined {
  return buildEffectiveRetentionPolicyFromPath(
    transition._treeChanges.to,
    transition._routerState._retention,
  );
}

function buildEffectiveRetentionPolicyFromPath(
  path: PathNode[],
  routerPolicy?: StateRetentionPolicyDeclaration,
): EffectiveRetentionPolicy | undefined {
  const effective: EffectiveRetentionPolicy = {
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

    if (!policy) return;

    applyRetentionPolicy(effective, policy, node.state.name);
    hasPolicy = true;
  });

  return hasPolicy ? effective : undefined;
}

function buildEffectiveLoadingPolicy(
  transition: Transition,
): EffectiveTransitionLoadingPolicy | undefined {
  const effective: {
    policy?: false | string | StateTransitionLoadingPolicy;
    state?: StateDeclaration;
    states: string[];
  } = {
    states: [],
  };

  if (transition._routerState._loading !== undefined) {
    applyLoadingPolicy(effective, transition._routerState._loading);
    effective.state = transition.to();
  }

  transition._treeChanges.to.forEach((node) => {
    const policy = node.state.self.policy?.transition?.loading;

    if (policy === undefined) return;

    applyLoadingPolicy(effective, policy);
    effective.state = node.state.self;
    effective.states.push(node.state.name);
  });

  return effective.state && effective.policy !== undefined
    ? ({
        policy: effective.policy,
        state: effective.state,
        states: effective.states,
      } as EffectiveTransitionLoadingPolicy)
    : undefined;
}

function pathParams(path: PathNode[]): Record<string, unknown> {
  const params: Record<string, unknown> = {};

  path.forEach((node) => {
    keys(node.paramValues).forEach((key) => {
      params[key] = node.paramValues[key];
    });
  });

  return params;
}

function stableParamsKey(path: PathNode[]): string {
  const params = pathParams(path);

  return keys(params)
    .sort()
    .map((key) => `${key}:${String(params[key])}`)
    .join("|");
}

function retentionKey(
  transition: Transition,
  viewConfig: ViewConfig,
  policy: EffectiveRetentionPolicy,
): string {
  const stateName = viewConfig._path[viewConfig._path.length - 1].state.name;

  let routeKey: string | undefined;

  if (isString(policy.key)) {
    routeKey = policy.key;
  } else if (policy.key) {
    const targetState = viewConfig._path[viewConfig._path.length - 1].state;

    const context: StateRetentionPolicyContext = {
      transition,
      state: targetState.self,
      params: pathParams(viewConfig._path),
    };

    const result = transition._routerState._injector?.invoke(
      policy.key,
      undefined,
      createRetentionPolicyInvocationLocals(context),
      "retention key policy",
    );

    if (!isString(result)) {
      throw new Error("Retention key policy must return a string.");
    }

    routeKey = result;
  }

  routeKey ??= `${stateName}?${stableParamsKey(viewConfig._path)}`;

  return `${routeKey}#${viewConfig._targetKey}`;
}

function retentionEviction(
  policy: EffectiveRetentionPolicy,
): ViewRetentionAssignment["_evict"] {
  return policy.evict;
}

/** @internal */
export function applyViewRetention(
  transition: Transition,
  viewConfig: ViewConfig,
): void {
  const policy = buildEffectiveRetentionPolicyFromPath(
    viewConfig._path,
    transition._routerState._retention,
  );

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

function buildEffectiveNavigationPolicy(
  transition: Transition,
): EffectiveNavigationPolicy | undefined {
  const effective: EffectiveNavigationPolicy = {
    authenticated: false,
    permissions: [],
    states: [],
  };

  transition._treeChanges.to.forEach((node) => {
    const policy = node.state.self.policy?.navigation;

    if (!policy) return;

    applyNavigationPolicy(effective, policy, node.state.name);
  });

  return effective.states.length ? effective : undefined;
}

/**
 * Evaluates the navigation policy for each transition before controller/view hooks.
 */
async function securityNavigationHook(
  this: TransitionService,
  transition: Transition,
): Promise<TargetState | undefined> {
  const from = transition.from();

  const to = transition.to();

  const context: NavigationPolicyContext = {
    operation: "navigation",
    from: {
      name: from.name,
      url: from.url,
    },
    to: {
      name: to.name,
      url: to.url,
      params: transition.params("to") as Record<string, string>,
    },
    transition: {
      id: String(transition.$id),
    },
    routePolicy: buildEffectiveNavigationPolicy(transition),
    userAgent:
      typeof navigator === "undefined" ? undefined : navigator.userAgent,
  };

  const decision = await this._security.check(context);

  if (decision.type === "allow") {
    return undefined;
  }

  if (decision.type === "redirect") {
    return this._stateService.target(
      decision.target,
      transition.params(),
      transition._options,
    );
  }

  return Promise.reject(
    Rejection.errored({
      reason: decision.reason ?? "Security policy denied navigation",
      status: decision.status,
      detail: decision,
    }),
  );
}

function registerSecurityNavigationPolicyHook(
  transitionService: TransitionService,
): DeregisterFn {
  return transitionService.onBefore({}, securityNavigationHook, {
    bind: transitionService,
    priority: 200,
  });
}

async function transitionLoadingPolicyHook(
  this: TransitionService,
  transition: Transition,
): Promise<TargetState | undefined> {
  if (
    transition._options._loadingFor ||
    transition._options._skipLoadingPolicy
  ) {
    return undefined;
  }

  const effectiveLoadingPolicy = buildEffectiveLoadingPolicy(transition);

  if (!effectiveLoadingPolicy || effectiveLoadingPolicy.policy === false) {
    return undefined;
  }

  if (
    isString(effectiveLoadingPolicy.policy) ||
    isInstanceOf(effectiveLoadingPolicy.policy, TargetState)
  ) {
    const redirectTarget = handleRedirectToResult(
      this._stateService,
      transition,
      effectiveLoadingPolicy.policy,
    );

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

    return this._stateService.target(
      redirectTarget.name(),
      redirectTarget.params(),
      options,
    );
  }

  const context: StateTransitionLoadingPolicyContext = {
    operation: "loading",
    transition,
    from: transition.from(),
    to: transition.to(),
    state: effectiveLoadingPolicy.state,
  };

  const target = transition._routerState._injector?.invoke(
    effectiveLoadingPolicy.policy,
    undefined,
    createTransitionPolicyInvocationLocals(context),
    "route loading policy",
  );

  const redirectTarget = await Promise.resolve(target);

  if (!redirectTarget) {
    return undefined;
  }

  if (redirectTarget === true) return undefined;

  const loadingTarget = handleRedirectToResult(
    this._stateService,
    transition,
    redirectTarget,
  );

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

  return this._stateService.target(
    loadingTarget.name(),
    loadingTarget.params(),
    options,
  );
}

function registerTransitionLoadingPolicyHook(
  transitionService: TransitionService,
): DeregisterFn {
  return transitionService.onBefore({}, transitionLoadingPolicyHook, {
    bind: transitionService,
    priority: 150,
  });
}

/**
 * Evaluates state transition policies for states being exited.
 */
async function transitionPolicyHook(
  this: TransitionService,
  transition: Transition,
): Promise<TargetState | undefined> {
  const from = transition.from();
  const to = transition.to();

  for (const state of transition.exiting()) {
    const policy = state.policy?.transition;

    if (!policy) continue;

    if (policy.canExit) {
      const context: StateTransitionPolicyContext = {
        operation: "canExit",
        transition,
        from,
        to,
        state,
      };

      const result = await Promise.resolve(
        this._routerState._injector?.invoke(
          policy.canExit,
          undefined,
          createTransitionPolicyInvocationLocals(context),
          "route canExit policy",
        ),
      );

      if (result === true || result === undefined) {
        // continue
      } else if (result === false) {
        throw Rejection.aborted("Route canExit policy blocked transition");
      } else {
        const redirectTarget = handleRedirectToResult(
          this._stateService,
          transition,
          result,
        );

        if (redirectTarget) {
          return redirectTarget;
        }

        throw new Error(
          "Route canExit policy must return boolean or redirect.",
        );
      }
    }

    if (!policy.dirty) continue;

    const dirtyPolicy = policy.dirty;
    const context: StateTransitionPolicyContext = {
      operation: "dirty",
      transition,
      from,
      to,
      state,
    };
    const shouldPrompt = await Promise.resolve(
      this._routerState._injector?.invoke(
        dirtyPolicy.when,
        undefined,
        createTransitionPolicyInvocationLocals(context),
        "route dirty policy",
      ),
    );

    if (!shouldPrompt) continue;

    if (dirtyPolicy.redirectTo) {
      return this._stateService.target(
        dirtyPolicy.redirectTo,
        transition.params(),
        transition._options,
      );
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

function registerTransitionPolicyHook(
  transitionService: TransitionService,
): DeregisterFn {
  return transitionService.onBefore({}, transitionPolicyHook, {
    bind: transitionService,
    priority: 100,
  });
}

async function eagerResolvePath(trans: Transition): Promise<void> {
  return new ResolveContext(trans._treeChanges.to, trans._routerState._injector)
    .resolvePath(true, trans)
    .then(noop);
}

function registerEagerResolvePath(
  transitionService: TransitionService,
): DeregisterFn {
  return transitionService.onStart({}, eagerResolvePath, {
    priority: RESOLVE_HOOK_PRIORITY,
  });
}

async function lazyResolveState(
  trans: Transition,
  state: StateDeclaration,
): Promise<void> {
  const stateObject = internalState(state);

  if (!stateObject) {
    throw new Error(`State '${state.name}' is not built`);
  }

  return new ResolveContext(trans._treeChanges.to, trans._routerState._injector)
    .subContext(stateObject)
    .resolvePath(false, trans)
    .then(noop);
}

function matchEnteringState(): boolean {
  return true;
}

function registerLazyResolveState(
  transitionService: TransitionService,
): DeregisterFn {
  return transitionService.onEnter(
    { entering: matchEnteringState },
    lazyResolveState,
    {
      priority: RESOLVE_HOOK_PRIORITY,
    },
  );
}

async function resolveRemaining(trans: Transition): Promise<void> {
  return new ResolveContext(trans._treeChanges.to, trans._routerState._injector)
    .resolvePath(false, trans)
    .then(noop);
}

function registerResolveRemaining(
  transitionService: TransitionService,
): DeregisterFn {
  return transitionService.onFinish({}, resolveRemaining, {
    priority: RESOLVE_HOOK_PRIORITY,
  });
}

function loadEnteringViews(transition: Transition): Promise<void> | undefined {
  const enteringViews = transitionViews(transition, "entering");

  if (!enteringViews.length) return undefined;
  const promises = new Array(enteringViews.length);

  enteringViews.forEach((view, i) => {
    promises[i] = loadViewConfig(view);
  });

  return Promise.all(promises).then(noop);
}

function registerLoadEnteringViews(
  transitionService: TransitionService,
): DeregisterFn {
  return transitionService.onFinish({}, loadEnteringViews);
}

function updateViewConfigs(
  viewService: ViewService,
  transition: Transition,
  enteringViews: ViewConfig[],
  exitingViews: ViewConfig[],
): void {
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

async function activateViewsHook(
  this: TransitionService,
  transition: Transition,
): Promise<void> {
  const viewService = this._view;

  const enteringViews = transitionViews(transition, "entering");

  const exitingViews = transitionViews(transition, "exiting");

  if (!enteringViews.length && !exitingViews.length) {
    return Promise.resolve();
  }

  const updateViews = (): void => {
    updateViewConfigs(viewService, transition, enteringViews, exitingViews);
  };

  if (
    transition._options._loadingFor ||
    transition._options._skipLoadingPolicy ||
    transition._options.redirectedFrom ||
    transition._routerState._viewTransitions === false ||
    !hasConnectedNgView(viewService)
  ) {
    updateViews();

    return Promise.resolve();
  }

  return runWithViewTransition(updateViews);
}

function registerActivateViews(
  transitionService: TransitionService,
): DeregisterFn {
  return transitionService.onSuccess({}, activateViewsHook, {
    bind: transitionService,
  });
}

/** @internal */
export function resolveScrollTarget(
  selector: string,
  browserDocument: Document | null | undefined = (
    globalThis as {
      document?: Document;
    }
  ).document,
): Element | null {
  return browserDocument?.querySelector(selector) ?? null;
}

/** @internal */
export function scrollToHash(
  browserWindow: Window | null | undefined = (
    globalThis as {
      window?: Window;
    }
  ).window,
  browserDocument: Document | null | undefined = (
    globalThis as {
      document?: Document;
    }
  ).document,
): boolean {
  if (!browserDocument || !browserWindow) {
    return false;
  }

  const hash = browserWindow.location.hash;

  if (!hash || hash === "#") return false;

  const id = decodeURIComponent(hash.slice(1));

  const target = browserDocument.getElementById(id);

  if (!target) return false;

  target.scrollIntoView();

  return true;
}

/** @internal */
export function applyRouterScroll(
  routerState: TransitionService["_routerState"],
  browserWindow: Window | null | undefined = (
    globalThis as {
      window?: Window;
    }
  ).window,
  browserDocument: Document | null | undefined = (
    globalThis as {
      document?: Document;
    }
  ).document,
): void {
  const scroll = routerState._scroll;

  if (!scroll || scroll === "preserve") return;

  if (scroll === "hash") {
    if (scrollToHash(browserWindow, browserDocument)) return;
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
export function resolveFocusTarget(
  focus: Exclude<TransitionService["_routerState"]["_focus"], undefined>,
  browserDocument: Document | null | undefined = (
    globalThis as {
      document?: Document;
    }
  ).document,
): HTMLElement | null {
  if (!browserDocument) return null;

  if (isString(focus)) {
    return browserDocument.querySelector<HTMLElement>(focus);
  }

  if (isObject(focus) && focus.selector) {
    return browserDocument.querySelector<HTMLElement>(focus.selector);
  }

  return browserDocument.querySelector<HTMLElement>(
    "[autofocus], [data-router-focus], main, h1",
  );
}

/** @internal */
export function applyRouterFocus(
  routerState: TransitionService["_routerState"],
  browserDocument: Document | null | undefined = (
    globalThis as {
      document?: Document;
    }
  ).document,
): void {
  const focus = routerState._focus;

  if (!focus) return;

  const target = resolveFocusTarget(focus, browserDocument);

  if (!target) return;

  const preventScroll = isObject(focus) ? focus.preventScroll : true;

  target.focus({ preventScroll });
}

async function routerUxHook(this: TransitionService): Promise<void> {
  await afterViewCommitTask();
  await afterPaintTask();
  applyRouterScroll(this._routerState);
  applyRouterFocus(this._routerState);
}

function registerRouterUxHook(
  transitionService: TransitionService,
): DeregisterFn {
  return transitionService.onSuccess({}, routerUxHook, {
    bind: transitionService,
    priority: -100,
  });
}

function hasConnectedNgView(viewService: ViewService): boolean {
  const ngViews = viewService._ngViews;

  for (let i = 0; i < ngViews.length; i++) {
    if (ngViews[i]._element.isConnected) {
      return true;
    }
  }

  return false;
}

function updateUrlHook(this: TransitionService, transition: Transition): void {
  const options = transition._options;

  const stateService = this._stateService;

  const routerState = this._routerState;

  const navigable = stateService.$current?.navigable;

  if (options.source !== "url" && options.location && navigable?._url) {
    const urlOptions = {
      replace: options.location === "replace",
    };

    routerState._urlRuntime._push(
      navigable._url,
      stateService._routerState._params,
      urlOptions,
    );
  }

  routerState._urlRuntime._update(true);
}

function registerUpdateUrl(transitionService: TransitionService): DeregisterFn {
  return transitionService.onSuccess({}, updateUrlHook, {
    bind: transitionService,
    priority: 9999,
  });
}

function registerUpdateGlobalState(
  transitionService: TransitionService,
): DeregisterFn {
  const updateGlobalState = (trans: Transition): void => {
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

  transitionService._onCreate({}, (trans: Transition) => {
    const routerState = trans._routerState;

    const clearCurrentTransition = (): void => {
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
