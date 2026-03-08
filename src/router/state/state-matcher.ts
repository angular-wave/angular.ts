import { isString, values } from "../../shared/utils.js";
import type { StateObject } from "./state-object.ts";
import type { StateOrName, StateStore } from "./interface.ts";

/**
 * Resolves absolute, relative, and glob state references against the state store.
 */
export class StateMatcher {
  _states: StateStore;

  /**
   * @param states state store used for name, relative path, and glob lookups
   */
  constructor(states: StateStore) {
    this._states = states;
  }

  /**
   * Returns true when the provided state name is relative (`.` or `^` syntax).
   *
   * @param {string} stateName
   */
  isRelative(stateName: string): boolean {
    stateName = stateName || "";

    return stateName.indexOf(".") === 0 || stateName.indexOf("^") === 0;
  }

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
   * Expands a relative state path such as `^` or `.child` against `base`.
   *
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
