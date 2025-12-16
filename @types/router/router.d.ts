/** @typedef {import('../interface.ts').ServiceProvider} ServiceProvider } */
/**
 * Global router state
 *
 * This is where we hold the global mutable state such as current state, current
 * params, current transition, etc.
 */
export class RouterProvider {
  /**
   * Current parameter values
   *
   * The parameter values from the latest successful transition
   * @type {StateParams}
   */
  params: StateParams;
  /**
   * @type {number}
   */
  _lastStartedTransitionId: number;
  /**
   * @type {Queue<import("./transition/transition.js").Transition>}
   */
  _transitionHistory: Queue<import("./transition/transition.js").Transition>;
  /**
   * @type {Queue<import("./transition/transition.js").Transition>}
   */
  _successfulTransitions: Queue<
    import("./transition/transition.js").Transition
  >;
  /**
   * @type {import("./state/interface.ts").StateDeclaration|undefined}
   */
  current: import("./state/interface.ts").StateDeclaration | undefined;
  /**
   * @type {import("./state/state-object.js").StateObject|undefined}
   */
  $current: import("./state/state-object.js").StateObject | undefined;
  /**
   * @type {import("./transition/transition.js").Transition|undefined}
   */
  transition: import("./transition/transition.js").Transition | undefined;
  $get: () => this;
}
/**
 * }
 */
export type ServiceProvider = import("../interface.ts").ServiceProvider;
import { StateParams } from "./params/state-params.js";
import { Queue } from "../shared/queue.js";
