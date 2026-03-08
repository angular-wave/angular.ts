import { copy } from "../../shared/common.ts";
import { isDefined } from "../../shared/utils.js";
import { $injectTokens as $t } from "../../injection-tokens.ts";
import {
  registerAddCoreResolvables,
  treeChangesCleanup,
} from "../hooks/core-resolvables.ts";
import { registerIgnoredTransitionHook } from "../hooks/ignored-transition.ts";
import { registerInvalidTransitionHook } from "../hooks/invalid-transition.ts";
import { registerLazyLoadHook } from "../hooks/lazy-load.ts";
import {
  registerOnEnterHook,
  registerOnExitHook,
  registerOnRetainHook,
} from "../hooks/on-enter-exit-retain.ts";
import { registerRedirectToHook } from "../hooks/redirect-to.ts";
import {
  registerEagerResolvePath,
  registerLazyResolveState,
  registerResolveRemaining,
} from "../hooks/resolve.ts";
import {
  registerActivateViews,
  registerLoadEnteringViews,
} from "../hooks/views.ts";
import type { PathNode } from "../path/path-node.ts";
import type { TargetState } from "../state/target-state.ts";
import { makeEvent, registerHook } from "./hook-registry.ts";
import type {
  DeregisterFn,
  HookFn,
  HookMatchCriteria,
  HookRegOptions,
  PathType,
  PathTypes,
  RegisteredHooks,
  TransitionOptions,
  TransitionService,
} from "./interface.ts";
import { TransitionEventType } from "./transition-event-type.ts";
import {
  TransitionHook,
  TransitionHookPhase,
  TransitionHookScope,
} from "./transition-hook.ts";
import { Transition } from "./transition.ts";

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

export class TransitionProvider implements TransitionService {
  static $inject = [
    $t._routerProvider,
    $t._viewProvider,
    $t._exceptionHandlerProvider,
  ] as const;

  _transitionCount: number;
  _eventTypes: TransitionEventType[];
  _registeredHooks: RegisteredHooks;
  _criteriaPaths: PathTypes;
  globals: ng.RouterProvider;
  $view: ng.ViewService;
  _deregisterHookFns: Record<string, DeregisterFn | undefined>;
  _exceptionHandler: ng.ExceptionHandlerService;

  constructor(
    globals: ng.RouterProvider,
    viewService: ng.ViewService,
    $exceptionHandler: ng.ExceptionHandlerProvider,
  ) {
    this._transitionCount = 0;
    this._eventTypes = [];
    this._registeredHooks = {};
    this._criteriaPaths = {} as PathTypes;
    this.globals = globals;
    this.$view = viewService;
    this._deregisterHookFns = {};
    this._defineCorePaths();
    this._defineCoreEvents();
    this._registerCoreTransitionHooks();
    this._exceptionHandler = $exceptionHandler.handler;
    globals._successfulTransitions.onEvict(treeChangesCleanup);
  }

  $get = [
    $t._state,
    $t._url,
    $t._stateRegistry,
    $t._view,
    (
      stateService: ng.StateService,
      urlService: ng.UrlService,
      stateRegistry: ng.StateRegistryService,
      viewService: ng.ViewService,
    ): TransitionProvider => {
      this._deregisterHookFns.lazyLoad = registerLazyLoadHook(
        this,
        stateService,
        urlService,
        stateRegistry,
      );

      this._deregisterHookFns.updateUrl = registerUpdateUrl(
        this,
        stateService,
        urlService,
      );

      this._deregisterHookFns.redirectTo = registerRedirectToHook(
        this,
        stateService,
      );

      this._deregisterHookFns.activateViews = registerActivateViews(
        this,
        viewService,
      );

      return this;
    },
  ] as const;

  create(fromPath: PathNode[], targetState: TargetState): Transition {
    return new Transition(fromPath, targetState, this, this.globals);
  }

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
      TH.LOG_REJECTED_RESULT,
      TH.THROW_ERROR,
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
      TH.LOG_REJECTED_RESULT,
      TH.LOG_ERROR,
      SYNCHRONOUS,
    );
    this._defineEvent(
      "onError",
      TransitionHookPhase._ERROR,
      0,
      paths.to,
      NORMAL_SORT,
      TH.LOG_REJECTED_RESULT,
      TH.LOG_ERROR,
      SYNCHRONOUS,
    );
  }

  _defineCorePaths(): void {
    const { _STATE: STATE, _TRANSITION: TRANSITION } = TransitionHookScope;

    this._definePathType("to", TRANSITION);
    this._definePathType("from", TRANSITION);
    this._definePathType("exiting", STATE);
    this._definePathType("retained", STATE);
    this._definePathType("entering", STATE);
  }

  _defineEvent(
    name: string,
    hookPhase: TransitionHookPhase,
    hookOrder: number,
    criteriaMatchPath: PathType,
    reverseSort = false,
    getResultHandler = TransitionHook.HANDLE_RESULT,
    getErrorHandler = TransitionHook.REJECT_ERROR,
    synchronous = false,
  ): void {
    const eventType = new TransitionEventType(
      name,
      hookPhase,
      hookOrder,
      criteriaMatchPath,
      reverseSort,
      getResultHandler,
      getErrorHandler,
      synchronous,
    );

    this._eventTypes.push(eventType);
    makeEvent(this, this, eventType);
  }

  _getEvents(phase?: TransitionHookPhase): TransitionEventType[] {
    const transitionHookTypes = isDefined(phase)
      ? this._eventTypes.filter((type) => type.hookPhase === phase)
      : this._eventTypes.slice();

    return transitionHookTypes.sort((left, right) => {
      const cmpByPhase = left.hookPhase - right.hookPhase;

      return cmpByPhase === 0 ? left.hookOrder - right.hookOrder : cmpByPhase;
    });
  }

  _definePathType(name: keyof PathTypes, hookScope: number): void {
    this._criteriaPaths[name] = { name, scope: hookScope } as PathType;
  }

  _getPathTypes(): PathTypes {
    return this._criteriaPaths;
  }

  getHooks(hookName: string) {
    return this._registeredHooks[hookName] || [];
  }

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

  onCreate(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn {
    return this.on("onCreate", matchCriteria, callback, options);
  }

  onBefore(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn {
    return this.on("onBefore", matchCriteria, callback, options);
  }

  onStart(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn {
    return this.on("onStart", matchCriteria, callback, options);
  }

  onEnter(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn {
    return this.on("onEnter", matchCriteria, callback, options);
  }

  onRetain(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn {
    return this.on("onRetain", matchCriteria, callback, options);
  }

  onExit(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn {
    return this.on("onExit", matchCriteria, callback, options);
  }

  onFinish(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn {
    return this.on("onFinish", matchCriteria, callback, options);
  }

  onSuccess(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn {
    return this.on("onSuccess", matchCriteria, callback, options);
  }

  onError(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn {
    return this.on("onError", matchCriteria, callback, options);
  }

  _getEventType(eventName: string): TransitionEventType {
    const eventType = this._eventTypes.find((type) => type.name === eventName);

    if (!eventType) {
      throw new Error(`Unknown Transition hook event: ${eventName}`);
    }

    return eventType;
  }

  _registerCoreTransitionHooks(): void {
    const fns = this._deregisterHookFns;

    fns.addCoreResolves = registerAddCoreResolvables(this);
    fns.ignored = registerIgnoredTransitionHook(this);
    fns.invalid = registerInvalidTransitionHook(this);
    fns.onExit = registerOnExitHook(this);
    fns.onRetain = registerOnRetainHook(this);
    fns.onEnter = registerOnEnterHook(this);
    fns.eagerResolve = registerEagerResolvePath(this);
    fns.lazyResolve = registerLazyResolveState(this);
    fns.resolveAll = registerResolveRemaining(this);
    fns.loadViews = registerLoadEnteringViews(this);
    fns.updateGlobals = registerUpdateGlobalState(this);
    fns.lazyLoad = registerLazyLoadHook(this);
  }
}

function registerUpdateUrl(
  transitionService: TransitionService,
  stateService: ng.StateService,
  urlService: ng.UrlService,
): DeregisterFn {
  const updateUrl = (transition: Transition): void => {
    const options = transition.options();
    const $state = stateService;

    if (
      options.source !== "url" &&
      options.location &&
      $state.$current?.navigable
    ) {
      const urlOptions = {
        replace: options.location === "replace",
      } as any;

      urlService.push(
        $state.$current.navigable.url,
        $state.globals.params,
        urlOptions,
      );
    }

    urlService.update(true);
  };

  return transitionService.onSuccess({}, updateUrl, { priority: 9999 });
}

function registerUpdateGlobalState(
  transitionService: TransitionService,
): DeregisterFn {
  return transitionService.onCreate({}, (trans: Transition) => {
    const globals = trans._globals;

    const transitionSuccessful = (): void => {
      globals._successfulTransitions.enqueue(trans);
      globals.$current = trans.$to();
      globals.current = globals.$current.self;
      copy(trans.params(), globals.params);
    };

    const clearCurrentTransition = (): void => {
      if (globals.transition === trans) {
        globals.transition = undefined;
      }
    };

    trans.onSuccess({}, transitionSuccessful, { priority: 10000 });
    trans.promise.then(clearCurrentTransition, clearCurrentTransition);
  });
}
