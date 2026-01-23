import { StateMatcher } from "./state-matcher.js";
import { StateBuilder } from "./state-builder.js";
import { StateQueueManager } from "./state-queue-manager.js";
import { applyPairs, removeFrom } from "../../shared/common.js";
import { propEq } from "../../shared/hof.js";
import { ResolveContext } from "../resolve/resolve-context.js";
import { isString, keys } from "../../shared/utils.js";
import { $injectTokens as $t, provider } from "../../injection-tokens.js";

/** @typedef {import("./state-object.js").StateObject} StateObject */
/** @typedef {import("./interface.ts").BuiltStateDeclaration} BuiltStateDeclaration */
/** @typedef {import('../../interface.ts').ServiceProvider} ServiceProvider } */

/**
 * A registry for all of the application's [[StateDeclaration]]s
 *
 * This API is found at `$stateRegistry` ([[UIRouter.stateRegistry]])
 *
 */
export class StateRegistryProvider {
  /* @ignore */ static $inject = provider([
    $t._url,
    $t._state,
    $t._router,
    $t._view,
  ]);

  /**
   * @param {ng.UrlService} urlService
   * @param {ng.StateService} stateService
   * @param {ng.RouterService} globals
   * @param {ng.ViewService} viewService
   */
  constructor(urlService, stateService, globals, viewService) {
    /** @type {import("./interface.ts").StateStore} */
    this.states = {};

    stateService.stateRegistry = this; // <- circular wiring

    /**
     * @type {ng.UrlService}
     */
    this.urlService = urlService;

    /**
     * @type {import("../url/url-rules.js").UrlRules}
     */
    this.urlServiceRules = urlService._rules;

    /**
     * @type {ng.InjectorService|undefined}
     */
    this.$injector = undefined;

    /**
     * @type {import("./interface.ts").StateRegistryListener[]}
     */
    this.listeners = [];

    /**
     *@type {StateMatcher}
     */
    this.matcher = new StateMatcher(this.states);

    /**
     * @type {StateBuilder}
     */
    this.builder = new StateBuilder(this.matcher, urlService);
    // Apply ng1 specific StateBuilder code for `onExit/Retain/Enter` properties
    this.builder.builder("onExit", this.getStateHookBuilder("onExit"));
    this.builder.builder("onRetain", this.getStateHookBuilder("onRetain"));
    this.builder.builder("onEnter", this.getStateHookBuilder("onEnter"));

    this.stateQueue = new StateQueueManager(
      this,
      this.urlServiceRules,
      this.states,
      this.builder,
      this.listeners,
    );

    this.registerRoot();

    viewService.rootViewContext(this.root());
    globals.$current = this.root();
    globals.current = /** @type {import("./state-service.js").StateObject} */ (
      globals.$current
    ).self;
  }

  $get = [
    $t._injector,
    /**
     * @param {import("../../core/di/internal-injector").InjectorService} $injector
     * @returns {StateRegistryProvider}
     */
    ($injector) => {
      this.$injector = $injector;
      this.builder._$injector = $injector;

      return this;
    },
  ];

  /**
   * This is a [[StateBuilder.builder]] function for angular1 `onEnter`, `onExit`,
   * `onRetain` callback hooks on a [[StateDeclaration]].
   *
   * @param {string} hookName
   */
  getStateHookBuilder(hookName) {
    const that = this;

    /**
     * @param {import("./state-object").StateObject & Record<string, any>} stateObject
     * @returns {((trans: ng.Transition, state: ng.BuiltStateDeclaration) => any) | undefined}
     */
    return function stateHookBuilder(stateObject) {
      const hook = stateObject[hookName];

      const pathname = hookName === "onExit" ? "from" : "to";

      /**
       * @param {ng.Transition} trans
       * @param {ng.BuiltStateDeclaration} state
       * @returns {any}
       */
      function decoratedNg1Hook(trans, state) {
        const resolveContext = new ResolveContext(
          /** @type {import("../resolve/resolve-context.js").PathNode[]} */ (
            trans.treeChanges(pathname)
          ),
        );

        const subContext = resolveContext.subContext(state._state());

        const locals = Object.assign(getLocals(subContext), {
          $state$: state,
          $transition$: trans,
        });

        return /** @type {ng.InjectorService} */ (that.$injector).invoke(
          hook,
          that,
          locals,
        );
      }

      return hook ? decoratedNg1Hook : undefined;
    };
  }

  /**
   * @private
   */
  registerRoot() {
    /** @type {ng.StateDeclaration} */
    const rootStateDef = {
      name: "",
      url: "^",
      params: {
        "#": { value: null, type: "hash", dynamic: true },
      },
      abstract: true,
    };

    this._root = this.stateQueue.register(rootStateDef);
    this._root.navigable = null;
  }

  /**
   * Listen for a State Registry events
   *
   * Adds a callback that is invoked when states are registered or deregistered with the StateRegistry.
   *
   * #### Example:
   * ```js
   * let allStates = registry.get();
   *
   * // Later, invoke deregisterFn() to remove the listener
   * let deregisterFn = registry.onStatesChanged((event, states) => {
   *   switch(event) {
   *     case: 'registered':
   *       states.forEach(state => allStates.push(state));
   *       break;
   *     case: 'deregistered':
   *       states.forEach(state => {
   *         let idx = allStates.indexOf(state);
   *         if (idx !== -1) allStates.splice(idx, 1);
   *       });
   *       break;
   *   }
   * });
   * ```
   *
   * @param {import("./interface.ts").StateRegistryListener} listener a callback function invoked when the registered states changes.
   *        The function receives two parameters, `event` and `state`.
   *        See [[StateRegistryListener]]
   * @return a function that deregisters the listener
   */
  onStatesChanged(listener) {
    /** @type {StateRegistryProvider} */
    const registryProvider = this;

    this.listeners.push(listener);

    return () => {
      removeFrom(registryProvider.listeners, listener);
    };
  }

  /**
   * Gets the implicit root state
   *
   * Gets the root of the state tree.
   * The root state is implicitly created by ng-router.
   * Note: this returns the internal [[StateObject]] representation, not a [[StateDeclaration]]
   *
   * @return the root [[StateObject]]
   */
  root() {
    return this._root;
  }

  /**
   * Adds a state to the registry
   *
   * Registers a [[StateDeclaration]] or queues it for registration.
   *
   * Note: a state will be queued if the state's parent isn't yet registered.
   *
   * @param {import("./interface.ts")._StateDeclaration} stateDefinition the definition of the state to register.
   * @returns the internal [[StateObject]] object.
   *          If the state was successfully registered, then the object is fully built (See: [[StateBuilder]]).
   *          If the state was only queued, then the object is not fully built.
   */
  register(stateDefinition) {
    return this.stateQueue.register(stateDefinition);
  }

  /**
   *
   * @param {BuiltStateDeclaration} state
   * @returns {BuiltStateDeclaration[]}
   */
  _deregisterTree(state) {
    /** @type {BuiltStateDeclaration[]} */
    const all = this.getAll().map((x) => x._state());

    /** @type {(states: BuiltStateDeclaration[]) => BuiltStateDeclaration[]} */
    const getChildren = /** @param {BuiltStateDeclaration[]} states */ (
      states,
    ) => {
      const _children = all.filter(
        (x) =>
          states.indexOf(/** @type {BuiltStateDeclaration} */ (x.parent)) !==
          -1,
      );

      return _children.length === 0
        ? _children
        : _children.concat(getChildren(_children));
    };

    const children = getChildren([state]);

    const deregistered = [state].concat(children).reverse();

    deregistered.forEach((_state) => {
      const rulesApi = this.urlServiceRules;

      // Remove URL rule
      rulesApi
        .rules()
        .filter(propEq("state", _state))
        .forEach((rule) => rulesApi.removeRule(rule));
      // Remove state from registry
      delete this.states[_state.name];
    });

    return deregistered;
  }

  /**
   * Removes a state from the registry
   *
   * This removes a state from the registry.
   * If the state has children, they are are also removed from the registry.
   *
   * @param {import("./interface.ts").StateOrName} stateOrName the state's name or object representation
   * @returns {BuiltStateDeclaration[]} a list of removed states
   */
  deregister(stateOrName) {
    const state = /** @type {BuiltStateDeclaration} */ (this.get(stateOrName));

    if (!state)
      throw new Error(`Can't deregister state; not found: ${stateOrName}`);
    const deregisteredStates = this._deregisterTree(state._state());

    this.listeners.forEach((listener) =>
      listener(
        "deregistered",
        deregisteredStates.map((x) => x.self),
      ),
    );

    return deregisteredStates;
  }

  /**
   * @return {ng.BuiltStateDeclaration[]}
   */
  getAll() {
    return keys(this.states).map(
      (name) =>
        /** @type {ng.BuiltStateDeclaration} */ (this.states[name].self),
    );
  }

  /**
   *
   * @param {import("./interface.ts").StateOrName} stateOrName
   * @param {import("./interface.ts").StateOrName} [base]
   * @returns {import("./state-service.js").StateDeclaration | import("./state-service.js").StateDeclaration[] | null}
   */
  get(stateOrName, base) {
    if (arguments.length === 0)
      return keys(this.states).map((name) => this.states[name].self);
    const found = this.matcher.find(stateOrName, base);

    return (found && found.self) || null;
  }

  /**
   * Registers a [[BuilderFunction]] for a specific [[StateObject]] property (e.g., `parent`, `url`, or `path`).
   * More than one BuilderFunction can be registered for a given property.
   *
   * The BuilderFunction(s) will be used to define the property on any subsequently built [[StateObject]] objects.
   *
   * @param {string} property The name of the State property being registered for.
   * @param {import("./interface.ts").BuilderFunction} builderFunction The BuilderFunction which will be used to build the State property
   * @returns a function which deregisters the BuilderFunction
   */
  decorator(property, builderFunction) {
    return this.builder.builder(property, builderFunction);
  }
}

export const getLocals = /** @param {ResolveContext} ctx */ (ctx) => {
  /** @type {string[]} */
  const tokens = ctx.getTokens().filter(isString);

  const tuples = tokens.map((key) => {
    const resolvable = ctx.getResolvable(key);

    const waitPolicy = ctx.getPolicy(resolvable).async;

    return [
      key,
      waitPolicy === "NOWAIT" ? resolvable.promise : resolvable.data,
    ];
  });

  return tuples.reduce(applyPairs, {});
};
