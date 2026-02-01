/** @typedef {import("./state-object.js").StateObject} StateObject */
/** @typedef {import("./interface.ts").StateOrName} StateOrName */
/** @typedef {import("./interface.ts").StateStore} StateStore */
export class StateMatcher {
  /** @param {StateStore} states */
  constructor(states: StateStore);
  /** @type {StateStore} */
  _states: StateStore;
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
    base?: StateOrName | undefined,
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
export type StateObject = import("./state-object.js").StateObject;
export type StateOrName = import("./interface.ts").StateOrName;
export type StateStore = import("./interface.ts").StateStore;
