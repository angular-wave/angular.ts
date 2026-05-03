import { Glob } from '../glob/glob.js';
import { isFunction, isObject, assign, isInstanceOf, keys, hasOwn } from '../../shared/utils.js';

/**
 * Internal representation of a ng-router state.
 *
 * Instances of this class are created when a [[StateDeclaration]] is registered with the [[StateRegistry]].
 *
 * A registered [[StateDeclaration]] is augmented with a getter ([[StateDeclaration._state]]) which returns the corresponding [[StateObject]] object.
 *
 * This class prototypally inherits from the corresponding [[StateDeclaration]].
 * Each of its own properties (i.e., `hasOwnProperty`) are built using builders from the [[StateBuilder]].
 * @extends {ng.StateDeclaration}
 */
class StateObject {
    static isStateDeclaration(obj) {
        return isFunction(obj._state);
    }
    static isState(obj) {
        return (isObject(obj) &&
            isObject(obj._stateObjectCache));
    }
    /**
     * @param {StateDeclaration} config
     */
    constructor(config) {
        assign(this, config);
        this.self = config;
        this.name = config.name;
        config._state = () => this;
        const nameGlob = this.name ? Glob.fromString(this.name) : null;
        this._stateObjectCache = { nameGlob };
    }
    /** @returns {StateObject} */
    /** @internal */
    _state() {
        return this;
    }
    /**
     * Returns true if the provided parameter is the same state.
     *
     * Compares the identity of the state against the passed value, which is either an object
     * reference to the actual `State` instance, the original definition object passed to
     * `$stateProvider.state()`, or the fully-qualified name.
     *
     * @param ref Can be one of (a) a `State` instance, (b) an object that was passed
     *        into `$stateProvider.state()`, (c) the fully-qualified name of a state as a string.
     * @returns Returns `true` if `ref` matches the current `State` instance.
     */
    is(ref) {
        return this === ref || this.self === ref || this.fqn() === ref;
    }
    /**
     * @deprecated this does not properly handle dot notation
     * @returns {string} Returns a dot-separated name of the state.
     */
    fqn() {
        if (!this.parent || !isInstanceOf(this.parent, this.constructor))
            return this.name;
        const name = this.parent.fqn();
        return name ? `${name}.${this.name}` : this.name;
    }
    /**
     * Returns the root node of this state's tree.
     *
     * @returns {StateObject} The root of this state's tree.
     */
    root() {
        return (this.parent && this.parent.root()) || this;
    }
    /**
     * Gets the state's `Param` objects
     *
     * Gets the list of [[Param]] objects owned by the state.
     * If `opts.inherit` is true, it also includes the ancestor states' [[Param]] objects.
     * If `opts.matchingKeys` exists, returns only `Param`s whose `id` is a key on the `matchingKeys` object
     *
     * @param {StateParamOptions} [opts] options
     * @returns {Param[]} the list of [[Param]] objects
     */
    parameters(opts) {
        const inherit = opts?.inherit !== false;
        const matchingKeys = opts?.matchingKeys;
        const inherited = (inherit && this.parent && this.parent.parameters({ matchingKeys })) ||
            [];
        const result = inherited.slice();
        const { params } = this;
        if (!params)
            return result;
        keys(params).forEach((id) => {
            const { [id]: param } = params;
            if (!matchingKeys || hasOwn(matchingKeys, id)) {
                result.push(param);
            }
        });
        return result;
    }
    /**
     * Returns a single [[Param]] that is owned by the state
     *
     * If `opts.inherit` is true, it also searches the ancestor states` [[Param]]s.
     * @param {string} id the name of the [[Param]] to return
     * @param {StateParamOptions} [opts] options
     * @returns {Param | undefined} the [[Param]] object, or undefined if it does not exist
     */
    parameter(id, opts) {
        const urlParam = this._url && this._url._parameter(id, opts);
        if (urlParam)
            return urlParam;
        const { params } = this;
        if (params && hasOwn(params, id)) {
            const { [id]: param } = params;
            return param;
        }
        return opts?.inherit && this.parent
            ? this.parent.parameter(id, opts)
            : undefined;
    }
    toString() {
        return this.fqn();
    }
}

export { StateObject };
