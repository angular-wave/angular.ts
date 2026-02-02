/** @typedef {import("./state-registry.js").StateRegistryListener} StateRegistryListener */
export class StateQueueManager {
  /**
   * @param {import("./state-registry.js").StateRegistryProvider} stateRegistry
   * @param {import("../url/url-rules.js").UrlRules} urlServiceRules
   * @param  {Record<string, StateObject>} states
   * @param {*} builder
   * @param {*} listeners
   */
  constructor(
    stateRegistry: import("./state-registry.js").StateRegistryProvider,
    urlServiceRules: import("../url/url-rules.js").UrlRules,
    states: Record<string, StateObject>,
    builder: any,
    listeners: any,
  );
  stateRegistry: import("./state-registry.js").StateRegistryProvider;
  /** @type {import("../url/url-rules.js").UrlRules} */
  urlServiceRules: import("../url/url-rules.js").UrlRules;
  /** @type {Record<string, StateObject>} */
  states: Record<string, StateObject>;
  builder: any;
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
  flush(): Record<string, StateObject>;
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
