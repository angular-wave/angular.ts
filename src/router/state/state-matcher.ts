import { isString, keys } from "../../shared/utils.ts";
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

    return stateName.startsWith(".") || stateName.startsWith("^");
  }

  /**
   * @param {StateOrName} stateOrName
   * @param {StateOrName | undefined} [base]
   * @returns {StateObject | undefined}
   */
  find(
    stateOrName: StateOrName | undefined,
    base?: StateOrName,
    matchGlob = true,
  ): StateObject | undefined {
    if (!stateOrName && stateOrName !== "") return undefined;
    const isStr = isString(stateOrName);

    let name = isStr ? stateOrName : stateOrName.name;

    if (this.isRelative(name)) name = this.resolvePath(name, base);
    const state = this._states[name] as StateObject | undefined;

    if (
      state &&
      (isStr || state === stateOrName || state.self === stateOrName)
    ) {
      return state;
    } else if (isStr && matchGlob) {
      const stateNames = keys(this._states);

      let match: StateObject | undefined;

      let duplicateNames: string[] | undefined;

      stateNames.forEach((stateName) => {
        const stateObj = this._states[stateName] as StateObject;

        if (stateObj._stateObjectCache.nameGlob?.matches(name)) {
          if (match) {
            duplicateNames = duplicateNames ?? [match.name];
            duplicateNames.push(stateObj.name);
          } else {
            match = stateObj;
          }
        }
      });

      if (duplicateNames) {
        throw new Error(
          `stateMatcher.find: Found multiple matches for ${name} using glob: ${duplicateNames.join(", ")}`,
        );
      }

      return match;
    }

    return undefined;
  }

  /**
   * `
   * @param {string} name
   * @param {StateOrName} base
   * @returns {string}
   */
  resolvePath(name: string, base: StateOrName | undefined): string {
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
            `Path '${name}' not valid for state '${baseState?.name ?? "unknown"}'`,
          );
        current = current.parent;
        continue;
      }
      break;
    }
    const relName = splitName.slice(i).join(".");

    return (
      (current?.name ?? "") + (current?.name && relName ? "." : "") + relName
    );
  }
}

export type { StateObject, StateOrName, StateStore };
