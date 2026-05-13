import {
  assign,
  deleteProperty,
  isFunction,
  isInstanceOf,
  isObject,
  isString,
  keys,
} from "../../shared/utils.ts";
import { Resolvable } from "../resolve/resolvable.ts";
import { ResolveContext } from "../resolve/resolve-context.ts";
import { TargetState } from "../state/target-state.ts";
import {
  loadViewConfig,
  type ViewConfig,
  type ViewService,
} from "../view/view.ts";
import { Rejection } from "./reject-factory.ts";
import { Transition } from "./transition.ts";
import type {
  BuiltStateDeclaration,
  RedirectToResult,
  StateDeclaration,
} from "../state/interface.ts";
import type { StateObject } from "../state/state-object.ts";
import type { PathNode } from "../path/path-node.ts";
import type { StateProvider } from "../state/state-service.ts";
import type { DeregisterFn, HookResult } from "./interface.ts";
import type { TransitionService } from "./transition-service.ts";

function noop(): void {
  /* empty */
}

function afterViewCommitTask(): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}

type ViewTransitionDocument = Document & {
  startViewTransition: (updateCallback: () => void) => {
    updateCallbackDone: Promise<void>;
    finished: Promise<void>;
  };
};

let viewTransitionActive = false;

function runWithViewTransition(updateCallback: () => void): Promise<void> {
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

  viewTransition.finished.then(
    () => {
      viewTransitionActive = false;
    },
    () => {
      viewTransitionActive = false;
    },
  );

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
      addTransitionResolvable(
        trans,
        Resolvable.fromData("$stateParams", trans.params()),
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

function ignoredHook(trans: Transition) {
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
  return state._state?.().onExit?.(transition, state);
}

function onRetainHook(
  transition: Transition,
  state: StateDeclaration,
): HookResult {
  return state._state?.().onRetain?.(transition, state);
}

function onEnterHook(
  transition: Transition,
  state: StateDeclaration,
): HookResult {
  return state._state?.().onEnter?.(transition, state);
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
  stateService: StateProvider,
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

function eagerResolvePath(trans: Transition): Promise<void> {
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

function lazyResolveState(
  trans: Transition,
  state: StateDeclaration,
): Promise<void> {
  const stateObject = state._state?.();

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

function resolveRemaining(trans: Transition): Promise<void> {
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
  enteringViews: ViewConfig[],
  exitingViews: ViewConfig[],
): void {
  exitingViews.forEach((view) => {
    viewService._deactivateViewConfig(view);
  });

  enteringViews.forEach((view) => {
    viewService._activateViewConfig(view);
  });

  viewService._sync();
}

function activateViewsHook(
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
    updateViewConfigs(viewService, enteringViews, exitingViews);
  };

  if (!hasConnectedNgView(viewService)) {
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

    trans.promise.then(clearCurrentTransition, clearCurrentTransition);
  });

  return transitionService.onSuccess({}, updateGlobalState, {
    priority: 10000,
  });
}
