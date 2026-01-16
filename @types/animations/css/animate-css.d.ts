/**
 * Parse a CSS time value (or comma-separated list of values) and return the maximum duration.
 *
 * Accepts values expressed in seconds (`s`) or milliseconds (`ms`) as returned by `getComputedStyle()`,
 * e.g. `"0.2s"`, `"150ms"`, or `"0.2s, 150ms"`. Milliseconds are converted to seconds before comparison.
 *
 * Invalid tokens are ignored. If no valid numeric token is found, the result is `0`.
 *
 * @param {string} str A CSS time string (optionally comma-separated).
 * @returns {number} The maximum time value, expressed in **seconds**.
 */
export function parseMaxTime(str: string): number;
export function AnimateCssProvider(): void;
export class AnimateCssProvider {
  $get: (() => ng.AnimateCssService)[];
}
