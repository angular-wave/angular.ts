import { isString, values } from "../../shared/utils.ts";
import type { StateObject } from "./state-object.ts";
import type { StateOrName, StateStore } from "./interface.ts";

export class StateMatcher {
  /** @internal */
  _states: StateStore;

  /** @param {StateStore} states */
  constructor(states: StateStore) {
    this._states = states;
  }

  /**
   * @param {string} stateName
   */
  isRelative(stateName: string): boolean {
    stateName = stateName || "";

    return stateName.indexOf(".") === 0 || stateName.indexOf("^") === 0;
  }

  /**
   * @param {StateOrName} stateOrName
   * @param {StateOrName | undefined} [base]
   * @returns {StateObject | undefined}
   */
  find(
    stateOrName: StateOrName,
    base?: StateOrName,
    matchGlob = true,
  ): StateObject | undefined {
    if (!stateOrName && stateOrName !== "") return undefined;
    const isStr = isString(stateOrName);

    let name = isStr ? stateOrName : stateOrName.name;

    if (this.isRelative(name))
      name = this.resolvePath(name, base as StateOrName);
    const state = this._states[name];

    if (
      state &&
      (isStr ||
        (!isStr && (state === stateOrName || state.self === stateOrName)))
    ) {
      return state as StateObject;
    } else if (isStr && matchGlob) {
      const states = values(this._states);

      const matches = states.filter((stateObj) =>
        stateObj._stateObjectCache?.nameGlob?.matches(name),
      );

      if (matches.length > 1) {
        throw new Error(
          `stateMatcher.find: Found multiple matches for ${name} using glob: ${matches.map((match) => match.name)}`,
        );
      }

      return matches[0] as StateObject | undefined;
    }

    return undefined;
  }

  /**
   * `
   * @param {string} name
   * @param {StateOrName} base
   * @returns {string}
   */
  resolvePath(name: string, base: StateOrName): string {
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
        if (!current?.parent)
          throw new Error(
            `Path '${name}' not valid for state '${baseState?.name}'`,
          );
        current = current.parent;
        continue;
      }
      break;
    }
    const relName = splitName.slice(i).join(".");

    return (
      (current?.name || "") + (current?.name && relName ? "." : "") + relName
    );
  }
}

export type { StateObject, StateOrName, StateStore };
