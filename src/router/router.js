import { StateParams } from "./params/state-params.js";
import { Queue } from "../shared/queue.js";

/** @typedef {import('../interface.ts').ServiceProvider} ServiceProvider } */

/**
 * Global router state
 *
 * This is where we hold the global mutable state such as current state, current
 * params, current transition, etc.
 */
export class RouterProvider {
  constructor() {
    /**
     * Current parameter values
     *
     * The parameter values from the latest successful transition
     * @type {StateParams}
     */
    this.params = new StateParams();

    /**
     * @type {number}
     */
    this.lastStartedTransitionId = -1;

    /**
     * @type {Queue<import("./transition/transition.js").Transition>}
     */
    this.transitionHistory = new Queue([], 1);

    /**
     * @type {Queue<import("./transition/transition.js").Transition>}
     */
    this.successfulTransitions = new Queue([], 1);

    /**
     * @type {import("./state/interface.ts").StateDeclaration|undefined}
     */
    this.current = undefined;

    /**
     * @type {import("./state/state-object.js").StateObject|undefined}
     */
    this.$current = undefined;

    /**
     * @type {import("./transition/transition.js").Transition|undefined}
     */
    this.transition = undefined;
  }

  $get = () => this;
}
