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
export class StateObject implements ng.StateDeclaration {
  /**
   * @param {import('./interface.ts').StateDeclaration} config
   */
  constructor(config: import("./interface.ts").StateDeclaration);
  name: any;
  navigable: any;
  /** @type {?StateObject} */
  parent: StateObject | null;
  params: any;
  url: any;
  includes: any;
  $$state: () => this;
  /**
   * @type {ng.StateDeclaration|ng.BuiltStateDeclaration}
   */
  self: ng.StateDeclaration | ng.BuiltStateDeclaration;
  _stateObjectCache: {
    nameGlob: Glob;
  };
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
  is(ref: any): boolean;
  /**
   * @deprecated this does not properly handle dot notation
   * @returns Returns a dot-separated name of the state.
   */
  fqn(): any;
  /**
   * Returns the root node of this state's tree.
   *
   * @returns The root of this state's tree.
   */
  root(): any;
  /**
   * Gets the state's `Param` objects
   *
   * Gets the list of [[Param]] objects owned by the state.
   * If `opts.inherit` is true, it also includes the ancestor states' [[Param]] objects.
   * If `opts.matchingKeys` exists, returns only `Param`s whose `id` is a key on the `matchingKeys` object
   *
   * @param opts options
   */
  parameters(opts: any): any;
  /**
   * Returns a single [[Param]] that is owned by the state
   *
   * If `opts.inherit` is true, it also searches the ancestor states` [[Param]]s.
   * @param id the name of the [[Param]] to return
   * @param opts options
   */
  parameter(id: any, opts?: {}): any;
  toString(): any;
}
export namespace StateObject {
  /** Predicate which returns true if the object is a [[StateDeclaration]] object */
  function isStateDeclaration(obj: any): boolean;
  /** Predicate which returns true if the object is an internal [[StateObject]] object */
  function isState(obj: any): boolean;
}
import { Glob } from "../glob/glob.js";
