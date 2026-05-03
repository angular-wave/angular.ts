import { stringify } from '../../shared/strings.js';
import { isInstanceOf, isArray, isString, isUndefined } from '../../shared/utils.js';
import { Resolvable } from './resolvable.js';

async function resolveToken(resolvable, context, trans) {
    return {
        token: resolvable.token,
        value: await resolvable.get(context, trans),
    };
}
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
        const tokenSet = new Set();
        this._path.forEach(({ resolvables }) => {
            resolvables.forEach(({ token }) => {
                tokenSet.add(token);
            });
        });
        return Array.from(tokenSet);
    }
    /**
     * Returns the most local resolvable registered for the specified token.
     */
    getResolvable(token) {
        for (let i = this._path.length - 1; i >= 0; i--) {
            const { resolvables } = this._path[i];
            for (let j = resolvables.length - 1; j >= 0; j--) {
                const candidate = resolvables[j];
                if (candidate.token === token) {
                    return candidate;
                }
            }
        }
        return undefined;
    }
    /**
     * Returns a child resolve context scoped to the specified state.
     */
    subContext(state) {
        let contextPath;
        for (let i = 0; i < this._path.length; i++) {
            if (this._path[i].state.name === state.name) {
                contextPath = this._path.slice(0, i + 1);
                break;
            }
        }
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
        const tokens = new Set();
        newResolvables.forEach((resolvable) => {
            const normalized = isInstanceOf(resolvable, Resolvable)
                ? resolvable
                : new Resolvable(resolvable);
            resolvables.push(normalized);
            tokens.add(normalized.token);
        });
        const nextResolvables = [];
        node.resolvables.forEach((existing) => {
            if (!tokens.has(existing.token)) {
                nextResolvables.push(existing);
            }
        });
        resolvables.forEach((resolvable) => nextResolvables.push(resolvable));
        node.resolvables = nextResolvables;
    }
    /**
     * Resolves the path's resolvables.
     */
    resolvePath(eagerOnly = false, trans) {
        const promises = [];
        this._path.forEach((node, index) => {
            const subContext = new ResolveContext(this._path.slice(0, index + 1), this._injector);
            node.resolvables.forEach((resolvable) => {
                if (!eagerOnly || resolvable.eager) {
                    promises.push(resolveToken(resolvable, subContext, trans));
                }
            });
        });
        return Promise.all(promises);
    }
    /**
     * Finds the path node that owns the provided resolvable.
     */
    findNode(resolvable) {
        const index = this._findNodeIndex(resolvable);
        return index === -1 ? undefined : this._path[index];
    }
    /** @internal */
    _findNodeIndex(resolvable) {
        for (let i = 0; i < this._path.length; i++) {
            const node = this._path[i];
            for (let j = 0; j < node.resolvables.length; j++) {
                if (node.resolvables[j] === resolvable) {
                    return i;
                }
            }
        }
        return -1;
    }
    /**
     * Resolves the dependency tokens required by a resolvable from either
     * the current path or the injector fallback.
     */
    getDependencies(resolvable) {
        const nodeIndex = this._findNodeIndex(resolvable);
        const dependencyPath = nodeIndex === -1 ? this._path : this._path.slice(0, nodeIndex + 1);
        const latestByToken = new Map();
        dependencyPath.forEach(({ resolvables }) => {
            resolvables.forEach((candidate) => {
                if (candidate !== resolvable) {
                    latestByToken.set(candidate.token, candidate);
                }
            });
        });
        const deps = isArray(resolvable.deps) ? resolvable.deps : [resolvable.deps];
        const dependencies = [];
        deps.forEach((token) => {
            const matching = latestByToken.get(token);
            if (matching) {
                dependencies.push(matching);
                return;
            }
            let fromInjector;
            if (this._injector && isString(token)) {
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
            dependencies.push(new Resolvable({ token, data: fromInjector }));
        });
        return dependencies;
    }
}

export { ResolveContext };
