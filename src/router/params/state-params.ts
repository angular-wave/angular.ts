import { assign, keys } from "../../shared/utils.ts";
import type { RawParams } from "./interface.ts";
import type { StateObject } from "../state/state-object.ts";

export class StateParams {
  [key: string]: unknown;

  constructor(params: RawParams = {}) {
    assign(this, params);
  }

  /**
   * Merges a set of parameters with all parameters inherited between the common parents of the
   * current state and a given destination state.
   *
   * @param {Object} newParams The set of parameters which will be composited with inherited params.
   * @param {StateObject} $current Internal definition of object representing the current state.
   * @param {StateObject} $to Internal definition of object representing state to transition to.
   */
  $inherit(
    newParams: RawParams,
    $current: StateObject,
    $to: StateObject,
  ): RawParams {
    const parents = ancestors($current, $to);

    const inherited: RawParams = {};

    const inheritList = new Set<string>();

    for (const parent of parents) {
      if (!parent.params) continue;
      const parentParams = parent.params;

      const parentParamsKeys = keys(parentParams);

      if (!parentParamsKeys.length) continue;

      for (const key of parentParamsKeys) {
        if (!parentParams[key].inherit || inheritList.has(key)) {
          continue;
        }

        inheritList.add(key);
        inherited[key] = this[key];
      }
    }

    return assign(inherited, newParams);
  }
}

/**
 * Finds the common ancestor path between two states.
 *
 * @param {StateObject} first The first state.
 * @param {StateObject} second The second state.
 * @return {Array<StateObject>} Returns an array of state names in descending order, not including the root.
 */
function ancestors(first: StateObject, second: StateObject): StateObject[] {
  const path: StateObject[] = [];

  const firstPath = first.path ?? [];

  const secondPath = second.path ?? [];

  const len = Math.min(firstPath.length, secondPath.length);

  for (let i = 0; i < len; i++) {
    if (firstPath[i] !== secondPath[i]) break;
    path.push(firstPath[i]);
  }

  return path;
}
