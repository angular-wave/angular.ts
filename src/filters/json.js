import { isUndefined, toJson } from "../shared/utils.js";

/**
 * @returns {ng.FilterFn}
 */
export function jsonFilter() {
  return function (object, spacing) {
    if (isUndefined(spacing)) {
      spacing = 2;
    }

    return toJson(object, spacing);
  };
}
