import { StateObject } from "./state-object.ts";
import type { StateRegistryProvider } from "./state-registry.ts";
import type { StateRegistryListener, StateStore } from "./interface.ts";
import type { StateBuilder } from "./state-builder.ts";
import type { UrlRules } from "../url/url-rules.ts";
export declare class StateQueueManager {
  stateRegistry: StateRegistryProvider;
  urlServiceRules: UrlRules;
  states: StateStore;
  builder: StateBuilder;
  listeners: StateRegistryListener[];
  queue: StateObject[];
  /**
   * @param {import("./state-registry.ts").StateRegistryProvider} stateRegistry
   * @param {import("../url/url-rules.js").UrlRules} urlServiceRules
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
   * @param {ng.StateDeclaration} stateDecl
   * @returns {StateObject}
   */
  register(stateDecl: ng.StateDeclaration): StateObject;
  flush(): StateStore;
  /**
   *
   * @param {StateObject | ng.StateDeclaration} state
   * @returns {void} a function that deregisters the rule
   */
  attachRoute(state: StateObject | ng.StateDeclaration): void;
}
