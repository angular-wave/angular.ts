import { StateMatcher } from "./state-matcher.ts";
import { StateBuilder } from "./state-builder.ts";
import { StateObject } from "./state-object.ts";
import { annotate } from "../../core/di/di.ts";
import type { CompileRegistry } from "../../core/compile/compile.ts";
import { deleteProperty, hasOwn, isString, keys } from "../../shared/utils.ts";
import type {
  BuiltStateDeclaration,
  InternalStateDeclaration,
  StateDeclarationInput,
  StateDeclaration,
  StateOrName,
  StateRegistryListener,
  StateStore,
} from "./interface.ts";
import type { RouterRuntimeState } from "../router.ts";

function stateOrNameToString(stateOrName: StateOrName): string {
  return isString(stateOrName) ? stateOrName : stateOrName.name;
}

/**
 * Public `$stateRegistry` contract for dynamic route registration.
 *
 * Module-owned static routes should normally use [[NgModule.router]]. Use this
 * service when routes must be added or removed at runtime.
 */
export interface StateRegistryService {
  onStatesChanged(
    listener: (
      event: "registered" | "deregistered",
      states: StateDeclaration[],
    ) => void,
  ): () => void;
  root(): StateDeclaration;
  register(stateDefinition: StateDeclaration): StateDeclaration;
  deregister(stateOrName: StateOrName): StateDeclaration[];
  getAll(): StateDeclaration[];
  get(): StateDeclaration[];
  get(stateOrName: StateOrName, base?: StateOrName): StateDeclaration | null;
}

/**
 * A registry for all of the application's [[StateDeclaration]]s
 *
 * This API is found at `$stateRegistry`.
 *
 */
export class StateRegistryRuntime implements StateRegistryService {
  /** @internal */
  _states: StateStore;
  /** @internal */
  _routerState: RouterRuntimeState;
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

  constructor(
    routerState: RouterRuntimeState,
    compileRegistry: CompileRegistry,
  ) {
    this._states = {};

    this._routerState = routerState;

    this._$injector = undefined;

    this._listeners = [];

    this._matcher = new StateMatcher(this._states);

    this._builder = new StateBuilder(
      this._matcher,
      routerState,
      compileRegistry,
    );

    this._queue = [];

    this.registerRoot();

    routerState._currentState = this._root;
    routerState._current = routerState._currentState.self;
  }

  /** @internal */
  _initRuntime($injector: ng.InjectorService): this {
    this._$injector = $injector;
    this._builder._$injector = $injector;
    this._annotateDeferredResolvables($injector.strictDi);

    return this;
  }

  /** @internal */
  _annotateDeferredResolvables(strictDi: boolean | undefined): void {
    const states = this._getAllBuilt();

    states.forEach((state) => {
      const { resolvables } = state;

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
   * @return the public root state declaration
   */
  root(): StateDeclaration {
    return this._root.self;
  }

  /**
   * Adds a state to the registry
   *
   * Registers a [[StateDeclaration]] or queues it for registration.
   *
   * Note: a state will be queued if the state's parent isn't yet registered.
   *
   * @param {StateDeclarationInput} stateDefinition the definition of the state to register.
   * @returns the registered public state declaration.
   */
  register(stateDefinition: StateDeclarationInput): StateDeclaration {
    return this._register(stateDefinition).self;
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

    registered.forEach((state) => {
      declarations.push(state.self);
    });

    this._notifyListeners("registered", declarations);
  }

  /** @internal */
  _notifyListeners(
    event: "registered" | "deregistered",
    states: StateDeclaration[],
  ): void {
    this._listeners.forEach((listener) => {
      listener(event, states);
    });
  }

  /** @internal */
  _attachRoute(state: StateObject): void {
    if (!state.self.abstract && state._url) {
      this._routerState._routeTable._add(state);
    }
  }

  /**
   *
   * @param {BuiltStateDeclaration} state
   * @returns {BuiltStateDeclaration[]}
   */
  /** @internal */
  _deregisterTree(state: BuiltStateDeclaration): BuiltStateDeclaration[] {
    const all = this._getAllBuilt();

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
      this._routerState._routeTable._remove(_state as StateObject);
      // Remove state from registry
      deleteProperty(this._states, _state.name);
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
   * @returns {StateDeclaration[]} a list of removed state declarations
   */
  deregister(stateOrName: StateOrName): StateDeclaration[] {
    const stateDeclaration = this.get(
      stateOrName,
    ) as InternalStateDeclaration | null;

    if (!stateDeclaration) {
      throw new Error(
        `Can't deregister state; not found: ${stateOrNameToString(stateOrName)}`,
      );
    }
    const deregisteredStates = this._deregisterTree(stateDeclaration._state());

    const deregisteredDeclarations: StateDeclaration[] = [];

    deregisteredStates.forEach((stateDeclaration) => {
      deregisteredDeclarations.push(stateDeclaration.self);
    });

    this._notifyListeners("deregistered", deregisteredDeclarations);

    return deregisteredDeclarations;
  }

  /** @internal */
  _getAllBuilt(): BuiltStateDeclaration[] {
    const stateNames = keys(this._states);

    const states: BuiltStateDeclaration[] = [];

    stateNames.forEach((name) => {
      states.push(this._states[name] as BuiltStateDeclaration);
    });

    return states;
  }

  /**
   * @return {StateDeclaration[]}
   */
  getAll(): StateDeclaration[] {
    return this._getAllBuilt().map((state) => state.self);
  }

  /**
   *
   * @param {StateOrName} [stateOrName]
   * @param {StateOrName} [base]
   * @returns {StateDeclaration | StateDeclaration[] | null}
   */
  get(): StateDeclaration[];
  get(stateOrName: StateOrName, base?: StateOrName): StateDeclaration | null;
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

    const found =
      stateOrName === undefined
        ? undefined
        : this._matcher.find(stateOrName, base);

    return found?.self ?? null;
  }
}
