import { defaults, find } from "../../shared/common.js";
import { propEq } from "../../shared/hof.js";
import { Glob } from "../glob/glob.js";
import { hasOwn, isFunction, isObject } from "../../shared/utils.js";

/**
 * Internal representation of a ng-router state.
 *
 * Instances of this class are created when a [[StateDeclaration]] is registered with the [[StateRegistry]].
 *
 * A registered [[StateDeclaration]] is augmented with a getter ([[StateDeclaration.$$state]]) which returns the corresponding [[StateObject]] object.
 *
 * This class prototypally inherits from the corresponding [[StateDeclaration]].
 * Each of its own properties (i.e., `hasOwnProperty`) are built using builders from the [[StateBuilder]].
 * @implements {ng.StateDeclaration}
 */
export class StateObject {
  name;
  navigable;
  /** @type {?StateObject} */
  parent;
  params;
  url;
  includes;

  /**
   * @param {import('./interface.ts').StateDeclaration} config
   */
  constructor(config) {
    Object.assign(this, config);
    this.$$state = () => {
      return this;
    };
    /**
     * @type {ng.StateDeclaration|ng.BuiltStateDeclaration}
     */
    this.self = config;
    /**
     * @type {?Glob}
     */
    const nameGlob = this.name ? Glob.fromString(this.name) : null;

    this._stateObjectCache = { nameGlob };
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
   * @returns Returns a dot-separated name of the state.
   */
  fqn() {
    if (!this.parent || !(this.parent instanceof this.constructor))
      return this.name;
    const name = this.parent.fqn();

    return name ? `${name}.${this.name}` : this.name;
  }

  /**
   * Returns the root node of this state's tree.
   *
   * @returns The root of this state's tree.
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
   * @param opts options
   */
  parameters(opts) {
    opts = defaults(opts, { inherit: true, matchingKeys: null });
    const inherited =
      (opts.inherit && this.parent && this.parent.parameters()) || [];

    return inherited
      .concat(Object.values(this.params))
      .filter(
        (param) => !opts.matchingKeys || hasOwn(opts.matchingKeys, param.id),
      );
  }

  /**
   * Returns a single [[Param]] that is owned by the state
   *
   * If `opts.inherit` is true, it also searches the ancestor states` [[Param]]s.
   * @param id the name of the [[Param]] to return
   * @param opts options
   */
  parameter(id, opts = {}) {
    return (
      (this.url && this.url.parameter(id, opts)) ||
      find(Object.values(this.params), propEq("id", id)) ||
      (opts.inherit && this.parent && this.parent.parameter(id))
    );
  }

  toString() {
    return this.fqn();
  }
}
/** Predicate which returns true if the object is a [[StateDeclaration]] object */
StateObject.isStateDeclaration = (obj) => isFunction(obj.$$state);
/** Predicate which returns true if the object is an internal [[StateObject]] object */
StateObject.isState = (obj) => isObject(obj._stateObjectCache);
