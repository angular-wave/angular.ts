import {
  _exceptionHandlerProvider,
  _routerProvider,
} from "../../injection-tokens.ts";
import {
  assign,
  isDefined,
  isFunction,
  isInstanceOf,
  isObject,
  isString,
  values,
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
import {
  TransitionHook,
  TransitionHookPhase,
  TransitionHookScope,
} from "./transition-hook.ts";
import type { StateProvider } from "../state/state-service.ts";
import type { UrlService } from "../url/url-service.ts";
import {
  loadViewConfig,
  type _ViewConfig,
  type ViewService,
} from "../view/view.ts";

/** @internal */
export interface PathType {
  name: string;
  scope: number;
}

/** @internal */
export interface PathTypes {
  [key: string]: PathType;

  to: PathType;
  from: PathType;
  exiting: PathType;
  retained: PathType;
  entering: PathType;
}

export const defaultTransOpts: TransitionOptions = {
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

  /** @internal path type metadata used for matching */
  _criteriaPaths: PathTypes;

  /**
   * @internal Return event types, optionally filtered by phase, sorted by phase/order.
   */
  _getEvents(phase?: TransitionHookPhase): TransitionEventType[];

  /** @internal Register a transition-construction hook used by built-ins. */
  _onCreate(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn;

  /** @internal Wire hooks that require runtime services. */
  _initRuntimeHooks(
    stateService: StateProvider,
    urlService: UrlService,
    viewService: ViewService,
  ): void;

  /** @internal Return the defined path types */
  _getPathTypes(): PathTypes;

  /** @internal view service */
  /** @internal */
  _view: ViewService;

  /** @internal */
  _stateService: StateProvider;

  /** @internal */
  _urlService: UrlService;

  /** @internal */
  _exceptionHandler: ng.ExceptionHandlerService;
}

/**
 * Central registry and factory for transition events, hooks, and transition instances.
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
  _criteriaPaths: PathTypes;
  /** @internal */
  _routerState: RouterProvider;
  /** @internal */
  _view!: ViewService;
  /** @internal */
  _stateService!: StateProvider;
  /** @internal */
  _urlService!: UrlService;
  /** @internal */
  _exceptionHandler: ng.ExceptionHandlerService;

  constructor(
    routerState: RouterProvider,
    $exceptionHandler: ng.ExceptionHandlerProvider,
  ) {
    this._transitionCount = 0;
    this._eventTypes = [];
    this._registeredHooks = {};
    this._criteriaPaths = {} as PathTypes;
    this._routerState = routerState;
    this._defineCorePaths();
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
    urlService: UrlService,
    viewService: ViewService,
  ): void {
    this._view = viewService;
    this._stateService = stateService;
    this._urlService = urlService;
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

    const paths = this._criteriaPaths;

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

  /** @internal */
  _defineCorePaths(): void {
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

    for (let i = 0; i < this._eventTypes.length; i++) {
      const eventType = this._eventTypes[i];

      if (!isDefined(phase) || eventType.hookPhase === phase) {
        transitionHookTypes.push(eventType);
      }
    }

    return transitionHookTypes.sort((left, right) => {
      const cmpByPhase = left.hookPhase - right.hookPhase;

      return cmpByPhase === 0 ? left.hookOrder - right.hookOrder : cmpByPhase;
    });
  }

  /**
   * Defines one path selector used by transition hook matching.
   */
  /** @internal */
  _definePathType(name: keyof PathTypes, hookScope: number): void {
    this._criteriaPaths[name] = { name, scope: hookScope } as PathType;
  }

  /**
   * Returns the configured transition hook path selectors.
   */
  /** @internal */
  _getPathTypes(): PathTypes {
    return this._criteriaPaths;
  }

  /**
   * Returns hooks registered for a specific transition event name.
   */
  getHooks(hookName: string) {
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

      if (eventType.name === eventName) return eventType;
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

      for (let i = 0; i < entering.length; i++) {
        const state = entering[i];

        addTransitionResolvable(
          trans,
          Resolvable.fromData("$state$", state),
          state.name,
        );
      }
    },
  );
}

const TRANSITION_TOKENS = ["$transition$", Transition] as const;

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

function transitionViews(trans: Transition, pathname: string): _ViewConfig[] {
  const path = (trans._treeChanges[pathname] || []) as PathNode[];

  const viewConfigs: _ViewConfig[] = [];

  for (let i = 0; i < path.length; i++) {
    const views = path[i]._views || [];

    for (let j = 0; j < views.length; j++) {
      viewConfigs.push(views[j]);
    }
  }

  return viewConfigs;
}

function treeChangesCleanup(trans: Transition): void {
  const paths = values(trans._treeChanges as Record<string, PathNode[]>);

  const nodes: PathNode[] = [];

  for (let i = 0; i < paths.length; i++) {
    const path = paths[i];

    for (let j = 0; j < path.length; j++) {
      const node = path[j];

      if (nodes.indexOf(node) === -1) {
        nodes.push(node);
      }
    }
  }

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];

    const { resolvables } = node;

    for (let j = 0; j < resolvables.length; j++) {
      const resolve = resolvables[j];

      if (TRANSITION_TOKENS.some((token) => token === resolve.token)) {
        resolvables[j] = Resolvable.fromData(resolve.token, null);
      }
    }
  }
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

  for (let i = 0; i < enteringViews.length; i++) {
    promises[i] = Promise.resolve(loadViewConfig(enteringViews[i]));
  }

  return Promise.all(promises).then(noop);
}

function registerLoadEnteringViews(
  transitionService: TransitionService,
): DeregisterFn {
  return transitionService.onFinish({}, loadEnteringViews);
}

function updateViewConfigs(
  viewService: ViewService,
  enteringViews: _ViewConfig[],
  exitingViews: _ViewConfig[],
): void {
  for (let i = 0; i < exitingViews.length; i++) {
    viewService._deactivateViewConfig(exitingViews[i]);
  }

  for (let i = 0; i < enteringViews.length; i++) {
    viewService._activateViewConfig(enteringViews[i]);
  }

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
    if (ngViews[i].element.isConnected) {
      return true;
    }
  }

  return false;
}

function updateUrlHook(this: TransitionProvider, transition: Transition): void {
  const options = transition._options;

  const stateService = this._stateService;

  const urlService = this._urlService;

  const navigable = stateService.$current?.navigable;

  if (options.source !== "url" && options.location && navigable?.url) {
    const urlOptions = {
      replace: options.location === "replace",
    };

    urlService.push(
      navigable.url,
      stateService._routerState._params,
      urlOptions,
    );
  }

  urlService.update(true);
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

    for (const key in params) {
      delete params[key];
    }

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
