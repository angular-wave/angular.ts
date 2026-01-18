/**
 * Returns all items from `tokens1` that are not present in `tokens2`.
 *
 * @param {string[]} tokens1
 * @param {string[]} tokens2
 * @returns {string[]}
 */
export function arrayDifference(tokens1: string[], tokens2: string[]): string[];
/**
 * Split a class string into tokens.
 *
 * - Trims leading/trailing whitespace
 * - Collapses any whitespace runs (space/tab/newline) into token boundaries
 *
 * @param {string} classString
 * @return {string[]}
 */
export function split(classString: string): string[];
/**
 * Convert an `ngClass` expression value into a space-delimited class string.
 *
 * Supports:
 * - string: returned as-is
 * - array: flattened and joined with spaces (falsy items are ignored)
 * - object: keys with truthy values are included
 * - other primitives: stringified
 *
 * @param {unknown} classValue
 * @returns {string}
 */
export function toClassString(classValue: unknown): string;
export const ngClassDirective: import("../../interface.ts").DirectiveFactory;
export const ngClassOddDirective: import("../../interface.ts").DirectiveFactory;
export const ngClassEvenDirective: import("../../interface.ts").DirectiveFactory;
