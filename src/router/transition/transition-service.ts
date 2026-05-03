import {
  _exceptionHandlerProvider,
  _routerProvider,
} from "../../injection-tokens.ts";
import {
  assign,
  isFunction,
  isInstanceOf,
  isObject,
  isString,
  keys,
} from "../../shared/utils.ts";
import { Resolvable } from "../resolve/resolvable.ts";
import { ResolveContext } from "../resolve/resolve-context.ts";
import { TargetState } from "../state/target-state.ts";
import { Rejection } from "./reject-factory.ts";
import type {
  BuiltStateDeclaration,
  RedirectToResult,
  StateDeclaration,
} from "../state/interface.ts";
import type { StateObject } from "../state/state-object.ts";
import type { RouterProvider } from "../router.ts";
import { Transition } from "./transition.ts";
import type { PathNode } from "../path/path-node.ts";
import {
  makeEvent,
  registerHook,
  type RegisteredHooks,
} from "./hook-registry.ts";
import type {
  DeregisterFn,
  HookFn,
  HookMatchCriteria,
  HookRegOptions,
  HookRegistry,
  HookResult,
  TransitionOptions,
} from "./interface.ts";
import {
  TransitionEventType,
  type TransitionErrorHandler,
  type TransitionResultHandler,
} from "./transition-event-type.ts";
import { TransitionHook, TransitionHookPhase } from "./transition-hook.ts";
import type { StateProvider } from "../state/state-service.ts";
import {
  loadViewConfig,
  type ViewConfig,
  type ViewService,
} from "../view/view.ts";
import { PATH_TYPES, type PathType } from "./path-types.ts";

export const defaultTransOpts: TransitionOptions = {
  location: true,
  relative: undefined,
  inherit: false,
  reload: false,
  current: () => null,
  source: "unknown",
};

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

  let hasCallbackError = false;

  let callbackError: unknown;

  viewTransitionActive = true;

  const viewTransition = (
    document as ViewTransitionDocument
  ).startViewTransition(() => {
    try {
      updateCallback();
    } catch (error) {
      hasCallbackError = true;
      callbackError = error;
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

  if (hasCallbackError) {
    throw callbackError;
  }

  return viewTransition.updateCallbackDone.then(afterViewCommitTask);
}

/**
 * The runtime service instance returned from `TransitionProvider.$get`.
 *
 * Note: In this codebase, `$get` returns the provider instance (`return this;`),
 * so the "service" surface includes both the public HookRegistry API and
 * a set of internal fields/methods used by built-in hook registrations.
 *
 * @internal
 */
export interface TransitionService extends HookRegistry {
  /**
   * Internal factory used by StateService.
   */
  create(fromPath: PathNode[], targetState: TargetState): Transition;

  /** @internal incremented for each created Transition */
  _transitionCount: number;

  /** @internal hook event types (onBefore/onStart/...) */
  _eventTypes: TransitionEventType[];

  /** @internal Return event types, optionally filtered by phase. */
  _getEvents(phase?: TransitionHookPhase): TransitionEventType[];

  /** @internal Return hooks registered for a transition event name. */
  _getHooks(hookName: string): RegisteredHooks[string];

  /** @internal Register a transition-construction hook used by built-ins. */
  _onCreate(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn;

  /** @internal Wire hooks that require runtime services. */
  _initRuntimeHooks(
    stateService: StateProvider,
    viewService: ViewService,
  ): void;

  /** @internal view service */
  /** @internal */
  _view: ViewService;

  /** @internal */
  _stateService: StateProvider;

  /** @internal */
  _exceptionHandler: ng.ExceptionHandlerService;
}

/**
 * Central registry and factory for transition events, hooks, and transition instances.
 *
 * @internal
 */
export class TransitionProvider implements TransitionService {
  static $inject = [_routerProvider, _exceptionHandlerProvider] as const;

  /** @internal */
  _transitionCount: number;
  /** @internal */
  _eventTypes: TransitionEventType[];
  /** @internal */
  _registeredHooks: RegisteredHooks;
  /** @internal */
  _routerState: RouterProvider;
  /** @internal */
  _view!: ViewService;
  /** @internal */
  _stateService!: StateProvider;
  /** @internal */
  _exceptionHandler: ng.ExceptionHandlerService;

  constructor(
    routerState: RouterProvider,
    $exceptionHandler: ng.ExceptionHandlerProvider,
  ) {
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
  $get(): TransitionProvider {
    return this;
  }

  /** @internal */
  _initRuntimeHooks(
    stateService: StateProvider,
    viewService: ViewService,
  ): void {
    this._view = viewService;
    this._stateService = stateService;
    registerUpdateUrl(this);
    registerRedirectToHook(this);
    registerActivateViews(this);
  }

  /**
   * Creates a new transition from the current path to a target state.
   */
  create(fromPath: PathNode[], targetState: TargetState): Transition {
    return new Transition(fromPath, targetState, this, this._routerState);
  }

  /**
   * Defines the built-in transition lifecycle events and their execution order.
   */
  /** @internal */
  _defineCoreEvents(): void {
    const TH = TransitionHook;

    const paths = PATH_TYPES;

    const NORMAL_SORT = false;

    const REVERSE_SORT = true;

    const SYNCHRONOUS = true;

    this._defineEvent(
      "onCreate",
      TransitionHookPhase._CREATE,
      0,
      paths.to,
      NORMAL_SORT,
      TH._logRejectedResult,
      TH._throwError,
      SYNCHRONOUS,
    );
    this._defineEvent("onBefore", TransitionHookPhase._BEFORE, 0, paths.to);
    this._defineEvent("onStart", TransitionHookPhase._RUN, 0, paths.to);
    this._defineEvent(
      "onExit",
      TransitionHookPhase._RUN,
      100,
      paths.exiting,
      REVERSE_SORT,
    );
    this._defineEvent(
      "onRetain",
      TransitionHookPhase._RUN,
      200,
      paths.retained,
    );
    this._defineEvent("onEnter", TransitionHookPhase._RUN, 300, paths.entering);
    this._defineEvent("onFinish", TransitionHookPhase._RUN, 400, paths.to);
    this._defineEvent(
      "onSuccess",
      TransitionHookPhase._SUCCESS,
      0,
      paths.to,
      NORMAL_SORT,
      TH._logRejectedResult,
      TH._logError,
      SYNCHRONOUS,
    );
    this._defineEvent(
      "onError",
      TransitionHookPhase._ERROR,
      0,
      paths.to,
      NORMAL_SORT,
      TH._logRejectedResult,
      TH._logError,
      SYNCHRONOUS,
    );
  }

  /**
   * Defines one transition event type and exposes its registration helper.
   */
  /** @internal */
  _defineEvent(
    name: string,
    hookPhase: TransitionHookPhase,
    hookOrder: number,
    criteriaMatchPath: PathType,
    reverseSort = false,
    resultHandler: TransitionResultHandler = TransitionHook._handleResult,
    errorHandler: TransitionErrorHandler = TransitionHook._rejectError,
    synchronous = false,
  ): void {
    const eventType = new TransitionEventType(
      name,
      hookPhase,
      hookOrder,
      criteriaMatchPath,
      reverseSort,
      resultHandler,
      errorHandler,
      synchronous,
    );

    this._eventTypes.push(eventType);
    makeEvent(this, this, eventType);
  }

  /**
   * Returns known transition event types, optionally filtered by phase.
   */
  /** @internal */
  _getEvents(phase?: TransitionHookPhase): TransitionEventType[] {
    const transitionHookTypes: TransitionEventType[] = [];

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
  _getHooks(hookName: string): RegisteredHooks[string] {
    return this._registeredHooks[hookName] || [];
  }

  /**
   * Registers a transition hook by event name.
   */
  on(
    eventName: string,
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn {
    const eventType = this._getEventType(eventName);

    return registerHook(
      this,
      this,
      eventType,
      matchCriteria,
      callback,
      options,
    );
  }

  /**
   * Registers an internal hook that runs while a transition is being constructed.
   */
  /** @internal */
  _onCreate(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn {
    return this.on("onCreate", matchCriteria, callback, options);
  }

  /**
   * Registers an `onBefore` transition hook.
   */
  onBefore(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn {
    return this.on("onBefore", matchCriteria, callback, options);
  }

  /**
   * Registers an `onStart` transition hook.
   */
  onStart(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn {
    return this.on("onStart", matchCriteria, callback, options);
  }

  /**
   * Registers an `onEnter` transition hook.
   */
  onEnter(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn {
    return this.on("onEnter", matchCriteria, callback, options);
  }

  /**
   * Registers an `onRetain` transition hook.
   */
  onRetain(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn {
    return this.on("onRetain", matchCriteria, callback, options);
  }

  /**
   * Registers an `onExit` transition hook.
   */
  onExit(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn {
    return this.on("onExit", matchCriteria, callback, options);
  }

  /**
   * Registers an `onFinish` transition hook.
   */
  onFinish(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn {
    return this.on("onFinish", matchCriteria, callback, options);
  }

  /**
   * Registers an `onSuccess` transition hook.
   */
  onSuccess(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn {
    return this.on("onSuccess", matchCriteria, callback, options);
  }

  /**
   * Registers an `onError` transition hook.
   */
  onError(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn {
    return this.on("onError", matchCriteria, callback, options);
  }

  /**
   * Looks up one known transition event type by name.
   */
  /** @internal */
  _getEventType(eventName: string): TransitionEventType {
    for (let i = 0; i < this._eventTypes.length; i++) {
      const eventType = this._eventTypes[i];

      if (eventType._name === eventName) return eventType;
    }

    throw new Error(`Unknown Transition hook event: ${eventName}`);
  }

  /**
   * Installs the built-in transition hooks that power router behavior.
   */
  /** @internal */
  _registerCoreTransitionHooks(): void {
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
  const toPath = trans._treeChanges.to || [];

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
  const path = (trans._treeChanges[pathname] || []) as PathNode[];

  const viewConfigs: ViewConfig[] = [];

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

function treeChangesCleanup(trans: Transition): void {
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
      result.state || trans.to(),
      result.params || trans.params(),
      trans._options,
    );
  }

  return undefined;
}

async function redirectToHook(
  this: TransitionProvider,
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
  return new ResolveContext(trans._treeChanges.to, trans._routerState._injector)
    .subContext(state._state!())
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
  this: TransitionProvider,
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

function updateUrlHook(this: TransitionProvider, transition: Transition): void {
  const options = transition._options;

  const stateService = this._stateService;

  const routerState = this._routerState;

  const navigable = stateService.$current?.navigable;

  if (options.source !== "url" && options.location && navigable?._url) {
    const urlOptions = {
      replace: options.location === "replace",
    };

    routerState._push(
      navigable._url,
      stateService._routerState._params,
      urlOptions,
    );
  }

  routerState._update(true);
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
    routerState._current = current?.self;
    const params = routerState._params;

    keys(params).forEach((key) => {
      delete params[key];
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
