import { StateMatcher } from "./state-matcher.ts";
import { StateBuilder } from "./state-builder.ts";
import { StateQueueManager } from "./state-queue-manager.ts";
import { applyPairs, removeFrom } from "../../shared/common.ts";
import { propEq } from "../../shared/hof.ts";
import { ResolveContext } from "../resolve/resolve-context.ts";
import { isString, keys } from "../../shared/utils.ts";
import { $injectTokens as $t } from "../../injection-tokens.ts";
import type { InjectorService } from "../../core/di/internal-injector.ts";
import type {
  BuiltStateDeclaration,
  StateDeclaration,
  StateOrName,
} from "./interface.ts";
import type { BuilderFunction } from "./state-builder.ts";
import type { StateStore } from "./state-matcher.ts";
import type { StateObject } from "./state-object.ts";
import type { UrlRules } from "../url/url-rules.ts";

/**
 * The signature for the callback function provided to [[StateRegistry.onStatesChanged]].
 */
export type StateRegistryListener = (
  event: "registered" | "deregistered",
  states: StateDeclaration[],
) => void;

/**
 * Either a [[StateDeclaration]] or an ES6 class that implements [[StateDeclaration]].
 *
 * The ES6 class constructor should have no arguments.
 */
export type _StateDeclaration = StateDeclaration | { new (): StateDeclaration };

/**
 * A registry for all of the application's [[StateDeclaration]]s
 *
 * This API is found at `$stateRegistry` ([[UIRouter.stateRegistry]])
 *
 */
export class StateRegistryProvider {
  /* @ignore */ static $inject = [
    $t._urlProvider,
    $t._stateProvider,
    $t._routerProvider,
    $t._viewProvider,
  ];

  states: StateStore;
  urlService: ng.UrlService;
  urlServiceRules: UrlRules;
  $injector: ng.InjectorService | undefined;
  listeners: StateRegistryListener[];
  matcher: StateMatcher;
  builder: StateBuilder;
  stateQueue: StateQueueManager;
  _root!: StateObject;

  /**
   * Creates the state registry and wires the matcher, builder, queue, and root state.
   */
  constructor(
    urlService: ng.UrlService,
    stateService: ng.StateService,
    globals: ng.RouterService,
    viewService: ng.ViewService,
  ) {
    this.states = {};

    stateService.stateRegistry = this; // <- circular wiring

    this.urlService = urlService;

    this.urlServiceRules = urlService._rules;

    this.$injector = undefined;

    this.listeners = [];

    this.matcher = new StateMatcher(this.states);

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
    globals.current = globals.$current.self;
  }

  /**
   * Wires the injector into the registry and state builder after bootstrap.
   */
  $get = [
    $t._injector,
    /**
     * Wires the injector into the registry and state builder after bootstrap.
     */
    ($injector: InjectorService) => {
      this.$injector = $injector;
      this.builder._$injector = $injector;

      return this;
    },
  ];

  /**
   * This is a [[StateBuilder.builder]] function for angular1 `onEnter`, `onExit`,
   * `onRetain` callback hooks on a [[StateDeclaration]].
   *
   * Returns a builder that decorates lifecycle hooks with resolve locals.
   */
  getStateHookBuilder(
    hookName: string,
  ): (
    stateObject: StateObject & Record<string, any>,
  ) =>
    | ((trans: ng.Transition, state: BuiltStateDeclaration) => any)
    | undefined {
    const that = this;

    /** Builds an injectable lifecycle hook wrapper for a specific state. */
    return function stateHookBuilder(
      stateObject: StateObject & Record<string, any>,
    ) {
      const hook = stateObject[hookName];

      const pathname = hookName === "onExit" ? "from" : "to";

      /** Invokes the lifecycle hook with transition metadata and resolve locals. */
      function decoratedNg1Hook(
        trans: ng.Transition,
        state: BuiltStateDeclaration,
      ) {
        const resolveContext = new ResolveContext(
          trans.treeChanges(
            pathname,
          ) as import("../path/path-node.ts").PathNode[],
        );

        const subContext = resolveContext.subContext(state._state());

        const locals = Object.assign(getLocals(subContext), {
          $state$: state,
          $transition$: trans,
        });

        return (that.$injector as ng.InjectorService).invoke(
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
  registerRoot(): void {
    const rootStateDef: ng.StateDeclaration = {
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
   * @param listener a callback function invoked when the registered states changes.
   *        The function receives two parameters, `event` and `state`.
   *        See [[StateRegistryListener]]
   * @return a function that deregisters the listener
   */
  onStatesChanged(listener: StateRegistryListener): () => void {
    this.listeners.push(listener);

    return () => {
      removeFrom(this.listeners, listener);
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
  root(): StateObject {
    return this._root;
  }

  /**
   * Adds a state to the registry
   *
   * Registers a [[StateDeclaration]] or queues it for registration.
   *
   * Note: a state will be queued if the state's parent isn't yet registered.
   *
   * @param stateDefinition the definition of the state to register.
   * @returns the internal [[StateObject]] object.
   *          If the state was successfully registered, then the object is fully built (See: [[StateBuilder]]).
   *          If the state was only queued, then the object is not fully built.
   */
  register(stateDefinition: _StateDeclaration): StateObject {
    return this.stateQueue.register(stateDefinition);
  }

  /** Deregisters a state and all of its descendants from the registry. */
  _deregisterTree(state: BuiltStateDeclaration): BuiltStateDeclaration[] {
    const all = this.getAll().map((x) => x._state());

    const getChildren = (
      states: BuiltStateDeclaration[],
    ): BuiltStateDeclaration[] => {
      const _children = all.filter(
        (x) => states.indexOf(x.parent as BuiltStateDeclaration) !== -1,
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
   * @param stateOrName the state's name or object representation
   * @returns a list of removed states
   */
  deregister(stateOrName: StateOrName): BuiltStateDeclaration[] {
    const state = this.get(stateOrName) as BuiltStateDeclaration | null;

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

  /** Returns all registered states as built state declarations. */
  getAll(): BuiltStateDeclaration[] {
    return keys(this.states).map(
      (name) => this.states[name].self as BuiltStateDeclaration,
    );
  }

  /**
   * Gets one registered state by name/object, or all states when no argument is provided.
   */
  get(
    stateOrName?: StateOrName,
    base?: StateOrName,
  ): StateDeclaration | StateDeclaration[] | null {
    if (arguments.length === 0)
      return keys(this.states).map((name) => this.states[name].self);
    const found = this.matcher.find(stateOrName as StateOrName, base);

    return (found && found.self) || null;
  }

  /**
   * Registers a [[BuilderFunction]] for a specific [[StateObject]] property (e.g., `parent`, `url`, or `path`).
   * More than one BuilderFunction can be registered for a given property.
   *
   * The BuilderFunction(s) will be used to define the property on any subsequently built [[StateObject]] objects.
   *
   * @param property The name of the State property being registered for.
   * @param builderFunction The BuilderFunction which will be used to build the State property
   * @returns a function which deregisters the BuilderFunction
   */
  decorator(property: string, builderFunction: BuilderFunction) {
    return this.builder.builder(property, builderFunction);
  }
}

export const getLocals = (ctx: ResolveContext): Record<string, any> => {
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
