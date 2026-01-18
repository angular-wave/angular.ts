export class StateQueueManager {
  /**
   * @param {import("./state-registry.js").StateRegistryProvider} stateRegistry
   * @param {import("../url/url-rules.js").UrlRules} urlServiceRules
   * @param {import("./interface.ts").StateStore} states
   * @param {*} builder
   * @param {*} listeners
   */
  constructor(
    stateRegistry: import("./state-registry.js").StateRegistryProvider,
    urlServiceRules: import("../url/url-rules.js").UrlRules,
    states: import("./interface.ts").StateStore,
    builder: any,
    listeners: any,
  );
  stateRegistry: import("./state-registry.js").StateRegistryProvider;
  /** @type {import("../url/url-rules.js").UrlRules} */
  urlServiceRules: import("../url/url-rules.js").UrlRules;
  states: import("./interface.ts").StateStore;
  builder: any;
  listeners: any;
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
   * @param {ng.StateDeclaration} state
   * @returns {() => void} a function that deregisters the rule
   */
  attachRoute(state: ng.StateDeclaration): () => void;
}
import { StateObject } from "./state-object.js";
