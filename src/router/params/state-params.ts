import { keys } from "../../shared/utils.ts";
import type { StateObject } from "../state/state-object.ts";

export class StateParams {
  [key: string]: any;

  constructor(params: Record<string, any> = {}) {
    Object.assign(this, params);
  }

  /**
   * Merges a set of parameters with all parameters inherited between the common parents of the
   * current state and a given destination state.
   *
   * @param newParams The set of parameters which will be composited with inherited params.
   * @param $current Internal definition of object representing the current state.
   * @param $to Internal definition of object representing state to transition to.
   */
  $inherit(
    newParams: Record<string, any>,
    $current: StateObject,
    $to: StateObject,
  ): Record<string, any> {
    const parents = ancestors($current, $to);

    const inherited: Record<string, any> = {};

    const inheritList = [];

    for (const parent of parents) {
      if (!parent || !parent.params) continue;
      const parentParams = parent.params as unknown as Record<
        string,
        { inherit?: boolean }
      >;

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
        inherited[key] = this[key];
      }
    }

    return Object.assign({}, inherited, newParams);
  }
}

/**
 * Finds the common ancestor path between two states.
 *
 * @param first The first state.
 * @param second The second state.
 * @returns Returns an array of state names in descending order, not including the root.
 */
function ancestors(first: StateObject, second: StateObject): StateObject[] {
  const path: StateObject[] = [];

  const firstPath = first.path || [];

  const secondPath = second.path || [];

  const len = Math.min(firstPath.length, secondPath.length);

  for (let i = 0; i < len; i++) {
    if (firstPath[i] !== secondPath[i]) break;
    path.push(firstPath[i]);
  }

  return path;
}
