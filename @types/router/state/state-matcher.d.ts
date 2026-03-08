import type { StateObject } from "./state-object.ts";
import type { StateOrName, StateStore } from "./interface.ts";
/**
 * Resolves absolute, relative, and glob state references against the state store.
 */
export declare class StateMatcher {
  _states: StateStore;
  /**
   * @param states state store used for name, relative path, and glob lookups
   */
  constructor(states: StateStore);
  /**
   * Returns true when the provided state name is relative (`.` or `^` syntax).
   *
   * @param {string} stateName
   */
  isRelative(stateName: string): boolean;
  /**
   * Finds a state by name, relative name, glob, or state object reference.
   *
   * @param {StateOrName} stateOrName
   * @param {StateOrName | undefined} [base]
   * @returns {StateObject | undefined}
   */
  find(
    stateOrName: StateOrName,
    base?: StateOrName,
    matchGlob?: boolean,
  ): StateObject | undefined;
  /**
   * Expands a relative state path such as `^` or `.child` against `base`.
   *
   * @param {string} name
   * @param {StateOrName} base
   * @returns {string}
   */
  resolvePath(name: string, base: StateOrName): string;
}
export type { StateObject, StateOrName, StateStore };
