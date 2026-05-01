import { Glob } from "../glob/glob.ts";
import {
  assign,
  hasOwn,
  isFunction,
  isInstanceOf,
  isObject,
  values,
} from "../../shared/utils.ts";
import type { Param } from "../params/param.ts";
import type { Resolvable } from "../resolve/resolvable.ts";
import type {
  BuiltStateDeclaration,
  StateDeclaration,
  ViewDeclaration,
} from "./interface.ts";
import type { TransitionStateHookFn } from "../transition/interface.ts";
import type { UrlMatcher } from "../url/url-matcher.ts";

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
    return isFunction((obj as { _state?: unknown })._state);
  }

  static isState(obj: unknown): obj is StateObject {
    return (
      isObject(obj) &&
      isObject((obj as { _stateObjectCache?: unknown })._stateObjectCache)
    );
  }

  name: string;
  navigable: StateObject | undefined | null;
  parent: StateObject | null | undefined;
  params: Record<string, Param> | undefined;
  url: UrlMatcher | undefined;
  data: unknown;
  includes!: Record<string, boolean>;
  path: StateObject[] | undefined;
  /** @internal */
  _views: Record<string, ViewDeclaration> | undefined;
  resolvables: Resolvable[] | undefined;
  onEnter: TransitionStateHookFn | undefined;
  onRetain: TransitionStateHookFn | undefined;
  onExit: TransitionStateHookFn | undefined;
  self: StateDeclaration;
  /** @internal */
  _stateObjectCache: { nameGlob: Glob | null };

  /**
   * @param {StateDeclaration} config
   */
  constructor(config: StateDeclaration) {
    assign(this, config);
    this.self = config;
    this.name = config.name;
    config._state = () => this as unknown as BuiltStateDeclaration;
    const nameGlob = this.name ? Glob.fromString(this.name) : null;

    this._stateObjectCache = { nameGlob };
  }

  /** @returns {StateObject} */
  /** @internal */
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
   * @param ref Can be one of (a) a `State` instance, (b) an object that was passed
   *        into `$stateProvider.state()`, (c) the fully-qualified name of a state as a string.
   * @returns Returns `true` if `ref` matches the current `State` instance.
   */
  is(ref: StateObject | StateDeclaration | string): boolean {
    return this === ref || this.self === ref || this.fqn() === ref;
  }

  /**
   * @deprecated this does not properly handle dot notation
   * @returns {string} Returns a dot-separated name of the state.
   */
  fqn(): string {
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
    const params = assign(
      {
        inherit: true,
        matchingKeys: null,
      },
      opts || {},
    ) as Param;

    const inherited =
      (params.inherit && this.parent && this.parent.parameters()) || [];

    const ownParams = values(this.params || {});

    const result: Param[] = [];

    for (let i = 0; i < inherited.length; i++) {
      const param = inherited[i];

      if (!params.matchingKeys || hasOwn(params.matchingKeys, param.id)) {
        result.push(param);
      }
    }

    for (let i = 0; i < ownParams.length; i++) {
      const param = ownParams[i];

      if (!params.matchingKeys || hasOwn(params.matchingKeys, param.id)) {
        result.push(param);
      }
    }

    return result;
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
    const urlParam = this.url && this.url.parameter(id, opts);

    if (urlParam) return urlParam;

    const ownParams = values(this.params || {});

    for (let i = 0; i < ownParams.length; i++) {
      const param = ownParams[i];

      if (param.id === id) return param;
    }

    return opts.inherit && this.parent ? this.parent.parameter(id) : undefined;
  }

  toString(): string {
    return this.fqn();
  }
}

export type { Param };
