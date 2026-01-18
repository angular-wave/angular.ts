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
    this._lastStartedTransitionId = -1;

    /**
     * @type {Queue<ng.Transition>}
     */
    this._transitionHistory = new Queue(
      /** @type {Array<ng.Transition>} */ ([]),
      1,
    );

    /**
     * @type {Queue<ng.Transition>}
     */
    this._successfulTransitions = new Queue(
      /** @type {Array<ng.Transition>} */ ([]),
      1,
    );

    /**
     * @type {ng.StateDeclaration|undefined}
     */
    this.current = undefined;

    /**
     * @type {ng.StateObject|undefined}
     */
    this.$current = undefined;

    /**
     * @type {ng.Transition|undefined}
     */
    this.transition = undefined;
  }

  $get = () => this;
}
