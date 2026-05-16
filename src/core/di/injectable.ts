import type { Injectable } from "../../interface.ts";
import { isArray, isFunction, isString } from "../../shared/utils.ts";
import type {
  RuntimeConstructor,
  RuntimeFunction,
} from "../../shared/utils.ts";

type RuntimeInjectable = RuntimeFunction | RuntimeConstructor;

/**
 * A value is injectable if it is a function, class constructor, or ng1
 * array-notation-style value where dependency names are strings and the final
 * item is callable.
 */
export function isInjectable<T extends RuntimeInjectable = RuntimeInjectable>(
  val: unknown,
): val is Injectable<T> {
  if (isArray<unknown>(val) && val.length > 0) {
    const lastIndex = val.length - 1;

    for (let i = 0; i < lastIndex; i++) {
      if (!isString(val[i])) return false;
    }

    return isFunction(val[lastIndex]);
  }

  return isFunction(val);
}
