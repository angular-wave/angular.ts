import { isUndefined, toJson } from "../shared/utils.js";

/**
 * @returns {ng.FilterFn}
 */
export function jsonFilter() {
  return function (object: any, spacing?: number) {
    if (isUndefined(spacing)) {
      spacing = 2;
    }

    return toJson(object, spacing);
  };
}
