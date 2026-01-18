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
   * @type {Queue<ng.Transition>}
   */
  _transitionHistory: Queue<ng.Transition>;
  /**
   * @type {Queue<ng.Transition>}
   */
  _successfulTransitions: Queue<ng.Transition>;
  /**
   * @type {ng.StateDeclaration|undefined}
   */
  current: ng.StateDeclaration | undefined;
  /**
   * @type {ng.StateObject|undefined}
   */
  $current: ng.StateObject | undefined;
  /**
   * @type {ng.Transition|undefined}
   */
  transition: ng.Transition | undefined;
  $get: () => this;
}
/**
 * }
 */
export type ServiceProvider = import("../interface.ts").ServiceProvider;
import { StateParams } from "./params/state-params.js";
import { Queue } from "../shared/queue.js";
