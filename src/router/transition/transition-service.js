import { Transition } from "./transition.js";
import { registerHook } from "./hook-registry.js";
import {
  registerAddCoreResolvables,
  treeChangesCleanup,
} from "../hooks/core-resolvables.js";
import {
  registerOnEnterHook,
  registerOnExitHook,
  registerOnRetainHook,
} from "../hooks/on-enter-exit-retain.js";
import {
  registerEagerResolvePath,
  registerLazyResolveState,
  registerResolveRemaining,
} from "../hooks/resolve.js";
import {
  registerActivateViews,
  registerLoadEnteringViews,
} from "../hooks/views.js";
import { registerLazyLoadHook } from "../hooks/lazy-load.js";
import { TransitionEventType } from "./transition-event-type.js";
import {
  TransitionHook,
  TransitionHookPhase,
  TransitionHookScope,
} from "./transition-hook.js";
import { isDefined } from "../../shared/utils.js";
import { registerIgnoredTransitionHook } from "../hooks/ignored-transition.js";
import { registerInvalidTransitionHook } from "../hooks/invalid-transition.js";
import { registerRedirectToHook } from "../hooks/redirect-to.js";
import { $injectTokens as $t, provider } from "../../injection-tokens.js";
import { copy } from "../../shared/common.js";
/** @typedef {import("./interface.ts").DeregisterFn} DeregisterFn */
/** @typedef {import("./interface.ts").HookFn} HookFn */
/** @typedef {import("./interface.ts").HookMatchCriteria} HookMatchCriteria */
/** @typedef {import("./interface.ts").HookRegOptions} HookRegOptions */
/** @typedef {import("./interface.ts").PathTypes} PathTypes */
/** @typedef {import("./interface.ts").RegisteredHooks} RegisteredHooks */
/**
 * The default [[Transition]] options.
 *
 * Include this object when applying custom defaults:
 * let reloadOpts = { reload: true, notify: true }
 * let options = defaults(theirOpts, customDefaults, defaultOptions);
 * @type {import("./interface.ts").TransitionOptions}
 */
export const defaultTransOpts = {
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
 * This class provides services related to Transitions.
 *
 * - Most importantly, it allows global Transition Hooks to be registered.
 * - It allows the default transition error handler to be set.
 * - It also has a factory function for creating new [[Transition]] objects, (used internally by the [[StateService]]).
 *
 * At bootstrap, [[UIRouter]] creates a single instance (singleton) of this class.
 *
 * This API is located at `router.transitionService` ([[UIRouter.transitionService]])
 */
export class TransitionProvider {
  /* @ignore */ static $inject = provider([
    $t._router,
    $t._view,
    $t._exceptionHandler,
  ]);

  /**
   * @param {ng.RouterService} globals
   * @param {ng.ViewService} viewService
   * @param {ng.ExceptionHandlerProvider} $exceptionHandler
   */
  constructor(globals, viewService, $exceptionHandler) {
    this._transitionCount = 0;
    /**
     * The transition hook types, such as `onEnter`, `onStart`, etc
     * @type {TransitionEventType[]}
     */
    this._eventTypes = [];
    /** @internal The registered transition hooks */
    /** @type {RegisteredHooks} */
    this._registeredHooks = {};
    /** The  paths on a criteria object */
    /** @type {PathTypes} */
    this._criteriaPaths = /** @type {PathTypes} */ ({});
    this.globals = globals;
    this.$view = viewService;
    /** @type {Record<string, DeregisterFn | undefined>} */
    this._deregisterHookFns = {};
    this._defineCorePaths();
    this._defineCoreEvents();
    this._registerCoreTransitionHooks();

    /** @type {ng.ExceptionHandlerService} */
    this._exceptionHandler = $exceptionHandler.handler;
    globals._successfulTransitions.onEvict(treeChangesCleanup);
  }

  $get = [
    $t._state,
    $t._url,
    $t._stateRegistry,
    $t._view,
    /**
     * @param {ng.StateService} stateService
     * @param {ng.UrlService} urlService
     * @param {ng.StateRegistryService} stateRegistry
     * @param {ng.ViewService} viewService
     * @returns {TransitionProvider}
     */
    (stateService, urlService, stateRegistry, viewService) => {
      // Lazy load state trees
      this._deregisterHookFns.lazyLoad = registerLazyLoadHook(
        this,
        stateService,
        urlService,
        stateRegistry,
      );

      // After globals.current is updated at priority: 10000
      this._deregisterHookFns.updateUrl = registerUpdateUrl(
        this,
        stateService,
        urlService,
      );

      // Wire up redirectTo hook
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
  ];
  /**
   * Registers a [[TransitionHookFn]], called *while a transition is being constructed*.
   *
   * Registers a transition lifecycle hook, which is invoked during transition construction.
   *
   * This low level hook should only be used by plugins.
   * This can be a useful time for plugins to add resolves or mutate the transition as needed.
   * The Sticky States plugin uses this hook to modify the treechanges.
   *
   * ### Lifecycle
   *
   * `onCreate` hooks are invoked *while a transition is being constructed*.
   *
   * ### Return value
   *
   * The hook's return value is ignored
   *
   * @internal
   * @param criteria defines which Transitions the Hook should be invoked for.
   * @param callback the hook function which will be invoked.
   * @param options the registration options
   * @returns a function which deregisters the hook.
   */

  /**
   * Creates a new [[Transition]] object
   *
   * This is a factory function for creating new Transition objects.
   * It is used internally by the [[StateService]] and should generally not be called by application code.
   *
   * @internal
   * @param fromPath the path to the current state (the from state)
   * @param targetState the target state (destination)
   * @returns a Transition
   */
  /**
   * @param {import("../path/path-node.js").PathNode[]} fromPath
   * @param {import("../state/target-state.js").TargetState} targetState
   */
  create(fromPath, targetState) {
    return new Transition(fromPath, targetState, this, this.globals);
  }

  _defineCoreEvents() {
    const TH = TransitionHook;

    const paths = this._criteriaPaths;

    const NORMAL_SORT = false,
      REVERSE_SORT = true;

    const SYNCHRONOUS = true;

    this._eventTypes = [
      new TransitionEventType(
        "onCreate",
        TransitionHookPhase._CREATE,
        0,
        paths.to,
        NORMAL_SORT,
        /** @type {any} */ (TH.LOG_REJECTED_RESULT),
        TH.THROW_ERROR,
        SYNCHRONOUS,
      ),
      new TransitionEventType(
        "onBefore",
        TransitionHookPhase._BEFORE,
        0,
        paths.to,
      ),
      new TransitionEventType("onStart", TransitionHookPhase._RUN, 0, paths.to),
      new TransitionEventType(
        "onExit",
        TransitionHookPhase._RUN,
        100,
        paths.exiting,
        REVERSE_SORT,
      ),
      new TransitionEventType(
        "onRetain",
        TransitionHookPhase._RUN,
        200,
        paths.retained,
      ),
      new TransitionEventType(
        "onEnter",
        TransitionHookPhase._RUN,
        300,
        paths.entering,
      ),
      new TransitionEventType(
        "onFinish",
        TransitionHookPhase._RUN,
        400,
        paths.to,
      ),
      new TransitionEventType(
        "onSuccess",
        TransitionHookPhase._SUCCESS,
        0,
        paths.to,
        NORMAL_SORT,
        /** @type {any} */ (TH.LOG_REJECTED_RESULT),
        TH.LOG_ERROR,
        SYNCHRONOUS,
      ),
      new TransitionEventType(
        "onError",
        TransitionHookPhase._ERROR,
        0,
        paths.to,
        NORMAL_SORT,
        /** @type {any} */ (TH.LOG_REJECTED_RESULT),
        TH.LOG_ERROR,
        SYNCHRONOUS,
      ),
    ];
  }

  _defineCorePaths() {
    const { _STATE: STATE, _TRANSITION: TRANSITION } = TransitionHookScope;

    this._definePathType("to", TRANSITION);
    this._definePathType("from", TRANSITION);
    this._definePathType("exiting", STATE);
    this._definePathType("retained", STATE);
    this._definePathType("entering", STATE);
  }

  /**
   * @param {TransitionHookPhase} [phase]
   * @return {any[]}
   */
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
   * Adds a Path to be used as a criterion against a TreeChanges path
   *
   * For example: the `exiting` path in [[HookMatchCriteria]] is a STATE scoped path.
   * It was defined by calling `defineTreeChangesCriterion('exiting', TransitionHookScope.STATE)`
   * Each state in the exiting path is checked against the criteria and returned as part of the match.
   *
   * Another example: the `to` path in [[HookMatchCriteria]] is a TRANSITION scoped path.
   * It was defined by calling `defineTreeChangesCriterion('to', TransitionHookScope.TRANSITION)`
   * Only the tail of the `to` path is checked against the criteria and returned as part of the match.
   * @internal
   * @param {string} name
   * @param {number} hookScope
   */
  _definePathType(name, hookScope) {
    this._criteriaPaths[name] = { name, scope: hookScope };
  }

  _getPathTypes() {
    return this._criteriaPaths;
  }

  /**
   * @param {string} hookName
   * @returns {import("./hook-registry.js").RegisteredHook[]}
   */
  getHooks(hookName) {
    return this._registeredHooks[hookName] || [];
  }

  /**
   * Registers a hook by event name.
   * @param {string} eventName
   * @param {HookMatchCriteria} matchCriteria
   * @param {HookFn} callback
   * @param {HookRegOptions} [options]
   * @returns {DeregisterFn}
   */
  on(eventName, matchCriteria, callback, options) {
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
   * @param {HookMatchCriteria} matchCriteria
   * @param {HookFn} callback
   * @param {HookRegOptions} [options]
   * @returns {DeregisterFn}
   */
  onCreate(matchCriteria, callback, options) {
    return this.on("onCreate", matchCriteria, callback, options);
  }

  /**
   * @param {HookMatchCriteria} matchCriteria
   * @param {HookFn} callback
   * @param {HookRegOptions} [options]
   * @returns {DeregisterFn}
   */
  onBefore(matchCriteria, callback, options) {
    return this.on("onBefore", matchCriteria, callback, options);
  }

  /**
   * @param {HookMatchCriteria} matchCriteria
   * @param {HookFn} callback
   * @param {HookRegOptions} [options]
   * @returns {DeregisterFn}
   */
  onStart(matchCriteria, callback, options) {
    return this.on("onStart", matchCriteria, callback, options);
  }

  /**
   * @param {HookMatchCriteria} matchCriteria
   * @param {HookFn} callback
   * @param {HookRegOptions} [options]
   * @returns {DeregisterFn}
   */
  onEnter(matchCriteria, callback, options) {
    return this.on("onEnter", matchCriteria, callback, options);
  }

  /**
   * @param {HookMatchCriteria} matchCriteria
   * @param {HookFn} callback
   * @param {HookRegOptions} [options]
   * @returns {DeregisterFn}
   */
  onRetain(matchCriteria, callback, options) {
    return this.on("onRetain", matchCriteria, callback, options);
  }

  /**
   * @param {HookMatchCriteria} matchCriteria
   * @param {HookFn} callback
   * @param {HookRegOptions} [options]
   * @returns {DeregisterFn}
   */
  onExit(matchCriteria, callback, options) {
    return this.on("onExit", matchCriteria, callback, options);
  }

  /**
   * @param {HookMatchCriteria} matchCriteria
   * @param {HookFn} callback
   * @param {HookRegOptions} [options]
   * @returns {DeregisterFn}
   */
  onFinish(matchCriteria, callback, options) {
    return this.on("onFinish", matchCriteria, callback, options);
  }

  /**
   * @param {HookMatchCriteria} matchCriteria
   * @param {HookFn} callback
   * @param {HookRegOptions} [options]
   * @returns {DeregisterFn}
   */
  onSuccess(matchCriteria, callback, options) {
    return this.on("onSuccess", matchCriteria, callback, options);
  }

  /**
   * @param {HookMatchCriteria} matchCriteria
   * @param {HookFn} callback
   * @param {HookRegOptions} [options]
   * @returns {DeregisterFn}
   */
  onError(matchCriteria, callback, options) {
    return this.on("onError", matchCriteria, callback, options);
  }

  /**
   * @param {string} eventName
   * @returns {TransitionEventType}
   */
  _getEventType(eventName) {
    const eventType = this._eventTypes.find((type) => type.name === eventName);

    if (!eventType) {
      throw new Error(`Unknown Transition hook event: ${eventName}`);
    }

    return eventType;
  }

  _registerCoreTransitionHooks() {
    const fns = this._deregisterHookFns;

    fns.addCoreResolves = registerAddCoreResolvables(this);
    fns.ignored = registerIgnoredTransitionHook(this);
    fns.invalid = registerInvalidTransitionHook(this);

    // Wire up onExit/Retain/Enter state hooks
    fns.onExit = registerOnExitHook(this);
    fns.onRetain = registerOnRetainHook(this);
    fns.onEnter = registerOnEnterHook(this);
    // Wire up Resolve hooks
    fns.eagerResolve = registerEagerResolvePath(this);
    fns.lazyResolve = registerLazyResolveState(this);
    fns.resolveAll = registerResolveRemaining(this);
    // Wire up the View management hooks
    fns.loadViews = registerLoadEnteringViews(this);

    // Updates global state after a transition
    fns.updateGlobals = registerUpdateGlobalState(this);
  }
}

/**
 * @param {ng.TransitionService} transitionService
 * @param {ng.StateService} stateService
 * @param {ng.UrlService} urlService
 */
function registerUpdateUrl(transitionService, stateService, urlService) {
  /**
   * A [[TransitionHookFn]] which updates the URL after a successful transition
   *
   * Registered using `transitionService.onSuccess({}, updateUrl);`
   */
  const updateUrl = (/** @type {ng.Transition}} */ transition) => {
    const options = transition.options();

    const $state = stateService;

    // Dont update the url in these situations:
    // The transition was triggered by a URL sync (options.source === 'url')
    // The user doesn't want the url to update (options.location === false)
    // The destination state, and all parents have no navigable url
    if (
      options.source !== "url" &&
      options.location &&
      $state.$current?.navigable
    ) {
      const urlOptions = /** @type {any} */ ({
        replace: options.location === "replace",
      });

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

/**
 * Registers a hook that keeps global router state in sync with transitions.
 *
 * - Sets the current transition before it runs
 * - Updates current state and params on success
 * - Clears the current transition when finished
 * @param {ng.TransitionService} transitionService
 */
function registerUpdateGlobalState(transitionService) {
  return transitionService.onCreate(
    {},
    /** @param {import("./transition.js").Transition} trans */ (trans) => {
      const globals = trans._globals;

      const transitionSuccessful = () => {
        globals._successfulTransitions.enqueue(trans);
        globals.$current = trans.$to();
        globals.current = globals.$current.self;
        copy(trans.params(), globals.params);
      };

      const clearCurrentTransition = () => {
        // Only clear if this transition is still the active one
        if (globals.transition === trans) {
          globals.transition = undefined;
        }
      };

      trans.onSuccess({}, transitionSuccessful, { priority: 10000 });
      trans.promise.then(clearCurrentTransition, clearCurrentTransition);
    },
  );
}
