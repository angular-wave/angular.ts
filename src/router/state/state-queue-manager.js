import { hasOwn, isString } from "../../shared/utils.js";
import { StateObject } from "./state-object.js";

/** @typedef {import("./state-registry.js").StateRegistryListener} StateRegistryListener */

export class StateQueueManager {
  /**
   * @param {import("./state-registry.js").StateRegistryProvider} stateRegistry
   * @param {import("../url/url-rules.js").UrlRules} urlServiceRules
   * @param  {Record<string, StateObject>} states
   * @param {*} builder
   * @param {*} listeners
   */
  constructor(stateRegistry, urlServiceRules, states, builder, listeners) {
    this.stateRegistry = stateRegistry;
    /** @type {import("../url/url-rules.js").UrlRules} */
    this.urlServiceRules = urlServiceRules;

    /** @type {Record<string, StateObject>} */
    this.states = states;
    this.builder = builder;
    /** @type {StateRegistryListener[]} */
    this.listeners = listeners;
    /**
     * @type {Array<StateObject>}
     */
    this.queue = [];
  }

  /**
   * @param {ng.StateDeclaration} stateDecl
   * @returns {StateObject}
   */
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

    /** @type {StateObject[]} */
    const registered = [], // states that got registered
      orphans = []; // states that don't yet have a parent registered

    /** @type {Record<string, number>} */
    const previousQueueLength = {}; // keep track of how long the queue when an orphan was first encountered

    const getState = (/** @type {string} */ name) =>
      hasOwn(this.states, name) && this.states[name];

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

      const { name } = /** @type {StateObject} */ (state);

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
        states[name] = /** @type {StateObject} */ (state);
        this.attachRoute(/** @type {StateObject} */ (state));

        if (orphanIdx >= 0) orphans.splice(orphanIdx, 1);
        registered.push(/** @type {StateObject} */ (state));
        continue;
      }
      const prev = previousQueueLength[name];

      previousQueueLength[name] = queue.length;

      if (orphanIdx >= 0 && prev === queue.length) {
        // Wait until two consecutive iterations where no additional states were dequeued successfully.
        // throw new Error(`Cannot register orphaned state '${name}'`);
        queue.push(/** @type {StateObject} */ (state));
        notifyListeners();

        return states;
      } else if (orphanIdx < 0) {
        orphans.push(state);
      }
      queue.push(/** @type {StateObject} */ (state));
    }
    notifyListeners();

    return states;
  }

  /**
   *
   * @param {StateObject | ng.StateDeclaration} state
   * @returns {void} a function that deregisters the rule
   */
  attachRoute(state) {
    if (!(/** @type {ng.StateDeclaration} */ (state).abstract) && state.url) {
      const rulesApi = this.urlServiceRules;

      rulesApi.rule(
        rulesApi._urlRuleFactory.create(/** @type {StateObject} */ (state)),
      );
    }
  }
}
