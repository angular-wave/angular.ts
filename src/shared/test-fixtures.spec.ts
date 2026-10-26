import { assertInvariantDefined } from "./utils.ts";

export { assertInvariantDefined as defined };

/** Require an HTML node where a fixture exercises HTML-only behavior. */
export function htmlNode(value: unknown): HTMLElement {
  if (!(value instanceof HTMLElement)) {
    throw new TypeError("Expected an HTMLElement in the test fixture");
  }
  return value;
}

/** Verify a controller's runtime class when a test retrieves it through DOM metadata. */
export function instance<T>(
  value: unknown,
  constructor: abstract new (...args: never[]) => T,
): T {
  if (!(value instanceof constructor))
    throw new TypeError(`Expected ${constructor.name} in the test fixture`);
  return value;
}

/** Verify a compiler result is one DOM element, including SVG roots. */
export function elementNode(value: unknown): Element {
  return instance(value, Element);
}

/** Check optional fixture hooks while retaining their actual parameter and result types. */
export function callable<T extends object, K extends keyof T>(
  object: T,
  key: K,
): asserts object is T & {
  [P in K]-?: Extract<T[P], (...args: never[]) => unknown>;
} {
  if (typeof object[key] !== "function")
    throw new TypeError(`Missing fixture callback: ${String(key)}`);
}
