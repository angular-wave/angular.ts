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
    this._params = new StateParams();

    /**
     * @type {number}
     */
    this._lastStartedTransitionId = -1;

    /**
     * @type {Queue<import("./transition/transition.js").Transition>}
     */
    this._transitionHistory = new Queue([], 1);

    /**
     * @type {Queue<import("./transition/transition.js").Transition>}
     */
    this._successfulTransitions = new Queue([], 1);

    /**
     * @type {import("./state/interface.ts").StateDeclaration|undefined}
     */
    this._current = undefined;

    /**
     * @type {import("./state/state-object.js").StateObject|undefined}
     */
    this._$current = undefined;

    /**
     * @type {import("./transition/transition.js").Transition|undefined}
     */
    this._transition = undefined;
  }

  $get = () => this;
}
