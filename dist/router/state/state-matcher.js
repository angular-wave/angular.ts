import { keys, isString } from '../../shared/utils.js';

class StateMatcher {
    /** @param {StateStore} states */
    constructor(states) {
        this._states = states;
    }
    /**
     * @param {string} stateName
     */
    isRelative(stateName) {
        stateName = stateName || "";
        return stateName.indexOf(".") === 0 || stateName.indexOf("^") === 0;
    }
    /**
     * @param {StateOrName} stateOrName
     * @param {StateOrName | undefined} [base]
     * @returns {StateObject | undefined}
     */
    find(stateOrName, base, matchGlob = true) {
        if (!stateOrName && stateOrName !== "")
            return undefined;
        const isStr = isString(stateOrName);
        let name = isStr ? stateOrName : stateOrName.name;
        if (this.isRelative(name))
            name = this.resolvePath(name, base);
        const state = this._states[name];
        if (state &&
            (isStr ||
                (!isStr && (state === stateOrName || state.self === stateOrName)))) {
            return state;
        }
        else if (isStr && matchGlob) {
            const stateNames = keys(this._states);
            let match;
            let duplicateNames;
            stateNames.forEach((stateName) => {
                const stateObj = this._states[stateName];
                if (stateObj._stateObjectCache?.nameGlob?.matches(name)) {
                    if (match) {
                        duplicateNames = duplicateNames || [match.name];
                        duplicateNames.push(stateObj.name);
                    }
                    else {
                        match = stateObj;
                    }
                }
            });
            if (duplicateNames) {
                throw new Error(`stateMatcher.find: Found multiple matches for ${name} using glob: ${duplicateNames}`);
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
    resolvePath(name, base) {
        if (!base)
            throw new Error(`No reference point given for path '${name}'`);
        const baseState = this.find(base);
        const splitName = name.split(".");
        const pathLength = splitName.length;
        let i = 0, current = baseState;
        for (; i < pathLength; i++) {
            if (splitName[i] === "" && i === 0) {
                current = baseState;
                continue;
            }
            if (splitName[i] === "^") {
                if (!current?.parent)
                    throw new Error(`Path '${name}' not valid for state '${baseState?.name}'`);
                current = current.parent;
                continue;
            }
            break;
        }
        const relName = splitName.slice(i).join(".");
        return ((current?.name || "") + (current?.name && relName ? "." : "") + relName);
    }
}

export { StateMatcher };
