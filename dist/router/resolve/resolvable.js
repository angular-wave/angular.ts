import { stringify } from '../../shared/strings.js';
import { isInstanceOf, isFunction, assert, isNullOrUndefined, isObject, hasOwn, isArray } from '../../shared/utils.js';

async function resolveResolvable(resolvable, resolveContext, trans) {
    const dependencies = resolveContext.getDependencies(resolvable);
    const dependencyPromises = new Array(dependencies.length);
    dependencies.forEach((dependency, index) => {
        dependencyPromises[index] = dependency.get(resolveContext, trans);
    });
    const resolvedDeps = await Promise.all(dependencyPromises);
    const resolvedValue = await resolvable.resolveFn?.(...resolvedDeps);
    resolvable.data = resolvedValue;
    resolvable.resolved = true;
    resolvable.resolveFn = null;
    return resolvable.data;
}
/**
 * # The Resolve subsystem
 *
 * This subsystem is an asynchronous, hierarchical Dependency Injection system.
 *
 * Typically, resolve is configured on a state using a [[StateDeclaration.resolve]] declaration.
 */
/**
 * Represents one dependency that can be resolved for a transition.
 *
 * A resolvable tracks its token, dependency list, eager timing, cached value,
 * and in-flight promise so router state resolution stays idempotent.
 */
class Resolvable {
    /**
     * @throws Error when a resolve function is provided without a token.
     */
    constructor(arg1, resolveFn, deps, eager, data) {
        this.token = undefined;
        this.resolveFn = undefined;
        this.deps = [];
        this.eager = false;
        this.data = undefined;
        this.resolved = false;
        this.promise = undefined;
        if (isInstanceOf(arg1, Resolvable)) {
            this.token = arg1.token;
            this.resolveFn = arg1.resolveFn;
            this.deps = arg1.deps;
            this.eager = arg1.eager;
            this.data = arg1.data;
            this.resolved = arg1.resolved;
            this.promise = arg1.promise;
        }
        else if (isFunction(resolveFn)) {
            assert(!isNullOrUndefined(arg1), "token argument is required");
            this.token = arg1;
            this.eager = !!eager;
            this.resolveFn = resolveFn;
            this.deps = deps || [];
            this.data = data;
            this.resolved = data !== undefined;
            this.promise = this.resolved ? Promise.resolve(this.data) : undefined;
        }
        else if (isObject(arg1) &&
            hasOwn(arg1, "token") &&
            (hasOwn(arg1, "resolveFn") || hasOwn(arg1, "data"))) {
            const literal = arg1;
            this.token = literal.token;
            this.resolveFn = literal.resolveFn;
            this.deps = literal.deps || [];
            this.eager = !!literal.eager;
            this.data = literal.data;
            this.resolved = literal.data !== undefined;
            this.promise = this.resolved ? Promise.resolve(this.data) : undefined;
        }
    }
    /**
     * Resolves this token by first resolving its dependencies, then invoking
     * the resolve function and caching the resulting value.
     */
    resolve(resolveContext, trans) {
        this.promise = resolveResolvable(this, resolveContext, trans);
        return this.promise;
    }
    /**
     * Returns the cached promise, resolving the token first if necessary.
     */
    get(resolveContext, trans) {
        return this.promise || this.resolve(resolveContext, trans);
    }
    /**
     * Returns a readable description of the resolvable and its dependencies.
     */
    toString() {
        const deps = isArray(this.deps) ? this.deps : [this.deps];
        return `Resolvable(token: ${stringify(this.token)}, requires: [${deps.map(stringify)}])`;
    }
    /**
     * Creates a shallow copy of this resolvable.
     */
    clone() {
        return new Resolvable(this);
    }
    /**
     * Creates a resolvable that is already resolved to `data`.
     */
    static fromData(token, data) {
        return new Resolvable(token, () => data, undefined, undefined, data);
    }
}

export { Resolvable };
