/** @typedef {import("../state/state-object.js").StateObject} StateObject */
export class StateParams {
  constructor(params?: {});
  /**
   * Merges a set of parameters with all parameters inherited between the common parents of the
   * current state and a given destination state.
   *
   * @param {Object} newParams The set of parameters which will be composited with inherited params.
   * @param {StateObject} $current Internal definition of object representing the current state.
   * @param {StateObject} $to Internal definition of object representing state to transition to.
   */
  $inherit(newParams: any, $current: StateObject, $to: StateObject): any;
}
export type StateObject = import("../state/state-object.js").StateObject;
