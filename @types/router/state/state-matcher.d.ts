export class StateMatcher {
  /** @param {import("./interface.ts").StateStore} states */
  constructor(states: import("./interface.ts").StateStore);
  /** @type {import("./interface.ts").StateStore} */
  _states: import("./interface.ts").StateStore;
  isRelative(stateName: any): boolean;
  find(
    stateOrName: any,
    base: any,
    matchGlob?: boolean,
  ):
    | import("./state-object.js").StateObject
    | import("./interface.ts").BuiltStateDeclaration;
  resolvePath(name: any, base: any): string;
}
