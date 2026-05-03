import { _injector, _routerProvider } from "../../injection-tokens.ts";
import { StateMatcher } from "./state-matcher.ts";
import { StateBuilder } from "./state-builder.ts";
import { StateObject } from "./state-object.ts";
import { annotate } from "../../core/di/di.ts";
import { ResolveContext } from "../resolve/resolve-context.ts";
import { hasOwn, keys, isString } from "../../shared/utils.ts";
import type { InjectorService } from "../../core/di/internal-injector.ts";
import type {
  BuiltStateDeclaration,
  StateDeclarationInput,
  StateDeclaration,
  StateOrName,
  StateRegistryListener,
  StateStore,
} from "./interface.ts";
import type { RouterProvider } from "../router.ts";

/**
 * A registry for all of the application's [[StateDeclaration]]s
 *
 * This API is found at `$stateRegistry`.
 *
 */
export class StateRegistryProvider {
  /* @ignore */ static $inject = [_routerProvider];

  /** @internal */
  _states: StateStore;
  /** @internal */
  _routerState: RouterProvider;
  /** @internal */
  _$injector: ng.InjectorService | undefined;
  /** @internal */
  _listeners: StateRegistryListener[];
  /** @internal */
  _matcher: StateMatcher;
  /** @internal */
  _builder: StateBuilder;
  /** @internal */
  _queue: StateObject[];
  /** @internal */
  _root!: StateObject;

  constructor(routerState: RouterProvider) {
    this._states = {};

    this._routerState = routerState;

    this._$injector = undefined;

    this._listeners = [];

    this._matcher = new StateMatcher(this._states);

    this._builder = new StateBuilder(this._matcher, routerState);

    this._queue = [];

    this.registerRoot();

    routerState._currentState = this.root();
    routerState._current = routerState._currentState.self;
  }

  $get = [
    _injector,
    /**
     * @param {InjectorService} $injector
     * @returns {StateRegistryProvider}
     */
    ($injector: InjectorService) => {
      this._$injector = $injector;
      this._builder._$injector = $injector;
      this._annotateDeferredResolvables($injector.strictDi);

      return this;
    },
  ];

  /** @internal */
  _annotateDeferredResolvables(strictDi: boolean | undefined): void {
    const states = this.getAll();

    states.forEach((state) => {
      const resolvables = state._state().resolvables || [];

      resolvables.forEach((resolvable) => {
        if (resolvable.deps === "deferred") {
          resolvable.deps = annotate(resolvable.resolveFn, strictDi);
        }
      });
    });
  }

  /**
   * @private
   */
  registerRoot(): void {
    const rootStateDef: StateDeclaration = {
      name: "",
      url: "^",
      params: {
        "#": { value: null, type: "hash", dynamic: true },
      },
      abstract: true,
    };

    this._root = this._register(rootStateDef);
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
   * @param {StateRegistryListener} listener a callback function invoked when the registered states changes.
   *        The function receives two parameters, `event` and `state`.
   *        See [[StateRegistryListener]]
   * @return a function that deregisters the listener
   */
  onStatesChanged(listener: StateRegistryListener): () => void {
    this._listeners.push(listener);

    return () => {
      const index = this._listeners.indexOf(listener);

      if (index !== -1) {
        this._listeners.splice(index, 1);
      }
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
   * @param {StateDeclarationInput} stateDefinition the definition of the state to register.
   * @returns the internal [[StateObject]] object.
   *          If the state was successfully registered, then the object is fully built (See: [[StateBuilder]]).
   *          If the state was only queued, then the object is not fully built.
   */
  register(stateDefinition: StateDeclarationInput): StateObject {
    return this._register(stateDefinition);
  }

  /** @internal */
  _register(stateDeclaration: ng.StateDeclaration): StateObject {
    const state = new StateObject(stateDeclaration);

    const { name } = state;

    if (!isString(name)) throw new Error("State must have a valid name");

    if (hasOwn(this._states, name) || this._isQueued(name)) {
      throw new Error(`State '${name}' is already defined`);
    }

    this._queue.push(state);
    this._flush();

    return state;
  }

  /** @internal */
  _isQueued(name: string): boolean {
    const { _queue } = this;

    for (let i = 0; i < _queue.length; i++) {
      if (_queue[i].name === name) return true;
    }

    return false;
  }

  /** @internal */
  _flush(): StateStore {
    const { _queue, _states, _builder } = this;

    const registered: StateObject[] = [];

    const orphans: StateObject[] = [];

    const previousQueueLength: Record<string, number> = {};

    while (_queue.length) {
      const state = _queue.shift();

      if (!state) continue;

      const { name } = state;

      const result = _builder._build(state);

      const orphanIndex = orphans.indexOf(state);

      if (result) {
        const existingState = hasOwn(_states, name) ? _states[name] : undefined;

        if (existingState?.name === name) {
          throw new Error(`State '${name}' is already defined`);
        }

        _states[name] = state;
        this._attachRoute(state);

        if (orphanIndex >= 0) orphans.splice(orphanIndex, 1);
        registered.push(state);
        continue;
      }

      const previousLength = previousQueueLength[name];

      previousQueueLength[name] = _queue.length;

      if (orphanIndex >= 0 && previousLength === _queue.length) {
        _queue.push(state);
        this._notifyRegistered(registered);

        return _states;
      }

      if (orphanIndex < 0) {
        orphans.push(state);
      }

      _queue.push(state);
    }

    this._notifyRegistered(registered);

    return _states;
  }

  /** @internal */
  _notifyRegistered(registered: StateObject[]): void {
    if (!registered.length) return;

    const declarations: StateDeclaration[] = [];

    registered.forEach((state) => declarations.push(state.self));

    this._notifyListeners("registered", declarations);
  }

  /** @internal */
  _notifyListeners(
    event: "registered" | "deregistered",
    states: StateDeclaration[],
  ): void {
    this._listeners.forEach((listener) => listener(event, states));
  }

  /** @internal */
  _attachRoute(state: StateObject): void {
    if (!state.self.abstract && state._url) {
      this._routerState._registerStateRoute(state);
    }
  }

  /**
   *
   * @param {BuiltStateDeclaration} state
   * @returns {BuiltStateDeclaration[]}
   */
  /** @internal */
  _deregisterTree(state: BuiltStateDeclaration): BuiltStateDeclaration[] {
    const allDeclarations = this.getAll();

    const all: BuiltStateDeclaration[] = [];

    allDeclarations.forEach((declaration) => {
      all.push(declaration._state());
    });

    const children: BuiltStateDeclaration[] = [];

    const queue = [state];

    for (let i = 0; i < queue.length; i++) {
      const parent = queue[i];

      for (let j = 0; j < all.length; j++) {
        const candidate = all[j];

        if (candidate.parent === parent) {
          children.push(candidate);
          queue.push(candidate);
        }
      }
    }

    const deregistered = children.slice().reverse();

    deregistered.push(state);

    deregistered.forEach((_state) => {
      this._routerState._removeStateRoute(_state as StateObject);
      // Remove state from registry
      delete this._states[_state.name];
    });

    return deregistered;
  }

  /**
   * Removes a state from the registry
   *
   * This removes a state from the registry.
   * If the state has children, they are are also removed from the registry.
   *
   * @param {StateOrName} stateOrName the state's name or object representation
   * @returns {BuiltStateDeclaration[]} a list of removed states
   */
  deregister(stateOrName: StateOrName): BuiltStateDeclaration[] {
    const state = this.get(stateOrName) as BuiltStateDeclaration | null;

    if (!state)
      throw new Error(`Can't deregister state; not found: ${stateOrName}`);
    const deregisteredStates = this._deregisterTree(state._state());

    const deregisteredDeclarations: StateDeclaration[] = [];

    deregisteredStates.forEach((stateDeclaration) => {
      deregisteredDeclarations.push(stateDeclaration.self);
    });

    this._notifyListeners("deregistered", deregisteredDeclarations);

    return deregisteredStates;
  }

  /**
   * @return {ng.BuiltStateDeclaration[]}
   */
  getAll(): BuiltStateDeclaration[] {
    const stateNames = keys(this._states);

    const states: BuiltStateDeclaration[] = [];

    stateNames.forEach((name) => {
      states.push(this._states[name].self as BuiltStateDeclaration);
    });

    return states;
  }

  /**
   *
   * @param {StateOrName} [stateOrName]
   * @param {StateOrName} [base]
   * @returns {StateDeclaration | StateDeclaration[] | null}
   */
  get(
    stateOrName?: StateOrName,
    base?: StateOrName,
  ): StateDeclaration | StateDeclaration[] | null {
    if (arguments.length === 0) {
      const stateNames = keys(this._states);

      const states: StateDeclaration[] = [];

      stateNames.forEach((name) => {
        states.push(this._states[name].self);
      });

      return states;
    }

    const found = this._matcher.find(stateOrName as StateOrName, base);

    return (found && found.self) || null;
  }
}

export function getLocals(ctx: ResolveContext): Record<string, unknown> {
  const tokens = ctx.getTokens();

  const locals: Record<string, unknown> = {};

  tokens.forEach((key) => {
    if (isString(key)) {
      locals[key] = ctx.getResolvable(key).data;
    }
  });

  return locals;
}
