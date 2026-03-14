import { defaults, find } from "../../shared/common.js";
import { propEq } from "../../shared/hof.js";
import { Glob } from "../glob/glob.ts";
import { hasOwn, isFunction, isObject, values } from "../../shared/utils.js";
import type { Param } from "../params/param.ts";
import type { Resolvable } from "../resolve/resolvable.ts";
import type { StateDeclaration } from "./interface.ts";

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
export class StateObject {
  static isStateDeclaration(
    obj: StateObject | StateDeclaration,
  ): obj is StateDeclaration {
    return isFunction((obj as any)._state);
  }

  static isState(obj: any): obj is StateObject {
    return isObject(obj._stateObjectCache);
  }

  name;
  navigable: { url: any } | undefined | null;
  parent: StateObject | undefined;
  params: ArrayLike<Param> | undefined;
  url: { parameter: (id: any, opts: {}) => any } | undefined;
  includes: any;
  path: StateObject[] | undefined;
  views: any;
  resolvables: Resolvable[] | undefined;
  self: StateDeclaration;
  _stateObjectCache: { nameGlob: Glob | null };

  /**
   * @param {import('./interface.ts').StateDeclaration} config
   */
  constructor(config: StateDeclaration) {
    Object.assign(this, config);
    this.self = config;
    this.name = config.name;
    const nameGlob = this.name ? Glob.fromString(this.name) : null;

    this._stateObjectCache = { nameGlob };
  }

  /** @returns {StateObject} */
  _state(): StateObject {
    return this;
  }

  /**
   * Returns true if the provided parameter is the same state.
   *
   * Compares the identity of the state against the passed value, which is either an object
   * reference to the actual `State` instance, the original definition object passed to
   * `$stateProvider.state()`, or the fully-qualified name.
   *
   * @param {any} ref Can be one of (a) a `State` instance, (b) an object that was passed
   *        into `$stateProvider.state()`, (c) the fully-qualified name of a state as a string.
   * @returns Returns `true` if `ref` matches the current `State` instance.
   */
  is(ref: any): boolean {
    return this === ref || this.self === ref || this.fqn() === ref;
  }

  /**
   * @deprecated this does not properly handle dot notation
   * @returns {string} Returns a dot-separated name of the state.
   */
  fqn(): string {
    if (!this.parent || !(this.parent instanceof this.constructor))
      return this.name;
    const name = this.parent.fqn();

    return name ? `${name}.${this.name}` : this.name;
  }

  /**
   * Returns the root node of this state's tree.
   *
   * @returns {StateObject} The root of this state's tree.
   */
  root(): StateObject {
    return (this.parent && this.parent.root()) || this;
  }

  /**
   * Gets the state's `Param` objects
   *
   * Gets the list of [[Param]] objects owned by the state.
   * If `opts.inherit` is true, it also includes the ancestor states' [[Param]] objects.
   * If `opts.matchingKeys` exists, returns only `Param`s whose `id` is a key on the `matchingKeys` object
   *
   * @param {Partial<Param>} [opts] options
   * @returns {Param[]} the list of [[Param]] objects
   */
  parameters(opts?: Partial<Param>): Param[] {
    const params = defaults(opts, {
      inherit: true,
      matchingKeys: null,
    }) as Param;

    const inherited =
      (params.inherit && this.parent && this.parent.parameters()) || [];

    return inherited
      .concat(values(this.params || {}))
      .filter(
        (param) =>
          !params.matchingKeys || hasOwn(params.matchingKeys, param.id),
      );
  }

  /**
   * Returns a single [[Param]] that is owned by the state
   *
   * If `opts.inherit` is true, it also searches the ancestor states` [[Param]]s.
   * @param {string} id the name of the [[Param]] to return
   * @param {Param} [opts] options
   * @returns {Param | undefined} the [[Param]] object, or undefined if it does not exist
   */
  parameter(id: string, opts: Partial<Param> = {}): Param | undefined {
    return (
      (this.url && this.url.parameter(id, opts)) ||
      find(values(this.params || {}), propEq("id", id)) ||
      (opts.inherit && this.parent && this.parent.parameter(id))
    );
  }

  toString(): string {
    return this.fqn();
  }
}

export type { Param };
