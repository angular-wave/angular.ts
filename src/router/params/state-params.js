import { keys } from "../../shared/utils.js";

/** @typedef {import("../state/state-object.js").StateObject} StateObject */

export class StateParams {
  constructor(params = {}) {
    Object.assign(this, params);
  }

  /**
   * Merges a set of parameters with all parameters inherited between the common parents of the
   * current state and a given destination state.
   *
   * @param {Object} newParams The set of parameters which will be composited with inherited params.
   * @param {StateObject} $current Internal definition of object representing the current state.
   * @param {StateObject} $to Internal definition of object representing state to transition to.
   */
  $inherit(newParams, $current, $to) {
    const parents = ancestors($current, $to);

    /** @type {Record<string, any>} */
    const inherited = {};

    /** @type {string[]} */
    const inheritList = [];

    for (const parent of parents) {
      if (!parent || !parent.params) continue;
      /** @type {Record<string, any>} */
      const parentParams = parent.params;

      /** @type {string[]} */
      const parentParamsKeys = keys(parentParams);

      if (!parentParamsKeys.length) continue;

      for (const key of parentParamsKeys) {
        if (
          parentParams[key].inherit === false ||
          inheritList.indexOf(key) >= 0
        ) {
          continue;
        }

        inheritList.push(key);
        inherited[key] = /** @type {Record<string, any>} */ (this)[key];
      }
    }

    return Object.assign({}, inherited, newParams);
  }
}

/**
 * Finds the common ancestor path between two states.
 *
 * @param {StateObject} first The first state.
 * @param {StateObject} second The second state.
 * @return {Array<StateObject>} Returns an array of state names in descending order, not including the root.
 */
function ancestors(first, second) {
  /** @type {Array<StateObject>} */
  const path = [];

  const firstPath = first.path || [];

  const secondPath = second.path || [];

  const len = Math.min(firstPath.length, secondPath.length);

  for (let i = 0; i < len; i++) {
    if (firstPath[i] !== secondPath[i]) break;
    path.push(firstPath[i]);
  }

  return path;
}
