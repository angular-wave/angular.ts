import type { StateObject } from "./state-object.ts";
import type { StateOrName, StateStore } from "./interface.ts";
export declare class StateMatcher {
  _states: StateStore;
  /** @param {StateStore} states */
  constructor(states: StateStore);
  /**
   * @param {string} stateName
   */
  isRelative(stateName: string): boolean;
  /**
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
   * `
   * @param {string} name
   * @param {StateOrName} base
   * @returns {string}
   */
  resolvePath(name: string, base: StateOrName): string;
}
export type { StateObject, StateOrName, StateStore };
