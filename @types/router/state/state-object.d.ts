/** @typedef {import("../params/param.js").Param} Param */
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
  /**
   * @param {import('./interface.ts').StateDeclaration} config
   */
  constructor(config: import("./interface.ts").StateDeclaration);
  /**
   * @type {string}
   */
  name: string;
  /**
   * @type {{ url: any; } | undefined | null}
   */
  navigable:
    | {
        url: any;
      }
    | undefined
    | null;
  /** @type {StateObject | undefined} */
  parent: StateObject | undefined;
  /**
   * @type {ArrayLike<Param> | undefined}
   */
  params: ArrayLike<Param> | undefined;
  /**
   * @type {{ parameter: (arg0: any, arg1: {}) => any; } | undefined}
   */
  url:
    | {
        parameter: (arg0: any, arg1: {}) => any;
      }
    | undefined;
  /**
   * @type {any}
   */
  includes: any;
  /**
   * @type {StateObject[] | undefined}
   */
  path: StateObject[] | undefined;
  /**
   * @type {any}
   */
  views: any;
  /**
   * @type {ng.StateDeclaration}
   */
  self: ng.StateDeclaration;
  _stateObjectCache: {
    nameGlob: Glob;
  };
  /** @returns {StateObject} */
  _state(): StateObject;
  /**
   * Returns true if the provided parameter is the same state.
   *
   * Compares the identity of the state against the passed value, which is either an object
   * reference to the actual `State` instance, the original definition object passed to
   * `$stateProvider.state()`, or the fully-qualified name.
   *
   * @param {StateObject | string} ref Can be one of (a) a `State` instance, (b) an object that was passed
   *        into `$stateProvider.state()`, (c) the fully-qualified name of a state as a string.
   * @returns Returns `true` if `ref` matches the current `State` instance.
   */
  is(ref: StateObject | string): boolean;
  /**
   * @deprecated this does not properly handle dot notation
   * @returns {string} Returns a dot-separated name of the state.
   */
  fqn(): string;
  /**
   * Returns the root node of this state's tree.
   *
   * @returns {StateObject} The root of this state's tree.
   */
  root(): StateObject;
  /**
   * Gets the state's `Param` objects
   *
   * Gets the list of [[Param]] objects owned by the state.
   * If `opts.inherit` is true, it also includes the ancestor states' [[Param]] objects.
   * If `opts.matchingKeys` exists, returns only `Param`s whose `id` is a key on the `matchingKeys` object
   *
   * @param {Param} [opts] options
   * @returns {Param[]} the list of [[Param]] objects
   */
  parameters(opts?: Param): Param[];
  /**
   * Returns a single [[Param]] that is owned by the state
   *
   * If `opts.inherit` is true, it also searches the ancestor states` [[Param]]s.
   * @param {string} id the name of the [[Param]] to return
   * @param {Param} [opts] options
   * @returns {Param | undefined} the [[Param]] object, or undefined if it does not exist
   */
  parameter(id: string, opts?: Param): Param | undefined;
  toString(): string;
}
export namespace StateObject {
  /** Predicate which returns true if the object is a [[StateDeclaration]] object */
  function isStateDeclaration(obj: { _state: any }): boolean;
  /** Predicate which returns true if the object is an internal [[StateObject]] object */
  function isState(obj: { _stateObjectCache: any }): boolean;
}
export type Param = import("../params/param.js").Param;
import { Glob } from "../glob/glob.js";
