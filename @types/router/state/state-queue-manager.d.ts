export class StateQueueManager {
  /**
   * @param {import("./state-registry.js").StateRegistryProvider} stateRegistry
   * @param {*} urlServiceRules
   * @param {Record<string, ng.StateObject>} states
   * @param {*} builder
   * @param {*} listeners
   */
  constructor(
    stateRegistry: import("./state-registry.js").StateRegistryProvider,
    urlServiceRules: any,
    states: Record<string, ng.StateObject>,
    builder: any,
    listeners: any,
  );
  stateRegistry: import("./state-registry.js").StateRegistryProvider;
  urlServiceRules: any;
  states: Record<string, StateObject>;
  builder: any;
  listeners: any;
  /**
   * @type {Array<StateObject>}
   */
  queue: Array<StateObject>;
  register(stateDecl: any): StateObject;
  flush(): Record<string, StateObject>;
  attachRoute(state: any): void;
}
import { StateObject } from "./state-object.js";
