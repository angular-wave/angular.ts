import { isUndefined, toJson } from "../shared/utils.js";

/**
 * Serializes a value to JSON using AngularTS's `toJson` helper.
 */
export function jsonFilter() {
  return function (object: any, spacing?: number) {
    if (isUndefined(spacing)) {
      spacing = 2;
    }

    return toJson(object, spacing);
  };
}
