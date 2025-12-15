export class StateQueueManager {
  /**
   * @param {import("./state-registry.js").StateRegistryProvider} stateRegistry
   * @param {import("../url/url-rules.js").UrlRules} urlServiceRules
   * @param {import("./interface.js").StateStore} states
   * @param {*} builder
   * @param {*} listeners
   */
  constructor(
    stateRegistry: import("./state-registry.js").StateRegistryProvider,
    urlServiceRules: import("../url/url-rules.js").UrlRules,
    states: import("./interface.js").StateStore,
    builder: any,
    listeners: any,
  );
  stateRegistry: import("./state-registry.js").StateRegistryProvider;
  /** @type {import("../url/url-rules.js").UrlRules} */
  urlServiceRules: import("../url/url-rules.js").UrlRules;
  states: import("./interface.js").StateStore;
  builder: any;
  listeners: any;
  /**
   * @type {Array<StateObject>}
   */
  queue: Array<StateObject>;
  register(stateDecl: any): StateObject;
  flush(): import("./interface.js").StateStore;
  /**
   *
   * @param {ng.StateDeclaration} state
   * @returns {() => void} a function that deregisters the rule
   */
  attachRoute(state: ng.StateDeclaration): () => void;
}
import { StateObject } from "./state-object.js";
