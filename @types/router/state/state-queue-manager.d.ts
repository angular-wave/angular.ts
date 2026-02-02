/** @typedef {import("./state-registry.js").StateRegistryListener} StateRegistryListener */
export class StateQueueManager {
  /**
   * @param {import("./state-registry.js").StateRegistryProvider} stateRegistry
   * @param {import("../url/url-rules.js").UrlRules} urlServiceRules
   * @param {import("./interface.ts").StateStore} states
   * @param {import("./state-builder.js").StateBuilder} builder
   * @param {StateRegistryListener[]} listeners
   */
  constructor(
    stateRegistry: import("./state-registry.js").StateRegistryProvider,
    urlServiceRules: import("../url/url-rules.js").UrlRules,
    states: import("./interface.ts").StateStore,
    builder: import("./state-builder.js").StateBuilder,
    listeners: StateRegistryListener[],
  );
  stateRegistry: import("./state-registry.js").StateRegistryProvider;
  /** @type {import("../url/url-rules.js").UrlRules} */
  urlServiceRules: import("../url/url-rules.js").UrlRules;
  /** @type {import("./interface.ts").StateStore} */
  states: import("./interface.ts").StateStore;
  builder: import("./state-builder.js").StateBuilder;
  /** @type {StateRegistryListener[]} */
  listeners: StateRegistryListener[];
  /**
   * @type {Array<StateObject>}
   */
  queue: Array<StateObject>;
  /**
   * @param {ng.StateDeclaration} stateDecl
   * @returns {StateObject}
   */
  register(stateDecl: ng.StateDeclaration): StateObject;
  flush(): import("./interface.ts").StateStore;
  /**
   *
   * @param {StateObject | ng.StateDeclaration} state
   * @returns {void} a function that deregisters the rule
   */
  attachRoute(state: StateObject | ng.StateDeclaration): void;
}
export type StateRegistryListener =
  import("./state-registry.js").StateRegistryListener;
import { StateObject } from "./state-object.js";
