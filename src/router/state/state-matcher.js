import { isString } from "../../shared/utils.js";
export class StateMatcher {
  /** @param {import("./interface.ts").StateStore} states */
  constructor(states) {
    /** @type {import("./interface.ts").StateStore} */
    this._states = states;
  }

  isRelative(stateName) {
    stateName = stateName || "";

    return stateName.indexOf(".") === 0 || stateName.indexOf("^") === 0;
  }

  find(stateOrName, base, matchGlob = true) {
    if (!stateOrName && stateOrName !== "") return undefined;
    const isStr = isString(stateOrName);

    let name = isStr ? stateOrName : stateOrName.name;

    if (this.isRelative(name)) name = this.resolvePath(name, base);
    const state = this._states[name];

    if (
      state &&
      (isStr ||
        (!isStr && (state === stateOrName || state.self === stateOrName)))
    ) {
      return state;
    } else if (isStr && matchGlob) {
      const states = Object.values(this._states);

      const matches = states.filter((stateObj) =>
        stateObj._stateObjectCache.nameGlob?.matches(name),
      );

      if (matches.length > 1) {
        throw new Error(
          `stateMatcher.find: Found multiple matches for ${name} using glob: ${matches.map((match) => match.name)}`,
        );
      }

      return matches[0];
    }

    return undefined;
  }

  resolvePath(name, base) {
    if (!base) throw new Error(`No reference point given for path '${name}'`);
    const baseState = this.find(base);

    const splitName = name.split(".");

    const pathLength = splitName.length;

    let i = 0,
      current = baseState;

    for (; i < pathLength; i++) {
      if (splitName[i] === "" && i === 0) {
        current = baseState;
        continue;
      }

      if (splitName[i] === "^") {
        if (!current.parent)
          throw new Error(
            `Path '${name}' not valid for state '${baseState.name}'`,
          );
        current = current.parent;
        continue;
      }
      break;
    }
    const relName = splitName.slice(i).join(".");

    return current.name + (current.name && relName ? "." : "") + relName;
  }
}
