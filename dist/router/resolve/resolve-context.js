import { stringify } from '../../shared/strings.js';
import { isInstanceOf, isArray, isUndefined } from '../../shared/utils.js';
import { subPath } from '../path/path-utils.js';
import { Resolvable } from './resolvable.js';

/**
 * Provides resolve lookup and execution helpers for a specific transition path.
 */
class ResolveContext {
    /**
     * @param _path path of nodes whose resolvables are visible in this context
     * @param _injector injector used when dependency tokens are not resolvables in the path
     */
    constructor(_path, _injector) {
        this._path = _path;
        this._injector = _injector;
    }
    /**
     * Returns the unique tokens available from all resolvables in this path.
     */
    getTokens() {
        const tokens = [];
        for (let i = 0; i < this._path.length; i++) {
            const { resolvables } = this._path[i];
            for (let j = 0; j < resolvables.length; j++) {
                const { token } = resolvables[j];
                if (!tokens.includes(token)) {
                    tokens.push(token);
                }
            }
        }
        return tokens;
    }
    /**
     * Returns the most local resolvable registered for the specified token.
     */
    getResolvable(token) {
        let matching;
        for (let i = 0; i < this._path.length; i++) {
            const { resolvables } = this._path[i];
            for (let j = 0; j < resolvables.length; j++) {
                const candidate = resolvables[j];
                if (candidate.token === token) {
                    matching = candidate;
                }
            }
        }
        return matching;
    }
    /**
     * Returns a child resolve context scoped to the specified state.
     */
    subContext(state) {
        const contextPath = subPath(this._path, (node) => node?.state.name === state.name);
        return new ResolveContext((contextPath || this._path), this._injector);
    }
    /**
     * Adds or replaces resolvables for a specific state in this path.
     */
    addResolvables(newResolvables, state) {
        let node;
        for (let i = 0; i < this._path.length; i++) {
            const candidate = this._path[i];
            if (candidate.state === state) {
                node = candidate;
                break;
            }
        }
        if (!node) {
            throw new Error(`Could not find path node for state: ${state.name}`);
        }
        const resolvables = [];
        const keys = [];
        for (let i = 0; i < newResolvables.length; i++) {
            const resolvable = newResolvables[i];
            const normalized = isInstanceOf(resolvable, Resolvable)
                ? resolvable
                : new Resolvable(resolvable);
            resolvables.push(normalized);
            keys.push(normalized.token);
        }
        const nextResolvables = [];
        for (let i = 0; i < node.resolvables.length; i++) {
            const existing = node.resolvables[i];
            if (!keys.includes(existing.token)) {
                nextResolvables.push(existing);
            }
        }
        for (let i = 0; i < resolvables.length; i++) {
            nextResolvables.push(resolvables[i]);
        }
        node.resolvables = nextResolvables;
    }
    /**
     * Resolves the path's resolvables.
     */
    resolvePath(eagerOnly = false, trans) {
        const promises = [];
        for (let i = 0; i < this._path.length; i++) {
            const node = this._path[i];
            const subContext = this.subContext(node.state);
            for (let j = 0; j < node.resolvables.length; j++) {
                const resolvable = node.resolvables[j];
                if (eagerOnly && !resolvable.eager) {
                    continue;
                }
                const promise = resolvable
                    .get(subContext, trans)
                    .then((value) => ({ token: resolvable.token, value }));
                promises.push(promise);
            }
        }
        return Promise.all(promises);
    }
    /**
     * Finds the path node that owns the provided resolvable.
     */
    findNode(resolvable) {
        for (let i = 0; i < this._path.length; i++) {
            const node = this._path[i];
            if (node.resolvables.includes(resolvable)) {
                return node;
            }
        }
        return undefined;
    }
    /**
     * Resolves the dependency tokens required by a resolvable from either
     * the current path or the injector fallback.
     */
    getDependencies(resolvable) {
        const node = this.findNode(resolvable);
        const dependencyPath = subPath(this._path, (x) => x === node) || this._path;
        const availableResolvables = [];
        for (let i = 0; i < dependencyPath.length; i++) {
            const { resolvables } = dependencyPath[i];
            for (let j = 0; j < resolvables.length; j++) {
                const candidate = resolvables[j];
                if (candidate !== resolvable) {
                    availableResolvables.push(candidate);
                }
            }
        }
        const latestByToken = new Map();
        for (let i = 0; i < availableResolvables.length; i++) {
            const candidate = availableResolvables[i];
            latestByToken.set(candidate.token, candidate);
        }
        const deps = isArray(resolvable.deps) ? resolvable.deps : [resolvable.deps];
        const dependencies = [];
        for (let i = 0; i < deps.length; i++) {
            const token = deps[i];
            const matching = latestByToken.get(token);
            if (matching) {
                dependencies.push(matching);
                continue;
            }
            let fromInjector;
            if (this._injector) {
                try {
                    fromInjector = this._injector.get(token);
                }
                catch {
                    fromInjector = undefined;
                }
            }
            if (isUndefined(fromInjector)) {
                throw new Error(`Could not find Dependency Injection token: ${stringify(token)}`);
            }
            dependencies.push(new Resolvable(token, () => fromInjector, [], undefined, fromInjector));
        }
        return dependencies;
    }
}

export { ResolveContext };
