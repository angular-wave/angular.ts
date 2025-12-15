export class StateQueueManager {
  /**
   * @param {import("./state-registry.js").StateRegistryProvider} stateRegistry
   * @param {import("../url/url-rules.js").UrlRules} urlServiceRules
   * @param {Record<string, ng.StateObject>} states
   * @param {*} builder
   * @param {*} listeners
   */
  constructor(
    stateRegistry: import("./state-registry.js").StateRegistryProvider,
    urlServiceRules: import("../url/url-rules.js").UrlRules,
    states: Record<string, ng.StateObject>,
    builder: any,
    listeners: any,
  );
  stateRegistry: import("./state-registry.js").StateRegistryProvider;
  /** @type {import("../url/url-rules.js").UrlRules} */
  urlServiceRules: import("../url/url-rules.js").UrlRules;
  states: Record<string, StateObject>;
  builder: any;
  listeners: any;
  /**
   * @type {Array<StateObject>}
   */
  queue: Array<StateObject>;
  register(stateDecl: any): StateObject;
  flush(): Record<string, StateObject>;
  /**
   *
   * @param {ng.StateDeclaration} state
   * @returns {() => void} a function that deregisters the rule
   */
  attachRoute(state: ng.StateDeclaration): () => void;
}
import { StateObject } from "./state-object.js";
