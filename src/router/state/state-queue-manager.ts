import { hasOwn, isString } from "../../shared/utils.ts";
import { StateObject } from "./state-object.ts";
import type { StateRegistryProvider } from "./state-registry.ts";
import type { StateRegistryListener, StateStore } from "./interface.ts";
import type { StateBuilder } from "./state-builder.ts";
import type { UrlRules } from "../url/url-rules.ts";

/**
 * Queues state declarations until their parents exist, then builds and registers them.
 */
export class StateQueueManager {
  stateRegistry: StateRegistryProvider;
  urlServiceRules: UrlRules;
  states: StateStore;
  builder: StateBuilder;
  listeners: StateRegistryListener[];
  queue: StateObject[];

  /**
   * @param {import("./state-registry.ts").StateRegistryProvider} stateRegistry
   * @param {import("../url/url-rules.ts").UrlRules} urlServiceRules
   * @param {import("./interface.ts").StateStore} states
   * @param {import("./state-builder.ts").StateBuilder} builder
   * @param {StateRegistryListener[]} listeners
   */
  constructor(
    stateRegistry: StateRegistryProvider,
    urlServiceRules: UrlRules,
    states: StateStore,
    builder: StateBuilder,
    listeners: StateRegistryListener[],
  ) {
    this.stateRegistry = stateRegistry;
    this.urlServiceRules = urlServiceRules;
    this.states = states;
    this.builder = builder;
    this.listeners = listeners;
    this.queue = [];
  }

  /**
   * Queues a state declaration and attempts to flush the registration queue.
   *
   * @param {ng.StateDeclaration} stateDecl
   * @returns {StateObject}
   */
  register(stateDecl: ng.StateDeclaration): StateObject {
    const state = new StateObject(stateDecl);
    const { name } = state;

    if (!isString(name)) throw new Error("State must have a valid name");

    if (
      hasOwn(this.states, state.name) ||
      this.queue.map((x) => x.name).includes(state.name)
    )
      throw new Error(`State '${state.name}' is already defined`);
    this.queue.push(state);
    this.flush();

    return state;
  }

  /**
   * Processes queued states until no further registrations can be completed.
   */
  flush(): StateStore {
    const { queue, states, builder } = this;

    const registered: StateObject[] = []; // states that got registered
    const orphans: StateObject[] = []; // states that don't yet have a parent registered

    const previousQueueLength: Record<string, number> = {}; // keep track of how long the queue when an orphan was first encountered

    const getState = (name: string) =>
      hasOwn(this.states, name) ? this.states[name] : undefined;

    const notifyListeners = () => {
      if (registered.length) {
        this.listeners.forEach((listener) =>
          listener(
            "registered",
            registered.map((x) => x.self),
          ),
        );
      }
    };

    while (queue.length > 0) {
      const state = queue.shift();
      if (!state) continue;

      const { name } = state;

      const result = builder.build(state);

      const orphanIdx = orphans.indexOf(state);

      if (result) {
        const existingState = getState(name);

        if (existingState && existingState.name === name) {
          throw new Error(`State '${name}' is already defined`);
        }
        const existingFutureState = getState(`${name}.**`);

        if (existingFutureState) {
          // Remove future state of the same name
          this.stateRegistry.deregister(existingFutureState);
        }
        states[name] = state;
        this.attachRoute(state);

        if (orphanIdx >= 0) orphans.splice(orphanIdx, 1);
        registered.push(state);
        continue;
      }
      const prev = previousQueueLength[name];

      previousQueueLength[name] = queue.length;

      if (orphanIdx >= 0 && prev === queue.length) {
        // Wait until two consecutive iterations where no additional states were dequeued successfully.
        // throw new Error(`Cannot register orphaned state '${name}'`);
        queue.push(state);
        notifyListeners();

        return states;
      } else if (orphanIdx < 0) {
        orphans.push(state);
      }
      queue.push(state);
    }
    notifyListeners();

    return states;
  }

  /**
   * Attaches the state's URL rule once the state is fully registered.
   *
   * @param {StateObject | ng.StateDeclaration} state
   * @returns {void} a function that deregisters the rule
   */
  attachRoute(state: StateObject | ng.StateDeclaration): void {
    if (
      !(state as ng.StateDeclaration & { abstract?: boolean }).abstract &&
      state.url
    ) {
      const rulesApi = this.urlServiceRules;

      rulesApi.rule(rulesApi._urlRuleFactory.create(state as StateObject));
    }
  }
}
