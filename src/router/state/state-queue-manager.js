import { hasOwn, isString } from "../../shared/utils.js";
import { StateObject } from "./state-object.js";

export class StateQueueManager {
  /**
   * @param {import("./state-registry.js").StateRegistryProvider} stateRegistry
   * @param {import("../url/url-rules.js").UrlRules} urlServiceRules
   * @param {import("./interface.js").StateStore} states
   * @param {*} builder
   * @param {*} listeners
   */
  constructor(stateRegistry, urlServiceRules, states, builder, listeners) {
    this.stateRegistry = stateRegistry;
    /** @type {import("../url/url-rules.js").UrlRules} */
    this.urlServiceRules = urlServiceRules;
    this.states = states;
    this.builder = builder;
    this.listeners = listeners;
    /**
     * @type {Array<StateObject>}
     */
    this.queue = [];
  }

  register(stateDecl) {
    const state = new StateObject(stateDecl);

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

  flush() {
    const { queue, states, builder } = this;

    const registered = [], // states that got registered
      orphans = [], // states that don't yet have a parent registered
      previousQueueLength = {}; // keep track of how long the queue when an orphan was first encountered

    const getState = (name) => hasOwn(this.states, name) && this.states[name];

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
   *
   * @param {ng.StateDeclaration} state
   * @returns {() => void} a function that deregisters the rule
   */
  attachRoute(state) {
    if (state.abstract || !state.url) return;
    const rulesApi = this.urlServiceRules;

    rulesApi.rule(rulesApi._urlRuleFactory.create(state));
  }
}
