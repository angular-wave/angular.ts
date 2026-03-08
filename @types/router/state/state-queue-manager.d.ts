import { StateObject } from "./state-object.ts";
import type { StateRegistryProvider } from "./state-registry.ts";
import type { StateRegistryListener, StateStore } from "./interface.ts";
import type { StateBuilder } from "./state-builder.ts";
import type { UrlRules } from "../url/url-rules.ts";
/**
 * Queues state declarations until their parents exist, then builds and registers them.
 */
export declare class StateQueueManager {
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
  );
  /**
   * Queues a state declaration and attempts to flush the registration queue.
   *
   * @param {ng.StateDeclaration} stateDecl
   * @returns {StateObject}
   */
  register(stateDecl: ng.StateDeclaration): StateObject;
  /**
   * Processes queued states until no further registrations can be completed.
   */
  flush(): StateStore;
  /**
   * Attaches the state's URL rule once the state is fully registered.
   *
   * @param {StateObject | ng.StateDeclaration} state
   * @returns {void} a function that deregisters the rule
   */
  attachRoute(state: StateObject | ng.StateDeclaration): void;
}
