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
    | import("./interface.ts").BuiltStateDeclaration
    | import("./state-object.js").StateObject;
  resolvePath(name: any, base: any): string;
}
