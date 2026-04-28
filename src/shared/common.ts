import { assign, keys } from "./utils.ts";

/**
 * Given an array and an item, removes the item in-place when present.
 */
export function removeFrom<T>(array: T[], obj: T): T[] {
  const i = array.indexOf(obj);

  if (i !== -1) array.splice(i, 1);

  return array;
}

/**
 * Applies option defaults and only copies option keys known by the defaults.
 * Earlier defaults take precedence over later defaults.
 */
export function defaults(opts: any, ...defaultsList: any[]): any {
  const defaultVals = assign({}, ...defaultsList.reverse());

  opts = opts || {};

  keys(defaultVals).forEach((key) => {
    if (key in opts) defaultVals[key] = opts[key];
  });

  return defaultVals;
}

/**
 * Reduce helper that pushes an item to an array, then returns the array.
 */
export function pushR<T>(arr: T[], obj: T): T[] {
  arr.push(obj);

  return arr;
}

/**
 * Returns the last element of an array or string.
 */
export function tail<T>(arr: T[] | string): T | string | undefined {
  return arr.length > 0 ? arr[arr.length - 1] : undefined;
}
