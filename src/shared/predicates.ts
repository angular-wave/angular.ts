import { isArray, isFunction, isString } from "./utils.js";

/**
 * A value is "injectable" if it is a function, or if it is an ng1
 * array-notation-style array where the head is strings and the tail is a
 * function.
 */
export function isInjectable(val: unknown): boolean {
  if (isArray<unknown>(val) && val.length > 0) {
    const head = val.slice(0, -1);
    const tail = val.slice(-1);

    return !(
      head.some((injectable) => !isString(injectable)) ||
      tail.some((injectable) => !isFunction(injectable))
    );
  }

  return isFunction(val);
}

/**
 * It is probably a Promise if it's an object and it has a function `then`.
 */
export function isPromise(
  obj: unknown,
): obj is { then: (...args: unknown[]) => unknown } {
  return (
    obj !== null &&
    typeof obj === "object" &&
    typeof (obj as { then?: unknown }).then === "function"
  );
}
