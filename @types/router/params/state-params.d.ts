import type { StateObject } from "../state/state-object.ts";
export declare class StateParams {
  [key: string]: any;
  constructor(params?: Record<string, any>);
  /**
   * Merges a set of parameters with all parameters inherited between the common parents of the
   * current state and a given destination state.
   *
   * @param {Object} newParams The set of parameters which will be composited with inherited params.
   * @param {StateObject} $current Internal definition of object representing the current state.
   * @param {StateObject} $to Internal definition of object representing state to transition to.
   */
  $inherit(
    newParams: Record<string, any>,
    $current: StateObject,
    $to: StateObject,
  ): Record<string, any>;
}
