import { ancestors } from "../../shared/common.js";

export class StateParams {
  constructor(params = {}) {
    Object.assign(this, params);
  }

  /**
   * Merges a set of parameters with all parameters inherited between the common parents of the
   * current state and a given destination state.
   *
   * @param {Object} newParams The set of parameters which will be composited with inherited params.
   * @param {Object} $current Internal definition of object representing the current state.
   * @param {Object} $to Internal definition of object representing state to transition to.
   */
  $inherit(newParams, $current, $to) {
    const parents = ancestors($current, $to),
      inherited = {},
      inheritList = [];

    for (const i in parents) {
      if (!parents[i] || !parents[i].params) continue;
      const parentParams = parents[i].params;

      const parentParamsKeys = Object.keys(parentParams);

      if (!parentParamsKeys.length) continue;

      for (const j in parentParamsKeys) {
        if (
          parentParams[parentParamsKeys[j]].inherit === false ||
          inheritList.indexOf(parentParamsKeys[j]) >= 0
        )
          continue;
        inheritList.push(parentParamsKeys[j]);
        inherited[parentParamsKeys[j]] = this[parentParamsKeys[j]];
      }
    }

    return Object.assign({}, inherited, newParams);
  }
}
